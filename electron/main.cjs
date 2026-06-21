// ── AnimeVault main process entry point ───────────────────────────────────────
// Responsible for: window creation, session setup, ad-blocking, scheduled
// backup trigger, and app lifecycle. All heavy IPC logic lives in ipc/.

const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  webContents,
  Notification,
} = require("electron");
const path = require("path");
const RPC = require("discord-rpc");

// ── RAM / performance flags ────────────────────────────────────────────────────
app.commandLine.appendSwitch(
  "js-flags",
  "--max-old-space-size=256 --expose-gc",
);
app.commandLine.appendSwitch(
  "disable-features",
  "HardwareMediaKeyHandling,MediaSessionService,UseSandboxedXdgPortal",
);
// Run the network stack in the browser process → one less utility process
app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess2");
// NOTE: enable-low-end-device-mode removed, it cuts the GPU texture tile budget
// and causes visible seams/stripes/dots on large images.

// Cap disk cache and limit renderer processes (prevents RAM growth on multi-page navigation)
app.commandLine.appendSwitch("disk-cache-size", String(80 * 1024 * 1024));
app.commandLine.appendSwitch("renderer-process-limit", "3");

// ── Sub-modules ────────────────────────────────────────────────────────────────
const blockStats = require("./ipc/blockStats.cjs");
const storageIpc = require("./ipc/storage.cjs");
const fs = require('fs');
const https = require('https');
const http = require('http');
const { pipeline } = require('stream');
const { v4: uuidv4 } = require('uuid');

// ── Ad/tracker block list ───────────────────────────────────────────────────────
// NOTE: Critical design dependencies (fonts.googleapis.com, fonts.gstatic.com)
// are intentionally NOT blocked. The app relies on Google Fonts (Geist, Sora)
// and Material Symbols for proper rendering. Blocking them breaks icon display
// and layout. Only actual ad/tracker domains are listed here.
const BLOCKED_HOSTS = [
  // Analytics / Ad networks
  "*://www.google-analytics.com/*",
  "*://analytics.google.com/*",
  "*://googletagmanager.com/*",
  "*://www.googletagmanager.com/*",
  "*://googletagservices.com/*",
  "*://doubleclick.net/*",
  "*://*.doubleclick.net/*",
  "*://adservice.google.com/*",
  "*://adservice.google.de/*",
  "*://pagead2.googlesyndication.com/*",
  "*://stats.g.doubleclick.net/*",

  // Known ad servers / malvertising
  "*://cdn.adx1.com/*",
  "*://intelligenceadx.com/*",
  "*://adsco.re/*",
  "*://mc.yandex.com/*",
  "*://mc.yandex.ru/*",
  "*://bvtpk.com/*",
  "*://my.rtmark.net/*",
  "*://bvtpk.com/*",
  "*://b7510.com/*",
  "*://gt.unbrownunflat.com/*",
  "*://im.malocacomals.com/*",
  "*://users.videasy.net/*",
  "*://nf.sixmossin.com/*",
  "*://realizationnewestfangs.com/*",
  "*://acscdn.com/*",
  "*://lt.taloseempest.com/*",
  "*://pl26708123.profitableratecpm.com/*",
  "*://preferencenail.com/*",
  "*://protrafficinspector.com/*",
  "*://s10.histats.com/*",
  "*://weirdopt.com/*",
  "*://static.cloudflareinsights.com/*",
  "*://kettledroopingcontinuation.com/*",
  "*://wayfarerorthodox.com/*",
  "*://woxaglasuy.net/*",
  "*://adeptspiritual.com/*",
  "*://www.calculating-laugh.com/*",
  "*://amavhxdlofklxjg.xyz/*",
  "*://7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd/*",
  "*://5mq.get64t9vqg8pnbex1y463o.rest/*",
  "*://usrpubtrk.com/*",
  "*://adexchangeclear.com/*",
  "*://rzjzjnavztycv.online/*",
  "*://tmstr4.cloudnestra.com/*",
  "*://tmstr4.neonhorizonworkshops.com/*",
];

// ── Module-level state ──────────────────────────────────────────────────────────
let mainWindow = null;
const getMainWindow = () => mainWindow;

const playerWcIds = new Set();
let sessionsConfigured = false;

// ── Discord RPC ─────────────────────────────────────────────────────────────────
let rpc = null;
let currentAnimeActivity = null;

// ── Auto Updater ────────────────────────────────────────────────────────────────
let autoUpdater = null;
let updateStatus = {
  status: "idle",
  message: "Updater is waiting to check for releases.",
  progress: 0,
};

// ── Setup Session ───────────────────────────────────────────────────────────────
function setupSession(playerSession, trailerSession) {
  const stripHeaders = (details, callback) => {
    const headers = { ...details.responseHeaders };
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === "x-frame-options" || lower === "content-security-policy")
        delete headers[key];
    }
    callback({ responseHeaders: headers });
  };

  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  playerSession.setUserAgent(UA);
  trailerSession.setUserAgent(UA);

  playerSession.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    stripHeaders,
  );
  trailerSession.webRequest.onHeadersReceived(
    { urls: ["*://*/*"] },
    stripHeaders,
  );

  // Trailer: block ads only (no media intercept needed)
  trailerSession.webRequest.onBeforeRequest({ urls: BLOCKED_HOSTS }, (_, cb) =>
    cb({ cancel: true }),
  );

  // Player session: block ads + intercept m3u8/vtt URLs for renderer
  const MEDIA_URLS = [
    "*://*/*.m3u8*",
    "*://*/*.m3u8",
    "*://*/*.vtt*",
    "*://*/*.vtt",
  ];
  playerSession.webRequest.onBeforeRequest(
    { urls: [...BLOCKED_HOSTS, ...MEDIA_URLS] },
    (details, callback) => {
      const { url } = details;
      const isMedia = url.includes(".m3u8") || url.includes(".vtt");
      if (!isMedia) {
        blockStats.recordBlockedRequest(url);
        callback({ cancel: true });
        return;
      }
      // Media URL: check if it also happens to be on a blocked domain
      try {
        const host = new URL(url).hostname;
        const blocked = BLOCKED_HOSTS.some((pat) => {
          const hostPat = pat.replace(/^\*:\/\//, "").split("/")[0];
          return hostPat.startsWith("*.")
            ? host.endsWith(hostPat.slice(1))
            : host === hostPat || host === hostPat.replace(/^\*\./, "");
        });
        if (blocked) {
          blockStats.recordBlockedRequest(url);
          callback({ cancel: true });
          return;
        }
      } catch { }
      // Pass through + notify renderer
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        if (url.includes(".m3u8")) {
          mw.webContents.send("m3u8-found", url);
        } else if (url.includes(".vtt")) {
          mw.webContents.send("subtitle-found", {
            url,
            lang: "en",
          });
        }
      }
      callback({});
    },
  );

  // YouTube consent cookie → suppress consent gate in both sessions
  const ytCookie = {
    url: "https://www.youtube.com",
    name: "SOCS",
    value: "CAI",
    path: "/",
    secure: true,
    httpOnly: false,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2,
  };
  for (const domain of [".youtube.com", ".youtube-nocookie.com"]) {
    const cookie = { ...ytCookie, domain };
    trailerSession.cookies.set(cookie).catch(() => { });
    playerSession.cookies.set(cookie).catch(() => { });
  }
}

// ── Create Window ────────────────────────────────────────────────────────────────
function createWindow() {
  storageIpc.applySecretMigrationIfNeeded();
  blockStats.loadBlockStats();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    icon: path.join(__dirname, "../build/icon.ico"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
      show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      backgroundThrottling: true,
      spellcheck: false,
      // Caps the renderer's V8 heap + exposes gc() for manual GC hints after navigation
      additionalArguments: ["--js-flags=--max-old-space-size=256 --expose-gc"],
    },
  });

    // Show window when ready to prevent visual flash
    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
    });
  // Force long-lived disk caching for TMDB images in the default session.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["*://image.tmdb.org/*"] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      headers["cache-control"] = ["public, max-age=604800, immutable"]; // 7 days
      delete headers["pragma"];
      delete headers["expires"];
      callback({ responseHeaders: headers });
    },
  );

  // Inject Origin header for Neon Auth requests
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["*://*.neon.tech/*", "*://*.supabase.co/*"] },
    (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      requestHeaders["Origin"] = "https://animevaultofficial.github.io";
      callback({ requestHeaders });
    }
  );

  // ── Lazy session setup ───────────────────────────────────────────────────────
  // Player/trailer sessions are configured on the first webview attach or
  // when the pop-out window opens, whichever comes first.

  // Block popups from webviews, intercept fullscreen, lazy-init sessions
  mainWindow.webContents.on("did-attach-webview", (_, wc) => {
    if (!sessionsConfigured) {
      sessionsConfigured = true;
      const playerSession = session.fromPartition("persist:player");
      const trailerSession = session.fromPartition("persist:trailer");
      setupSession(playerSession, trailerSession);
    }

    // Track player webviews for cleanup on player-stopped
    try {
      if (wc.session === session.fromPartition("persist:player")) {
        playerWcIds.add(wc.id);
        wc.once("destroyed", () => playerWcIds.delete(wc.id));
      }
    } catch { }

    wc.setWindowOpenHandler(() => ({ action: "deny" }));
    wc.on("will-navigate", (event, url) => {
      event.preventDefault();
    });
    wc.on("new-window", (event) => {
      event.preventDefault();
    });
    wc.on("enter-html-fullscreen", () =>
      mainWindow.webContents.send("webview-enter-fullscreen"),
    );
    wc.on("leave-html-fullscreen", () =>
      mainWindow.webContents.send("webview-leave-fullscreen"),
    );
  });

  // Also set window open handler on main window
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (app.isPackaged) {
    const indexPath = path.join(app.getAppPath(), "dist/index.html");
    console.log("[AnimeVault] Loading production UI from:", indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    const devUrl = "http://localhost:5173/";
    console.log("[AnimeVault] Loading dev server:", devUrl);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.once("did-finish-load", () => {
    sendUpdateStatus(updateStatus);
    const sbSettings = storageIpc.loadScheduledBackupSettings();
    if (storageIpc.shouldRunScheduledBackup(sbSettings)) {
      mainWindow.webContents.send("scheduled-backup-requested");
    }
    if (app.isPackaged) {
      checkForUpdates();
    }
  });

  // Simple download handler (renderer can call via preload)
  ipcMain.handle('download:start', async (_event, { url, filename }) => {
    try {
      const saveDir = app.getPath('downloads') || app.getPath('userData');
      const safeName = filename || path.basename(new URL(url).pathname) || `download-${Date.now()}`;
      const outPath = path.join(saveDir, safeName);
      const proto = url.startsWith('https') ? https : http;
      const id = uuidv4();

      const req = proto.get(url, (res) => {
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const fileStream = fs.createWriteStream(outPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          const pct = total ? Math.round((received / total) * 100) : null;
          const mw = getMainWindow();
          if (mw && !mw.isDestroyed()) mw.webContents.send('download-progress', { id, url, path: outPath, received, total, percent: pct });
        });
        pipeline(res, fileStream, (err) => {
          const mw = getMainWindow();
          if (mw && !mw.isDestroyed()) mw.webContents.send('download-progress', { id, url, path: outPath, finished: !err, error: err?.message });
        });
      });

      req.on('error', (err) => {
        const mw = getMainWindow();
        if (mw && !mw.isDestroyed()) mw.webContents.send('download-progress', { id, url, path: null, finished: false, error: err.message });
      });

      return { success: true, id, path: outPath };
    } catch (e) {
      return { success: false, error: e?.message };
    }
  });

  // ── Auto-check for updates on startup (like Discord) ─────────────────────────
  if (app.isPackaged) {
    // Send an immediate "checking" status so the UI shows the checking state
    mainWindow.webContents.once("did-finish-load", () => {
      // The first did-finish-load triggers the initial check; we already have this above
    });
  }
}

// ── Auto Updater Helpers ────────────────────────────────────────────────────────
function initAutoUpdater() {
  if (!app.isPackaged) {
    sendUpdateStatus({
      status: "disabled",
      message: "Auto updates are enabled in packaged release builds.",
      progress: 0,
    });
    return;
  }

  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    console.warn("electron-updater is not installed:", error.message);
    sendUpdateStatus({
      status: "error",
      message: "Auto updater dependency is missing. Run npm install before packaging.",
      progress: 0,
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;
  autoUpdater.requestHeaders = {
    "User-Agent": "AnimeVault/AutoUpdater",
  };

  if (process.platform === "win32") {
    autoUpdater.allowDowngrade = false;
  } else if (process.platform === "darwin") {
    autoUpdater.allowDowngrade = false;
  } else if (process.platform === "linux") {
    autoUpdater.allowDowngrade = false;
  }

  autoUpdater.on("checking-for-update", () => {
    console.log("[AutoUpdater] Checking for updates...");
    sendUpdateStatus({
      status: "checking",
      message: "Scanning GitHub Releases for a fresh build...",
      progress: 0,
    });
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version);
    sendUpdateStatus({
      status: "available",
      message: `Version ${info.version} is available. Downloading in the background...`,
      version: info.version,
      progress: 0,
    });
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[AutoUpdater] Already on latest version");
    sendUpdateStatus({
      status: "current",
      message: "You are running the newest AnimeVault release.",
      progress: 100,
    });
  });

  autoUpdater.on("download-progress", (progressInfo) => {
    console.log("[AutoUpdater] Download progress:", Math.round(progressInfo.percent) + "%");
    sendUpdateStatus({
      status: "downloading",
      message: `Downloading update at ${Math.round(progressInfo.percent)}%...`,
      progress: Math.round(progressInfo.percent),
      bytesPerSecond: progressInfo.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded, ready to install:", info.version);
    sendUpdateStatus({
      status: "ready",
      message: `Version ${info.version} is ready. Restart AnimeVault to install instantly.`,
      version: info.version,
      progress: 100,
    });
  });

  autoUpdater.on("error", (error) => {
    console.error("[AutoUpdater] Error:", error);
    const errorMsg = error?.message || error?.toString() || "AnimeVault could not reach the release server.";

    if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
      console.warn("[AutoUpdater] 404 Error - Build not available for this platform");
      sendUpdateStatus({
        status: "error",
        message: `⚠️ Build unavailable for ${process.platform}. This is normal for pre-release versions. Check releases: https://github.com/adiyanhehe/Anime-Vault/releases`,
        progress: 0,
      });
    } else if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("Network")) {
      console.warn("[AutoUpdater] Network error - No internet connection or DNS failure");
      sendUpdateStatus({
        status: "error",
        message: "🌐 Network error: Cannot reach GitHub. Check your internet connection.",
        progress: 0,
      });
    } else if (errorMsg.includes("ETIMEDOUT")) {
      console.warn("[AutoUpdater] Connection timeout");
      sendUpdateStatus({
        status: "error",
        message: "⏱️ Connection timeout: GitHub took too long to respond. Try again later.",
        progress: 0,
      });
    } else if (errorMsg.includes("PSModulePath") || errorMsg.includes("chcp 65001") || errorMsg.includes("powershell.exe -NoProfile -NonInteractive -I auto update")) {
      console.warn("[AutoUpdater] PowerShell command error - likely a packaging issue");
      sendUpdateStatus({
        status: "error",
        message: "⏩ Skipping auto-update for now. Check GitHub for latest releases: https://github.com/adiyanhehe/Anime-Vault/releases",
        progress: 0,
      });
    } else {
      sendUpdateStatus({
        status: "error",
        message: `Update check failed: ${errorMsg.substring(0, 100)}`,
        progress: 0,
      });
    }
  });

  // ── Auto-check on startup (like Discord) ─────────────────────────────────────
  // After initializing, immediately trigger a check so the app shows "checking" state
  // when the user opens it
  if (app.isPackaged) {
    // Use a short delay to let the app settle, then check
    setTimeout(() => {
      console.log("[AutoUpdater] Performing startup update check (Discord-style)...");
      autoUpdater.checkForUpdates().catch((error) => {
        console.error("[AutoUpdater] Startup check failed:", error);
      });
    }, 3000);
  }
}

function checkForUpdates() {
  if (!autoUpdater) return updateStatus;
  console.log("[AutoUpdater] User triggered manual check");
  autoUpdater.checkForUpdates().catch((error) => {
    console.error("[AutoUpdater] Manual check failed:", error);
  });
  return updateStatus;
}

function sendUpdateStatus(nextStatus) {
  updateStatus = { ...updateStatus, ...nextStatus };
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    window.webContents.send("update-status", updateStatus);
  }
}

// ── Discord RPC Helpers ────────────────────────────────────────────────────────
function initDiscord() {
  try {
    const clientId = "1510920317143613470";
    rpc = new RPC.Client({ transport: "ipc" });
    rpc.login({ clientId }).catch((err) => {
      console.warn("Discord RPC login failed:", err.message);
    });
  } catch (e) {
    console.warn("Discord RPC unavailable:", e.message);
  }
}

// ── Register All IPC Modules ────────────────────────────────────────────────────
storageIpc.register();
blockStats.init(getMainWindow);

// get-block-stats lives with its data
ipcMain.handle("get-block-stats", () => blockStats.getBlockStats());

// ── Discord RPC IPC ─────────────────────────────────────────────────────────────
ipcMain.handle("set-anime-activity", async (_, activity) => {
  if (!rpc) return;
  const { title, episode, coverUrl, url } = activity;
  currentAnimeActivity = {
    details: `Watching ${title}`,
    state: episode ? `Episode ${episode}` : "Movie",
    largeImageKey: coverUrl || "anime_vault",
    largeImageText: title,
    buttons: url ? [{ label: "View Details", url }] : [],
    startTimestamp: Date.now(),
  };
  try {
    await rpc.setActivity(currentAnimeActivity);
  } catch (err) {
    console.error("Discord RPC setActivity error:", err);
  }
});

ipcMain.handle("update-anime-activity-time", async (_, { currentTime, duration }) => {
  if (!rpc || !currentAnimeActivity || !duration) return;
  try {
    const startTimestamp = Date.now() - (currentTime * 1000);
    const endTimestamp = startTimestamp + (duration * 1000);
    await rpc.setActivity({
      ...currentAnimeActivity,
      startTimestamp,
      endTimestamp,
    });
  } catch (err) {
    console.error("Discord RPC update time error:", err);
  }
});

ipcMain.handle("clear-anime-activity", () => {
  if (rpc) rpc.clearActivity();
});

// ── Auto Updater IPC ────────────────────────────────────────────────────────────
ipcMain.handle("updates:get-status", () => updateStatus);
ipcMain.handle("updates:check", () => checkForUpdates());
ipcMain.handle("updates:install", () => {
  if (!autoUpdater) return false;
  autoUpdater.quitAndInstall(false, true);
  return true;
});

// ── Player memory cleanup ───────────────────────────────────────────────────────
ipcMain.on("player-stopped", () => {
  // Step 1: Mute + destroy all tracked player WebContents by ID.
  for (const id of playerWcIds) {
    try {
      const wc = webContents.fromId(id);
      if (wc && !wc.isDestroyed()) {
        try {
          wc.setAudioMuted(true);
        } catch { }
        wc.destroy();
      }
    } catch { }
  }
  playerWcIds.clear();

  // Step 2: Flush HTTP + shader caches from the player session.
  try {
    const ps = session.fromPartition("persist:player");
    ps.clearCache().catch(() => { });
    ps.clearStorageData({ storages: ["shadercache", "cachestorage"] }).catch(
      () => { },
    );
  } catch { }

  // Step 3: GC hints
  if (typeof global.gc === "function") global.gc();
  const mw = mainWindow;
  if (mw && !mw.isDestroyed()) {
    mw.webContents
      .executeJavaScript("if(typeof gc==='function') gc();")
      .catch(() => { });
  }
});

// ── Desktop notifications ───────────────────────────────────────────────────────
ipcMain.handle(
  "show-notification",
  (_, { title, body, silent = false }) => {
    try {
      if (!Notification.isSupported()) return;
      const n = new Notification({
        title: String(title),
        body: String(body),
        silent,
      });
      n.show();
    } catch { }
  },
);

// ── Single-instance lock ─────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initDiscord();
    initAutoUpdater();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
  app.on("activate", () => {
    if (mainWindow === null) createWindow();
  });
}