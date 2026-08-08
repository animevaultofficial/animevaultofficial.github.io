// vite.config.js
import { defineConfig } from "file:///E:/animevaultofficial.github.io/node_modules/vite/dist/node/index.js";
import react from "file:///E:/animevaultofficial.github.io/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";

// api/manga.js
import express from "file:///E:/animevaultofficial.github.io/node_modules/express/index.js";
import mangakakalot from "file:///E:/animevaultofficial.github.io/node_modules/mangakakalot-api/index.js";
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
import express2 from "file:///E:/animevaultofficial.github.io/node_modules/express/index.js";
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
  const response = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: REQUIRED_HEADERS,
    body: JSON.stringify({ query, variables })
  });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});
router2.post("/episode", async (req, res) => {
  try {
    const { showId, translationType = "sub", episodeString = "1" } = req.body || {};
    if (!showId) {
      return res.status(400).json({ error: "showId is required." });
    }
    const query = `
      query ($showId: String!, $translationType: TranslationType!, $episodeString: String!) {
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
    res.status(500).json({ error: err.message });
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

// vite.config.js
var __vite_injected_original_dirname = "E:\\animevaultofficial.github.io";
var vite_config_default = defineConfig(({ command, mode }) => {
  const isWebOSBuild = !!process.env.WEBOS || mode === "webos" || process.env.npm_lifecycle_event === "webos:package";
  const isElectronBuild = !!process.env.ELECTRON || process.env.npm_lifecycle_event?.startsWith("electron") || command === "build" && (mode === "electron" || !!process.env.npm_package_dependencies_electron);
  const ghPagesBase = process.env.VITE_BASE || process.env.GH_PAGES_BASE || "/";
  const base = command === "serve" ? "/" : isElectronBuild || isWebOSBuild ? "./" : ghPagesBase;
  if (command === "build") {
    console.log(`[Vite] Build base path: "${base}" (electron: ${isElectronBuild}, webos: ${isWebOSBuild})`);
  }
  return {
    plugins: [
      react(),
      {
        name: "manga-api-dev-middleware",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith("/api/manga")) {
              return manga_default(req, res, next);
            }
            if (req.url && req.url.startsWith("/api/allanime")) {
              return allanime_default(req, res, next);
            }
            next();
          });
        }
      }
    ],
    base,
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          bypass: (req) => {
            if (req.url && (req.url.startsWith("/api/manga") || req.url.startsWith("/api/allanime"))) {
              return req.url;
            }
          },
          rewrite: (p) => p.replace(/^\/api/, "/api")
        }
      }
    },
    build: {
      outDir: isWebOSBuild ? "dist-webos" : "dist",
      rollupOptions: {
        external: isElectronBuild ? ["bcryptjs"] : []
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL21hbmdhLmpzIiwgImFwaS9hbGxhbmltZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L2FuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW8vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBtYW5nYUFwaUFwcCBmcm9tICcuL2FwaS9tYW5nYS5qcyc7XG5pbXBvcnQgYWxsQW5pbWVBcGlBcHAgZnJvbSAnLi9hcGkvYWxsYW5pbWUuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGlzV2ViT1NCdWlsZCA9ICEhcHJvY2Vzcy5lbnYuV0VCT1MgfHwgbW9kZSA9PT0gJ3dlYm9zJyB8fCBwcm9jZXNzLmVudi5ucG1fbGlmZWN5Y2xlX2V2ZW50ID09PSAnd2Vib3M6cGFja2FnZSc7XG5cbiAgY29uc3QgaXNFbGVjdHJvbkJ1aWxkID1cbiAgICAhIXByb2Nlc3MuZW52LkVMRUNUUk9OIHx8XG4gICAgcHJvY2Vzcy5lbnYubnBtX2xpZmVjeWNsZV9ldmVudD8uc3RhcnRzV2l0aCgnZWxlY3Ryb24nKSB8fFxuICAgIChjb21tYW5kID09PSAnYnVpbGQnICYmIChtb2RlID09PSAnZWxlY3Ryb24nIHx8ICEhcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfZGVwZW5kZW5jaWVzX2VsZWN0cm9uKSk7XG5cbiAgY29uc3QgZ2hQYWdlc0Jhc2UgPSBwcm9jZXNzLmVudi5WSVRFX0JBU0UgfHwgcHJvY2Vzcy5lbnYuR0hfUEFHRVNfQkFTRSB8fCAnLyc7XG5cbiAgY29uc3QgYmFzZSA9IGNvbW1hbmQgPT09ICdzZXJ2ZSdcbiAgICA/ICcvJyAvLyBkZXYgc2VydmVyXG4gICAgOiAoaXNFbGVjdHJvbkJ1aWxkIHx8IGlzV2ViT1NCdWlsZClcbiAgICAgID8gJy4vJyAvLyBwYWNrYWdlZCBhcHBzIGxvYWQgbG9jYWwgZmlsZXMgYW5kIG5lZWQgcmVsYXRpdmUgYXNzZXRzXG4gICAgICA6IGdoUGFnZXNCYXNlOyAvLyBHaXRIdWIgUGFnZXMgYWJzb2x1dGUgYmFzZVxuXG4gIGlmIChjb21tYW5kID09PSAnYnVpbGQnKSB7XG4gICAgY29uc29sZS5sb2coYFtWaXRlXSBCdWlsZCBiYXNlIHBhdGg6IFwiJHtiYXNlfVwiIChlbGVjdHJvbjogJHtpc0VsZWN0cm9uQnVpbGR9LCB3ZWJvczogJHtpc1dlYk9TQnVpbGR9KWApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAge1xuICAgICAgICBuYW1lOiAnbWFuZ2EtYXBpLWRldi1taWRkbGV3YXJlJyxcbiAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxLnVybCAmJiByZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvbWFuZ2EnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbWFuZ2FBcGlBcHAocmVxLCByZXMsIG5leHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlcS51cmwgJiYgcmVxLnVybC5zdGFydHNXaXRoKCcvYXBpL2FsbGFuaW1lJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGFsbEFuaW1lQXBpQXBwKHJlcSwgcmVzLCBuZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF0sXG4gICAgYmFzZSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDUxNzQsXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgYnlwYXNzOiAocmVxKSA9PiB7XG4gICAgICAgICAgICAvLyBEbyBub3QgcHJveHkgL2FwaS9tYW5nYSBvciAvYXBpL2FsbGFuaW1lIHJlcXVlc3RzIHRvIHBvcnQgMzAwMFxuICAgICAgICAgICAgaWYgKHJlcS51cmwgJiYgKHJlcS51cmwuc3RhcnRzV2l0aCgnL2FwaS9tYW5nYScpIHx8IHJlcS51cmwuc3RhcnRzV2l0aCgnL2FwaS9hbGxhbmltZScpKSkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVxLnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHJld3JpdGU6IChwKSA9PiBwLnJlcGxhY2UoL15cXC9hcGkvLCAnL2FwaScpLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBvdXREaXI6IGlzV2ViT1NCdWlsZCA/ICdkaXN0LXdlYm9zJyA6ICdkaXN0JyxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgZXh0ZXJuYWw6IGlzRWxlY3Ryb25CdWlsZCA/IFsnYmNyeXB0anMnXSA6IFtdLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXGFuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW9cXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxhbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvXFxcXGFwaVxcXFxtYW5nYS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pby9hcGkvbWFuZ2EuanNcIjsvLyBhcGkvbWFuZ2EuanNcbi8vIFZlcmNlbCBzZXJ2ZXJsZXNzIGZ1bmN0aW9uIC8gRXhwcmVzcyBBUEkgaGFuZGxlciBmb3IgTWFuZ2FLYWthbG90IEFQSVxuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgbWFuZ2FrYWthbG90IGZyb20gJ21hbmdha2FrYWxvdC1hcGknO1xuXG5jb25zdCBBTklMSVNUX0FQSSA9ICdodHRwczovL2dyYXBocWwuYW5pbGlzdC5jbyc7XG5cbmNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcblxuYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUnKTtcbiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuZW5kKCk7XG4gIH1cbiAgbmV4dCgpO1xufSk7XG5cbi8qKlxuICogU2VydmVyLXNpZGUgQW5pTGlzdCBmYWxsYmFjayBoZWxwZXIgd2hlbiBNYW5nYUtha2Fsb3Qgc2NyYXBlcnMgZ2V0IENsb3VkZmxhcmUgNDAzIGJsb2NrZWRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbmlMaXN0RmFsbGJhY2soc29ydCA9ICdQT1BVTEFSSVRZX0RFU0MnLCBwYWdlID0gMSwgc2VhcmNoID0gbnVsbCkge1xuICBjb25zdCBxdWVyeSA9IHNlYXJjaCA/IGBcbiAgICBxdWVyeSAoJHNlYXJjaDogU3RyaW5nLCAkcGFnZTogSW50KSB7XG4gICAgICBQYWdlKHBhZ2U6ICRwYWdlLCBwZXJQYWdlOiAyNCkge1xuICAgICAgICBwYWdlSW5mbyB7IGhhc05leHRQYWdlIH1cbiAgICAgICAgbWVkaWEoc2VhcmNoOiAkc2VhcmNoLCB0eXBlOiBNQU5HQSkge1xuICAgICAgICAgIGlkXG4gICAgICAgICAgdGl0bGUgeyBlbmdsaXNoIHJvbWFqaSB1c2VyUHJlZmVycmVkIH1cbiAgICAgICAgICBjb3ZlckltYWdlIHsgZXh0cmFMYXJnZSBsYXJnZSB9XG4gICAgICAgICAgYXZlcmFnZVNjb3JlXG4gICAgICAgICAgc3RhdHVzXG4gICAgICAgICAgY2hhcHRlcnNcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgYCA6IGBcbiAgICBxdWVyeSAoJHBhZ2U6IEludCwgJHNvcnQ6IFtNZWRpYVNvcnRdKSB7XG4gICAgICBQYWdlKHBhZ2U6ICRwYWdlLCBwZXJQYWdlOiAyNCkge1xuICAgICAgICBwYWdlSW5mbyB7IGhhc05leHRQYWdlIH1cbiAgICAgICAgbWVkaWEodHlwZTogTUFOR0EsIHNvcnQ6ICRzb3J0KSB7XG4gICAgICAgICAgaWRcbiAgICAgICAgICB0aXRsZSB7IGVuZ2xpc2ggcm9tYWppIHVzZXJQcmVmZXJyZWQgfVxuICAgICAgICAgIGNvdmVySW1hZ2UgeyBleHRyYUxhcmdlIGxhcmdlIH1cbiAgICAgICAgICBhdmVyYWdlU2NvcmVcbiAgICAgICAgICBzdGF0dXNcbiAgICAgICAgICBjaGFwdGVyc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBgO1xuXG4gIGNvbnN0IHZhcmlhYmxlcyA9IHNlYXJjaFxuICAgID8geyBzZWFyY2gsIHBhZ2U6IE51bWJlcihwYWdlKSB8fCAxIH1cbiAgICA6IHsgcGFnZTogTnVtYmVyKHBhZ2UpIHx8IDEsIHNvcnQ6IFtzb3J0XSB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChBTklMSVNUX0FQSSwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgcXVlcnksIHZhcmlhYmxlcyB9KVxuICAgIH0pO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgbWVkaWFMaXN0ID0gZGF0YT8uZGF0YT8uUGFnZT8ubWVkaWEgfHwgW107XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hbmdhczogbWVkaWFMaXN0Lm1hcChpdGVtID0+ICh7XG4gICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICB0aXRsZTogaXRlbS50aXRsZT8uZW5nbGlzaCB8fCBpdGVtLnRpdGxlPy5yb21hamkgfHwgaXRlbS50aXRsZT8udXNlclByZWZlcnJlZCB8fCAnTWFuZ2EnLFxuICAgICAgICBpbWFnZTogaXRlbS5jb3ZlckltYWdlPy5leHRyYUxhcmdlIHx8IGl0ZW0uY292ZXJJbWFnZT8ubGFyZ2UsXG4gICAgICAgIHBvc3RlcjogaXRlbS5jb3ZlckltYWdlPy5sYXJnZSxcbiAgICAgICAgbGF0ZXN0Q2hhcHRlcjogaXRlbS5jaGFwdGVycyA/IGBWb2wgLyAke2l0ZW0uY2hhcHRlcnN9IENoYCA6IGl0ZW0uc3RhdHVzIHx8ICdPbmdvaW5nJyxcbiAgICAgICAgdmlld3M6IGl0ZW0uYXZlcmFnZVNjb3JlID8gaXRlbS5hdmVyYWdlU2NvcmUgKiAxMDAgOiA4NTAwXG4gICAgICB9KSksXG4gICAgICBjdXJyZW50UGFnZTogTnVtYmVyKHBhZ2UpIHx8IDEsXG4gICAgICBoYXNOZXh0UGFnZTogZGF0YT8uZGF0YT8uUGFnZT8ucGFnZUluZm8/Lmhhc05leHRQYWdlIHx8IGZhbHNlLFxuICAgICAgdG90YWxQYWdlczogNTBcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4geyBtYW5nYXM6IFtdLCBjdXJyZW50UGFnZTogMSwgaGFzTmV4dFBhZ2U6IGZhbHNlLCB0b3RhbFBhZ2VzOiAxIH07XG4gIH1cbn1cblxuY29uc3Qgcm91dGVyID0gZXhwcmVzcy5Sb3V0ZXIoKTtcblxuLy8gSGVscGVyIGZvciBjaGFwdGVyIHJlYWRpbmdcbmNvbnN0IGhhbmRsZVJlYWQgPSBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBtYW5nYUlkID0gcmVxLnBhcmFtcy5tYW5nYUlkO1xuICAgIGNvbnN0IGNoYXB0ZXJJZCA9IHJlcS5wYXJhbXMuY2hhcHRlcklkO1xuICAgIGNvbnN0IGZuID0gbWFuZ2FrYWthbG90LmdldENoYXB0ZXJJbWFnZXMgfHwgbWFuZ2FrYWthbG90LnNjcmFwZUNoYXB0ZXJJbWFnZXM7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGZuKG1hbmdhSWQsIGNoYXB0ZXJJZCk7XG4gICAgaWYgKGRhdGEgJiYgIWRhdGEuZXJyb3IpIHJldHVybiByZXMuanNvbihkYXRhKTtcbiAgICByZXMuanNvbih7IGVycm9yOiAnQ2hhcHRlciB1bmF2YWlsYWJsZScsIGltYWdlczogW10gfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJlcy5qc29uKHsgZXJyb3I6IGBFcnJvciBmZXRjaGluZyBjaGFwdGVyOiAke2Vyci5tZXNzYWdlIHx8IGVycn1gLCBpbWFnZXM6IFtdIH0pO1xuICB9XG59O1xuXG5yb3V0ZXIuZ2V0KCcvcmVhZC86bWFuZ2FJZC86Y2hhcHRlcklkJywgaGFuZGxlUmVhZCk7XG5yb3V0ZXIuZ2V0KCcvcmVhZC86bWFuZ2FJZCcsIGhhbmRsZVJlYWQpO1xucm91dGVyLmdldCgnL3JlYWQnLCBoYW5kbGVSZWFkKTtcblxucm91dGVyLmdldCgnL2RldGFpbHMvOmlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0RGV0YWlscyB8fCBtYW5nYWtha2Fsb3Quc2NyYXBlTWFuZ2FEZXRhaWxzO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihyZXEucGFyYW1zLmlkKTtcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnRpdGxlKSByZXR1cm4gcmVzLmpzb24oZGF0YSk7XG4gICAgcmVzLmpzb24oeyBlcnJvcjogJ0RldGFpbHMgdW5hdmFpbGFibGUnIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXMuanNvbih7IGVycm9yOiBgRXJyb3IgZmV0Y2hpbmcgZGV0YWlsczogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCB9KTtcbiAgfVxufSk7XG5cbmNvbnN0IGhhbmRsZVNlYXJjaCA9IGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICBjb25zdCBxdWVyeSA9IHJlcS5wYXJhbXMucXVlcnkgfHwgJ2F0dGFjayBvbiB0aXRhbic7XG4gIGNvbnN0IHBhZ2UgPSByZXEucGFyYW1zLnBhZ2UgfHwgMTtcbiAgdHJ5IHtcbiAgICBjb25zdCBmbiA9IG1hbmdha2FrYWxvdC5zZWFyY2ggfHwgbWFuZ2FrYWthbG90LnNjcmFwZU1hbmdhU2VhcmNoO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihxdWVyeSwgcGFnZSk7XG4gICAgaWYgKGRhdGEgJiYgKChkYXRhLm1hbmdhcyAmJiBkYXRhLm1hbmdhcy5sZW5ndGggPiAwKSB8fCAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhLmxlbmd0aCA+IDApKSkge1xuICAgICAgcmV0dXJuIHJlcy5qc29uKGRhdGEpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gaWdub3JlIHNjcmFwZXIgZXJyb3IsIHByb2NlZWQgdG8gZmFsbGJhY2tcbiAgfVxuICBjb25zdCBmYWxsYmFjayA9IGF3YWl0IGZldGNoQW5pTGlzdEZhbGxiYWNrKG51bGwsIHBhZ2UsIHF1ZXJ5KTtcbiAgcmVzLmpzb24oZmFsbGJhY2spO1xufTtcblxucm91dGVyLmdldCgnL3NlYXJjaC86cXVlcnkvOnBhZ2UnLCBoYW5kbGVTZWFyY2gpO1xucm91dGVyLmdldCgnL3NlYXJjaC86cXVlcnknLCBoYW5kbGVTZWFyY2gpO1xucm91dGVyLmdldCgnL3NlYXJjaCcsIGhhbmRsZVNlYXJjaCk7XG5cbmNvbnN0IGhhbmRsZUxpc3QgPSAobGlzdEZuTmFtZSwgZGVmYXVsdFNjcmFwZU5hbWUsIGZhbGxiYWNrU29ydCkgPT4gYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIGNvbnN0IHBhZ2UgPSByZXEucGFyYW1zLnBhZ2UgfHwgMTtcbiAgdHJ5IHtcbiAgICBjb25zdCBmbiA9IG1hbmdha2FrYWxvdFtsaXN0Rm5OYW1lXSB8fCBtYW5nYWtha2Fsb3RbZGVmYXVsdFNjcmFwZU5hbWVdO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbihwYWdlKTtcbiAgICBpZiAoZGF0YSAmJiAoKGRhdGEubWFuZ2FzICYmIGRhdGEubWFuZ2FzLmxlbmd0aCA+IDApIHx8IChBcnJheS5pc0FycmF5KGRhdGEpICYmIGRhdGEubGVuZ3RoID4gMCkpKSB7XG4gICAgICByZXR1cm4gcmVzLmpzb24oZGF0YSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBpZ25vcmUgc2NyYXBlciBlcnJvciwgcHJvY2VlZCB0byBmYWxsYmFja1xuICB9XG4gIGNvbnN0IGZhbGxiYWNrID0gYXdhaXQgZmV0Y2hBbmlMaXN0RmFsbGJhY2soZmFsbGJhY2tTb3J0LCBwYWdlKTtcbiAgcmVzLmpzb24oZmFsbGJhY2spO1xufTtcblxucm91dGVyLmdldCgnL2xhdGVzdC86cGFnZScsIGhhbmRsZUxpc3QoJ2dldExhdGVzdCcsICdzY3JhcGVMYXRlc3RNYW5nYXMnLCAnVVBEQVRFRF9BVF9ERVNDJykpO1xucm91dGVyLmdldCgnL2xhdGVzdCcsIGhhbmRsZUxpc3QoJ2dldExhdGVzdCcsICdzY3JhcGVMYXRlc3RNYW5nYXMnLCAnVVBEQVRFRF9BVF9ERVNDJykpO1xuXG5yb3V0ZXIuZ2V0KCcvcG9wdWxhci86cGFnZScsIGhhbmRsZUxpc3QoJ2dldFBvcHVsYXInLCAnc2NyYXBlUG9wdWxhck1hbmdhcycsICdQT1BVTEFSSVRZX0RFU0MnKSk7XG5yb3V0ZXIuZ2V0KCcvcG9wdWxhcicsIGhhbmRsZUxpc3QoJ2dldFBvcHVsYXInLCAnc2NyYXBlUG9wdWxhck1hbmdhcycsICdQT1BVTEFSSVRZX0RFU0MnKSk7XG5cbnJvdXRlci5nZXQoJy9uZXdlc3QvOnBhZ2UnLCBoYW5kbGVMaXN0KCdnZXROZXdlc3QnLCAnc2NyYXBlTmV3ZXN0TWFuZ2FzJywgJ1NUQVJUX0RBVEVfREVTQycpKTtcbnJvdXRlci5nZXQoJy9uZXdlc3QnLCBoYW5kbGVMaXN0KCdnZXROZXdlc3QnLCAnc2NyYXBlTmV3ZXN0TWFuZ2FzJywgJ1NUQVJUX0RBVEVfREVTQycpKTtcblxucm91dGVyLmdldCgnL2NvbXBsZXRlZC86cGFnZScsIGhhbmRsZUxpc3QoJ2dldENvbXBsZXRlZCcsICdzY3JhcGVDb21wbGV0ZWRNYW5nYXMnLCAnRkFWT1VSSVRFU19ERVNDJykpO1xucm91dGVyLmdldCgnL2NvbXBsZXRlZCcsIGhhbmRsZUxpc3QoJ2dldENvbXBsZXRlZCcsICdzY3JhcGVDb21wbGV0ZWRNYW5nYXMnLCAnRkFWT1VSSVRFU19ERVNDJykpO1xuXG5yb3V0ZXIuZ2V0KCcvcG9wdWxhci1ub3cnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmbiA9IG1hbmdha2FrYWxvdC5nZXRQb3B1bGFyTm93IHx8IG1hbmdha2FrYWxvdC5zY3JhcGVQb3B1bGFyTm93TWFuZ2FzO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbigpO1xuICAgIGlmIChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgZGF0YS5sZW5ndGggPiAwKSByZXR1cm4gcmVzLmpzb24oZGF0YSk7XG4gIH0gY2F0Y2ggKGVycikge31cbiAgY29uc3QgZmFsbGJhY2sgPSBhd2FpdCBmZXRjaEFuaUxpc3RGYWxsYmFjaygnUE9QVUxBUklUWV9ERVNDJywgMSk7XG4gIHJlcy5qc29uKGZhbGxiYWNrLm1hbmdhcy5zbGljZSgwLCAxMCkpO1xufSk7XG5cbnJvdXRlci5nZXQoJy9ob21lJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZm4gPSBtYW5nYWtha2Fsb3QuZ2V0SG9tZVBhZ2UgfHwgbWFuZ2FrYWthbG90LnNjcmFwZUhvbWVQYWdlO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmbigpO1xuICAgIGlmIChkYXRhICYmICgoZGF0YS5tYW5nYXMgJiYgZGF0YS5tYW5nYXMubGVuZ3RoID4gMCkgfHwgZGF0YS5wb3B1bGFyTm93IHx8IGRhdGEucG9wdWxhclNsaWRlcikpIHtcbiAgICAgIHJldHVybiByZXMuanNvbihkYXRhKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge31cbiAgY29uc3QgcG9wdWxhciA9IGF3YWl0IGZldGNoQW5pTGlzdEZhbGxiYWNrKCdQT1BVTEFSSVRZX0RFU0MnLCAxKTtcbiAgY29uc3QgbGF0ZXN0ID0gYXdhaXQgZmV0Y2hBbmlMaXN0RmFsbGJhY2soJ1VQREFURURfQVRfREVTQycsIDEpO1xuICByZXMuanNvbih7XG4gICAgcG9wdWxhck5vdzogcG9wdWxhci5tYW5nYXMuc2xpY2UoMCwgMTApLFxuICAgIHBvcHVsYXJTbGlkZXI6IHBvcHVsYXIubWFuZ2FzLnNsaWNlKDAsIDEwKSxcbiAgICBtYW5nYXM6IGxhdGVzdC5tYW5nYXNcbiAgfSk7XG59KTtcblxuYXBwLnVzZSgnL2FwaS9tYW5nYScsIHJvdXRlcik7XG5hcHAudXNlKCcvJywgcm91dGVyKTtcblxuZXhwb3J0IGRlZmF1bHQgYXBwO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxhbmltZXZhdWx0b2ZmaWNpYWwuZ2l0aHViLmlvXFxcXGFwaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcYW5pbWV2YXVsdG9mZmljaWFsLmdpdGh1Yi5pb1xcXFxhcGlcXFxcYWxsYW5pbWUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L2FuaW1ldmF1bHRvZmZpY2lhbC5naXRodWIuaW8vYXBpL2FsbGFuaW1lLmpzXCI7Ly8gYXBpL2FsbGFuaW1lLmpzXG4vLyBFeHByZXNzIEFQSSBoYW5kbGVyIC8gVmVyY2VsIHNlcnZlcmxlc3MgcHJveHkgZm9yIEFsbEFuaW1lIEdyYXBoUUwgQVBJXG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcblxuY29uc3QgQUxMQU5JTUVfR1JBUEhRTF9FTkRQT0lOVCA9ICdodHRwczovL2FwaS5hbGxhbmltZS5kYXkvYXBpJztcblxuY29uc3QgYXBwID0gZXhwcmVzcygpO1xuYXBwLnVzZShleHByZXNzLmpzb24oKSk7XG5cbmFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlJyk7XG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmVuZCgpO1xuICB9XG4gIG5leHQoKTtcbn0pO1xuXG5jb25zdCByb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xucm91dGVyLnVzZShleHByZXNzLmpzb24oKSk7XG5cbmNvbnN0IFJFUVVJUkVEX0hFQURFUlMgPSB7XG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICdSZWZlcmVyJzogJ2h0dHBzOi8vYWxsbWFuZ2EudG8nLFxuICAnVXNlci1BZ2VudCc6ICdNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KScsXG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgR3JhcGhRTCByZXF1ZXN0IGFnYWluc3QgQWxsQW5pbWUgQVBJXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVHcmFwaFFMKHF1ZXJ5LCB2YXJpYWJsZXMgPSB7fSkge1xuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEFMTEFOSU1FX0dSQVBIUUxfRU5EUE9JTlQsIHtcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICBoZWFkZXJzOiBSRVFVSVJFRF9IRUFERVJTLFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgcXVlcnksIHZhcmlhYmxlcyB9KSxcbiAgfSk7XG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBBbGxBbmltZSBHcmFwaFFMIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke2Vycm9yVGV4dCB8fCByZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICB9XG5cbiAgY29uc3QganNvbiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgaWYgKGpzb24uZXJyb3JzICYmIGpzb24uZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEFsbEFuaW1lIEdyYXBoUUwgRXJyb3I6ICR7anNvbi5lcnJvcnNbMF0/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gR3JhcGhRTCBlcnJvcid9YCk7XG4gIH1cblxuICByZXR1cm4ganNvbi5kYXRhO1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgR2VuZXJpYyBHcmFwaFFMIHByb3h5IGVuZHBvaW50IFx1MjUwMFx1MjUwMFxucm91dGVyLnBvc3QoJy9ncmFwaHFsJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBxdWVyeSwgdmFyaWFibGVzIH0gPSByZXEuYm9keSB8fCB7fTtcbiAgICBpZiAoIXF1ZXJ5KSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ1F1ZXJ5IGlzIHJlcXVpcmVkLicgfSk7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBleGVjdXRlR3JhcGhRTChxdWVyeSwgdmFyaWFibGVzKTtcbiAgICByZXMuanNvbih7IGRhdGEgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICB9XG59KTtcblxuLy8gXHUyNTAwXHUyNTAwIFNob3cgSUQgTG9va3VwIGVuZHBvaW50IFx1MjUwMFx1MjUwMFxucm91dGVyLnBvc3QoJy9zaG93cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgdGl0bGUsIGxpbWl0ID0gMTAsIHBhZ2UgPSAxIH0gPSByZXEuYm9keSB8fCB7fTtcbiAgICBpZiAoIXRpdGxlKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ1RpdGxlIGlzIHJlcXVpcmVkLicgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnkgPSBgXG4gICAgICBxdWVyeSAoJHNlYXJjaDogU2VhcmNoSW5wdXQsICRsaW1pdDogSW50LCAkcGFnZTogSW50KSB7XG4gICAgICAgIHNob3dzKHNlYXJjaDogJHNlYXJjaCwgbGltaXQ6ICRsaW1pdCwgcGFnZTogJHBhZ2UpIHtcbiAgICAgICAgICBlZGdlcyB7XG4gICAgICAgICAgICBfaWRcbiAgICAgICAgICAgIG5hbWVcbiAgICAgICAgICAgIGVuZ2xpc2hOYW1lXG4gICAgICAgICAgICBhdmFpbGFibGVFcGlzb2Rlc0RldGFpbFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIGA7XG5cbiAgICBjb25zdCB2YXJpYWJsZXMgPSB7XG4gICAgICBzZWFyY2g6IHsgcXVlcnk6IHRpdGxlIH0sXG4gICAgICBsaW1pdDogTnVtYmVyKGxpbWl0KSB8fCAxMCxcbiAgICAgIHBhZ2U6IE51bWJlcihwYWdlKSB8fCAxLFxuICAgIH07XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZXhlY3V0ZUdyYXBoUUwocXVlcnksIHZhcmlhYmxlcyk7XG4gICAgY29uc3Qgc2hvd3MgPSBkYXRhPy5zaG93cz8uZWRnZXMgfHwgW107XG4gICAgcmVzLmpzb24oeyBzaG93cyB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gIH1cbn0pO1xuXG4vLyBcdTI1MDBcdTI1MDAgRXBpc29kZSBTb3VyY2UgRmV0Y2hlciBlbmRwb2ludCBcdTI1MDBcdTI1MDBcbnJvdXRlci5wb3N0KCcvZXBpc29kZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgc2hvd0lkLCB0cmFuc2xhdGlvblR5cGUgPSAnc3ViJywgZXBpc29kZVN0cmluZyA9ICcxJyB9ID0gcmVxLmJvZHkgfHwge307XG4gICAgaWYgKCFzaG93SWQpIHtcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnc2hvd0lkIGlzIHJlcXVpcmVkLicgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnkgPSBgXG4gICAgICBxdWVyeSAoJHNob3dJZDogU3RyaW5nISwgJHRyYW5zbGF0aW9uVHlwZTogVHJhbnNsYXRpb25UeXBlISwgJGVwaXNvZGVTdHJpbmc6IFN0cmluZyEpIHtcbiAgICAgICAgZXBpc29kZShzaG93SWQ6ICRzaG93SWQsIHRyYW5zbGF0aW9uVHlwZTogJHRyYW5zbGF0aW9uVHlwZSwgZXBpc29kZVN0cmluZzogJGVwaXNvZGVTdHJpbmcpIHtcbiAgICAgICAgICBzb3VyY2VVcmxzXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgO1xuXG4gICAgY29uc3QgdmFyaWFibGVzID0ge1xuICAgICAgc2hvd0lkOiBTdHJpbmcoc2hvd0lkKSxcbiAgICAgIHRyYW5zbGF0aW9uVHlwZTogU3RyaW5nKHRyYW5zbGF0aW9uVHlwZSkudG9Mb3dlckNhc2UoKSA9PT0gJ2R1YicgPyAnZHViJyA6ICdzdWInLFxuICAgICAgZXBpc29kZVN0cmluZzogU3RyaW5nKGVwaXNvZGVTdHJpbmcpLFxuICAgIH07XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZXhlY3V0ZUdyYXBoUUwocXVlcnksIHZhcmlhYmxlcyk7XG4gICAgY29uc3Qgc291cmNlVXJscyA9IGRhdGE/LmVwaXNvZGU/LnNvdXJjZVVybHMgfHwgW107XG4gICAgcmVzLmpzb24oeyBzb3VyY2VVcmxzIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgfVxufSk7XG5cbi8vIFx1MjUwMFx1MjUwMCBDbG9jayBVUkwgcmVzb2x2ZXIgcHJveHkgZW5kcG9pbnQgXHUyNTAwXHUyNTAwXG5yb3V0ZXIuYWxsKCcvY2xvY2snLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgdHJ5IHtcbiAgICBsZXQgdGFyZ2V0VXJsID0gcmVxLnF1ZXJ5LnVybCB8fCByZXEuYm9keT8udXJsO1xuICAgIGlmICghdGFyZ2V0VXJsKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ3VybCBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQuJyB9KTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0VXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgdGFyZ2V0VXJsID0gYGh0dHBzOi8vYWxsYW5pbWUuZGF5JHt0YXJnZXRVcmx9YDtcbiAgICB9XG5cbiAgICBjb25zdCBjbG9ja1JlcyA9IGF3YWl0IGZldGNoKHRhcmdldFVybCwge1xuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ1JlZmVyZXInOiAnaHR0cHM6Ly9hbGxtYW5nYS50bycsXG4gICAgICAgICdVc2VyLUFnZW50JzogJ01vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoIWNsb2NrUmVzLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENsb2NrIEhUVFAgJHtjbG9ja1Jlcy5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgY29uc3QganNvbiA9IGF3YWl0IGNsb2NrUmVzLmpzb24oKTtcbiAgICByZXMuanNvbihqc29uKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gIH1cbn0pO1xuXG5hcHAudXNlKCcvYXBpL2FsbGFuaW1lJywgcm91dGVyKTtcbmFwcC51c2UoJy8nLCByb3V0ZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBhcHA7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1SLFNBQVMsb0JBQW9CO0FBQ2hULE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7OztBQ0FqQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxrQkFBa0I7QUFFekIsSUFBTSxjQUFjO0FBRXBCLElBQU0sTUFBTSxRQUFRO0FBRXBCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQzFCLE1BQUksVUFBVSwrQkFBK0IsR0FBRztBQUNoRCxNQUFJLFVBQVUsZ0NBQWdDLG9CQUFvQjtBQUNsRSxNQUFJLFVBQVUsZ0NBQWdD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QUFDLENBQUMsUUFBUSxJQUFJLFNBQVMsU0FBUyxXQUFXLFFBQVEsSUFBSSx3QkFBd0I7QUFFcEcsUUFBTSxrQkFDSixDQUFDLENBQUMsUUFBUSxJQUFJLFlBQ2QsUUFBUSxJQUFJLHFCQUFxQixXQUFXLFVBQVUsS0FDckQsWUFBWSxZQUFZLFNBQVMsY0FBYyxDQUFDLENBQUMsUUFBUSxJQUFJO0FBRWhFLFFBQU0sY0FBYyxRQUFRLElBQUksYUFBYSxRQUFRLElBQUksaUJBQWlCO0FBRTFFLFFBQU0sT0FBTyxZQUFZLFVBQ3JCLE1BQ0MsbUJBQW1CLGVBQ2xCLE9BQ0E7QUFFTixNQUFJLFlBQVksU0FBUztBQUN2QixZQUFRLElBQUksNEJBQTRCLElBQUksZ0JBQWdCLGVBQWUsWUFBWSxZQUFZLEdBQUc7QUFBQSxFQUN4RztBQUVBLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixnQkFBZ0IsUUFBUTtBQUN0QixpQkFBTyxZQUFZLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUN6QyxnQkFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJLFdBQVcsWUFBWSxHQUFHO0FBQy9DLHFCQUFPLGNBQVksS0FBSyxLQUFLLElBQUk7QUFBQSxZQUNuQztBQUNBLGdCQUFJLElBQUksT0FBTyxJQUFJLElBQUksV0FBVyxlQUFlLEdBQUc7QUFDbEQscUJBQU8saUJBQWUsS0FBSyxLQUFLLElBQUk7QUFBQSxZQUN0QztBQUNBLGlCQUFLO0FBQUEsVUFDUCxDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLE1BQ1osT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUSxDQUFDLFFBQVE7QUFFZixnQkFBSSxJQUFJLFFBQVEsSUFBSSxJQUFJLFdBQVcsWUFBWSxLQUFLLElBQUksSUFBSSxXQUFXLGVBQWUsSUFBSTtBQUN4RixxQkFBTyxJQUFJO0FBQUEsWUFDYjtBQUFBLFVBQ0Y7QUFBQSxVQUNBLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxVQUFVLE1BQU07QUFBQSxRQUM1QztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRLGVBQWUsZUFBZTtBQUFBLE1BQ3RDLGVBQWU7QUFBQSxRQUNiLFVBQVUsa0JBQWtCLENBQUMsVUFBVSxJQUFJLENBQUM7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsiZXhwcmVzcyIsICJhcHAiLCAiZXhwcmVzcyIsICJyb3V0ZXIiXQp9Cg==
