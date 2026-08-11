export const ANIME_STREAM_BASE = 'https://megaflix.buzz';

export function buildAnimeStreamUrlFromAniList(anilistId, episode, lang = 'sub') {
  if (!anilistId || !episode) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/stream/ani/${anilistId}/${episode}/${language}`;
}

export function buildAnimeStreamUrlFromMal(malId, episode, lang = 'sub') {
  if (!malId || !episode) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/stream/mal/${malId}/${episode}/${language}`;
}

export function buildAnimeStreamUrlFromServer(serverNumber, aniwatchId, lang = 'sub') {
  if (!serverNumber || !aniwatchId) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/stream/s-${serverNumber}/${aniwatchId}/${language}`;
}

export function buildAnimeStreamApiUrlFromAniList(anilistId, episode, lang = 'sub') {
  if (!anilistId || !episode) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/api/ani/${anilistId}/${episode}/${language}`;
}

export function buildAnimeStreamApiUrlFromMal(malId, episode, lang = 'sub') {
  if (!malId || !episode) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/api/mal/${malId}/${episode}/${language}`;
}

export function buildAnimeStreamApiUrlFromServer(serverNumber, aniwatchId, lang = 'sub') {
  if (!serverNumber || !aniwatchId) return null;
  const language = lang === 'dub' ? 'dub' : 'sub';
  return `${ANIME_STREAM_BASE}/api/s-${serverNumber}/${aniwatchId}/${language}`;
}
