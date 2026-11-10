const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = '288d312680f3117dd4c56964be6809dc';
const ANILIST = 'https://graphql.anilist.co';
const MEDIA_RESOLVER = import.meta.env.VITE_MEDIA_SOURCE_API || '';

const tmdbImage = (path, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
const textTitle = item => item?.title?.english || item?.title?.romaji || item?.title?.native || item?.name || item?.title || 'Untitled';

async function fetchTimed(input, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function tmdb(path) {
  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  const response = await fetchTimed(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return response.json();
}

async function aniList(query, variables = {}) {
  const response = await fetchTimed(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Anime catalog request failed (${response.status}).`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Anime catalog request failed.');
  return payload.data;
}

function shapeTMDB(item, type) {
  const mediaType = item.media_type || type;
  return {
    id: item.id,
    key: `${mediaType}-${item.id}`,
    type: mediaType,
    title: item.title || item.name || 'Untitled',
    poster: tmdbImage(item.poster_path),
    backdrop: tmdbImage(item.backdrop_path, 'w1280'),
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    overview: item.overview || '',
    rating: Number(item.vote_average || 0),
    genres: item.genre_ids || [],
  };
}

function shapeAnime(item) {
  return {
    id: item.id,
    key: `anime-${item.id}`,
    type: 'anime',
    title: textTitle(item),
    poster: item.coverImage?.extraLarge || item.coverImage?.large || '',
    backdrop: item.bannerImage || item.coverImage?.extraLarge || '',
    year: item.seasonYear || '',
    overview: String(item.description || '').replace(/<[^>]*>/g, ''),
    rating: Number(item.averageScore || 0) / 10,
    genres: item.genres || [],
    episodes: item.episodes,
  };
}

const MEDIA_LIST_QUERY = `query ($sort: [MediaSort], $perPage: Int) { Page(perPage: $perPage) { media(type: ANIME, sort: $sort, isAdult: false) { id title { english romaji native } coverImage { extraLarge large } bannerImage seasonYear averageScore genres episodes } } }`;

export async function getHomeCatalog() {
  const [movies, shows, anime] = await Promise.allSettled([
    tmdb('/trending/movie/week'),
    tmdb('/trending/tv/week'),
    aniList(MEDIA_LIST_QUERY, { sort: ['TRENDING_DESC'], perPage: 18 }),
  ]);
  const movieItems = movies.status === 'fulfilled' ? (movies.value.results || []).map(item => shapeTMDB(item, 'movie')) : [];
  const showItems = shows.status === 'fulfilled' ? (shows.value.results || []).map(item => shapeTMDB(item, 'tv')) : [];
  const animeItems = anime.status === 'fulfilled' ? (anime.value.Page.media || []).map(shapeAnime) : [];
  return { movies: movieItems, shows: showItems, anime: animeItems, featured: movieItems[0] || showItems[0] || animeItems[0] || null };
}

export async function searchCatalog(query, type = 'all') {
  const value = String(query || '').trim();
  if (!value) return [];
  const tasks = [];
  if (type === 'all' || type === 'movie' || type === 'tv') {
    tasks.push(tmdb(`/search/multi?query=${encodeURIComponent(value)}&include_adult=false`).then(result => (result.results || [])
      .filter(item => ['movie', 'tv'].includes(item.media_type))
      .filter(item => type === 'all' || item.media_type === type)
      .map(item => shapeTMDB(item, item.media_type))));
  }
  if (type === 'all' || type === 'anime') {
    const queryText = `query ($search: String) { Page(perPage: 20) { media(type: ANIME, search: $search, isAdult: false, sort: POPULARITY_DESC) { id title { english romaji native } coverImage { extraLarge large } bannerImage seasonYear averageScore genres episodes } } }`;
    tasks.push(aniList(queryText, { search: value }).then(result => result.Page.media.map(shapeAnime)));
  }
  const results = await Promise.allSettled(tasks);
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}

export async function getDetails(item) {
  if (item.type === 'anime') {
    const result = await aniList(`query ($id: Int) { Media(id: $id, type: ANIME) { id title { english romaji native } coverImage { extraLarge large } bannerImage seasonYear averageScore genres episodes description studios { nodes { name } } } }`, { id: Number(item.id) });
    return shapeAnime(result.Media);
  }
  const result = await tmdb(`/${item.type}/${item.id}?append_to_response=credits,videos`);
  return { ...shapeTMDB({ ...result, media_type: item.type }, item.type), genres: (result.genres || []).map(genre => genre.name), cast: (result.credits?.cast || []).slice(0, 8), seasons: result.seasons || [] };
}

export async function getEpisodeList(id, season = 1) {
  const result = await tmdb(`/tv/${id}/season/${season}`);
  return result.episodes || [];
}

export async function getPlaybackSource(item, provider, season = 1, episode = 1) {
  if (MEDIA_RESOLVER) {
    const url = new URL(MEDIA_RESOLVER, window.location.origin);
    url.searchParams.set('type', item.type === 'movie' ? 'movie' : 'tv');
    url.searchParams.set('tmdbId', String(item.id));
    url.searchParams.set('provider', provider);
    if (item.type !== 'movie') { url.searchParams.set('season', String(season)); url.searchParams.set('episode', String(episode)); }
    const response = await fetchTimed(url, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `The playback resolver returned ${response.status}.`);
    if (!data.url) throw new Error(data.message || 'The resolver did not return a stream for this provider.');
    let resolvedUrl;
    try { resolvedUrl = new URL(data.url, window.location.origin); }
    catch { throw new Error('The playback resolver returned an invalid URL.'); }
    if (!['https:', 'http:'].includes(resolvedUrl.protocol)) throw new Error('The playback resolver returned an unsupported URL.');
    const isDirectMedia = /\.(m3u8|mp4|webm|ogg)(?:$|\?)/i.test(resolvedUrl.href) || /m3u8|mpegurl|^(hls|video|mp4|webm)$/i.test(data.type || '');
    return { url: resolvedUrl.href, type: provider === 'vidsrc' && !isDirectMedia ? 'external' : data.type || 'embed' };
  }
  const id = encodeURIComponent(item.id);
  if (provider === 'videasy') return { url: item.type === 'movie' ? `https://player.videasy.ws/embed/movie/${id}` : `https://player.videasy.ws/embed/tv/${id}/${season}/${episode}`, type: 'embed' };
  if (provider === 'vidnest') return { url: item.type === 'movie' ? `https://vidnest.fun/movie/${id}` : `https://vidnest.fun/tv/${id}/${season}/${episode}`, type: 'embed' };
  if (provider === 'vidsrc') return { url: item.type === 'movie' ? `https://vidsrc.tw/embed/movie/${id}` : `https://vidsrc.tw/embed/tv/${id}/${season}/${episode}`, type: 'external' };
  throw new Error('Choose a supported provider to continue.');
}

export const PROVIDERS = [
  { id: 'videasy', label: 'Videasy' },
  { id: 'vidnest', label: 'Vidnest' },
  { id: 'vidsrc', label: 'VidSrc', mode: 'external' },
];
