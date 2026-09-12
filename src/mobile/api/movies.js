const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const MEDIA_SOURCE_API = import.meta.env.VITE_MEDIA_SOURCE_API || '';
const TMDB_TIMEOUT_MS = 10000;
const MEDIA_SOURCE_TIMEOUT_MS = 20000;

export const MEDIA_SOURCE_PROVIDERS = [
  { id: 'videasy', name: 'Videasy', default: true },
  { id: 'vidsrc', name: 'VidSrc', default: false },
  { id: 'vidnest', name: 'Vidnest', default: false },
];

export const DEFAULT_MEDIA_SOURCE_PROVIDER = 'videasy';

async function tmdbFetch(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  try {
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', 'en-US');
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMovieDetails(tmdbId) {
  return tmdbFetch(`/movie/${encodeURIComponent(String(tmdbId))}`);
}

export async function fetchTVDetails(tmdbId) {
  return tmdbFetch(`/tv/${encodeURIComponent(String(tmdbId))}`);
}

export async function fetchTVSeasonDetails(tmdbId, season) {
  return tmdbFetch(`/tv/${encodeURIComponent(String(tmdbId))}/season/${encodeURIComponent(String(season))}`);
}

export async function fetchLatestMovies(page = 1) {
  return tmdbFetch(`/trending/movie/week?page=${page}`);
}

export async function fetchLatestTVShows(page = 1) {
  return tmdbFetch(`/trending/tv/week?page=${page}`);
}

export async function searchMoviesAndSeries(query, page = 1) {
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`);
  return data?.results?.filter(r => r.media_type === 'movie' || r.media_type === 'tv') || [];
}

export async function fetchMediaMeta(mediaType, tmdbId) {
  return mediaType === 'movie' ? fetchMovieDetails(tmdbId) : fetchTVDetails(tmdbId);
}

export async function findMediaByTitle(title, mediaType) {
  const query = String(title || '').trim();
  if (!query) return null;
  const results = await searchMoviesAndSeries(query);
  const wanted = mediaType === 'movie' ? 'movie' : 'tv';
  const typed = results.filter(item => item?.media_type === wanted && item?.id != null);
  if (!typed.length) return null;
  const normalized = query.toLowerCase();
  return typed.find(item => String(item.title || item.name || '').toLowerCase() === normalized) || typed[0];
}

function extractDirectUrl(data) {
  if (!data || typeof data !== 'object') return '';
  const candidates = [
    data.url,
    data.source,
    data.stream,
    data.file,
    data.mediaUrl,
    data.media_url,
    data.playbackUrl,
    data.playback_url,
    data?.data?.url,
    data?.data?.source,
    data?.data?.stream,
    data?.result?.url,
    data?.result?.source,
    Array.isArray(data.sources) ? data.sources.find(item => typeof item === 'string') : '',
    Array.isArray(data.sources) ? data.sources.find(item => item && typeof item.url === 'string')?.url : '',
    Array.isArray(data?.data?.sources) ? data.data.sources.find(item => typeof item === 'string') : '',
    Array.isArray(data?.data?.sources) ? data.data.sources.find(item => item && typeof item.url === 'string')?.url : '',
  ];
  return candidates.find(value => typeof value === 'string' && /^https?:\/\//i.test(value)) || '';
}

// Resolve a direct media URL from AnimeVault's configured, authorized media-source backend.
// The native Android player intentionally accepts only direct MP4/HLS/WebM/OGG media URLs;
// provider pages/iframes are not converted in the client.
export async function resolveDirectMediaSource(mediaType, tmdbId, season = null, episode = null, provider = DEFAULT_MEDIA_SOURCE_PROVIDER) {
  if (!MEDIA_SOURCE_API) {
    throw new Error('Media source backend is not configured in this APK build (VITE_MEDIA_SOURCE_API is missing).');
  }

  const selectedProvider = MEDIA_SOURCE_PROVIDERS.some(item => item.id === provider)
    ? provider
    : DEFAULT_MEDIA_SOURCE_PROVIDER;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_SOURCE_TIMEOUT_MS);
  try {
    const url = new URL(MEDIA_SOURCE_API, window.location.origin);
    url.searchParams.set('type', mediaType === 'movie' ? 'movie' : 'tv');
    url.searchParams.set('tmdbId', String(tmdbId));
    url.searchParams.set('provider', selectedProvider);
    if (mediaType !== 'movie') {
      url.searchParams.set('season', String(season || 1));
      url.searchParams.set('episode', String(episode || 1));
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const message = data?.error || data?.message || `Media source backend returned HTTP ${res.status}.`;
      throw new Error(String(message));
    }

    const directUrl = extractDirectUrl(data);
    if (!directUrl) {
      throw new Error(`Media source backend returned no direct media URL for ${selectedProvider}.`);
    }
    return directUrl;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Media source backend timed out after ${MEDIA_SOURCE_TIMEOUT_MS / 1000}s.`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
