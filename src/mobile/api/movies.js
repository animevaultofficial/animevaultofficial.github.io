const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const MEDIA_SOURCE_API = import.meta.env.VITE_MEDIA_SOURCE_API || '';

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

// Native-player source resolver.
// The endpoint must return a direct media URL, never an iframe/embed page.
// Expected JSON: { url: "https://your-cdn.example/video.m3u8" }
export async function resolveDirectMediaSource(mediaType, tmdbId, season = null, episode = null) {
  if (!MEDIA_SOURCE_API) return null;

  try {
    const url = new URL(MEDIA_SOURCE_API, window.location.origin);
    url.searchParams.set('type', mediaType === 'movie' ? 'movie' : 'tv');
    url.searchParams.set('tmdbId', String(tmdbId));
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
