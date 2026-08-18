export const ANIME_STREAM_BASE = 'https://megaplay.buzz';
export const ANIKOTO_API_BASE = 'https://anikotoapi.site';
export const MEGAPLAY_ORIGIN = new URL(ANIME_STREAM_BASE).origin;

function normalizeLanguage(lang = 'sub') {
  return lang === 'dub' ? 'dub' : 'sub';
}

function normalizePositiveId(value) {
  const id = String(value || '').trim();
  return /^\d+$/.test(id) ? id : '';
}

function buildStreamUrl(pathParts) {
  const url = new URL(pathParts.map(part => encodeURIComponent(String(part))).join('/'), `${ANIME_STREAM_BASE}/`);
  return url.toString();
}

export function buildAnimeStreamUrlFromAniList(anilistId, episode, lang = 'sub') {
  const id = normalizePositiveId(anilistId);
  const ep = normalizePositiveId(episode);
  if (!id || !ep) return null;
  return buildStreamUrl(['stream', 'ani', id, ep, normalizeLanguage(lang)]);
}

export function buildAnimeStreamUrlFromMal(malId, episode, lang = 'sub') {
  const id = normalizePositiveId(malId);
  const ep = normalizePositiveId(episode);
  if (!id || !ep) return null;
  return buildStreamUrl(['stream', 'mal', id, ep, normalizeLanguage(lang)]);
}

export function buildAnimeStreamUrlFromServer(serverNumber, aniwatchId, lang = 'sub') {
  const server = normalizePositiveId(serverNumber);
  const episodeId = normalizePositiveId(aniwatchId);
  if (!server || !episodeId) return null;
  return buildStreamUrl(['stream', `s-${server}`, episodeId, normalizeLanguage(lang)]);
}

export function buildMegaPlayUrlFromAnikotoEpisode(episode, lang = 'sub') {
  const language = normalizeLanguage(lang);
  const directEmbed = episode?.embed_url?.[language];
  if (directEmbed) return directEmbed;

  const episodeEmbedId = episode?.episode_embed_id || episode?.aniwatch_ep_id || episode?.hianime_ep_id;
  return buildAnimeStreamUrlFromServer(2, episodeEmbedId, language);
}

export function buildAnimeStreamApiUrlFromAniList(anilistId, episode, lang = 'sub') {
  const id = normalizePositiveId(anilistId);
  const ep = normalizePositiveId(episode);
  if (!id || !ep) return null;
  return buildStreamUrl(['api', 'ani', id, ep, normalizeLanguage(lang)]);
}

export function buildAnimeStreamApiUrlFromMal(malId, episode, lang = 'sub') {
  const id = normalizePositiveId(malId);
  const ep = normalizePositiveId(episode);
  if (!id || !ep) return null;
  return buildStreamUrl(['api', 'mal', id, ep, normalizeLanguage(lang)]);
}

export function buildAnimeStreamApiUrlFromServer(serverNumber, aniwatchId, lang = 'sub') {
  const server = normalizePositiveId(serverNumber);
  const episodeId = normalizePositiveId(aniwatchId);
  if (!server || !episodeId) return null;
  return buildStreamUrl(['api', `s-${server}`, episodeId, normalizeLanguage(lang)]);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Anikoto request failed (${res.status})`);
  return res.json();
}

export async function fetchRecentAnikotoAnime({ page = 1, perPage = 20 } = {}) {
  const url = new URL('/recent-anime', ANIKOTO_API_BASE);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  return fetchJson(url.toString());
}

export async function fetchAnikotoSeries(seriesId) {
  const id = String(seriesId || '').trim();
  if (!id) return null;
  return fetchJson(new URL(`/series/${encodeURIComponent(id)}`, ANIKOTO_API_BASE).toString());
}
