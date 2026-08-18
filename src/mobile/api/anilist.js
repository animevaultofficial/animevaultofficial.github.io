import {
  fetchTrendingMedia,
  fetchAnimeById,
  fetchAnimeBySeason as fetchSeasonFromWeb,
  searchAnime as searchAnimeFromWeb,
  stripHtml as stripHtmlFromWeb,
} from '../../api/anilist';

const ANILIST_URL = 'https://graphql.anilist.co';

async function safeFetch(label, fn, fallback) {
  try { return await fn(); }
  catch (err) { console.warn(`[AnimeVault Mobile] ${label} failed:`, err?.message || err); return fallback; }
}

async function queryAniListById(value, field = 'id') {
  const numericId = Number(value);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const query = `query ($value: Int) { Media(${field}: $value, type: ANIME) { id idMal title { romaji english native } description episodes status season seasonYear genres averageScore meanScore format duration source studios { nodes { name } } coverImage { extraLarge large medium color } bannerImage nextAiringEpisode { episode timeUntilAiring } externalLinks { site url id } recommendations(perPage: 12, sort: RATING_DESC) { nodes { mediaRecommendation { id title { romaji english native } coverImage { extraLarge large medium } averageScore format seasonYear } } } } }`;
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { value: numericId } }),
  });
  if (!response.ok) throw new Error(`AniList detail request failed: ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors[0].message || 'AniList detail request failed');
  return json.data?.Media || null;
}

export async function fetchHomeData() {
  const [trending, popular, upcoming] = await Promise.all([
    safeFetch('trending anime fetch', () => fetchTrendingMedia('ANIME', 1, 15), []),
    safeFetch('popular anime fetch', () => searchAnimeFromWeb('', 'ANIME', null, 1, 20, 'POPULARITY'), []),
    safeFetch('upcoming anime fetch', () => searchAnimeFromWeb('', 'ANIME', null, 1, 20, 'POPULARITY', 'NOT_YET_RELEASED'), []),
  ]);
  return { trending: { media: trending || [] }, popular: { media: popular || [] }, upcoming: { media: upcoming || [] } };
}

export async function fetchAnimeDetail(id) {
  const raw = String(id ?? '').trim();
  if (!raw) throw new Error('Missing anime ID.');
  const isMal = raw.toLowerCase().startsWith('mal-');
  const numeric = raw.replace(/^mal-/i, '');
  let media = null;
  try {
    media = isMal ? await queryAniListById(numeric, 'idMal') : await queryAniListById(numeric, 'id');
  } catch (err) {
    console.warn('[AnimeVault Mobile] direct AniList detail lookup failed:', err?.message || err);
  }
  if (!media) {
    try { media = await fetchAnimeById(isMal ? numeric : raw); }
    catch (err) { console.warn('[AnimeVault Mobile] fallback anime detail lookup failed:', err?.message || err); }
  }
  if (!media) throw new Error('Anime could not be loaded. The content service may be temporarily unavailable.');
  return { Media: media };
}

export async function fetchAnimeBySeason(season, year, page = 1, perPage = 20) {
  return safeFetch('seasonal anime fetch', () => fetchSeasonFromWeb(season, year, page, perPage), []);
}

const SORT_MAP = { TRENDING_DESC: 'TRENDING', POPULARITY_DESC: 'POPULARITY', SCORE_DESC: 'SCORE', FAVOURITES_DESC: 'FAVOURITES', UPDATED_AT_DESC: 'UPDATED' };

export async function searchAnime(query, genre = null, sort = 'TRENDING_DESC', status = 'All', year = 'All', page = 1) {
  const mappedSort = SORT_MAP[sort] || sort || 'TRENDING';
  return safeFetch('anime search fetch', () => searchAnimeFromWeb(query, 'ANIME', genre || null, page, 40, mappedSort, status, year), []);
}

export function getTitle(media) { return media?.title?.english || media?.title?.romaji || media?.title?.native || 'Unknown'; }
export function getImage(media, size = 'large') { return media?.coverImage?.[size === 'large' ? 'extraLarge' : 'large'] || media?.coverImage?.large || media?.coverImage?.medium || null; }
export function stripHtml(html) { return stripHtmlFromWeb(html || ''); }