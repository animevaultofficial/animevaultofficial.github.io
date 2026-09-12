const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const MEDIA_SOURCE_API = import.meta.env.VITE_MEDIA_SOURCE_API || '';
const TMDB_TIMEOUT_MS = 10000;

export const MEDIA_SOURCE_PROVIDERS = [
  { id: 'vidsrc', name: 'VidSrc', default: true },
  { id: 'vidnest', name: 'Vidnest', default: false },
  { id: 'videasy', name: 'Videasy', default: false },
];
export const DEFAULT_MEDIA_SOURCE_PROVIDER = 'vidsrc';

async function tmdbFetch(endpoint) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  try { const url = new URL(`${TMDB_BASE}${endpoint}`); url.searchParams.set('api_key', TMDB_API_KEY); url.searchParams.set('language', 'en-US'); const res = await fetch(url.toString(), { signal: controller.signal }); if (!res.ok) return null; return await res.json(); }
  catch { return null; } finally { clearTimeout(timer); }
}
export async function fetchMovieDetails(tmdbId) { return tmdbFetch(`/movie/${encodeURIComponent(String(tmdbId))}`); }
export async function fetchTVDetails(tmdbId) { return tmdbFetch(`/tv/${encodeURIComponent(String(tmdbId))}`); }
export async function fetchTVSeasonDetails(tmdbId, season) { return tmdbFetch(`/tv/${encodeURIComponent(String(tmdbId))}/season/${encodeURIComponent(String(season))}`); }
export async function fetchLatestMovies(page = 1) { return tmdbFetch(`/trending/movie/week?page=${page}`); }
export async function fetchLatestTVShows(page = 1) { return tmdbFetch(`/trending/tv/week?page=${page}`); }
export async function searchMoviesAndSeries(query, page = 1) { const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`); return data?.results?.filter(r => r.media_type === 'movie' || r.media_type === 'tv') || []; }
export async function fetchMediaMeta(mediaType, tmdbId) { return mediaType === 'movie' ? fetchMovieDetails(tmdbId) : fetchTVDetails(tmdbId); }
export async function findMediaByTitle(title, mediaType) { const query = String(title || '').trim(); if (!query) return null; const results = await searchMoviesAndSeries(query); const wanted = mediaType === 'movie' ? 'movie' : 'tv'; const typed = results.filter(item => item?.media_type === wanted && item?.id != null); if (!typed.length) return null; const normalized = query.toLowerCase(); return typed.find(item => String(item.title || item.name || '').toLowerCase() === normalized) || typed[0]; }

export function buildEmbedSource(mediaType, tmdbId, season = 1, episode = 1, provider = DEFAULT_MEDIA_SOURCE_PROVIDER) {
  const id = String(tmdbId || '').trim(); if (!/^\d+$/.test(id)) return '';
  const type = mediaType === 'movie' ? 'movie' : 'tv'; const s = Math.max(1, Number(season) || 1); const e = Math.max(1, Number(episode) || 1);
  if (provider === 'vidnest') return type === 'movie' ? `https://vidnest.fun/movie/${id}` : `https://vidnest.fun/tv/${id}/${s}/${e}`;
  if (provider === 'videasy') return type === 'movie' ? `https://player.videasy.net/movie/${id}` : `https://player.videasy.net/tv/${id}/${s}/${e}`;
  return type === 'movie' ? `https://vidsrc.tw/embed/movie/${id}` : `https://vidsrc.tw/embed/tv/${id}/${s}/${e}`;
}

export async function resolveMediaSource(mediaType, tmdbId, season = null, episode = null, provider = DEFAULT_MEDIA_SOURCE_PROVIDER) {
  const direct = await resolveDirectMediaSource(mediaType, tmdbId, season, episode, provider);
  return direct || buildEmbedSource(mediaType, tmdbId, season, episode, provider);
}

export async function resolveDirectMediaSource(mediaType, tmdbId, season = null, episode = null, provider = DEFAULT_MEDIA_SOURCE_PROVIDER) {
  if (!MEDIA_SOURCE_API) return null;
  const selectedProvider = MEDIA_SOURCE_PROVIDERS.some(item => item.id === provider) ? provider : DEFAULT_MEDIA_SOURCE_PROVIDER;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);
  try {
    const url = new URL(MEDIA_SOURCE_API, window.location.origin); url.searchParams.set('type', mediaType === 'movie' ? 'movie' : 'tv'); url.searchParams.set('tmdbId', String(tmdbId)); url.searchParams.set('provider', selectedProvider);
    if (mediaType !== 'movie') { url.searchParams.set('season', String(season || 1)); url.searchParams.set('episode', String(episode || 1)); }
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal }); if (!res.ok) return null; const data = await res.json(); return typeof data?.url === 'string' ? data.url : null;
  } catch { return null; } finally { clearTimeout(timer); }
}
