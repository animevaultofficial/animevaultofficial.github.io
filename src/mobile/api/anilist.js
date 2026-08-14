import {
  fetchTrendingMedia,
  fetchAnimeById,
  fetchAnimeBySeason as fetchSeasonFromWeb,
  searchAnime as searchAnimeFromWeb,
  stripHtml as stripHtmlFromWeb,
} from '../../api/anilist';

async function safeFetch(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[AnimeVault Mobile] ${label} failed:`, err?.message || err);
    return fallback;
  }
}

export async function fetchHomeData() {
  const [trending, popular, upcoming] = await Promise.all([
    safeFetch('trending anime fetch', () => fetchTrendingMedia('ANIME', 1, 15), []),
    safeFetch('popular anime fetch', () => searchAnimeFromWeb('', 'ANIME', null, 1, 20, 'POPULARITY'), []),
    safeFetch('upcoming anime fetch', () => searchAnimeFromWeb('', 'ANIME', null, 1, 20, 'POPULARITY', 'NOT_YET_RELEASED'), []),
  ]);

  return {
    trending: { media: trending || [] },
    popular: { media: popular || [] },
    upcoming: { media: upcoming || [] },
  };
}

export async function fetchAnimeDetail(id) {
  const media = await fetchAnimeById(id);
  return { Media: media };
}

export async function fetchAnimeBySeason(season, year, page = 1, perPage = 20) {
  return safeFetch('seasonal anime fetch', () => fetchSeasonFromWeb(season, year, page, perPage), []);
}

const SORT_MAP = {
  TRENDING_DESC: 'TRENDING',
  POPULARITY_DESC: 'POPULARITY',
  SCORE_DESC: 'SCORE',
  FAVOURITES_DESC: 'FAVOURITES',
  UPDATED_AT_DESC: 'UPDATED',
};

export async function searchAnime(query, genre = null, sort = 'TRENDING_DESC', status = 'All', year = 'All', page = 1) {
  const mappedSort = SORT_MAP[sort] || sort || 'TRENDING';
  return safeFetch(
    'anime search fetch',
    () => searchAnimeFromWeb(query, 'ANIME', genre || null, page, 40, mappedSort, status, year),
    [],
  );
}


export function getTitle(media) {
  return media?.title?.english || media?.title?.romaji || media?.title?.native || 'Unknown';
}

export function getImage(media, size = 'large') {
  return media?.coverImage?.[size === 'large' ? 'extraLarge' : 'large'] || media?.coverImage?.large || media?.coverImage?.medium || null;
}

export function stripHtml(html) {
  return stripHtmlFromWeb(html || '');
}
