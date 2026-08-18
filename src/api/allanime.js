/**
 * allanime.js — AllAnime GraphQL Client & Stream Source Decoder
 */

const LOCAL_API_BASE = '/api/allanime';
const DIRECT_GRAPHQL_ENDPOINT = 'https://api.allanime.day/api';

// Cache show IDs in memory to eliminate redundant searches
const showIdCache = new Map();

/**
 * Execute AllAnime GraphQL query via backend proxy or direct fetch with headers
 */
export async function queryAllAnime(query, variables = {}) {
  let activeQuery = query || '';
  if (activeQuery.includes('TranslationType!') && !activeQuery.includes('VaildTranslationTypeEnumType!')) {
    activeQuery = activeQuery.replace('TranslationType!', 'VaildTranslationTypeEnumType!');
  }

  // 1. Try local backend proxy endpoint
  try {
    const res = await fetch(`${LOCAL_API_BASE}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: activeQuery, variables }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.errors?.length) throw new Error(json.errors[0]?.message || 'AllAnime GraphQL error');
      if (json?.data) return json.data;
      if (json?.error) throw new Error(json.error);
      throw new Error('AllAnime GraphQL response returned no data.');
    }
  } catch (_) {
    // Fallback if local server middleware isn't present
  }

  // 2. Direct fetch with required headers
  try {
    const res = await fetch(DIRECT_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://allmanga.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({ query: activeQuery, variables }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.errors?.length) throw new Error(json.errors[0]?.message || 'AllAnime GraphQL error');
      if (json?.data) return json.data;
      if (json?.error) throw new Error(json.error);
      throw new Error('AllAnime GraphQL response returned no data.');
    }
  } catch (_) {}

  return null;
}

/**
 * 1. Show ID Lookup
 * Search AllAnime by title (primary or English) to get the show _id.
 */
export async function fetchShowId(title, englishTitle, romajiTitle) {
  if (!title && !englishTitle && !romajiTitle) return null;
  const cacheKey = `${title}_${englishTitle}_${romajiTitle}`;
  if (showIdCache.has(cacheKey)) {
    return showIdCache.get(cacheKey);
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

  const searchForTerm = async (term) => {
    if (!term) return null;
    // Clean search string (remove season brackets, special symbols)
    const cleanedTerm = term.replace(/\s*\([^)]*\)/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (!cleanedTerm) return null;

    const data = await queryAllAnime(query, {
      search: { query: cleanedTerm },
      limit: 10,
      page: 1,
    });
    const edges = data?.shows?.edges || [];
    if (!edges.length) return null;

    const termClean = cleanedTerm.toLowerCase().replace(/[^a-z0-9]/g, '');

    const scored = edges.map(show => {
      const nameClean = (show.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const engClean = (show.englishName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      let score = 0;
      if (nameClean === termClean || engClean === termClean) score = 10;
      else if (nameClean.includes(termClean) || engClean.includes(termClean) || termClean.includes(nameClean)) score = 7;
      else score = 3;

      return { show, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.show || null;
  };

  let match = await searchForTerm(englishTitle);
  if (!match) match = await searchForTerm(title);
  if (!match) match = await searchForTerm(romajiTitle);

  const showId = match?._id || null;
  if (showId) {
    showIdCache.set(cacheKey, showId);
  }
  return showId;
}

/**
 * 2. Episode Source Fetcher
 * Query raw sourceUrls for a given showId, translationType ("sub"/"dub"), and episodeString ("1", "2", etc.)
 */
export async function fetchRawEpisodeSources(showId, translationType = 'sub', episodeString = '1') {
  const query = `
    query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
      episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
        sourceUrls
      }
    }
  `;

  const variables = {
    showId: String(showId),
    translationType: translationType.toLowerCase() === 'dub' ? 'dub' : 'sub',
    episodeString: String(episodeString),
  };

  const data = await queryAllAnime(query, variables);
  return data?.episode?.sourceUrls || [];
}

/**
 * 3. Source Parsing & Decoding
 * Cleans hex/base64 encoded URLs and prefix tags (e.g., '--').
 */
export function decodeAllAnimeSourceUrl(rawUrlStr) {
  if (!rawUrlStr || typeof rawUrlStr !== 'string') return '';
  let str = rawUrlStr.trim();

  // Strip prefix tags like '--'
  if (str.startsWith('--')) {
    str = str.slice(2);

    // If remaining string is Hex encoded
    if (/^[0-9a-fA-F]+$/.test(str)) {
      try {
        let hexDecoded = '';
        for (let i = 0; i < str.length; i += 2) {
          hexDecoded += String.fromCharCode(parseInt(str.substr(i, 2), 16));
        }
        str = hexDecoded;
      } catch (_) {}
    }
  }

  // Check for base64 encoding if needed
  if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length > 20 && !str.startsWith('http') && !str.startsWith('/')) {
    try {
      const b64Decoded = atob(str);
      if (b64Decoded.startsWith('http') || b64Decoded.startsWith('/') || b64Decoded.includes('clock')) {
        str = b64Decoded;
      }
    } catch (_) {}
  }

  return str;
}

/**
 * Fetch and resolve `/clock` URL JSON to extract direct `.m3u8` links
 */
export async function resolveClockUrl(clockUrl) {
  let url = clockUrl;
  if (url.startsWith('/')) {
    url = `https://allanime.day${url}`;
  }

  // 1. Try local proxy
  try {
    const proxyRes = await fetch(`${LOCAL_API_BASE}/clock?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && json.links) return json.links;
    }
  } catch (_) {}

  // 2. Direct fetch
  try {
    const directRes = await fetch(url, {
      headers: {
        'Referer': 'https://allmanga.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (directRes.ok) {
      const json = await directRes.json();
      if (json && json.links) return json.links;
    }
  } catch (_) {}

  return [];
}

/**
 * Complete pipeline: Search, Fetch, Decode, and Parse stream sources for an episode
 * Returns array of formatted stream sources for VideoPlayer:
 * [
 *   { url, quality, type: 'hls'|'iframe', serverName, priority }
 * ]
 */
export async function getDecodedEpisodeSources(showId, translationType = 'sub', episodeString = '1') {
  const rawSources = await fetchRawEpisodeSources(showId, translationType, episodeString);
  if (!rawSources || !rawSources.length) return [];

  const parsedSources = [];

  for (let i = 0; i < rawSources.length; i++) {
    const item = rawSources[i];
    const rawUrl = typeof item === 'string' ? item : item.sourceUrl;
    const serverName = item.sourceName || item.name || `Server ${i + 1}`;
    const priority = item.priority || (i + 1);

    if (!rawUrl) continue;

    const decoded = decodeAllAnimeSourceUrl(rawUrl);
    if (!decoded) continue;

    // Check if it's a /clock link
    if (decoded.includes('/clock') || decoded.includes('clock?id=')) {
      const clockLinks = await resolveClockUrl(decoded);
      if (clockLinks && clockLinks.length > 0) {
        clockLinks.forEach(cl => {
          if (cl.link) {
            const isHls = cl.hls || cl.link.includes('.m3u8') || cl.link.includes('hls');
            if (isHls) {
              parsedSources.push({
                url: cl.link,
                quality: cl.resolutionStr || '1080p',
                type: 'hls',
                serverName: `${serverName} (${cl.resolutionStr || 'HLS'})`,
                priority,
              });
            }
          }
        });
        continue;
      }
    }

    // Direct stream link only - skip embed/iframe links
    const isHls = decoded.includes('.m3u8') || item.type === 'hls';

    parsedSources.push({
      url: decoded,
      quality: item.quality || '720p',
      type: 'hls',
      serverName: `${serverName} (HLS)`,
      priority,
    });
  }

  // Sort by priority
  parsedSources.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  return parsedSources;
}
