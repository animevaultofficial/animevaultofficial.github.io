// api/manga.js
// Vercel serverless function / Express API handler for MangaKakalot API
import express from 'express';
import mangakakalot from 'mangakakalot-api';

const ANILIST_API = 'https://graphql.anilist.co';

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/**
 * Server-side AniList fallback helper when MangaKakalot scrapers get Cloudflare 403 blocked
 */
async function fetchAniListFallback(sort = 'POPULARITY_DESC', page = 1, search = null) {
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

  const variables = search
    ? { search, page: Number(page) || 1 }
    : { page: Number(page) || 1, sort: [sort] };

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    return {
      mangas: mediaList.map(item => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.userPreferred || 'Manga',
        image: item.coverImage?.extraLarge || item.coverImage?.large,
        poster: item.coverImage?.large,
        latestChapter: item.chapters ? `Vol / ${item.chapters} Ch` : item.status || 'Ongoing',
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

const router = express.Router();

// Helper for chapter reading
const handleRead = async (req, res) => {
  try {
    const mangaId = req.params.mangaId;
    const chapterId = req.params.chapterId;
    const fn = mangakakalot.getChapterImages || mangakakalot.scrapeChapterImages;
    const data = await fn(mangaId, chapterId);
    if (data && !data.error) return res.json(data);
    res.json({ error: 'Chapter unavailable', images: [] });
  } catch (err) {
    res.json({ error: `Error fetching chapter: ${err.message || err}`, images: [] });
  }
};

router.get('/read/:mangaId/:chapterId', handleRead);
router.get('/read/:mangaId', handleRead);
router.get('/read', handleRead);

router.get('/details/:id', async (req, res) => {
  try {
    const fn = mangakakalot.getDetails || mangakakalot.scrapeMangaDetails;
    const data = await fn(req.params.id);
    if (data && data.title) return res.json(data);
    res.json({ error: 'Details unavailable' });
  } catch (err) {
    res.json({ error: `Error fetching details: ${err.message || err}` });
  }
});

const handleSearch = async (req, res) => {
  const query = req.params.query || 'attack on titan';
  const page = req.params.page || 1;
  try {
    const fn = mangakakalot.search || mangakakalot.scrapeMangaSearch;
    const data = await fn(query, page);
    if (data && ((data.mangas && data.mangas.length > 0) || (Array.isArray(data) && data.length > 0))) {
      return res.json(data);
    }
  } catch (err) {
    // ignore scraper error, proceed to fallback
  }
  const fallback = await fetchAniListFallback(null, page, query);
  res.json(fallback);
};

router.get('/search/:query/:page', handleSearch);
router.get('/search/:query', handleSearch);
router.get('/search', handleSearch);

const handleList = (listFnName, defaultScrapeName, fallbackSort) => async (req, res) => {
  const page = req.params.page || 1;
  try {
    const fn = mangakakalot[listFnName] || mangakakalot[defaultScrapeName];
    const data = await fn(page);
    if (data && ((data.mangas && data.mangas.length > 0) || (Array.isArray(data) && data.length > 0))) {
      return res.json(data);
    }
  } catch (err) {
    // ignore scraper error, proceed to fallback
  }
  const fallback = await fetchAniListFallback(fallbackSort, page);
  res.json(fallback);
};

router.get('/latest/:page', handleList('getLatest', 'scrapeLatestMangas', 'UPDATED_AT_DESC'));
router.get('/latest', handleList('getLatest', 'scrapeLatestMangas', 'UPDATED_AT_DESC'));

router.get('/popular/:page', handleList('getPopular', 'scrapePopularMangas', 'POPULARITY_DESC'));
router.get('/popular', handleList('getPopular', 'scrapePopularMangas', 'POPULARITY_DESC'));

router.get('/newest/:page', handleList('getNewest', 'scrapeNewestMangas', 'START_DATE_DESC'));
router.get('/newest', handleList('getNewest', 'scrapeNewestMangas', 'START_DATE_DESC'));

router.get('/completed/:page', handleList('getCompleted', 'scrapeCompletedMangas', 'FAVOURITES_DESC'));
router.get('/completed', handleList('getCompleted', 'scrapeCompletedMangas', 'FAVOURITES_DESC'));

router.get('/popular-now', async (req, res) => {
  try {
    const fn = mangakakalot.getPopularNow || mangakakalot.scrapePopularNowMangas;
    const data = await fn();
    if (data && Array.isArray(data) && data.length > 0) return res.json(data);
  } catch (err) {}
  const fallback = await fetchAniListFallback('POPULARITY_DESC', 1);
  res.json(fallback.mangas.slice(0, 10));
});

router.get('/home', async (req, res) => {
  try {
    const fn = mangakakalot.getHomePage || mangakakalot.scrapeHomePage;
    const data = await fn();
    if (data && ((data.mangas && data.mangas.length > 0) || data.popularNow || data.popularSlider)) {
      return res.json(data);
    }
  } catch (err) {}
  const popular = await fetchAniListFallback('POPULARITY_DESC', 1);
  const latest = await fetchAniListFallback('UPDATED_AT_DESC', 1);
  res.json({
    popularNow: popular.mangas.slice(0, 10),
    popularSlider: popular.mangas.slice(0, 10),
    mangas: latest.mangas
  });
});

app.use('/api/manga', router);
app.use('/', router);

export default app;
