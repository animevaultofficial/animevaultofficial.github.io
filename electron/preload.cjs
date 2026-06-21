const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setAnimeActivity: (activity) => ipcRenderer.invoke('set-anime-activity', activity),
  updateAnimeActivityTime: (progress) => ipcRenderer.invoke('update-anime-activity-time', progress),
  clearAnimeActivity: () => ipcRenderer.invoke('clear-anime-activity'),
  updates: {
    getStatus: () => ipcRenderer.invoke('updates:get-status'),
    check: () => ipcRenderer.invoke('updates:check'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('update-status', listener);
      return () => ipcRenderer.removeListener('update-status', listener);
    },
  },
});

contextBridge.exposeInMainWorld('electron', {
  onM3u8Found: (cb) => {
    const h = (_, url) => cb(url);
    ipcRenderer.on('m3u8-found', h);
    return h;
  },
  offM3u8Found: (h) => ipcRenderer.removeListener('m3u8-found', h),

  onSubtitleFound: (cb) => {
    const h = (_, data) => cb(data);
    ipcRenderer.on('subtitle-found', h);
    return h;
  },
  offSubtitleFound: (h) => ipcRenderer.removeListener('subtitle-found', h),

  onBlockedUpdate: (cb) => {
    const h = (_, data) => cb(data);
    ipcRenderer.on('blocked-stats-update', h);
    return h;
  },
  offBlockedUpdate: (h) => ipcRenderer.removeListener('blocked-stats-update', h),
  getBlockStats: () => ipcRenderer.invoke('get-block-stats'),

  showNotification: ({ title, body, silent }) =>
    ipcRenderer.invoke('show-notification', { title, body, silent }),

  playerStopped: () => ipcRenderer.send('player-stopped'),

  secureGet: (key) =>
    ipcRenderer.invoke('secure-store-get', key).then((r) => r.value ?? null),
  secureSet: (key, value) =>
    ipcRenderer.invoke('secure-store-set', { key, value }),

  onWebviewEnterFullscreen: (cb) => {
    const h = () => cb();
    ipcRenderer.on('webview-enter-fullscreen', h);
    return h;
  },
  offWebviewEnterFullscreen: (h) =>
    ipcRenderer.removeListener('webview-enter-fullscreen', h),
  onWebviewLeaveFullscreen: (cb) => {
    const h = () => cb();
    ipcRenderer.on('webview-leave-fullscreen', h);
    return h;
  },
  offWebviewLeaveFullscreen: (h) =>
    ipcRenderer.removeListener('webview-leave-fullscreen', h),

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  getScheduledBackupSettings: () =>
    ipcRenderer.invoke('get-scheduled-backup-settings'),
  setScheduledBackupSettings: (settings) =>
    ipcRenderer.invoke('set-scheduled-backup-settings', settings),
  performScheduledBackup: (args) =>
    ipcRenderer.invoke('perform-scheduled-backup', args),
  onScheduledBackupRequested: (cb) => {
    const h = () => cb();
    ipcRenderer.on('scheduled-backup-requested', h);
    return h;
  },
  offScheduledBackupRequested: (h) =>
    ipcRenderer.removeListener('scheduled-backup-requested', h),

  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
});

// Simple download API
contextBridge.exposeInMainWorld('electronDownload', {
  start: (url, filename) => ipcRenderer.invoke('download:start', { url, filename }),
  onProgress: (cb) => {
    const h = (_e, data) => cb(data);
    ipcRenderer.on('download-progress', h);
    return () => ipcRenderer.removeListener('download-progress', h);
  }
});

