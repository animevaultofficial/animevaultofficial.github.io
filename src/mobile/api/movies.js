const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const MEDIA_SOURCE_API = import.meta.env.VITE_MEDIA_SOURCE_API || '';

export const MEDIA_SOURCE_PROVIDERS = [
  { id: 'videasy', name: 'Videasy', default: true },
  { id: 'vidsrc', name: 'VidSrc', default: false },
  { id: 'vidnest', name: 'Vidnest', default: false },
];

export const DEFAULT_MEDIA_SOURCE_PROVIDER = 'videasy';

async function tmdbFetch(endpoint) {
  try {
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', 'en-US');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchMovieDetails(tmdbId) {
  return tmdbFetch(`/movie/${tmdbId}`);
}

export async function fetchTVDetails(tmdbId) {
  return tmdbFetch(`/tv/${tmdbId}`);
}

export async function fetchTVSeasonDetails(tmdbId, season) {
  return tmdbFetch(`/tv/${tmdbId}/season/${season}`);
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

// AnimeVault source resolver.
// Providers are selected by AnimeVault, while the backend must return a
// direct media URL that the native player can legally play (MP4/HLS/etc.).
// The frontend never converts provider pages into media streams.
export async function resolveDirectMediaSource(mediaType, tmdbId, season = null, episode = null, provider = DEFAULT_MEDIA_SOURCE_PROVIDER) {
  if (!MEDIA_SOURCE_API) return null;

  const selectedProvider = MEDIA_SOURCE_PROVIDERS.some(item => item.id === provider)
    ? provider
    : DEFAULT_MEDIA_SOURCE_PROVIDER;

  try {
    const url = new URL(MEDIA_SOURCE_API, window.location.origin);
    url.searchParams.set('type', mediaType === 'movie' ? 'movie' : 'tv');
    url.searchParams.set('tmdbId', String(tmdbId));
    url.searchParams.set('provider', selectedProvider);
    if (mediaType !== 'movie') {
      url.searchParams.set('season', String(season || 1));
      url.searchParams.set('episode', String(episode || 1));
    }

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
}
