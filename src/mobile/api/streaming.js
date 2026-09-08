import { buildAnimeStreamApiUrlFromAniList } from '../../utils/animeStreamingServer';

function findDirectMedia(value, seen = new Set()) {
  if (!value || seen.has(value)) return null;
  if (typeof value === 'string') return /\.(m3u8|mp4)(?:[?#]|$)/i.test(value) ? value : null;
  if (typeof value !== 'object') return null;
  seen.add(value);
  const keys = ['url','file','src','stream','streamUrl','stream_url','video','videoUrl','video_url','hls','hlsUrl','hls_url','source'];
  for (const key of keys) { const found = findDirectMedia(value[key], seen); if (found) return found; }
  for (const item of Object.values(value)) { const found = findDirectMedia(item, seen); if (found) return found; }
  return null;
}

export async function getMobileStreamSources(animeId, episodeNumber, language = 'sub') {
  if (!animeId || !episodeNumber) return [];
  try {
    const endpoint = buildAnimeStreamApiUrlFromAniList(animeId, episodeNumber, language);
    if (!endpoint) return [];
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Stream API failed (${response.status})`);
    const data = await response.json();
    const url = findDirectMedia(data);
    return url ? [{ url, type: /\.m3u8(?:[?#]|$)/i.test(url) ? 'hls' : 'mp4', serverName: 'AnimeVault Stream', priority: 1000 }] : [];
  } catch (error) {
    console.warn('[AnimeVault Android] Direct stream resolution failed:', error);
    return [];
  }
}
