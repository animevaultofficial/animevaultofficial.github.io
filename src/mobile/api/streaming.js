import { buildAnimeStreamApiUrlFromAniList } from '../../utils/animeStreamingServer';

const CACHE_TTL = 45_000;
const cache = new Map();

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

export async function getMobileStreamSources(animeId, episodeNumber, language = 'sub', options = {}) {
  if (!animeId || !episodeNumber) return [];
  const key = `${animeId}:${episodeNumber}:${language}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.sources;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 12_000);
  try {
    const endpoint = buildAnimeStreamApiUrlFromAniList(animeId, episodeNumber, language);
    if (!endpoint) return [];
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Stream API failed (${response.status})`);
    const data = await response.json();
    const url = findDirectMedia(data);
    const sources = url ? [{ url, type: /\.m3u8(?:[?#]|$)/i.test(url) ? 'hls' : 'mp4', serverName: 'AnimeVault Stream', priority: 1000 }] : [];
    cache.set(key, { time: Date.now(), sources });
    return sources;
  } catch (error) {
    if (error?.name !== 'AbortError') console.warn('[AnimeVault Android] Direct stream resolution failed:', error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function clearMobileStreamCache() { cache.clear(); }
