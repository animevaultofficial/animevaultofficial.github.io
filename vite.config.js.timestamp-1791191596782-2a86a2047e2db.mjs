// vite.config.js
import { defineConfig } from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/vite/dist/node/index.js";
import react from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";

// api/manga.js
import express from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/express/index.js";
import mangakakalot from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/mangakakalot-api/index.js";
var ANILIST_API = "https://graphql.anilist.co";
var app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
async function fetchAniListFallback(sort = "POPULARITY_DESC", page = 1, search = null) {
  const query = search ? `
    query ($search: String, $page: Int) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage }
        media(search: $search, type: MANGA) {
          id
          title { english romaji userPreferred }
          coverImage { extraLarge large }
          averageScore
          status
          chapters
        }
      }
    }
  ` : `
    query ($page: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage }
        media(type: MANGA, sort: $sort) {
          id
          title { english romaji userPreferred }
          coverImage { extraLarge large }
          averageScore
          status
          chapters
        }
      }
    }
  `;
  const variables = search ? { search, page: Number(page) || 1 } : { page: Number(page) || 1, sort: [sort] };
  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    return {
      mangas: mediaList.map((item) => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.userPreferred || "Manga",
        image: item.coverImage?.extraLarge || item.coverImage?.large,
        poster: item.coverImage?.large,
        latestChapter: item.chapters ? `Vol / ${item.chapters} Ch` : item.status || "Ongoing",
        views: item.averageScore ? item.averageScore * 100 : 8500
      })),
      currentPage: Number(page) || 1,
      hasNextPage: data?.data?.Page?.pageInfo?.hasNextPage || false,
      totalPages: 50
    };
  } catch (err) {
    return { mangas: [], currentPage: 1, hasNextPage: false, totalPages: 1 };
  }
}
var router = express.Router();
var handleRead = async (req, res) => {
  try {
    const mangaId = req.params.mangaId;
    const chapterId = req.params.chapterId;
    const fn = mangakakalot.getChapterImages || mangakakalot.scrapeChapterImages;
    const data = await fn(mangaId, chapterId);
    if (data && !data.error) return res.json(data);
    res.json({ error: "Chapter unavailable", images: [] });
  } catch (err) {
    res.json({ error: `Error fetching chapter: ${err.message || err}`, images: [] });
  }
};
router.get("/read/:mangaId/:chapterId", handleRead);
router.get("/read/:mangaId", handleRead);
router.get("/read", handleRead);
router.get("/details/:id", async (req, res) => {
  try {
    const fn = mangakakalot.getDetails || mangakakalot.scrapeMangaDetails;
    const data = await fn(req.params.id);
    if (data && data.title) return res.json(data);
    res.json({ error: "Details unavailable" });
  } catch (err) {
    res.json({ error: `Error fetching details: ${err.message || err}` });
  }
});
var handleSearch = async (req, res) => {
  const query = req.params.query || "attack on titan";
  const page = req.params.page || 1;
  try {
    const fn = mangakakalot.search || mangakakalot.scrapeMangaSearch;
    const data = await fn(query, page);
    if (data && (data.mangas && data.mangas.length > 0 || Array.isArray(data) && data.length > 0)) {
      return res.json(data);
    }
  } catch (err) {
  }
  const fallback = await fetchAniListFallback(null, page, query);
  res.json(fallback);
};
router.get("/search/:query/:page", handleSearch);
router.get("/search/:query", handleSearch);
router.get("/search", handleSearch);
var handleList = (listFnName, defaultScrapeName, fallbackSort) => async (req, res) => {
  const page = req.params.page || 1;
  try {
    const fn = mangakakalot[listFnName] || mangakakalot[defaultScrapeName];
    const data = await fn(page);
    if (data && (data.mangas && data.mangas.length > 0 || Array.isArray(data) && data.length > 0)) {
      return res.json(data);
    }
  } catch (err) {
  }
  const fallback = await fetchAniListFallback(fallbackSort, page);
  res.json(fallback);
};
router.get("/latest/:page", handleList("getLatest", "scrapeLatestMangas", "UPDATED_AT_DESC"));
router.get("/latest", handleList("getLatest", "scrapeLatestMangas", "UPDATED_AT_DESC"));
router.get("/popular/:page", handleList("getPopular", "scrapePopularMangas", "POPULARITY_DESC"));
router.get("/popular", handleList("getPopular", "scrapePopularMangas", "POPULARITY_DESC"));
router.get("/newest/:page", handleList("getNewest", "scrapeNewestMangas", "START_DATE_DESC"));
router.get("/newest", handleList("getNewest", "scrapeNewestMangas", "START_DATE_DESC"));
router.get("/completed/:page", handleList("getCompleted", "scrapeCompletedMangas", "FAVOURITES_DESC"));
router.get("/completed", handleList("getCompleted", "scrapeCompletedMangas", "FAVOURITES_DESC"));
router.get("/popular-now", async (req, res) => {
  try {
    const fn = mangakakalot.getPopularNow || mangakakalot.scrapePopularNowMangas;
    const data = await fn();
    if (data && Array.isArray(data) && data.length > 0) return res.json(data);
  } catch (err) {
  }
  const fallback = await fetchAniListFallback("POPULARITY_DESC", 1);
  res.json(fallback.mangas.slice(0, 10));
});
router.get("/home", async (req, res) => {
  try {
    const fn = mangakakalot.getHomePage || mangakakalot.scrapeHomePage;
    const data = await fn();
    if (data && (data.mangas && data.mangas.length > 0 || data.popularNow || data.popularSlider)) {
      return res.json(data);
    }
  } catch (err) {
  }
  const popular = await fetchAniListFallback("POPULARITY_DESC", 1);
  const latest = await fetchAniListFallback("UPDATED_AT_DESC", 1);
  res.json({
    popularNow: popular.mangas.slice(0, 10),
    popularSlider: popular.mangas.slice(0, 10),
    mangas: latest.mangas
  });
});
app.use("/api/manga", router);
app.use("/", router);
var manga_default = app;

// api/allanime.js
import express2 from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/express/index.js";
var ALLANIME_GRAPHQL_ENDPOINT = "https://api.allanime.day/api";
var app2 = express2();
app2.use(express2.json());
app2.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
var router2 = express2.Router();
router2.use(express2.json());
var REQUIRED_HEADERS = {
  "Content-Type": "application/json",
  "Referer": "https://allmanga.to",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
};
async function executeGraphQL(query, variables = {}) {
  let activeQuery = query || "";
  if (activeQuery.includes("TranslationType!") && !activeQuery.includes("VaildTranslationTypeEnumType!")) {
    activeQuery = activeQuery.replace("TranslationType!", "VaildTranslationTypeEnumType!");
  }
  let response = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: REQUIRED_HEADERS,
    body: JSON.stringify({ query: activeQuery, variables })
  });
  if (!response.ok && activeQuery.includes("VaildTranslationTypeEnumType!")) {
    const fallbackQuery = activeQuery.replace("VaildTranslationTypeEnumType!", "TranslationType!");
    const retryRes = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: REQUIRED_HEADERS,
      body: JSON.stringify({ query: fallbackQuery, variables })
    });
    if (retryRes.ok) response = retryRes;
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`AllAnime GraphQL HTTP ${response.status}: ${errorText || response.statusText}`);
  }
  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`AllAnime GraphQL Error: ${json.errors[0]?.message || "Unknown GraphQL error"}`);
  }
  return json.data;
}
router2.post("/graphql", async (req, res) => {
  try {
    const { query, variables } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }
    const data = await executeGraphQL(query, variables);
    res.json({ data });
  } catch (err) {
    res.json({ data: null, error: err.message });
  }
});
router2.post("/shows", async (req, res) => {
  try {
    const { title, limit = 10, page = 1 } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Title is required." });
    }
    const query = `
      query ($search: SearchInput, $limit: Int, $page: Int) {
        shows(search: $search, limit: $limit, page: $page) {
          edges {
            _id
            name
            englishName
            availableEpisodesDetail
          }
        }
      }
    `;
    const variables = {
      search: { query: title },
      limit: Number(limit) || 10,
      page: Number(page) || 1
    };
    const data = await executeGraphQL(query, variables);
    const shows = data?.shows?.edges || [];
    res.json({ shows });
  } catch (err) {
    res.json({ shows: [], error: err.message });
  }
});
router2.post("/episode", async (req, res) => {
  try {
    const { showId, translationType = "sub", episodeString = "1" } = req.body || {};
    if (!showId) {
      return res.status(400).json({ error: "showId is required." });
    }
    const query = `
      query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
        episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
          sourceUrls
        }
      }
    `;
    const variables = {
      showId: String(showId),
      translationType: String(translationType).toLowerCase() === "dub" ? "dub" : "sub",
      episodeString: String(episodeString)
    };
    const data = await executeGraphQL(query, variables);
    const sourceUrls = data?.episode?.sourceUrls || [];
    res.json({ sourceUrls });
  } catch (err) {
    res.json({ sourceUrls: [], error: err.message });
  }
});
router2.all("/clock", async (req, res) => {
  try {
    let targetUrl = req.query.url || req.body?.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "url parameter is required." });
    }
    if (targetUrl.startsWith("/")) {
      targetUrl = `https://allanime.day${targetUrl}`;
    }
    const clockRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Referer": "https://allmanga.to",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    if (!clockRes.ok) {
      throw new Error(`Clock HTTP ${clockRes.status}`);
    }
    const json = await clockRes.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.use("/api/allanime", router2);
app2.use("/", router2);
var allanime_default = app2;

// api/hcaptcha.js
import express3 from "file:///E:/New%20folder/animevaultofficial.github.io/node_modules/express/index.js";
var app3 = express3();
app3.use(express3.json());
var HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify";
var HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY || "";
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, message: "Captcha response is required." });
  }
  if (!HCAPTCHA_SECRET_KEY) {
    return res.status(500).json({ success: false, message: "Captcha secret is not configured." });
  }
  try {
    const verifyRes = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        response: String(token),
        secret: HCAPTCHA_SECRET_KEY
      }).toString()
    });
    const payload = await verifyRes.json().catch(() => ({}));
    const isValid = Boolean(payload?.success);
    if (!verifyRes.ok || !isValid) {
      console.warn("[hCaptcha] validation rejected:", payload?.["error-codes"] || verifyRes.status);
      return res.status(400).json({
        success: false,
        message: "Captcha validation failed."
      });
    }
    return res.json({ success: true, message: "Captcha validated." });
  } catch (error) {
    console.error("[hCaptcha] verification failed:", error);
    return res.status(500).json({ success: false, message: "Captcha verification failed." });
  }
}
app3.post("/api/hcaptcha/verify", async (req, res) => {
  return handler(req, res);
});

// vite.config.js
var __vite_injected_original_dirname = "E:\\New folder\\animevaultofficial.github.io";
var vite_config_default = defineConfig(({ command, mode }) => {
  const isWebOSBuild = !!process.env.WEBOS || mode === "webos" || process.env.npm_lifecycle_event === "webos:package";
  const isElectronBuild = !!process.env.ELECTRON || process.env.npm_lifecycle_event?.startsWith("electron") || command === "build" && (mode === "electron" || !!process.env.npm_package_dependencies_electron);
  const ghPagesBase = process.env.VITE_BASE || process.env.GH_PAGES_BASE || "/";
  const base = command === "serve" ? "/" : isElectronBuild || isWebOSBuild ? "./" : ghPagesBase;
  if (command === "build") console.log(`[Vite] Build base path: "${base}" (electron: ${isElectronBuild}, webos: ${isWebOSBuild})`);
  return {
    plugins: [
      react(),
      {
        name: "animevault-api-dev-middleware",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith("/api/manga")) return manga_default(req, res, next);
            if (req.url?.startsWith("/api/allanime")) return allanime_default(req, res, next);
            if (req.url?.startsWith("/api/hcaptcha")) return handler(req, res, next);
            next();
          });
        }
      }
    ],
    base,
    resolve: { alias: { "@": path.resolve(__vite_injected_original_dirname, "src") } },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          bypass: (req) => {
            if (req.url?.startsWith("/api/manga") || req.url?.startsWith("/api/allanime") || req.url?.startsWith("/api/hcaptcha")) return req.url;
          },
          rewrite: (p) => p.replace(/^\/api/, "/api")
        }
      }
    },
    build: {
      outDir: isWebOSBuild ? "dist-webos" : "dist",
      rollupOptions: { external: isElectronBuild ? ["bcryptjs"] : [] }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL21hbmdhLmpzIiwgImFwaS9hbGxhbmltZS5qcyIsICJhcGkvaGNhcHRjaGEuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovTmV3JTIwZm9sZGVyL2FuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW8vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCBtYW5nYUFwaUFwcCBmcm9tICcuL2FwaS9tYW5nYS5qcyc7XHJcbmltcG9ydCBhbGxBbmltZUFwaUFwcCBmcm9tICcuL2FwaS9hbGxhbmltZS5qcyc7XHJcbmltcG9ydCBoY2FwdGNoYUFwaUFwcCBmcm9tICcuL2FwaS9oY2FwdGNoYS5qcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgaXNXZWJPU0J1aWxkID0gISFwcm9jZXNzLmVudi5XRUJPUyB8fCBtb2RlID09PSAnd2Vib3MnIHx8IHByb2Nlc3MuZW52Lm5wbV9saWZlY3ljbGVfZXZlbnQgPT09ICd3ZWJvczpwYWNrYWdlJztcclxuICBjb25zdCBpc0VsZWN0cm9uQnVpbGQgPSAhIXByb2Nlc3MuZW52LkVMRUNUUk9OIHx8IHByb2Nlc3MuZW52Lm5wbV9saWZlY3ljbGVfZXZlbnQ/LnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJykgfHwgKGNvbW1hbmQgPT09ICdidWlsZCcgJiYgKG1vZGUgPT09ICdlbGVjdHJvbicgfHwgISFwcm9jZXNzLmVudi5ucG1fcGFja2FnZV9kZXBlbmRlbmNpZXNfZWxlY3Ryb24pKTtcclxuICBjb25zdCBnaFBhZ2VzQmFzZSA9IHByb2Nlc3MuZW52LlZJVEVfQkFTRSB8fCBwcm9jZXNzLmVudi5HSF9QQUdFU19CQVNFIHx8ICcvJztcclxuICBjb25zdCBiYXNlID0gY29tbWFuZCA9PT0gJ3NlcnZlJyA/ICcvJyA6IChpc0VsZWN0cm9uQnVpbGQgfHwgaXNXZWJPU0J1aWxkKSA/ICcuLycgOiBnaFBhZ2VzQmFzZTtcclxuICBpZiAoY29tbWFuZCA9PT0gJ2J1aWxkJykgY29uc29sZS5sb2coYFtWaXRlXSBCdWlsZCBiYXNlIHBhdGg6IFwiJHtiYXNlfVwiIChlbGVjdHJvbjogJHtpc0VsZWN0cm9uQnVpbGR9LCB3ZWJvczogJHtpc1dlYk9TQnVpbGR9KWApO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ2FuaW1ldmF1bHQtYXBpLWRldi1taWRkbGV3YXJlJyxcclxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9tYW5nYScpKSByZXR1cm4gbWFuZ2FBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9hbGxhbmltZScpKSByZXR1cm4gYWxsQW5pbWVBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9oY2FwdGNoYScpKSByZXR1cm4gaGNhcHRjaGFBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBiYXNlLFxyXG4gICAgcmVzb2x2ZTogeyBhbGlhczogeyAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSB9IH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogNTE3MyxcclxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICBieXBhc3M6IHJlcSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEudXJsPy5zdGFydHNXaXRoKCcvYXBpL21hbmdhJykgfHwgcmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9hbGxhbmltZScpIHx8IHJlcS51cmw/LnN0YXJ0c1dpdGgoJy9hcGkvaGNhcHRjaGEnKSkgcmV0dXJuIHJlcS51cmw7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgcmV3cml0ZTogcCA9PiBwLnJlcGxhY2UoL15cXC9hcGkvLCAnL2FwaScpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgb3V0RGlyOiBpc1dlYk9TQnVpbGQgPyAnZGlzdC13ZWJvcycgOiAnZGlzdCcsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHsgZXh0ZXJuYWw6IGlzRWxlY3Ryb25CdWlsZCA/IFsnYmNyeXB0anMnXSA6IFtdIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFxhcGlcXFxcbWFuZ2EuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L05ldyUyMGZvbGRlci9hbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvL2FwaS9tYW5nYS5qc1wiOy8vIGFwaS9tYW5nYS5qc1xyXG4vLyBWZXJjZWwgc2VydmVybGVzcyBmdW5jdGlvbiAvIEV4cHJlc3MgQVBJIGhhbmRsZXIgZm9yIE1hbmdhS2FrYWxvdCBBUElcclxuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XHJcbmltcG9ydCBtYW5nYWtha2Fsb3QgZnJvbSAnbWFuZ2FrYWthbG90LWFwaSc7XHJcblxyXG5jb25zdCBBTklMSVNUX0FQSSA9ICdodHRwczovL2dyYXBocWwuYW5pbGlzdC5jbyc7XHJcblxyXG5jb25zdCBhcHAgPSBleHByZXNzKCk7XHJcblxyXG5hcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZScpO1xyXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuZW5kKCk7XHJcbiAgfVxyXG4gIG5leHQoKTtcclxufSk7XHJcblxyXG4vKipcclxuICogU2VydmVyLXNpZGUgQW5pTGlzdCBmYWxsYmFjayBoZWxwZXIgd2hlbiBNYW5nYUtha2Fsb3Qgc2NyYXBlcnMgZ2V0IENsb3VkZmxhcmUgNDAzIGJsb2NrZWRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGZldGNoQW5pTGlzdEZhbGxiYWNrKHNvcnQgPSAnUE9QVUxBUklUWV9ERVNDJywgcGFnZSA9IDEsIHNlYXJjaCA9IG51bGwpIHtcclxuICBjb25zdCBxdWVyeSA9IHNlYXJjaCA/IGBcclxuICAgIHF1ZXJ5ICgkc2VhcmNoOiBTdHJpbmcsICRwYWdlOiBJbnQpIHtcclxuICAgICAgUGFnZShwYWdlOiAkcGFnZSwgcGVyUGFnZTogMjQpIHtcclxuICAgICAgICBwYWdlSW5mbyB7IGhhc05leHRQYWdlIH1cclxuICAgICAgICBtZWRpYShzZWFyY2g6ICRzZWFyY2gsIHR5cGU6IE1BTkdBKSB7XHJcbiAgICAgICAgICBpZFxyXG4gICAgICAgICAgdGl0bGUgeyBlbmdsaXNoIHJvbWFqaSB1c2VyUHJlZmVycmVkIH1cclxuICAgICAgICAgIGNvdmVySW1hZ2UgeyBleHRyYUxhcmdlIGxhcmdlIH1cclxuICAgICAgICAgIGF2ZXJhZ2VTY29yZVxyXG4gICAgICAgICAgc3RhdHVzXHJcbiAgICAgICAgICBjaGFwdGVyc1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIGAgOiBgXHJcbiAgICBxdWVyeSAoJHBhZ2U6IEludCwgJHNvcnQ6IFtNZWRpYVNvcnRdKSB7XHJcbiAgICAgIFBhZ2UocGFnZTogJHBhZ2UsIHBlclBhZ2U6IDI0KSB7XHJcbiAgICAgICAgcGFnZUluZm8geyBoYXNOZXh0UGFnZSB9XHJcbiAgICAgICAgbWVkaWEodHlwZTogTUFOR0EsIHNvcnQ6ICRzb3J0KSB7XHJcbiAgICAgICAgICBpZFxyXG4gICAgICAgICAgdGl0bGUgeyBlbmdsaXNoIHJvbWFqaSB1c2VyUHJlZmVycmVkIH1cclxuICAgICAgICAgIGNvdmVySW1hZ2UgeyBleHRyYUxhcmdlIGxhcmdlIH1cclxuICAgICAgICAgIGF2ZXJhZ2VTY29yZVxyXG4gICAgICAgICAgc3RhdHVzXHJcbiAgICAgICAgICBjaGFwdGVyc1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIGA7XHJcblxyXG4gIGNvbnN0IHZhcmlhYmxlcyA9IHNlYXJjaFxyXG4gICAgPyB7IHNlYXJjaCwgcGFnZTogTnVtYmVyKHBhZ2UpIHx8IDEgfVxyXG4gICAgOiB7IHBhZ2U6IE51bWJlcihwYWdlKSB8fCAxLCBzb3J0OiBbc29ydF0gfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goQU5JTElTVF9BUEksIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSlcclxuICAgIH0pO1xyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIGNvbnN0IG1lZGlhTGlzdCA9IGRhdGE/LmRhdGE/LlBhZ2U/Lm1lZGlhIHx8IFtdO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbWFuZ2FzOiBtZWRpYUxpc3QubWFwKGl0ZW0gPT4gKHtcclxuICAgICAgICBpZDogaXRlbS5pZCxcclxuICAgICAgICB0aXRsZTogaXRlbS50aXRsZT8uZW5nbGlzaCB8fCBpdGVtLnRpdGxlPy5yb21hamkgfHwgaXRlbS50aXRsZT8udXNlclByZWZlcnJlZCB8fCAnTWFuZ2EnLFxyXG4gICAgICAgIGltYWdlOiBpdGVtLmNvdmVySW1hZ2U/LmV4dHJhTGFyZ2UgfHwgaXRlbS5jb3ZlckltYWdlPy5sYXJnZSxcclxuICAgICAgICBwb3N0ZXI6IGl0ZW0uY292ZXJJbWFnZT8ubGFyZ2UsXHJcbiAgICAgICAgbGF0ZXN0Q2hhcHRlcjogaXRlbS5jaGFwdGVycyA/IGBWb2wgLyAke2l0ZW0uY2hhcHRlcnN9IENoYCA6IGl0ZW0uc3RhdHVzIHx8ICdPbmdvaW5nJyxcclxuICAgICAgICB2aWV3czogaXRlbS5hdmVyYWdlU2NvcmUgPyBpdGVtLmF2ZXJhZ2VTY29yZSAqIDEwMCA6IDg1MDBcclxuICAgICAgfSkpLFxyXG4gICAgICBjdXJyZW50UGFnZTogTnVtYmVyKHBhZ2UpIHx8IDEsXHJcbiAgICAgIGhhc05leHRQYWdlOiBkYXRhPy5kYXRhPy5QYWdlPy5wYWdlSW5mbz8uaGFzTmV4dFBhZ2UgfHwgZmFsc2UsXHJcbiAgICAgIHRvdGFsUGFnZXM6IDUwXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmV0dXJuIHsgbWFuZ2FzOiBbXSwgY3VycmVudFBhZ2U6IDEsIGhhc05leHRQYWdlOiBmYWxzZSwgdG90YWxQYWdlczogMSB9O1xyXG4gIH1cclxufVxyXG5cclxuY29uc3Qgcm91dGVyID0gZXhwcmVzcy5Sb3V0ZXIoKTtcclxuXHJcbi8vIEhlbHBlciBmb3IgY2hhcHRlciByZWFkaW5nXHJcbmNvbnN0IGhhbmRsZVJlYWQgPSBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgbWFuZ2FJZCA9IHJlcS5wYXJhbXMubWFuZ2FJZDtcclxuICAgIGNvbnN0IGNoYXB0ZXJJZCA9IHJlcS5wYXJhbXMuY2hhcHRlcklkO1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0Q2hhcHRlckltYWdlcyB8fCBtYW5nYWtha2Fsb3Quc2NyYXBlQ2hhcHRlckltYWdlcztcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihtYW5nYUlkLCBjaGFwdGVySWQpO1xyXG4gICAgaWYgKGRhdGEgJiYgIWRhdGEuZXJyb3IpIHJldHVybiByZXMuanNvbihkYXRhKTtcclxuICAgIHJlcy5qc29uKHsgZXJyb3I6ICdDaGFwdGVyIHVuYXZhaWxhYmxlJywgaW1hZ2VzOiBbXSB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJlcy5qc29uKHsgZXJyb3I6IGBFcnJvciBmZXRjaGluZyBjaGFwdGVyOiAke2Vyci5tZXNzYWdlIHx8IGVycn1gLCBpbWFnZXM6IFtdIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbnJvdXRlci5nZXQoJy9yZWFkLzptYW5nYUlkLzpjaGFwdGVySWQnLCBoYW5kbGVSZWFkKTtcclxucm91dGVyLmdldCgnL3JlYWQvOm1hbmdhSWQnLCBoYW5kbGVSZWFkKTtcclxucm91dGVyLmdldCgnL3JlYWQnLCBoYW5kbGVSZWFkKTtcclxuXHJcbnJvdXRlci5nZXQoJy9kZXRhaWxzLzppZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBmbiA9IG1hbmdha2FrYWxvdC5nZXREZXRhaWxzIHx8IG1hbmdha2FrYWxvdC5zY3JhcGVNYW5nYURldGFpbHM7XHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZm4ocmVxLnBhcmFtcy5pZCk7XHJcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnRpdGxlKSByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgICByZXMuanNvbih7IGVycm9yOiAnRGV0YWlscyB1bmF2YWlsYWJsZScgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICByZXMuanNvbih7IGVycm9yOiBgRXJyb3IgZmV0Y2hpbmcgZGV0YWlsczogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCB9KTtcclxuICB9XHJcbn0pO1xyXG5cclxuY29uc3QgaGFuZGxlU2VhcmNoID0gYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgY29uc3QgcXVlcnkgPSByZXEucGFyYW1zLnF1ZXJ5IHx8ICdhdHRhY2sgb24gdGl0YW4nO1xyXG4gIGNvbnN0IHBhZ2UgPSByZXEucGFyYW1zLnBhZ2UgfHwgMTtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3Quc2VhcmNoIHx8IG1hbmdha2FrYWxvdC5zY3JhcGVNYW5nYVNlYXJjaDtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihxdWVyeSwgcGFnZSk7XHJcbiAgICBpZiAoZGF0YSAmJiAoKGRhdGEubWFuZ2FzICYmIGRhdGEubWFuZ2FzLmxlbmd0aCA+IDApIHx8IChBcnJheS5pc0FycmF5KGRhdGEpICYmIGRhdGEubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgIHJldHVybiByZXMuanNvbihkYXRhKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIC8vIGlnbm9yZSBzY3JhcGVyIGVycm9yLCBwcm9jZWVkIHRvIGZhbGxiYWNrXHJcbiAgfVxyXG4gIGNvbnN0IGZhbGxiYWNrID0gYXdhaXQgZmV0Y2hBbmlMaXN0RmFsbGJhY2sobnVsbCwgcGFnZSwgcXVlcnkpO1xyXG4gIHJlcy5qc29uKGZhbGxiYWNrKTtcclxufTtcclxuXHJcbnJvdXRlci5nZXQoJy9zZWFyY2gvOnF1ZXJ5LzpwYWdlJywgaGFuZGxlU2VhcmNoKTtcclxucm91dGVyLmdldCgnL3NlYXJjaC86cXVlcnknLCBoYW5kbGVTZWFyY2gpO1xyXG5yb3V0ZXIuZ2V0KCcvc2VhcmNoJywgaGFuZGxlU2VhcmNoKTtcclxuXHJcbmNvbnN0IGhhbmRsZUxpc3QgPSAobGlzdEZuTmFtZSwgZGVmYXVsdFNjcmFwZU5hbWUsIGZhbGxiYWNrU29ydCkgPT4gYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgY29uc3QgcGFnZSA9IHJlcS5wYXJhbXMucGFnZSB8fCAxO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBmbiA9IG1hbmdha2FrYWxvdFtsaXN0Rm5OYW1lXSB8fCBtYW5nYWtha2Fsb3RbZGVmYXVsdFNjcmFwZU5hbWVdO1xyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGZuKHBhZ2UpO1xyXG4gICAgaWYgKGRhdGEgJiYgKChkYXRhLm1hbmdhcyAmJiBkYXRhLm1hbmdhcy5sZW5ndGggPiAwKSB8fCAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhLmxlbmd0aCA+IDApKSkge1xyXG4gICAgICByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAvLyBpZ25vcmUgc2NyYXBlciBlcnJvciwgcHJvY2VlZCB0byBmYWxsYmFja1xyXG4gIH1cclxuICBjb25zdCBmYWxsYmFjayA9IGF3YWl0IGZldGNoQW5pTGlzdEZhbGxiYWNrKGZhbGxiYWNrU29ydCwgcGFnZSk7XHJcbiAgcmVzLmpzb24oZmFsbGJhY2spO1xyXG59O1xyXG5cclxucm91dGVyLmdldCgnL2xhdGVzdC86cGFnZScsIGhhbmRsZUxpc3QoJ2dldExhdGVzdCcsICdzY3JhcGVMYXRlc3RNYW5nYXMnLCAnVVBEQVRFRF9BVF9ERVNDJykpO1xyXG5yb3V0ZXIuZ2V0KCcvbGF0ZXN0JywgaGFuZGxlTGlzdCgnZ2V0TGF0ZXN0JywgJ3NjcmFwZUxhdGVzdE1hbmdhcycsICdVUERBVEVEX0FUX0RFU0MnKSk7XHJcblxyXG5yb3V0ZXIuZ2V0KCcvcG9wdWxhci86cGFnZScsIGhhbmRsZUxpc3QoJ2dldFBvcHVsYXInLCAnc2NyYXBlUG9wdWxhck1hbmdhcycsICdQT1BVTEFSSVRZX0RFU0MnKSk7XHJcbnJvdXRlci5nZXQoJy9wb3B1bGFyJywgaGFuZGxlTGlzdCgnZ2V0UG9wdWxhcicsICdzY3JhcGVQb3B1bGFyTWFuZ2FzJywgJ1BPUFVMQVJJVFlfREVTQycpKTtcclxuXHJcbnJvdXRlci5nZXQoJy9uZXdlc3QvOnBhZ2UnLCBoYW5kbGVMaXN0KCdnZXROZXdlc3QnLCAnc2NyYXBlTmV3ZXN0TWFuZ2FzJywgJ1NUQVJUX0RBVEVfREVTQycpKTtcclxucm91dGVyLmdldCgnL25ld2VzdCcsIGhhbmRsZUxpc3QoJ2dldE5ld2VzdCcsICdzY3JhcGVOZXdlc3RNYW5nYXMnLCAnU1RBUlRfREFURV9ERVNDJykpO1xyXG5cclxucm91dGVyLmdldCgnL2NvbXBsZXRlZC86cGFnZScsIGhhbmRsZUxpc3QoJ2dldENvbXBsZXRlZCcsICdzY3JhcGVDb21wbGV0ZWRNYW5nYXMnLCAnRkFWT1VSSVRFU19ERVNDJykpO1xyXG5yb3V0ZXIuZ2V0KCcvY29tcGxldGVkJywgaGFuZGxlTGlzdCgnZ2V0Q29tcGxldGVkJywgJ3NjcmFwZUNvbXBsZXRlZE1hbmdhcycsICdGQVZPVVJJVEVTX0RFU0MnKSk7XHJcblxyXG5yb3V0ZXIuZ2V0KCcvcG9wdWxhci1ub3cnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0UG9wdWxhck5vdyB8fCBtYW5nYWtha2Fsb3Quc2NyYXBlUG9wdWxhck5vd01hbmdhcztcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbigpO1xyXG4gICAgaWYgKGRhdGEgJiYgQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhLmxlbmd0aCA+IDApIHJldHVybiByZXMuanNvbihkYXRhKTtcclxuICB9IGNhdGNoIChlcnIpIHt9XHJcbiAgY29uc3QgZmFsbGJhY2sgPSBhd2FpdCBmZXRjaEFuaUxpc3RGYWxsYmFjaygnUE9QVUxBUklUWV9ERVNDJywgMSk7XHJcbiAgcmVzLmpzb24oZmFsbGJhY2subWFuZ2FzLnNsaWNlKDAsIDEwKSk7XHJcbn0pO1xyXG5cclxucm91dGVyLmdldCgnL2hvbWUnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0SG9tZVBhZ2UgfHwgbWFuZ2FrYWthbG90LnNjcmFwZUhvbWVQYWdlO1xyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGZuKCk7XHJcbiAgICBpZiAoZGF0YSAmJiAoKGRhdGEubWFuZ2FzICYmIGRhdGEubWFuZ2FzLmxlbmd0aCA+IDApIHx8IGRhdGEucG9wdWxhck5vdyB8fCBkYXRhLnBvcHVsYXJTbGlkZXIpKSB7XHJcbiAgICAgIHJldHVybiByZXMuanNvbihkYXRhKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnIpIHt9XHJcbiAgY29uc3QgcG9wdWxhciA9IGF3YWl0IGZldGNoQW5pTGlzdEZhbGxiYWNrKCdQT1BVTEFSSVRZX0RFU0MnLCAxKTtcclxuICBjb25zdCBsYXRlc3QgPSBhd2FpdCBmZXRjaEFuaUxpc3RGYWxsYmFjaygnVVBEQVRFRF9BVF9ERVNDJywgMSk7XHJcbiAgcmVzLmpzb24oe1xyXG4gICAgcG9wdWxhck5vdzogcG9wdWxhci5tYW5nYXMuc2xpY2UoMCwgMTApLFxyXG4gICAgcG9wdWxhclNsaWRlcjogcG9wdWxhci5tYW5nYXMuc2xpY2UoMCwgMTApLFxyXG4gICAgbWFuZ2FzOiBsYXRlc3QubWFuZ2FzXHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuYXBwLnVzZSgnL2FwaS9tYW5nYScsIHJvdXRlcik7XHJcbmFwcC51c2UoJy8nLCByb3V0ZXIpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgYXBwO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFxhcGlcXFxcYWxsYW5pbWUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L05ldyUyMGZvbGRlci9hbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvL2FwaS9hbGxhbmltZS5qc1wiOy8vIGFwaS9hbGxhbmltZS5qc1xyXG4vLyBFeHByZXNzIEFQSSBoYW5kbGVyIC8gVmVyY2VsIHNlcnZlcmxlc3MgcHJveHkgZm9yIEFsbEFuaW1lIEdyYXBoUUwgQVBJXHJcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xyXG5cclxuY29uc3QgQUxMQU5JTUVfR1JBUEhRTF9FTkRQT0lOVCA9ICdodHRwczovL2FwaS5hbGxhbmltZS5kYXkvYXBpJztcclxuXHJcbmNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcclxuYXBwLnVzZShleHByZXNzLmpzb24oKSk7XHJcblxyXG5hcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZScpO1xyXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuZW5kKCk7XHJcbiAgfVxyXG4gIG5leHQoKTtcclxufSk7XHJcblxyXG5jb25zdCByb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xyXG5yb3V0ZXIudXNlKGV4cHJlc3MuanNvbigpKTtcclxuXHJcbmNvbnN0IFJFUVVJUkVEX0hFQURFUlMgPSB7XHJcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAnUmVmZXJlcic6ICdodHRwczovL2FsbG1hbmdhLnRvJyxcclxuICAnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KScsXHJcbn07XHJcblxyXG4vKipcclxuICogRXhlY3V0ZSBHcmFwaFFMIHJlcXVlc3QgYWdhaW5zdCBBbGxBbmltZSBBUElcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVHcmFwaFFMKHF1ZXJ5LCB2YXJpYWJsZXMgPSB7fSkge1xyXG4gIGxldCBhY3RpdmVRdWVyeSA9IHF1ZXJ5IHx8ICcnO1xyXG4gIGlmIChhY3RpdmVRdWVyeS5pbmNsdWRlcygnVHJhbnNsYXRpb25UeXBlIScpICYmICFhY3RpdmVRdWVyeS5pbmNsdWRlcygnVmFpbGRUcmFuc2xhdGlvblR5cGVFbnVtVHlwZSEnKSkge1xyXG4gICAgYWN0aXZlUXVlcnkgPSBhY3RpdmVRdWVyeS5yZXBsYWNlKCdUcmFuc2xhdGlvblR5cGUhJywgJ1ZhaWxkVHJhbnNsYXRpb25UeXBlRW51bVR5cGUhJyk7XHJcbiAgfVxyXG5cclxuICBsZXQgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChBTExBTklNRV9HUkFQSFFMX0VORFBPSU5ULCB7XHJcbiAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgIGhlYWRlcnM6IFJFUVVJUkVEX0hFQURFUlMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5OiBhY3RpdmVRdWVyeSwgdmFyaWFibGVzIH0pLFxyXG4gIH0pO1xyXG5cclxuICBpZiAoIXJlc3BvbnNlLm9rICYmIGFjdGl2ZVF1ZXJ5LmluY2x1ZGVzKCdWYWlsZFRyYW5zbGF0aW9uVHlwZUVudW1UeXBlIScpKSB7XHJcbiAgICBjb25zdCBmYWxsYmFja1F1ZXJ5ID0gYWN0aXZlUXVlcnkucmVwbGFjZSgnVmFpbGRUcmFuc2xhdGlvblR5cGVFbnVtVHlwZSEnLCAnVHJhbnNsYXRpb25UeXBlIScpO1xyXG4gICAgY29uc3QgcmV0cnlSZXMgPSBhd2FpdCBmZXRjaChBTExBTklNRV9HUkFQSFFMX0VORFBPSU5ULCB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBoZWFkZXJzOiBSRVFVSVJFRF9IRUFERVJTLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5OiBmYWxsYmFja1F1ZXJ5LCB2YXJpYWJsZXMgfSksXHJcbiAgICB9KTtcclxuICAgIGlmIChyZXRyeVJlcy5vaykgcmVzcG9uc2UgPSByZXRyeVJlcztcclxuICB9XHJcblxyXG4gIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEFsbEFuaW1lIEdyYXBoUUwgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7ZXJyb3JUZXh0IHx8IHJlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBqc29uID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gIGlmIChqc29uLmVycm9ycyAmJiBqc29uLmVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEFsbEFuaW1lIEdyYXBoUUwgRXJyb3I6ICR7anNvbi5lcnJvcnNbMF0/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gR3JhcGhRTCBlcnJvcid9YCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ganNvbi5kYXRhO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgR2VuZXJpYyBHcmFwaFFMIHByb3h5IGVuZHBvaW50IFx1MjUwMFx1MjUwMFxyXG5yb3V0ZXIucG9zdCgnL2dyYXBocWwnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBxdWVyeSwgdmFyaWFibGVzIH0gPSByZXEuYm9keSB8fCB7fTtcclxuICAgIGlmICghcXVlcnkpIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdRdWVyeSBpcyByZXF1aXJlZC4nIH0pO1xyXG4gICAgfVxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGV4ZWN1dGVHcmFwaFFMKHF1ZXJ5LCB2YXJpYWJsZXMpO1xyXG4gICAgcmVzLmpzb24oeyBkYXRhIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmVzLmpzb24oeyBkYXRhOiBudWxsLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTaG93IElEIExvb2t1cCBlbmRwb2ludCBcdTI1MDBcdTI1MDBcclxucm91dGVyLnBvc3QoJy9zaG93cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IHRpdGxlLCBsaW1pdCA9IDEwLCBwYWdlID0gMSB9ID0gcmVxLmJvZHkgfHwge307XHJcbiAgICBpZiAoIXRpdGxlKSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnVGl0bGUgaXMgcmVxdWlyZWQuJyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBxdWVyeSA9IGBcclxuICAgICAgcXVlcnkgKCRzZWFyY2g6IFNlYXJjaElucHV0LCAkbGltaXQ6IEludCwgJHBhZ2U6IEludCkge1xyXG4gICAgICAgIHNob3dzKHNlYXJjaDogJHNlYXJjaCwgbGltaXQ6ICRsaW1pdCwgcGFnZTogJHBhZ2UpIHtcclxuICAgICAgICAgIGVkZ2VzIHtcclxuICAgICAgICAgICAgX2lkXHJcbiAgICAgICAgICAgIG5hbWVcclxuICAgICAgICAgICAgZW5nbGlzaE5hbWVcclxuICAgICAgICAgICAgYXZhaWxhYmxlRXBpc29kZXNEZXRhaWxcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIGA7XHJcblxyXG4gICAgY29uc3QgdmFyaWFibGVzID0ge1xyXG4gICAgICBzZWFyY2g6IHsgcXVlcnk6IHRpdGxlIH0sXHJcbiAgICAgIGxpbWl0OiBOdW1iZXIobGltaXQpIHx8IDEwLFxyXG4gICAgICBwYWdlOiBOdW1iZXIocGFnZSkgfHwgMSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGV4ZWN1dGVHcmFwaFFMKHF1ZXJ5LCB2YXJpYWJsZXMpO1xyXG4gICAgY29uc3Qgc2hvd3MgPSBkYXRhPy5zaG93cz8uZWRnZXMgfHwgW107XHJcbiAgICByZXMuanNvbih7IHNob3dzIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmVzLmpzb24oeyBzaG93czogW10sIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcclxuICB9XHJcbn0pO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEVwaXNvZGUgU291cmNlIEZldGNoZXIgZW5kcG9pbnQgXHUyNTAwXHUyNTAwXHJcbnJvdXRlci5wb3N0KCcvZXBpc29kZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IHNob3dJZCwgdHJhbnNsYXRpb25UeXBlID0gJ3N1YicsIGVwaXNvZGVTdHJpbmcgPSAnMScgfSA9IHJlcS5ib2R5IHx8IHt9O1xyXG4gICAgaWYgKCFzaG93SWQpIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdzaG93SWQgaXMgcmVxdWlyZWQuJyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBxdWVyeSA9IGBcclxuICAgICAgcXVlcnkgKCRzaG93SWQ6IFN0cmluZyEsICR0cmFuc2xhdGlvblR5cGU6IFZhaWxkVHJhbnNsYXRpb25UeXBlRW51bVR5cGUhLCAkZXBpc29kZVN0cmluZzogU3RyaW5nISkge1xyXG4gICAgICAgIGVwaXNvZGUoc2hvd0lkOiAkc2hvd0lkLCB0cmFuc2xhdGlvblR5cGU6ICR0cmFuc2xhdGlvblR5cGUsIGVwaXNvZGVTdHJpbmc6ICRlcGlzb2RlU3RyaW5nKSB7XHJcbiAgICAgICAgICBzb3VyY2VVcmxzXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBgO1xyXG5cclxuICAgIGNvbnN0IHZhcmlhYmxlcyA9IHtcclxuICAgICAgc2hvd0lkOiBTdHJpbmcoc2hvd0lkKSxcclxuICAgICAgdHJhbnNsYXRpb25UeXBlOiBTdHJpbmcodHJhbnNsYXRpb25UeXBlKS50b0xvd2VyQ2FzZSgpID09PSAnZHViJyA/ICdkdWInIDogJ3N1YicsXHJcbiAgICAgIGVwaXNvZGVTdHJpbmc6IFN0cmluZyhlcGlzb2RlU3RyaW5nKSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGV4ZWN1dGVHcmFwaFFMKHF1ZXJ5LCB2YXJpYWJsZXMpO1xyXG4gICAgY29uc3Qgc291cmNlVXJscyA9IGRhdGE/LmVwaXNvZGU/LnNvdXJjZVVybHMgfHwgW107XHJcbiAgICByZXMuanNvbih7IHNvdXJjZVVybHMgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICByZXMuanNvbih7IHNvdXJjZVVybHM6IFtdLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDbG9jayBVUkwgcmVzb2x2ZXIgcHJveHkgZW5kcG9pbnQgXHUyNTAwXHUyNTAwXHJcbnJvdXRlci5hbGwoJy9jbG9jaycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBsZXQgdGFyZ2V0VXJsID0gcmVxLnF1ZXJ5LnVybCB8fCByZXEuYm9keT8udXJsO1xyXG4gICAgaWYgKCF0YXJnZXRVcmwpIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICd1cmwgcGFyYW1ldGVyIGlzIHJlcXVpcmVkLicgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRhcmdldFVybC5zdGFydHNXaXRoKCcvJykpIHtcclxuICAgICAgdGFyZ2V0VXJsID0gYGh0dHBzOi8vYWxsYW5pbWUuZGF5JHt0YXJnZXRVcmx9YDtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjbG9ja1JlcyA9IGF3YWl0IGZldGNoKHRhcmdldFVybCwge1xyXG4gICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ1JlZmVyZXInOiAnaHR0cHM6Ly9hbGxtYW5nYS50bycsXHJcbiAgICAgICAgJ1VzZXItQWdlbnQnOiAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCknLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFjbG9ja1Jlcy5vaykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENsb2NrIEhUVFAgJHtjbG9ja1Jlcy5zdGF0dXN9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QganNvbiA9IGF3YWl0IGNsb2NrUmVzLmpzb24oKTtcclxuICAgIHJlcy5qc29uKGpzb24pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmFwcC51c2UoJy9hcGkvYWxsYW5pbWUnLCByb3V0ZXIpO1xyXG5hcHAudXNlKCcvJywgcm91dGVyKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFwcDtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXFxcXGhjYXB0Y2hhLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9OZXclMjBmb2xkZXIvYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pby9hcGkvaGNhcHRjaGEuanNcIjtpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcclxuXHJcbmNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcclxuYXBwLnVzZShleHByZXNzLmpzb24oKSk7XHJcblxyXG5jb25zdCBIQ0FQVENIQV9WRVJJRllfVVJMID0gJ2h0dHBzOi8vaGNhcHRjaGEuY29tL3NpdGV2ZXJpZnknO1xyXG5jb25zdCBIQ0FQVENIQV9TRUNSRVRfS0VZID0gcHJvY2Vzcy5lbnYuSENBUFRDSEFfU0VDUkVUX0tFWSB8fCAnJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCByZXMpIHtcclxuICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDUpLmpzb24oeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogJ01ldGhvZCBub3QgYWxsb3dlZC4nIH0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyB0b2tlbiB9ID0gcmVxLmJvZHkgfHwge307XHJcbiAgaWYgKCF0b2tlbikge1xyXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdDYXB0Y2hhIHJlc3BvbnNlIGlzIHJlcXVpcmVkLicgfSk7XHJcbiAgfVxyXG5cclxuICBpZiAoIUhDQVBUQ0hBX1NFQ1JFVF9LRVkpIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnQ2FwdGNoYSBzZWNyZXQgaXMgbm90IGNvbmZpZ3VyZWQuJyB9KTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB2ZXJpZnlSZXMgPSBhd2FpdCBmZXRjaChIQ0FQVENIQV9WRVJJRllfVVJMLCB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyB9LFxyXG4gICAgICBib2R5OiBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcclxuICAgICAgICByZXNwb25zZTogU3RyaW5nKHRva2VuKSxcclxuICAgICAgICBzZWNyZXQ6IEhDQVBUQ0hBX1NFQ1JFVF9LRVksXHJcbiAgICAgIH0pLnRvU3RyaW5nKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgdmVyaWZ5UmVzLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcclxuICAgIGNvbnN0IGlzVmFsaWQgPSBCb29sZWFuKHBheWxvYWQ/LnN1Y2Nlc3MpO1xyXG5cclxuICAgIGlmICghdmVyaWZ5UmVzLm9rIHx8ICFpc1ZhbGlkKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW2hDYXB0Y2hhXSB2YWxpZGF0aW9uIHJlamVjdGVkOicsIHBheWxvYWQ/LlsnZXJyb3ItY29kZXMnXSB8fCB2ZXJpZnlSZXMuc3RhdHVzKTtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBtZXNzYWdlOiAnQ2FwdGNoYSB2YWxpZGF0aW9uIGZhaWxlZC4nLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ2FwdGNoYSB2YWxpZGF0ZWQuJyB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW2hDYXB0Y2hhXSB2ZXJpZmljYXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnQ2FwdGNoYSB2ZXJpZmljYXRpb24gZmFpbGVkLicgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hcHAucG9zdCgnL2FwaS9oY2FwdGNoYS92ZXJpZnknLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICByZXR1cm4gaGFuZGxlcihyZXEsIHJlcyk7XHJcbn0pO1xyXG5cclxuZXhwb3J0IHsgYXBwIH07XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1QsU0FBUyxvQkFBb0I7QUFDclYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTs7O0FDQWpCLE9BQU8sYUFBYTtBQUNwQixPQUFPLGtCQUFrQjtBQUV6QixJQUFNLGNBQWM7QUFFcEIsSUFBTSxNQUFNLFFBQVE7QUFFcEIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDMUIsTUFBSSxVQUFVLCtCQUErQixHQUFHO0FBQ2hELE1BQUksVUFBVSxnQ0FBZ0Msb0JBQW9CO0FBQ2xFLE1BQUksVUFBVSxnQ0FBZ0MsY0FBYztBQUM1RCxNQUFJLElBQUksV0FBVyxXQUFXO0FBQzVCLFdBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxJQUFJO0FBQUEsRUFDN0I7QUFDQSxPQUFLO0FBQ1AsQ0FBQztBQUtELGVBQWUscUJBQXFCLE9BQU8sbUJBQW1CLE9BQU8sR0FBRyxTQUFTLE1BQU07QUFDckYsUUFBTSxRQUFRLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BY25CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQWdCSixRQUFNLFlBQVksU0FDZCxFQUFFLFFBQVEsTUFBTSxPQUFPLElBQUksS0FBSyxFQUFFLElBQ2xDLEVBQUUsTUFBTSxPQUFPLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUU7QUFFNUMsTUFBSTtBQUNGLFVBQU0sV0FBVyxNQUFNLE1BQU0sYUFBYTtBQUFBLE1BQ3hDLFFBQVE7QUFBQSxNQUNSLFNBQVMsRUFBRSxnQkFBZ0Isb0JBQW9CLFVBQVUsbUJBQW1CO0FBQUEsTUFDNUUsTUFBTSxLQUFLLFVBQVUsRUFBRSxPQUFPLFVBQVUsQ0FBQztBQUFBLElBQzNDLENBQUM7QUFDRCxVQUFNLE9BQU8sTUFBTSxTQUFTLEtBQUs7QUFDakMsVUFBTSxZQUFZLE1BQU0sTUFBTSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxXQUFPO0FBQUEsTUFDTCxRQUFRLFVBQVUsSUFBSSxXQUFTO0FBQUEsUUFDN0IsSUFBSSxLQUFLO0FBQUEsUUFDVCxPQUFPLEtBQUssT0FBTyxXQUFXLEtBQUssT0FBTyxVQUFVLEtBQUssT0FBTyxpQkFBaUI7QUFBQSxRQUNqRixPQUFPLEtBQUssWUFBWSxjQUFjLEtBQUssWUFBWTtBQUFBLFFBQ3ZELFFBQVEsS0FBSyxZQUFZO0FBQUEsUUFDekIsZUFBZSxLQUFLLFdBQVcsU0FBUyxLQUFLLFFBQVEsUUFBUSxLQUFLLFVBQVU7QUFBQSxRQUM1RSxPQUFPLEtBQUssZUFBZSxLQUFLLGVBQWUsTUFBTTtBQUFBLE1BQ3ZELEVBQUU7QUFBQSxNQUNGLGFBQWEsT0FBTyxJQUFJLEtBQUs7QUFBQSxNQUM3QixhQUFhLE1BQU0sTUFBTSxNQUFNLFVBQVUsZUFBZTtBQUFBLE1BQ3hELFlBQVk7QUFBQSxJQUNkO0FBQUEsRUFDRixTQUFTLEtBQUs7QUFDWixXQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsYUFBYSxHQUFHLGFBQWEsT0FBTyxZQUFZLEVBQUU7QUFBQSxFQUN6RTtBQUNGO0FBRUEsSUFBTSxTQUFTLFFBQVEsT0FBTztBQUc5QixJQUFNLGFBQWEsT0FBTyxLQUFLLFFBQVE7QUFDckMsTUFBSTtBQUNGLFVBQU0sVUFBVSxJQUFJLE9BQU87QUFDM0IsVUFBTSxZQUFZLElBQUksT0FBTztBQUM3QixVQUFNLEtBQUssYUFBYSxvQkFBb0IsYUFBYTtBQUN6RCxVQUFNLE9BQU8sTUFBTSxHQUFHLFNBQVMsU0FBUztBQUN4QyxRQUFJLFFBQVEsQ0FBQyxLQUFLLE1BQU8sUUFBTyxJQUFJLEtBQUssSUFBSTtBQUM3QyxRQUFJLEtBQUssRUFBRSxPQUFPLHVCQUF1QixRQUFRLENBQUMsRUFBRSxDQUFDO0FBQUEsRUFDdkQsU0FBUyxLQUFLO0FBQ1osUUFBSSxLQUFLLEVBQUUsT0FBTywyQkFBMkIsSUFBSSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDO0FBQUEsRUFDakY7QUFDRjtBQUVBLE9BQU8sSUFBSSw2QkFBNkIsVUFBVTtBQUNsRCxPQUFPLElBQUksa0JBQWtCLFVBQVU7QUFDdkMsT0FBTyxJQUFJLFNBQVMsVUFBVTtBQUU5QixPQUFPLElBQUksZ0JBQWdCLE9BQU8sS0FBSyxRQUFRO0FBQzdDLE1BQUk7QUFDRixVQUFNLEtBQUssYUFBYSxjQUFjLGFBQWE7QUFDbkQsVUFBTSxPQUFPLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtBQUNuQyxRQUFJLFFBQVEsS0FBSyxNQUFPLFFBQU8sSUFBSSxLQUFLLElBQUk7QUFDNUMsUUFBSSxLQUFLLEVBQUUsT0FBTyxzQkFBc0IsQ0FBQztBQUFBLEVBQzNDLFNBQVMsS0FBSztBQUNaLFFBQUksS0FBSyxFQUFFLE9BQU8sMkJBQTJCLElBQUksV0FBVyxHQUFHLEdBQUcsQ0FBQztBQUFBLEVBQ3JFO0FBQ0YsQ0FBQztBQUVELElBQU0sZUFBZSxPQUFPLEtBQUssUUFBUTtBQUN2QyxRQUFNLFFBQVEsSUFBSSxPQUFPLFNBQVM7QUFDbEMsUUFBTSxPQUFPLElBQUksT0FBTyxRQUFRO0FBQ2hDLE1BQUk7QUFDRixVQUFNLEtBQUssYUFBYSxVQUFVLGFBQWE7QUFDL0MsVUFBTSxPQUFPLE1BQU0sR0FBRyxPQUFPLElBQUk7QUFDakMsUUFBSSxTQUFVLEtBQUssVUFBVSxLQUFLLE9BQU8sU0FBUyxLQUFPLE1BQU0sUUFBUSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUs7QUFDakcsYUFBTyxJQUFJLEtBQUssSUFBSTtBQUFBLElBQ3RCO0FBQUEsRUFDRixTQUFTLEtBQUs7QUFBQSxFQUVkO0FBQ0EsUUFBTSxXQUFXLE1BQU0scUJBQXFCLE1BQU0sTUFBTSxLQUFLO0FBQzdELE1BQUksS0FBSyxRQUFRO0FBQ25CO0FBRUEsT0FBTyxJQUFJLHdCQUF3QixZQUFZO0FBQy9DLE9BQU8sSUFBSSxrQkFBa0IsWUFBWTtBQUN6QyxPQUFPLElBQUksV0FBVyxZQUFZO0FBRWxDLElBQU0sYUFBYSxDQUFDLFlBQVksbUJBQW1CLGlCQUFpQixPQUFPLEtBQUssUUFBUTtBQUN0RixRQUFNLE9BQU8sSUFBSSxPQUFPLFFBQVE7QUFDaEMsTUFBSTtBQUNGLFVBQU0sS0FBSyxhQUFhLFVBQVUsS0FBSyxhQUFhLGlCQUFpQjtBQUNyRSxVQUFNLE9BQU8sTUFBTSxHQUFHLElBQUk7QUFDMUIsUUFBSSxTQUFVLEtBQUssVUFBVSxLQUFLLE9BQU8sU0FBUyxLQUFPLE1BQU0sUUFBUSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUs7QUFDakcsYUFBTyxJQUFJLEtBQUssSUFBSTtBQUFBLElBQ3RCO0FBQUEsRUFDRixTQUFTLEtBQUs7QUFBQSxFQUVkO0FBQ0EsUUFBTSxXQUFXLE1BQU0scUJBQXFCLGNBQWMsSUFBSTtBQUM5RCxNQUFJLEtBQUssUUFBUTtBQUNuQjtBQUVBLE9BQU8sSUFBSSxpQkFBaUIsV0FBVyxhQUFhLHNCQUFzQixpQkFBaUIsQ0FBQztBQUM1RixPQUFPLElBQUksV0FBVyxXQUFXLGFBQWEsc0JBQXNCLGlCQUFpQixDQUFDO0FBRXRGLE9BQU8sSUFBSSxrQkFBa0IsV0FBVyxjQUFjLHVCQUF1QixpQkFBaUIsQ0FBQztBQUMvRixPQUFPLElBQUksWUFBWSxXQUFXLGNBQWMsdUJBQXVCLGlCQUFpQixDQUFDO0FBRXpGLE9BQU8sSUFBSSxpQkFBaUIsV0FBVyxhQUFhLHNCQUFzQixpQkFBaUIsQ0FBQztBQUM1RixPQUFPLElBQUksV0FBVyxXQUFXLGFBQWEsc0JBQXNCLGlCQUFpQixDQUFDO0FBRXRGLE9BQU8sSUFBSSxvQkFBb0IsV0FBVyxnQkFBZ0IseUJBQXlCLGlCQUFpQixDQUFDO0FBQ3JHLE9BQU8sSUFBSSxjQUFjLFdBQVcsZ0JBQWdCLHlCQUF5QixpQkFBaUIsQ0FBQztBQUUvRixPQUFPLElBQUksZ0JBQWdCLE9BQU8sS0FBSyxRQUFRO0FBQzdDLE1BQUk7QUFDRixVQUFNLEtBQUssYUFBYSxpQkFBaUIsYUFBYTtBQUN0RCxVQUFNLE9BQU8sTUFBTSxHQUFHO0FBQ3RCLFFBQUksUUFBUSxNQUFNLFFBQVEsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFHLFFBQU8sSUFBSSxLQUFLLElBQUk7QUFBQSxFQUMxRSxTQUFTLEtBQUs7QUFBQSxFQUFDO0FBQ2YsUUFBTSxXQUFXLE1BQU0scUJBQXFCLG1CQUFtQixDQUFDO0FBQ2hFLE1BQUksS0FBSyxTQUFTLE9BQU8sTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUN2QyxDQUFDO0FBRUQsT0FBTyxJQUFJLFNBQVMsT0FBTyxLQUFLLFFBQVE7QUFDdEMsTUFBSTtBQUNGLFVBQU0sS0FBSyxhQUFhLGVBQWUsYUFBYTtBQUNwRCxVQUFNLE9BQU8sTUFBTSxHQUFHO0FBQ3RCLFFBQUksU0FBVSxLQUFLLFVBQVUsS0FBSyxPQUFPLFNBQVMsS0FBTSxLQUFLLGNBQWMsS0FBSyxnQkFBZ0I7QUFDOUYsYUFBTyxJQUFJLEtBQUssSUFBSTtBQUFBLElBQ3RCO0FBQUEsRUFDRixTQUFTLEtBQUs7QUFBQSxFQUFDO0FBQ2YsUUFBTSxVQUFVLE1BQU0scUJBQXFCLG1CQUFtQixDQUFDO0FBQy9ELFFBQU0sU0FBUyxNQUFNLHFCQUFxQixtQkFBbUIsQ0FBQztBQUM5RCxNQUFJLEtBQUs7QUFBQSxJQUNQLFlBQVksUUFBUSxPQUFPLE1BQU0sR0FBRyxFQUFFO0FBQUEsSUFDdEMsZUFBZSxRQUFRLE9BQU8sTUFBTSxHQUFHLEVBQUU7QUFBQSxJQUN6QyxRQUFRLE9BQU87QUFBQSxFQUNqQixDQUFDO0FBQ0gsQ0FBQztBQUVELElBQUksSUFBSSxjQUFjLE1BQU07QUFDNUIsSUFBSSxJQUFJLEtBQUssTUFBTTtBQUVuQixJQUFPLGdCQUFROzs7QUM3TGYsT0FBT0EsY0FBYTtBQUVwQixJQUFNLDRCQUE0QjtBQUVsQyxJQUFNQyxPQUFNQyxTQUFRO0FBQ3BCRCxLQUFJLElBQUlDLFNBQVEsS0FBSyxDQUFDO0FBRXRCRCxLQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUMxQixNQUFJLFVBQVUsK0JBQStCLEdBQUc7QUFDaEQsTUFBSSxVQUFVLGdDQUFnQyxvQkFBb0I7QUFDbEUsTUFBSSxVQUFVLGdDQUFnQyxjQUFjO0FBQzVELE1BQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsV0FBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLElBQUk7QUFBQSxFQUM3QjtBQUNBLE9BQUs7QUFDUCxDQUFDO0FBRUQsSUFBTUUsVUFBU0QsU0FBUSxPQUFPO0FBQzlCQyxRQUFPLElBQUlELFNBQVEsS0FBSyxDQUFDO0FBRXpCLElBQU0sbUJBQW1CO0FBQUEsRUFDdkIsZ0JBQWdCO0FBQUEsRUFDaEIsV0FBVztBQUFBLEVBQ1gsY0FBYztBQUNoQjtBQUtBLGVBQWUsZUFBZSxPQUFPLFlBQVksQ0FBQyxHQUFHO0FBQ25ELE1BQUksY0FBYyxTQUFTO0FBQzNCLE1BQUksWUFBWSxTQUFTLGtCQUFrQixLQUFLLENBQUMsWUFBWSxTQUFTLCtCQUErQixHQUFHO0FBQ3RHLGtCQUFjLFlBQVksUUFBUSxvQkFBb0IsK0JBQStCO0FBQUEsRUFDdkY7QUFFQSxNQUFJLFdBQVcsTUFBTSxNQUFNLDJCQUEyQjtBQUFBLElBQ3BELFFBQVE7QUFBQSxJQUNSLFNBQVM7QUFBQSxJQUNULE1BQU0sS0FBSyxVQUFVLEVBQUUsT0FBTyxhQUFhLFVBQVUsQ0FBQztBQUFBLEVBQ3hELENBQUM7QUFFRCxNQUFJLENBQUMsU0FBUyxNQUFNLFlBQVksU0FBUywrQkFBK0IsR0FBRztBQUN6RSxVQUFNLGdCQUFnQixZQUFZLFFBQVEsaUNBQWlDLGtCQUFrQjtBQUM3RixVQUFNLFdBQVcsTUFBTSxNQUFNLDJCQUEyQjtBQUFBLE1BQ3RELFFBQVE7QUFBQSxNQUNSLFNBQVM7QUFBQSxNQUNULE1BQU0sS0FBSyxVQUFVLEVBQUUsT0FBTyxlQUFlLFVBQVUsQ0FBQztBQUFBLElBQzFELENBQUM7QUFDRCxRQUFJLFNBQVMsR0FBSSxZQUFXO0FBQUEsRUFDOUI7QUFFQSxNQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLFVBQU0sWUFBWSxNQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQ3RELFVBQU0sSUFBSSxNQUFNLHlCQUF5QixTQUFTLE1BQU0sS0FBSyxhQUFhLFNBQVMsVUFBVSxFQUFFO0FBQUEsRUFDakc7QUFFQSxRQUFNLE9BQU8sTUFBTSxTQUFTLEtBQUs7QUFDakMsTUFBSSxLQUFLLFVBQVUsS0FBSyxPQUFPLFNBQVMsR0FBRztBQUN6QyxVQUFNLElBQUksTUFBTSwyQkFBMkIsS0FBSyxPQUFPLENBQUMsR0FBRyxXQUFXLHVCQUF1QixFQUFFO0FBQUEsRUFDakc7QUFFQSxTQUFPLEtBQUs7QUFDZDtBQUdBQyxRQUFPLEtBQUssWUFBWSxPQUFPLEtBQUssUUFBUTtBQUMxQyxNQUFJO0FBQ0YsVUFBTSxFQUFFLE9BQU8sVUFBVSxJQUFJLElBQUksUUFBUSxDQUFDO0FBQzFDLFFBQUksQ0FBQyxPQUFPO0FBQ1YsYUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHFCQUFxQixDQUFDO0FBQUEsSUFDN0Q7QUFDQSxVQUFNLE9BQU8sTUFBTSxlQUFlLE9BQU8sU0FBUztBQUNsRCxRQUFJLEtBQUssRUFBRSxLQUFLLENBQUM7QUFBQSxFQUNuQixTQUFTLEtBQUs7QUFDWixRQUFJLEtBQUssRUFBRSxNQUFNLE1BQU0sT0FBTyxJQUFJLFFBQVEsQ0FBQztBQUFBLEVBQzdDO0FBQ0YsQ0FBQztBQUdEQSxRQUFPLEtBQUssVUFBVSxPQUFPLEtBQUssUUFBUTtBQUN4QyxNQUFJO0FBQ0YsVUFBTSxFQUFFLE9BQU8sUUFBUSxJQUFJLE9BQU8sRUFBRSxJQUFJLElBQUksUUFBUSxDQUFDO0FBQ3JELFFBQUksQ0FBQyxPQUFPO0FBQ1YsYUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHFCQUFxQixDQUFDO0FBQUEsSUFDN0Q7QUFFQSxVQUFNLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBYWQsVUFBTSxZQUFZO0FBQUEsTUFDaEIsUUFBUSxFQUFFLE9BQU8sTUFBTTtBQUFBLE1BQ3ZCLE9BQU8sT0FBTyxLQUFLLEtBQUs7QUFBQSxNQUN4QixNQUFNLE9BQU8sSUFBSSxLQUFLO0FBQUEsSUFDeEI7QUFFQSxVQUFNLE9BQU8sTUFBTSxlQUFlLE9BQU8sU0FBUztBQUNsRCxVQUFNLFFBQVEsTUFBTSxPQUFPLFNBQVMsQ0FBQztBQUNyQyxRQUFJLEtBQUssRUFBRSxNQUFNLENBQUM7QUFBQSxFQUNwQixTQUFTLEtBQUs7QUFDWixRQUFJLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxPQUFPLElBQUksUUFBUSxDQUFDO0FBQUEsRUFDNUM7QUFDRixDQUFDO0FBR0RBLFFBQU8sS0FBSyxZQUFZLE9BQU8sS0FBSyxRQUFRO0FBQzFDLE1BQUk7QUFDRixVQUFNLEVBQUUsUUFBUSxrQkFBa0IsT0FBTyxnQkFBZ0IsSUFBSSxJQUFJLElBQUksUUFBUSxDQUFDO0FBQzlFLFFBQUksQ0FBQyxRQUFRO0FBQ1gsYUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHNCQUFzQixDQUFDO0FBQUEsSUFDOUQ7QUFFQSxVQUFNLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRZCxVQUFNLFlBQVk7QUFBQSxNQUNoQixRQUFRLE9BQU8sTUFBTTtBQUFBLE1BQ3JCLGlCQUFpQixPQUFPLGVBQWUsRUFBRSxZQUFZLE1BQU0sUUFBUSxRQUFRO0FBQUEsTUFDM0UsZUFBZSxPQUFPLGFBQWE7QUFBQSxJQUNyQztBQUVBLFVBQU0sT0FBTyxNQUFNLGVBQWUsT0FBTyxTQUFTO0FBQ2xELFVBQU0sYUFBYSxNQUFNLFNBQVMsY0FBYyxDQUFDO0FBQ2pELFFBQUksS0FBSyxFQUFFLFdBQVcsQ0FBQztBQUFBLEVBQ3pCLFNBQVMsS0FBSztBQUNaLFFBQUksS0FBSyxFQUFFLFlBQVksQ0FBQyxHQUFHLE9BQU8sSUFBSSxRQUFRLENBQUM7QUFBQSxFQUNqRDtBQUNGLENBQUM7QUFHREEsUUFBTyxJQUFJLFVBQVUsT0FBTyxLQUFLLFFBQVE7QUFDdkMsTUFBSTtBQUNGLFFBQUksWUFBWSxJQUFJLE1BQU0sT0FBTyxJQUFJLE1BQU07QUFDM0MsUUFBSSxDQUFDLFdBQVc7QUFDZCxhQUFPLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sNkJBQTZCLENBQUM7QUFBQSxJQUNyRTtBQUVBLFFBQUksVUFBVSxXQUFXLEdBQUcsR0FBRztBQUM3QixrQkFBWSx1QkFBdUIsU0FBUztBQUFBLElBQzlDO0FBRUEsVUFBTSxXQUFXLE1BQU0sTUFBTSxXQUFXO0FBQUEsTUFDdEMsUUFBUTtBQUFBLE1BQ1IsU0FBUztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRixDQUFDO0FBRUQsUUFBSSxDQUFDLFNBQVMsSUFBSTtBQUNoQixZQUFNLElBQUksTUFBTSxjQUFjLFNBQVMsTUFBTSxFQUFFO0FBQUEsSUFDakQ7QUFFQSxVQUFNLE9BQU8sTUFBTSxTQUFTLEtBQUs7QUFDakMsUUFBSSxLQUFLLElBQUk7QUFBQSxFQUNmLFNBQVMsS0FBSztBQUNaLFFBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sSUFBSSxRQUFRLENBQUM7QUFBQSxFQUM3QztBQUNGLENBQUM7QUFFREYsS0FBSSxJQUFJLGlCQUFpQkUsT0FBTTtBQUMvQkYsS0FBSSxJQUFJLEtBQUtFLE9BQU07QUFFbkIsSUFBTyxtQkFBUUY7OztBQ25MaVQsT0FBT0csY0FBYTtBQUVwVixJQUFNQyxPQUFNQyxTQUFRO0FBQ3BCRCxLQUFJLElBQUlDLFNBQVEsS0FBSyxDQUFDO0FBRXRCLElBQU0sc0JBQXNCO0FBQzVCLElBQU0sc0JBQXNCLFFBQVEsSUFBSSx1QkFBdUI7QUFFL0QsZUFBTyxRQUErQixLQUFLLEtBQUs7QUFDOUMsTUFBSSxJQUFJLFdBQVcsUUFBUTtBQUN6QixXQUFPLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLFNBQVMsT0FBTyxTQUFTLHNCQUFzQixDQUFDO0FBQUEsRUFDaEY7QUFFQSxRQUFNLEVBQUUsTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDO0FBQy9CLE1BQUksQ0FBQyxPQUFPO0FBQ1YsV0FBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLE9BQU8sU0FBUyxnQ0FBZ0MsQ0FBQztBQUFBLEVBQzFGO0FBRUEsTUFBSSxDQUFDLHFCQUFxQjtBQUN4QixXQUFPLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLFNBQVMsT0FBTyxTQUFTLG9DQUFvQyxDQUFDO0FBQUEsRUFDOUY7QUFFQSxNQUFJO0FBQ0YsVUFBTSxZQUFZLE1BQU0sTUFBTSxxQkFBcUI7QUFBQSxNQUNqRCxRQUFRO0FBQUEsTUFDUixTQUFTLEVBQUUsZ0JBQWdCLG9DQUFvQztBQUFBLE1BQy9ELE1BQU0sSUFBSSxnQkFBZ0I7QUFBQSxRQUN4QixVQUFVLE9BQU8sS0FBSztBQUFBLFFBQ3RCLFFBQVE7QUFBQSxNQUNWLENBQUMsRUFBRSxTQUFTO0FBQUEsSUFDZCxDQUFDO0FBRUQsVUFBTSxVQUFVLE1BQU0sVUFBVSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUMsRUFBRTtBQUN2RCxVQUFNLFVBQVUsUUFBUSxTQUFTLE9BQU87QUFFeEMsUUFBSSxDQUFDLFVBQVUsTUFBTSxDQUFDLFNBQVM7QUFDN0IsY0FBUSxLQUFLLG1DQUFtQyxVQUFVLGFBQWEsS0FBSyxVQUFVLE1BQU07QUFDNUYsYUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUs7QUFBQSxRQUMxQixTQUFTO0FBQUEsUUFDVCxTQUFTO0FBQUEsTUFDWCxDQUFDO0FBQUEsSUFDSDtBQUVBLFdBQU8sSUFBSSxLQUFLLEVBQUUsU0FBUyxNQUFNLFNBQVMscUJBQXFCLENBQUM7QUFBQSxFQUNsRSxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sbUNBQW1DLEtBQUs7QUFDdEQsV0FBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLE9BQU8sU0FBUywrQkFBK0IsQ0FBQztBQUFBLEVBQ3pGO0FBQ0Y7QUFFQUQsS0FBSSxLQUFLLHdCQUF3QixPQUFPLEtBQUssUUFBUTtBQUNuRCxTQUFPLFFBQVEsS0FBSyxHQUFHO0FBQ3pCLENBQUM7OztBSHBERCxJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsS0FBSyxNQUFNO0FBQ2pELFFBQU0sZUFBZSxDQUFDLENBQUMsUUFBUSxJQUFJLFNBQVMsU0FBUyxXQUFXLFFBQVEsSUFBSSx3QkFBd0I7QUFDcEcsUUFBTSxrQkFBa0IsQ0FBQyxDQUFDLFFBQVEsSUFBSSxZQUFZLFFBQVEsSUFBSSxxQkFBcUIsV0FBVyxVQUFVLEtBQU0sWUFBWSxZQUFZLFNBQVMsY0FBYyxDQUFDLENBQUMsUUFBUSxJQUFJO0FBQzNLLFFBQU0sY0FBYyxRQUFRLElBQUksYUFBYSxRQUFRLElBQUksaUJBQWlCO0FBQzFFLFFBQU0sT0FBTyxZQUFZLFVBQVUsTUFBTyxtQkFBbUIsZUFBZ0IsT0FBTztBQUNwRixNQUFJLFlBQVksUUFBUyxTQUFRLElBQUksNEJBQTRCLElBQUksZ0JBQWdCLGVBQWUsWUFBWSxZQUFZLEdBQUc7QUFFL0gsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ047QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGlCQUFPLFlBQVksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQ3pDLGdCQUFJLElBQUksS0FBSyxXQUFXLFlBQVksRUFBRyxRQUFPLGNBQVksS0FBSyxLQUFLLElBQUk7QUFDeEUsZ0JBQUksSUFBSSxLQUFLLFdBQVcsZUFBZSxFQUFHLFFBQU8saUJBQWUsS0FBSyxLQUFLLElBQUk7QUFDOUUsZ0JBQUksSUFBSSxLQUFLLFdBQVcsZUFBZSxFQUFHLFFBQU8sUUFBZSxLQUFLLEtBQUssSUFBSTtBQUM5RSxpQkFBSztBQUFBLFVBQ1AsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxJQUNBLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSyxFQUFFLEVBQUU7QUFBQSxJQUMxRCxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRLFNBQU87QUFDYixnQkFBSSxJQUFJLEtBQUssV0FBVyxZQUFZLEtBQUssSUFBSSxLQUFLLFdBQVcsZUFBZSxLQUFLLElBQUksS0FBSyxXQUFXLGVBQWUsRUFBRyxRQUFPLElBQUk7QUFBQSxVQUNwSTtBQUFBLFVBQ0EsU0FBUyxPQUFLLEVBQUUsUUFBUSxVQUFVLE1BQU07QUFBQSxRQUMxQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRLGVBQWUsZUFBZTtBQUFBLE1BQ3RDLGVBQWUsRUFBRSxVQUFVLGtCQUFrQixDQUFDLFVBQVUsSUFBSSxDQUFDLEVBQUU7QUFBQSxJQUNqRTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJleHByZXNzIiwgImFwcCIsICJleHByZXNzIiwgInJvdXRlciIsICJleHByZXNzIiwgImFwcCIsICJleHByZXNzIl0KfQo=
