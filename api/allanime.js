// api/allanime.js
// Express API handler / Vercel serverless proxy for AllAnime GraphQL API
import express from 'express';

const ALLANIME_GRAPHQL_ENDPOINT = 'https://api.allanime.day/api';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const router = express.Router();
router.use(express.json());

const REQUIRED_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://allmanga.to',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

/**
 * Execute GraphQL request against AllAnime API
 */
async function executeGraphQL(query, variables = {}) {
  let activeQuery = query || '';
  if (activeQuery.includes('TranslationType!') && !activeQuery.includes('VaildTranslationTypeEnumType!')) {
    activeQuery = activeQuery.replace('TranslationType!', 'VaildTranslationTypeEnumType!');
  }

  let response = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: REQUIRED_HEADERS,
    body: JSON.stringify({ query: activeQuery, variables }),
  });

  if (!response.ok && activeQuery.includes('VaildTranslationTypeEnumType!')) {
    const fallbackQuery = activeQuery.replace('VaildTranslationTypeEnumType!', 'TranslationType!');
    const retryRes = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: REQUIRED_HEADERS,
      body: JSON.stringify({ query: fallbackQuery, variables }),
    });
    if (retryRes.ok) response = retryRes;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AllAnime GraphQL HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`AllAnime GraphQL Error: ${json.errors[0]?.message || 'Unknown GraphQL error'}`);
  }

  return json.data;
}

// ── Generic GraphQL proxy endpoint ──
router.post('/graphql', async (req, res) => {
  try {
    const { query, variables } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    const data = await executeGraphQL(query, variables);
    res.json({ data });
  } catch (err) {
    res.json({ data: null, error: err.message });
  }
});

// ── Show ID Lookup endpoint ──
router.post('/shows', async (req, res) => {
  try {
    const { title, limit = 10, page = 1 } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
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
      page: Number(page) || 1,
    };

    const data = await executeGraphQL(query, variables);
    const shows = data?.shows?.edges || [];
    res.json({ shows });
  } catch (err) {
    res.json({ shows: [], error: err.message });
  }
});

// ── Episode Source Fetcher endpoint ──
router.post('/episode', async (req, res) => {
  try {
    const { showId, translationType = 'sub', episodeString = '1' } = req.body || {};
    if (!showId) {
      return res.status(400).json({ error: 'showId is required.' });
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
      translationType: String(translationType).toLowerCase() === 'dub' ? 'dub' : 'sub',
      episodeString: String(episodeString),
    };

    const data = await executeGraphQL(query, variables);
    const sourceUrls = data?.episode?.sourceUrls || [];
    res.json({ sourceUrls });
  } catch (err) {
    res.json({ sourceUrls: [], error: err.message });
  }
});

// ── Clock URL resolver proxy endpoint ──
router.all('/clock', async (req, res) => {
  try {
    let targetUrl = req.query.url || req.body?.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'url parameter is required.' });
    }

    if (targetUrl.startsWith('/')) {
      targetUrl = `https://allanime.day${targetUrl}`;
    }

    const clockRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Referer': 'https://allmanga.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
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

app.use('/api/allanime', router);
app.use('/', router);

export default app;
