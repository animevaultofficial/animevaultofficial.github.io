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
    },
    test: {
      environment: "jsdom",
      globals: true,
      css: true
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL21hbmdhLmpzIiwgImFwaS9hbGxhbmltZS5qcyIsICJhcGkvaGNhcHRjaGEuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXE5ldyBmb2xkZXJcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovTmV3JTIwZm9sZGVyL2FuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW8vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCBtYW5nYUFwaUFwcCBmcm9tICcuL2FwaS9tYW5nYS5qcyc7XHJcbmltcG9ydCBhbGxBbmltZUFwaUFwcCBmcm9tICcuL2FwaS9hbGxhbmltZS5qcyc7XHJcbmltcG9ydCBoY2FwdGNoYUFwaUFwcCBmcm9tICcuL2FwaS9oY2FwdGNoYS5qcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgaXNXZWJPU0J1aWxkID0gISFwcm9jZXNzLmVudi5XRUJPUyB8fCBtb2RlID09PSAnd2Vib3MnIHx8IHByb2Nlc3MuZW52Lm5wbV9saWZlY3ljbGVfZXZlbnQgPT09ICd3ZWJvczpwYWNrYWdlJztcclxuICBjb25zdCBpc0VsZWN0cm9uQnVpbGQgPSAhIXByb2Nlc3MuZW52LkVMRUNUUk9OIHx8IHByb2Nlc3MuZW52Lm5wbV9saWZlY3ljbGVfZXZlbnQ/LnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJykgfHwgKGNvbW1hbmQgPT09ICdidWlsZCcgJiYgKG1vZGUgPT09ICdlbGVjdHJvbicgfHwgISFwcm9jZXNzLmVudi5ucG1fcGFja2FnZV9kZXBlbmRlbmNpZXNfZWxlY3Ryb24pKTtcclxuICBjb25zdCBnaFBhZ2VzQmFzZSA9IHByb2Nlc3MuZW52LlZJVEVfQkFTRSB8fCBwcm9jZXNzLmVudi5HSF9QQUdFU19CQVNFIHx8ICcvJztcclxuICBjb25zdCBiYXNlID0gY29tbWFuZCA9PT0gJ3NlcnZlJyA/ICcvJyA6IChpc0VsZWN0cm9uQnVpbGQgfHwgaXNXZWJPU0J1aWxkKSA/ICcuLycgOiBnaFBhZ2VzQmFzZTtcclxuICBpZiAoY29tbWFuZCA9PT0gJ2J1aWxkJykgY29uc29sZS5sb2coYFtWaXRlXSBCdWlsZCBiYXNlIHBhdGg6IFwiJHtiYXNlfVwiIChlbGVjdHJvbjogJHtpc0VsZWN0cm9uQnVpbGR9LCB3ZWJvczogJHtpc1dlYk9TQnVpbGR9KWApO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICB7XHJcbiAgICAgICAgbmFtZTogJ2FuaW1ldmF1bHQtYXBpLWRldi1taWRkbGV3YXJlJyxcclxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9tYW5nYScpKSByZXR1cm4gbWFuZ2FBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9hbGxhbmltZScpKSByZXR1cm4gYWxsQW5pbWVBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9oY2FwdGNoYScpKSByZXR1cm4gaGNhcHRjaGFBcGlBcHAocmVxLCByZXMsIG5leHQpO1xyXG4gICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBiYXNlLFxyXG4gICAgcmVzb2x2ZTogeyBhbGlhczogeyAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSB9IH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogNTE3MyxcclxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXHJcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICBieXBhc3M6IHJlcSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEudXJsPy5zdGFydHNXaXRoKCcvYXBpL21hbmdhJykgfHwgcmVxLnVybD8uc3RhcnRzV2l0aCgnL2FwaS9hbGxhbmltZScpIHx8IHJlcS51cmw/LnN0YXJ0c1dpdGgoJy9hcGkvaGNhcHRjaGEnKSkgcmV0dXJuIHJlcS51cmw7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgcmV3cml0ZTogcCA9PiBwLnJlcGxhY2UoL15cXC9hcGkvLCAnL2FwaScpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgb3V0RGlyOiBpc1dlYk9TQnVpbGQgPyAnZGlzdC13ZWJvcycgOiAnZGlzdCcsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHsgZXh0ZXJuYWw6IGlzRWxlY3Ryb25CdWlsZCA/IFsnYmNyeXB0anMnXSA6IFtdIH0sXHJcbiAgICB9LFxyXG4gICAgdGVzdDoge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgICAgY3NzOiB0cnVlLFxyXG4gICAgfSxcclxuICB9O1xyXG59KTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXFxcXG1hbmdhLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9OZXclMjBmb2xkZXIvYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pby9hcGkvbWFuZ2EuanNcIjsvLyBhcGkvbWFuZ2EuanNcclxuLy8gVmVyY2VsIHNlcnZlcmxlc3MgZnVuY3Rpb24gLyBFeHByZXNzIEFQSSBoYW5kbGVyIGZvciBNYW5nYUtha2Fsb3QgQVBJXHJcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xyXG5pbXBvcnQgbWFuZ2FrYWthbG90IGZyb20gJ21hbmdha2FrYWxvdC1hcGknO1xyXG5cclxuY29uc3QgQU5JTElTVF9BUEkgPSAnaHR0cHM6Ly9ncmFwaHFsLmFuaWxpc3QuY28nO1xyXG5cclxuY29uc3QgYXBwID0gZXhwcmVzcygpO1xyXG5cclxuYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUnKTtcclxuICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmVuZCgpO1xyXG4gIH1cclxuICBuZXh0KCk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFNlcnZlci1zaWRlIEFuaUxpc3QgZmFsbGJhY2sgaGVscGVyIHdoZW4gTWFuZ2FLYWthbG90IHNjcmFwZXJzIGdldCBDbG91ZGZsYXJlIDQwMyBibG9ja2VkXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBmZXRjaEFuaUxpc3RGYWxsYmFjayhzb3J0ID0gJ1BPUFVMQVJJVFlfREVTQycsIHBhZ2UgPSAxLCBzZWFyY2ggPSBudWxsKSB7XHJcbiAgY29uc3QgcXVlcnkgPSBzZWFyY2ggPyBgXHJcbiAgICBxdWVyeSAoJHNlYXJjaDogU3RyaW5nLCAkcGFnZTogSW50KSB7XHJcbiAgICAgIFBhZ2UocGFnZTogJHBhZ2UsIHBlclBhZ2U6IDI0KSB7XHJcbiAgICAgICAgcGFnZUluZm8geyBoYXNOZXh0UGFnZSB9XHJcbiAgICAgICAgbWVkaWEoc2VhcmNoOiAkc2VhcmNoLCB0eXBlOiBNQU5HQSkge1xyXG4gICAgICAgICAgaWRcclxuICAgICAgICAgIHRpdGxlIHsgZW5nbGlzaCByb21hamkgdXNlclByZWZlcnJlZCB9XHJcbiAgICAgICAgICBjb3ZlckltYWdlIHsgZXh0cmFMYXJnZSBsYXJnZSB9XHJcbiAgICAgICAgICBhdmVyYWdlU2NvcmVcclxuICAgICAgICAgIHN0YXR1c1xyXG4gICAgICAgICAgY2hhcHRlcnNcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICBgIDogYFxyXG4gICAgcXVlcnkgKCRwYWdlOiBJbnQsICRzb3J0OiBbTWVkaWFTb3J0XSkge1xyXG4gICAgICBQYWdlKHBhZ2U6ICRwYWdlLCBwZXJQYWdlOiAyNCkge1xyXG4gICAgICAgIHBhZ2VJbmZvIHsgaGFzTmV4dFBhZ2UgfVxyXG4gICAgICAgIG1lZGlhKHR5cGU6IE1BTkdBLCBzb3J0OiAkc29ydCkge1xyXG4gICAgICAgICAgaWRcclxuICAgICAgICAgIHRpdGxlIHsgZW5nbGlzaCByb21hamkgdXNlclByZWZlcnJlZCB9XHJcbiAgICAgICAgICBjb3ZlckltYWdlIHsgZXh0cmFMYXJnZSBsYXJnZSB9XHJcbiAgICAgICAgICBhdmVyYWdlU2NvcmVcclxuICAgICAgICAgIHN0YXR1c1xyXG4gICAgICAgICAgY2hhcHRlcnNcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICBgO1xyXG5cclxuICBjb25zdCB2YXJpYWJsZXMgPSBzZWFyY2hcclxuICAgID8geyBzZWFyY2gsIHBhZ2U6IE51bWJlcihwYWdlKSB8fCAxIH1cclxuICAgIDogeyBwYWdlOiBOdW1iZXIocGFnZSkgfHwgMSwgc29ydDogW3NvcnRdIH07XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEFOSUxJU1RfQVBJLCB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBxdWVyeSwgdmFyaWFibGVzIH0pXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBjb25zdCBtZWRpYUxpc3QgPSBkYXRhPy5kYXRhPy5QYWdlPy5tZWRpYSB8fCBbXTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1hbmdhczogbWVkaWFMaXN0Lm1hcChpdGVtID0+ICh7XHJcbiAgICAgICAgaWQ6IGl0ZW0uaWQsXHJcbiAgICAgICAgdGl0bGU6IGl0ZW0udGl0bGU/LmVuZ2xpc2ggfHwgaXRlbS50aXRsZT8ucm9tYWppIHx8IGl0ZW0udGl0bGU/LnVzZXJQcmVmZXJyZWQgfHwgJ01hbmdhJyxcclxuICAgICAgICBpbWFnZTogaXRlbS5jb3ZlckltYWdlPy5leHRyYUxhcmdlIHx8IGl0ZW0uY292ZXJJbWFnZT8ubGFyZ2UsXHJcbiAgICAgICAgcG9zdGVyOiBpdGVtLmNvdmVySW1hZ2U/LmxhcmdlLFxyXG4gICAgICAgIGxhdGVzdENoYXB0ZXI6IGl0ZW0uY2hhcHRlcnMgPyBgVm9sIC8gJHtpdGVtLmNoYXB0ZXJzfSBDaGAgOiBpdGVtLnN0YXR1cyB8fCAnT25nb2luZycsXHJcbiAgICAgICAgdmlld3M6IGl0ZW0uYXZlcmFnZVNjb3JlID8gaXRlbS5hdmVyYWdlU2NvcmUgKiAxMDAgOiA4NTAwXHJcbiAgICAgIH0pKSxcclxuICAgICAgY3VycmVudFBhZ2U6IE51bWJlcihwYWdlKSB8fCAxLFxyXG4gICAgICBoYXNOZXh0UGFnZTogZGF0YT8uZGF0YT8uUGFnZT8ucGFnZUluZm8/Lmhhc05leHRQYWdlIHx8IGZhbHNlLFxyXG4gICAgICB0b3RhbFBhZ2VzOiA1MFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJldHVybiB7IG1hbmdhczogW10sIGN1cnJlbnRQYWdlOiAxLCBoYXNOZXh0UGFnZTogZmFsc2UsIHRvdGFsUGFnZXM6IDEgfTtcclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IHJvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XHJcblxyXG4vLyBIZWxwZXIgZm9yIGNoYXB0ZXIgcmVhZGluZ1xyXG5jb25zdCBoYW5kbGVSZWFkID0gYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG1hbmdhSWQgPSByZXEucGFyYW1zLm1hbmdhSWQ7XHJcbiAgICBjb25zdCBjaGFwdGVySWQgPSByZXEucGFyYW1zLmNoYXB0ZXJJZDtcclxuICAgIGNvbnN0IGZuID0gbWFuZ2FrYWthbG90LmdldENoYXB0ZXJJbWFnZXMgfHwgbWFuZ2FrYWthbG90LnNjcmFwZUNoYXB0ZXJJbWFnZXM7XHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZm4obWFuZ2FJZCwgY2hhcHRlcklkKTtcclxuICAgIGlmIChkYXRhICYmICFkYXRhLmVycm9yKSByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgICByZXMuanNvbih7IGVycm9yOiAnQ2hhcHRlciB1bmF2YWlsYWJsZScsIGltYWdlczogW10gfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICByZXMuanNvbih7IGVycm9yOiBgRXJyb3IgZmV0Y2hpbmcgY2hhcHRlcjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCwgaW1hZ2VzOiBbXSB9KTtcclxuICB9XHJcbn07XHJcblxyXG5yb3V0ZXIuZ2V0KCcvcmVhZC86bWFuZ2FJZC86Y2hhcHRlcklkJywgaGFuZGxlUmVhZCk7XHJcbnJvdXRlci5nZXQoJy9yZWFkLzptYW5nYUlkJywgaGFuZGxlUmVhZCk7XHJcbnJvdXRlci5nZXQoJy9yZWFkJywgaGFuZGxlUmVhZCk7XHJcblxyXG5yb3V0ZXIuZ2V0KCcvZGV0YWlscy86aWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0RGV0YWlscyB8fCBtYW5nYWtha2Fsb3Quc2NyYXBlTWFuZ2FEZXRhaWxzO1xyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGZuKHJlcS5wYXJhbXMuaWQpO1xyXG4gICAgaWYgKGRhdGEgJiYgZGF0YS50aXRsZSkgcmV0dXJuIHJlcy5qc29uKGRhdGEpO1xyXG4gICAgcmVzLmpzb24oeyBlcnJvcjogJ0RldGFpbHMgdW5hdmFpbGFibGUnIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmVzLmpzb24oeyBlcnJvcjogYEVycm9yIGZldGNoaW5nIGRldGFpbHM6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWAgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmNvbnN0IGhhbmRsZVNlYXJjaCA9IGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIGNvbnN0IHF1ZXJ5ID0gcmVxLnBhcmFtcy5xdWVyeSB8fCAnYXR0YWNrIG9uIHRpdGFuJztcclxuICBjb25zdCBwYWdlID0gcmVxLnBhcmFtcy5wYWdlIHx8IDE7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZuID0gbWFuZ2FrYWthbG90LnNlYXJjaCB8fCBtYW5nYWtha2Fsb3Quc2NyYXBlTWFuZ2FTZWFyY2g7XHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZm4ocXVlcnksIHBhZ2UpO1xyXG4gICAgaWYgKGRhdGEgJiYgKChkYXRhLm1hbmdhcyAmJiBkYXRhLm1hbmdhcy5sZW5ndGggPiAwKSB8fCAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhLmxlbmd0aCA+IDApKSkge1xyXG4gICAgICByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAvLyBpZ25vcmUgc2NyYXBlciBlcnJvciwgcHJvY2VlZCB0byBmYWxsYmFja1xyXG4gIH1cclxuICBjb25zdCBmYWxsYmFjayA9IGF3YWl0IGZldGNoQW5pTGlzdEZhbGxiYWNrKG51bGwsIHBhZ2UsIHF1ZXJ5KTtcclxuICByZXMuanNvbihmYWxsYmFjayk7XHJcbn07XHJcblxyXG5yb3V0ZXIuZ2V0KCcvc2VhcmNoLzpxdWVyeS86cGFnZScsIGhhbmRsZVNlYXJjaCk7XHJcbnJvdXRlci5nZXQoJy9zZWFyY2gvOnF1ZXJ5JywgaGFuZGxlU2VhcmNoKTtcclxucm91dGVyLmdldCgnL3NlYXJjaCcsIGhhbmRsZVNlYXJjaCk7XHJcblxyXG5jb25zdCBoYW5kbGVMaXN0ID0gKGxpc3RGbk5hbWUsIGRlZmF1bHRTY3JhcGVOYW1lLCBmYWxsYmFja1NvcnQpID0+IGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gIGNvbnN0IHBhZ2UgPSByZXEucGFyYW1zLnBhZ2UgfHwgMTtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3RbbGlzdEZuTmFtZV0gfHwgbWFuZ2FrYWthbG90W2RlZmF1bHRTY3JhcGVOYW1lXTtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihwYWdlKTtcclxuICAgIGlmIChkYXRhICYmICgoZGF0YS5tYW5nYXMgJiYgZGF0YS5tYW5nYXMubGVuZ3RoID4gMCkgfHwgKEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgZGF0YS5sZW5ndGggPiAwKSkpIHtcclxuICAgICAgcmV0dXJuIHJlcy5qc29uKGRhdGEpO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgLy8gaWdub3JlIHNjcmFwZXIgZXJyb3IsIHByb2NlZWQgdG8gZmFsbGJhY2tcclxuICB9XHJcbiAgY29uc3QgZmFsbGJhY2sgPSBhd2FpdCBmZXRjaEFuaUxpc3RGYWxsYmFjayhmYWxsYmFja1NvcnQsIHBhZ2UpO1xyXG4gIHJlcy5qc29uKGZhbGxiYWNrKTtcclxufTtcclxuXHJcbnJvdXRlci5nZXQoJy9sYXRlc3QvOnBhZ2UnLCBoYW5kbGVMaXN0KCdnZXRMYXRlc3QnLCAnc2NyYXBlTGF0ZXN0TWFuZ2FzJywgJ1VQREFURURfQVRfREVTQycpKTtcclxucm91dGVyLmdldCgnL2xhdGVzdCcsIGhhbmRsZUxpc3QoJ2dldExhdGVzdCcsICdzY3JhcGVMYXRlc3RNYW5nYXMnLCAnVVBEQVRFRF9BVF9ERVNDJykpO1xyXG5cclxucm91dGVyLmdldCgnL3BvcHVsYXIvOnBhZ2UnLCBoYW5kbGVMaXN0KCdnZXRQb3B1bGFyJywgJ3NjcmFwZVBvcHVsYXJNYW5nYXMnLCAnUE9QVUxBUklUWV9ERVNDJykpO1xyXG5yb3V0ZXIuZ2V0KCcvcG9wdWxhcicsIGhhbmRsZUxpc3QoJ2dldFBvcHVsYXInLCAnc2NyYXBlUG9wdWxhck1hbmdhcycsICdQT1BVTEFSSVRZX0RFU0MnKSk7XHJcblxyXG5yb3V0ZXIuZ2V0KCcvbmV3ZXN0LzpwYWdlJywgaGFuZGxlTGlzdCgnZ2V0TmV3ZXN0JywgJ3NjcmFwZU5ld2VzdE1hbmdhcycsICdTVEFSVF9EQVRFX0RFU0MnKSk7XHJcbnJvdXRlci5nZXQoJy9uZXdlc3QnLCBoYW5kbGVMaXN0KCdnZXROZXdlc3QnLCAnc2NyYXBlTmV3ZXN0TWFuZ2FzJywgJ1NUQVJUX0RBVEVfREVTQycpKTtcclxuXHJcbnJvdXRlci5nZXQoJy9jb21wbGV0ZWQvOnBhZ2UnLCBoYW5kbGVMaXN0KCdnZXRDb21wbGV0ZWQnLCAnc2NyYXBlQ29tcGxldGVkTWFuZ2FzJywgJ0ZBVk9VUklURVNfREVTQycpKTtcclxucm91dGVyLmdldCgnL2NvbXBsZXRlZCcsIGhhbmRsZUxpc3QoJ2dldENvbXBsZXRlZCcsICdzY3JhcGVDb21wbGV0ZWRNYW5nYXMnLCAnRkFWT1VSSVRFU19ERVNDJykpO1xyXG5cclxucm91dGVyLmdldCgnL3BvcHVsYXItbm93JywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZuID0gbWFuZ2FrYWthbG90LmdldFBvcHVsYXJOb3cgfHwgbWFuZ2FrYWthbG90LnNjcmFwZVBvcHVsYXJOb3dNYW5nYXM7XHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZm4oKTtcclxuICAgIGlmIChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgZGF0YS5sZW5ndGggPiAwKSByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7fVxyXG4gIGNvbnN0IGZhbGxiYWNrID0gYXdhaXQgZmV0Y2hBbmlMaXN0RmFsbGJhY2soJ1BPUFVMQVJJVFlfREVTQycsIDEpO1xyXG4gIHJlcy5qc29uKGZhbGxiYWNrLm1hbmdhcy5zbGljZSgwLCAxMCkpO1xyXG59KTtcclxuXHJcbnJvdXRlci5nZXQoJy9ob21lJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZuID0gbWFuZ2FrYWthbG90LmdldEhvbWVQYWdlIHx8IG1hbmdha2FrYWxvdC5zY3JhcGVIb21lUGFnZTtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbigpO1xyXG4gICAgaWYgKGRhdGEgJiYgKChkYXRhLm1hbmdhcyAmJiBkYXRhLm1hbmdhcy5sZW5ndGggPiAwKSB8fCBkYXRhLnBvcHVsYXJOb3cgfHwgZGF0YS5wb3B1bGFyU2xpZGVyKSkge1xyXG4gICAgICByZXR1cm4gcmVzLmpzb24oZGF0YSk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyKSB7fVxyXG4gIGNvbnN0IHBvcHVsYXIgPSBhd2FpdCBmZXRjaEFuaUxpc3RGYWxsYmFjaygnUE9QVUxBUklUWV9ERVNDJywgMSk7XHJcbiAgY29uc3QgbGF0ZXN0ID0gYXdhaXQgZmV0Y2hBbmlMaXN0RmFsbGJhY2soJ1VQREFURURfQVRfREVTQycsIDEpO1xyXG4gIHJlcy5qc29uKHtcclxuICAgIHBvcHVsYXJOb3c6IHBvcHVsYXIubWFuZ2FzLnNsaWNlKDAsIDEwKSxcclxuICAgIHBvcHVsYXJTbGlkZXI6IHBvcHVsYXIubWFuZ2FzLnNsaWNlKDAsIDEwKSxcclxuICAgIG1hbmdhczogbGF0ZXN0Lm1hbmdhc1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbmFwcC51c2UoJy9hcGkvbWFuZ2EnLCByb3V0ZXIpO1xyXG5hcHAudXNlKCcvJywgcm91dGVyKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFwcDtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxOZXcgZm9sZGVyXFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXFxcXGFsbGFuaW1lLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9OZXclMjBmb2xkZXIvYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pby9hcGkvYWxsYW5pbWUuanNcIjsvLyBhcGkvYWxsYW5pbWUuanNcclxuLy8gRXhwcmVzcyBBUEkgaGFuZGxlciAvIFZlcmNlbCBzZXJ2ZXJsZXNzIHByb3h5IGZvciBBbGxBbmltZSBHcmFwaFFMIEFQSVxyXG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcclxuXHJcbmNvbnN0IEFMTEFOSU1FX0dSQVBIUUxfRU5EUE9JTlQgPSAnaHR0cHM6Ly9hcGkuYWxsYW5pbWUuZGF5L2FwaSc7XHJcblxyXG5jb25zdCBhcHAgPSBleHByZXNzKCk7XHJcbmFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xyXG5cclxuYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUnKTtcclxuICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmVuZCgpO1xyXG4gIH1cclxuICBuZXh0KCk7XHJcbn0pO1xyXG5cclxuY29uc3Qgcm91dGVyID0gZXhwcmVzcy5Sb3V0ZXIoKTtcclxucm91dGVyLnVzZShleHByZXNzLmpzb24oKSk7XHJcblxyXG5jb25zdCBSRVFVSVJFRF9IRUFERVJTID0ge1xyXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgJ1JlZmVyZXInOiAnaHR0cHM6Ly9hbGxtYW5nYS50bycsXHJcbiAgJ1VzZXItQWdlbnQnOiAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCknLFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGUgR3JhcGhRTCByZXF1ZXN0IGFnYWluc3QgQWxsQW5pbWUgQVBJXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlR3JhcGhRTChxdWVyeSwgdmFyaWFibGVzID0ge30pIHtcclxuICBsZXQgYWN0aXZlUXVlcnkgPSBxdWVyeSB8fCAnJztcclxuICBpZiAoYWN0aXZlUXVlcnkuaW5jbHVkZXMoJ1RyYW5zbGF0aW9uVHlwZSEnKSAmJiAhYWN0aXZlUXVlcnkuaW5jbHVkZXMoJ1ZhaWxkVHJhbnNsYXRpb25UeXBlRW51bVR5cGUhJykpIHtcclxuICAgIGFjdGl2ZVF1ZXJ5ID0gYWN0aXZlUXVlcnkucmVwbGFjZSgnVHJhbnNsYXRpb25UeXBlIScsICdWYWlsZFRyYW5zbGF0aW9uVHlwZUVudW1UeXBlIScpO1xyXG4gIH1cclxuXHJcbiAgbGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goQUxMQU5JTUVfR1JBUEhRTF9FTkRQT0lOVCwge1xyXG4gICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICBoZWFkZXJzOiBSRVFVSVJFRF9IRUFERVJTLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBxdWVyeTogYWN0aXZlUXVlcnksIHZhcmlhYmxlcyB9KSxcclxuICB9KTtcclxuXHJcbiAgaWYgKCFyZXNwb25zZS5vayAmJiBhY3RpdmVRdWVyeS5pbmNsdWRlcygnVmFpbGRUcmFuc2xhdGlvblR5cGVFbnVtVHlwZSEnKSkge1xyXG4gICAgY29uc3QgZmFsbGJhY2tRdWVyeSA9IGFjdGl2ZVF1ZXJ5LnJlcGxhY2UoJ1ZhaWxkVHJhbnNsYXRpb25UeXBlRW51bVR5cGUhJywgJ1RyYW5zbGF0aW9uVHlwZSEnKTtcclxuICAgIGNvbnN0IHJldHJ5UmVzID0gYXdhaXQgZmV0Y2goQUxMQU5JTUVfR1JBUEhRTF9FTkRQT0lOVCwge1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgaGVhZGVyczogUkVRVUlSRURfSEVBREVSUyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBxdWVyeTogZmFsbGJhY2tRdWVyeSwgdmFyaWFibGVzIH0pLFxyXG4gICAgfSk7XHJcbiAgICBpZiAocmV0cnlSZXMub2spIHJlc3BvbnNlID0gcmV0cnlSZXM7XHJcbiAgfVxyXG5cclxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCkuY2F0Y2goKCkgPT4gJycpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBBbGxBbmltZSBHcmFwaFFMIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke2Vycm9yVGV4dCB8fCByZXNwb25zZS5zdGF0dXNUZXh0fWApO1xyXG4gIH1cclxuXHJcbiAgY29uc3QganNvbiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICBpZiAoanNvbi5lcnJvcnMgJiYganNvbi5lcnJvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBBbGxBbmltZSBHcmFwaFFMIEVycm9yOiAke2pzb24uZXJyb3JzWzBdPy5tZXNzYWdlIHx8ICdVbmtub3duIEdyYXBoUUwgZXJyb3InfWApO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGpzb24uZGF0YTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEdlbmVyaWMgR3JhcGhRTCBwcm94eSBlbmRwb2ludCBcdTI1MDBcdTI1MDBcclxucm91dGVyLnBvc3QoJy9ncmFwaHFsJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgcXVlcnksIHZhcmlhYmxlcyB9ID0gcmVxLmJvZHkgfHwge307XHJcbiAgICBpZiAoIXF1ZXJ5KSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnUXVlcnkgaXMgcmVxdWlyZWQuJyB9KTtcclxuICAgIH1cclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBleGVjdXRlR3JhcGhRTChxdWVyeSwgdmFyaWFibGVzKTtcclxuICAgIHJlcy5qc29uKHsgZGF0YSB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJlcy5qc29uKHsgZGF0YTogbnVsbCwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gIH1cclxufSk7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgU2hvdyBJRCBMb29rdXAgZW5kcG9pbnQgXHUyNTAwXHUyNTAwXHJcbnJvdXRlci5wb3N0KCcvc2hvd3MnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyB0aXRsZSwgbGltaXQgPSAxMCwgcGFnZSA9IDEgfSA9IHJlcS5ib2R5IHx8IHt9O1xyXG4gICAgaWYgKCF0aXRsZSkge1xyXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ1RpdGxlIGlzIHJlcXVpcmVkLicgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcXVlcnkgPSBgXHJcbiAgICAgIHF1ZXJ5ICgkc2VhcmNoOiBTZWFyY2hJbnB1dCwgJGxpbWl0OiBJbnQsICRwYWdlOiBJbnQpIHtcclxuICAgICAgICBzaG93cyhzZWFyY2g6ICRzZWFyY2gsIGxpbWl0OiAkbGltaXQsIHBhZ2U6ICRwYWdlKSB7XHJcbiAgICAgICAgICBlZGdlcyB7XHJcbiAgICAgICAgICAgIF9pZFxyXG4gICAgICAgICAgICBuYW1lXHJcbiAgICAgICAgICAgIGVuZ2xpc2hOYW1lXHJcbiAgICAgICAgICAgIGF2YWlsYWJsZUVwaXNvZGVzRGV0YWlsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBgO1xyXG5cclxuICAgIGNvbnN0IHZhcmlhYmxlcyA9IHtcclxuICAgICAgc2VhcmNoOiB7IHF1ZXJ5OiB0aXRsZSB9LFxyXG4gICAgICBsaW1pdDogTnVtYmVyKGxpbWl0KSB8fCAxMCxcclxuICAgICAgcGFnZTogTnVtYmVyKHBhZ2UpIHx8IDEsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBleGVjdXRlR3JhcGhRTChxdWVyeSwgdmFyaWFibGVzKTtcclxuICAgIGNvbnN0IHNob3dzID0gZGF0YT8uc2hvd3M/LmVkZ2VzIHx8IFtdO1xyXG4gICAgcmVzLmpzb24oeyBzaG93cyB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJlcy5qc29uKHsgc2hvd3M6IFtdLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBFcGlzb2RlIFNvdXJjZSBGZXRjaGVyIGVuZHBvaW50IFx1MjUwMFx1MjUwMFxyXG5yb3V0ZXIucG9zdCgnL2VwaXNvZGUnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBzaG93SWQsIHRyYW5zbGF0aW9uVHlwZSA9ICdzdWInLCBlcGlzb2RlU3RyaW5nID0gJzEnIH0gPSByZXEuYm9keSB8fCB7fTtcclxuICAgIGlmICghc2hvd0lkKSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnc2hvd0lkIGlzIHJlcXVpcmVkLicgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcXVlcnkgPSBgXHJcbiAgICAgIHF1ZXJ5ICgkc2hvd0lkOiBTdHJpbmchLCAkdHJhbnNsYXRpb25UeXBlOiBWYWlsZFRyYW5zbGF0aW9uVHlwZUVudW1UeXBlISwgJGVwaXNvZGVTdHJpbmc6IFN0cmluZyEpIHtcclxuICAgICAgICBlcGlzb2RlKHNob3dJZDogJHNob3dJZCwgdHJhbnNsYXRpb25UeXBlOiAkdHJhbnNsYXRpb25UeXBlLCBlcGlzb2RlU3RyaW5nOiAkZXBpc29kZVN0cmluZykge1xyXG4gICAgICAgICAgc291cmNlVXJsc1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgYDtcclxuXHJcbiAgICBjb25zdCB2YXJpYWJsZXMgPSB7XHJcbiAgICAgIHNob3dJZDogU3RyaW5nKHNob3dJZCksXHJcbiAgICAgIHRyYW5zbGF0aW9uVHlwZTogU3RyaW5nKHRyYW5zbGF0aW9uVHlwZSkudG9Mb3dlckNhc2UoKSA9PT0gJ2R1YicgPyAnZHViJyA6ICdzdWInLFxyXG4gICAgICBlcGlzb2RlU3RyaW5nOiBTdHJpbmcoZXBpc29kZVN0cmluZyksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBleGVjdXRlR3JhcGhRTChxdWVyeSwgdmFyaWFibGVzKTtcclxuICAgIGNvbnN0IHNvdXJjZVVybHMgPSBkYXRhPy5lcGlzb2RlPy5zb3VyY2VVcmxzIHx8IFtdO1xyXG4gICAgcmVzLmpzb24oeyBzb3VyY2VVcmxzIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmVzLmpzb24oeyBzb3VyY2VVcmxzOiBbXSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gIH1cclxufSk7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ2xvY2sgVVJMIHJlc29sdmVyIHByb3h5IGVuZHBvaW50IFx1MjUwMFx1MjUwMFxyXG5yb3V0ZXIuYWxsKCcvY2xvY2snLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICB0cnkge1xyXG4gICAgbGV0IHRhcmdldFVybCA9IHJlcS5xdWVyeS51cmwgfHwgcmVxLmJvZHk/LnVybDtcclxuICAgIGlmICghdGFyZ2V0VXJsKSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAndXJsIHBhcmFtZXRlciBpcyByZXF1aXJlZC4nIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YXJnZXRVcmwuc3RhcnRzV2l0aCgnLycpKSB7XHJcbiAgICAgIHRhcmdldFVybCA9IGBodHRwczovL2FsbGFuaW1lLmRheSR7dGFyZ2V0VXJsfWA7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY2xvY2tSZXMgPSBhd2FpdCBmZXRjaCh0YXJnZXRVcmwsIHtcclxuICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdSZWZlcmVyJzogJ2h0dHBzOi8vYWxsbWFuZ2EudG8nLFxyXG4gICAgICAgICdVc2VyLUFnZW50JzogJ01vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICghY2xvY2tSZXMub2spIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDbG9jayBIVFRQICR7Y2xvY2tSZXMuc3RhdHVzfWApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGpzb24gPSBhd2FpdCBjbG9ja1Jlcy5qc29uKCk7XHJcbiAgICByZXMuanNvbihqc29uKTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gIH1cclxufSk7XHJcblxyXG5hcHAudXNlKCcvYXBpL2FsbGFuaW1lJywgcm91dGVyKTtcclxuYXBwLnVzZSgnLycsIHJvdXRlcik7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhcHA7XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcTmV3IGZvbGRlclxcXFxhbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvXFxcXGFwaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcTmV3IGZvbGRlclxcXFxhbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvXFxcXGFwaVxcXFxoY2FwdGNoYS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovTmV3JTIwZm9sZGVyL2FuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW8vYXBpL2hjYXB0Y2hhLmpzXCI7aW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XHJcblxyXG5jb25zdCBhcHAgPSBleHByZXNzKCk7XHJcbmFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xyXG5cclxuY29uc3QgSENBUFRDSEFfVkVSSUZZX1VSTCA9ICdodHRwczovL2hjYXB0Y2hhLmNvbS9zaXRldmVyaWZ5JztcclxuY29uc3QgSENBUFRDSEFfU0VDUkVUX0tFWSA9IHByb2Nlc3MuZW52LkhDQVBUQ0hBX1NFQ1JFVF9LRVkgfHwgJyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSwgcmVzKSB7XHJcbiAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykge1xyXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA1KS5qc29uKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdNZXRob2Qgbm90IGFsbG93ZWQuJyB9KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHsgdG9rZW4gfSA9IHJlcS5ib2R5IHx8IHt9O1xyXG4gIGlmICghdG9rZW4pIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnQ2FwdGNoYSByZXNwb25zZSBpcyByZXF1aXJlZC4nIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFIQ0FQVENIQV9TRUNSRVRfS0VZKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogJ0NhcHRjaGEgc2VjcmV0IGlzIG5vdCBjb25maWd1cmVkLicgfSk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgdmVyaWZ5UmVzID0gYXdhaXQgZmV0Y2goSENBUFRDSEFfVkVSSUZZX1VSTCwge1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgfSxcclxuICAgICAgYm9keTogbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgICAgcmVzcG9uc2U6IFN0cmluZyh0b2tlbiksXHJcbiAgICAgICAgc2VjcmV0OiBIQ0FQVENIQV9TRUNSRVRfS0VZLFxyXG4gICAgICB9KS50b1N0cmluZygpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHZlcmlmeVJlcy5qc29uKCkuY2F0Y2goKCkgPT4gKHt9KSk7XHJcbiAgICBjb25zdCBpc1ZhbGlkID0gQm9vbGVhbihwYXlsb2FkPy5zdWNjZXNzKTtcclxuXHJcbiAgICBpZiAoIXZlcmlmeVJlcy5vayB8fCAhaXNWYWxpZCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1toQ2FwdGNoYV0gdmFsaWRhdGlvbiByZWplY3RlZDonLCBwYXlsb2FkPy5bJ2Vycm9yLWNvZGVzJ10gfHwgdmVyaWZ5UmVzLnN0YXR1cyk7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ0NhcHRjaGEgdmFsaWRhdGlvbiBmYWlsZWQuJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlcy5qc29uKHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0NhcHRjaGEgdmFsaWRhdGVkLicgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1toQ2FwdGNoYV0gdmVyaWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogJ0NhcHRjaGEgdmVyaWZpY2F0aW9uIGZhaWxlZC4nIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXBwLnBvc3QoJy9hcGkvaGNhcHRjaGEvdmVyaWZ5JywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgcmV0dXJuIGhhbmRsZXIocmVxLCByZXMpO1xyXG59KTtcclxuXHJcbmV4cG9ydCB7IGFwcCB9O1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdULFNBQVMsb0JBQW9CO0FBQ3JWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7OztBQ0FqQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxrQkFBa0I7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QUksd0JBQXdCO0FBQ3BHLFFBQU0sa0JBQWtCLENBQUMsQ0FBQyxRQUFRLElBQUksWUFBWSxRQUFRLElBQUkscUJBQXFCLFdBQVcsVUFBVSxLQUFNLFlBQVksWUFBWSxTQUFTLGNBQWMsQ0FBQyxDQUFDLFFBQVEsSUFBSTtBQUMzSyxRQUFNLGNBQWMsUUFBUSxJQUFJLGFBQWEsUUFBUSxJQUFJLGlCQUFpQjtBQUMxRSxRQUFNLE9BQU8sWUFBWSxVQUFVLE1BQU8sbUJBQW1CLGVBQWdCLE9BQU87QUFDcEYsTUFBSSxZQUFZLFFBQVMsU0FBUSxJQUFJLDRCQUE0QixJQUFJLGdCQUFnQixlQUFlLFlBQVksWUFBWSxHQUFHO0FBRS9ILFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixnQkFBZ0IsUUFBUTtBQUN0QixpQkFBTyxZQUFZLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUN6QyxnQkFBSSxJQUFJLEtBQUssV0FBVyxZQUFZLEVBQUcsUUFBTyxjQUFZLEtBQUssS0FBSyxJQUFJO0FBQ3hFLGdCQUFJLElBQUksS0FBSyxXQUFXLGVBQWUsRUFBRyxRQUFPLGlCQUFlLEtBQUssS0FBSyxJQUFJO0FBQzlFLGdCQUFJLElBQUksS0FBSyxXQUFXLGVBQWUsRUFBRyxRQUFPLFFBQWUsS0FBSyxLQUFLLElBQUk7QUFDOUUsaUJBQUs7QUFBQSxVQUNQLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsSUFDQSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLGtDQUFXLEtBQUssRUFBRSxFQUFFO0FBQUEsSUFDMUQsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLE1BQ1osT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUSxTQUFPO0FBQ2IsZ0JBQUksSUFBSSxLQUFLLFdBQVcsWUFBWSxLQUFLLElBQUksS0FBSyxXQUFXLGVBQWUsS0FBSyxJQUFJLEtBQUssV0FBVyxlQUFlLEVBQUcsUUFBTyxJQUFJO0FBQUEsVUFDcEk7QUFBQSxVQUNBLFNBQVMsT0FBSyxFQUFFLFFBQVEsVUFBVSxNQUFNO0FBQUEsUUFDMUM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUSxlQUFlLGVBQWU7QUFBQSxNQUN0QyxlQUFlLEVBQUUsVUFBVSxrQkFBa0IsQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUFFO0FBQUEsSUFDakU7QUFBQSxJQUNBLE1BQU07QUFBQSxNQUNKLGFBQWE7QUFBQSxNQUNiLFNBQVM7QUFBQSxNQUNULEtBQUs7QUFBQSxJQUNQO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImV4cHJlc3MiLCAiYXBwIiwgImV4cHJlc3MiLCAicm91dGVyIiwgImV4cHJlc3MiLCAiYXBwIiwgImV4cHJlc3MiXQp9Cg==
