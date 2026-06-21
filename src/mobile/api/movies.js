const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint) {
  try {
    const res = await fetch(`${TMDB_BASE}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`);
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

export function getPlayerUrl(mediaType, tmdbId, season, episode) {
  if (mediaType === 'movie') {
    return `https://vidsrc.to/embed/movie/${tmdbId}`;
  } else {
    return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
  }
}

const EMBED_SERVERS = [
  { name: 'VidSrc', movie: (id) => `https://vidsrc.to/embed/movie/${id}`, tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', movie: (id) => `https://www.2embed.cc/embed/${id}`, tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { name: 'SuperEmbed', movie: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`, tv: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: 'VidKing', movie: (id) => `https://vidking.ru/embed/movie/${id}`, tv: (id, s, e) => `https://vidking.ru/embed/tv/${id}/${s}/${e}` },
];