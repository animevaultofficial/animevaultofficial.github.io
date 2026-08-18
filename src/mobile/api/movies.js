const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint) {
  try {
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', 'en-US');
    const res = await fetch(url.toString());
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
  if (mediaType === 'movie') return fetchMovieDetails(tmdbId);
  else return fetchTVDetails(tmdbId);
}

// ── Player Sources (matching web version) ──
// Primary: Videasy (same as web's playerSources.js)
// Fallbacks: VidSrc, VidKing

export const EMBED_SERVERS = [
  {
    name: 'Videasy',
    colorParam: 'color',
    params: { overlay: 'true' },
    movie: (id) => `https://player.videasy.net/movie/${id}`,
    tv: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidSrc',
    movie: (id) => `https://vidsrc.sbs/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.sbs/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidKing',
    colorParam: 'color',
    params: { autoPlay: 'true' },
    movie: (id) => `https://www.vidking.net/embed/movie/${id}`,
    tv: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Vidnest',
    movie: (id) => `https://vidnest.fun/movie/${id}`,
    tv: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
  },

];

export function getPlayerUrl(mediaType, tmdbId, season, episode, serverIndex = 0, accentColor = null) {
  const server = EMBED_SERVERS[serverIndex] || EMBED_SERVERS[0];
  let url;
  if (mediaType === 'movie') {
    url = server.movie(tmdbId);
  } else {
    url = server.tv(tmdbId, season || 1, episode || 1);
  }
  // Add accent color if supported
  if (accentColor && server.colorParam) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set(server.colorParam, accentColor.replace(/^#/, ''));
      // Add any extra params
      if (server.params) {
        Object.entries(server.params).forEach(([k, v]) => parsed.searchParams.set(k, v));
      }
      return parsed.toString();
    } catch { return url; }
  }
  return url;
}
