// EXACT copy of web version's streaming.js for mobile
// Consumet API with multiple mirrors + CORS proxy fallback

const TIMEOUT_MS = 4000;
const HEALTH_CACHE_KEY = 'animevault_api_health';
const HEALTH_CACHE_TTL = 1000 * 60 * 30;

const CONSUMET_MIRRORS = [
  import.meta.env.VITE_CONSUMET_API_URL,
  'https://api.consumet.org',
  'https://c.delusionz.xyz',
  'https://consumet-api-nu-one.vercel.app',
  'https://consumet-api-clone.vercel.app',
  'https://api-consumet-org-three.vercel.app',
  'https://anime-api-seven-lemon.vercel.app',
  'https://consumet.netlify.app',
  'https://anime-api-phi.vercel.app',
  'https://consumet-instance.onrender.com',
].filter(Boolean);

const CORS_PROXIES = [
  import.meta.env.VITE_API_CORS_PROXY,
].filter(Boolean);

const USE_CORS_PROXY_FIRST = CORS_PROXIES.length > 0 && typeof window !== 'undefined';

async function fetchThroughCorsProxy(targetUrl) {
  if (CORS_PROXIES.length === 0) return null;
  for (const proxy of CORS_PROXIES) {
    const proxyUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetchWithTimeout(proxyUrl, TIMEOUT_MS);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text) continue;
      try {
        return JSON.parse(text);
      } catch {
        continue;
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}

function loadHealthCache() {
  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.ts < HEALTH_CACHE_TTL)
    );
  } catch { return {}; }
}

function saveHealthCache(cache) {
  try { localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cache)); } catch { }
}

function markMirrorHealth(mirror, healthy) {
  const cache = loadHealthCache();
  cache[mirror] = { healthy, ts: Date.now() };
  saveHealthCache(cache);
}

function getHealthyMirrors() {
  const cache = loadHealthCache();
  const now = Date.now();
  const healthy = [];
  for (const mirror of CONSUMET_MIRRORS) {
    const entry = cache[mirror];
    if (!entry || (now - entry.ts >= HEALTH_CACHE_TTL)) {
      healthy.push(mirror);
    } else if (entry.healthy) {
      healthy.push(mirror);
    }
  }
  return healthy;
}

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    return res;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

async function fetchFromMirrors(path) {
  const mirrors = getHealthyMirrors();
  if (!mirrors || mirrors.length === 0) return null;

  for (const mirror of mirrors) {
    const targetUrl = `${mirror}${path}`;

    if (USE_CORS_PROXY_FIRST) {
      const data = await fetchThroughCorsProxy(targetUrl);
      if (data) {
        markMirrorHealth(mirror, true);
        return data;
      }
    }

    try {
      const directRes = await fetchWithTimeout(targetUrl, TIMEOUT_MS);
      if (directRes.ok) {
        const data = await directRes.json();
        if (data) { markMirrorHealth(mirror, true); return data; }
      }

      if (!USE_CORS_PROXY_FIRST && CORS_PROXIES.length > 0) {
        const data = await fetchThroughCorsProxy(targetUrl);
        if (data) { markMirrorHealth(mirror, true); return data; }
      }

      markMirrorHealth(mirror, false);
    } catch (_) {
      markMirrorHealth(mirror, false);
    }
  }
  return null;
}

function cleanTitle(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function titleScore(a, b) {
  const ca = cleanTitle(a);
  const cb = cleanTitle(b);
  if (ca === cb) return 1;
  if (ca.includes(cb) || cb.includes(ca)) return 0.8;
  const wa = new Set(ca.split(' '));
  const wb = new Set(cb.split(' '));
  const common = [...wa].filter(w => wb.has(w)).length;
  return common / Math.max(wa.size, wb.size);
}

const PROVIDERS = ['gogoanime', 'zoro', 'animepahe'];

async function searchProvider(provider, title, year, englishTitle) {
  let data = await fetchFromMirrors(`/anime/${provider}/search/${encodeURIComponent(title)}`);
  let results = data?.results || [];
  if (!results.length && englishTitle && englishTitle !== title) {
    data = await fetchFromMirrors(`/anime/${provider}/search/${encodeURIComponent(englishTitle)}`);
    results = data?.results || [];
  }
  if (!results.length) return null;
  const scored = results.map(r => ({
    r,
    score: titleScore(r.title, title) + (year && String(r.releaseDate || '').includes(String(year)) ? 0.3 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score < 0.3) return null;
  return { id: best.r.id, provider, score: best.score };
}

export async function findBestStreamingMatch(title, year, englishTitle) {
  const attempts = PROVIDERS.map(p => searchProvider(p, title, year, englishTitle));
  try {
    return await Promise.any(attempts.map(p => p.then(r => { if (!r) throw new Error('no match'); return r; })));
  } catch { return null; }
}

export async function fetchStreamingEpisodes(id, provider = 'gogoanime') {
  const data = await fetchFromMirrors(`/anime/${provider}/info/${encodeURIComponent(id)}`);
  return data?.episodes || [];
}

export async function fetchStreamingSources(episodeId, provider = 'gogoanime') {
  const data = await fetchFromMirrors(`/anime/${provider}/watch/${encodeURIComponent(episodeId)}`);
  return data?.sources || [];
}

let isProbing = false;

export async function probeMirrors() {
  if (isProbing) return;
  const cache = loadHealthCache();
  const now = Date.now();
  const unprobed = CONSUMET_MIRRORS.filter(mirror => {
    const entry = cache[mirror];
    return !entry || (now - entry.ts >= HEALTH_CACHE_TTL);
  });
  if (unprobed.length === 0) return;

  isProbing = true;
  try {
    for (const mirror of unprobed) {
      const targetUrl = `${mirror}/anime/gogoanime/search/test`;
      let healthy = false;
      try {
        if (USE_CORS_PROXY_FIRST && CORS_PROXIES.length > 0) {
          const data = await fetchThroughCorsProxy(targetUrl);
          healthy = !!data;
        } else {
          const res = await fetchWithTimeout(targetUrl, 3000);
          healthy = res.ok;
        }
      } catch {
        healthy = false;
      }
      markMirrorHealth(mirror, healthy);
      if (healthy) break;
    }
  } finally {
    isProbing = false;
  }
}

export async function fetchRecentEpisodes(page = 1) {
  const data = await fetchFromMirrors(`/anime/gogoanime/recent-episodes?page=${page}`);
  return data?.results || [];
}

// MegaPlay embed (same as web version)
export const EMBED_SERVERS = [
  {
    id: 'megaplay',
    label: 'MegaPlay',
    languages: ['sub', 'dub'],
    buildUrl: ({ animeId, episode, lang }) => `https://animeplay.cfd/stream/ani/${animeId}/${episode}/${lang || 'sub'}`,
  },
  {
    id: 'vidsrc',
    label: 'VidSrc',
    languages: ['sub', 'dub'],
    buildUrl: ({ animeId, episode, lang }) => `https://vsembed.su/embed/tv/${animeId}/${episode}`,
  },
  // VidPlus is currently down; remove it from anime streaming fallbacks.
];

// Helper to extract numeric ID from potentially prefixed IDs (e.g. "mal-12345" -> "12345")
export function extractNumericId(rawId) {
  if (!rawId) return null;
  const str = String(rawId).trim();
  const match = str.match(/(\d+)$/);
  return match ? match[1] : str;
}

// Detect if ID is a MAL ID (starts with "mal-" prefix)
export function isMalId(rawId) {
  if (!rawId) return false;
  return String(rawId).trim().toLowerCase().startsWith('mal-');
}

// Get MegaPlay embed URL - supports both AniList IDs (/stream/ani/) and MAL IDs (/stream/mal/)
export function getAnimePlayUrl(animeId, episode, lang = 'sub') {
  const numericId = extractNumericId(animeId);
  const route = isMalId(animeId) ? 'mal' : 'ani';
  return `https://animeplay.cfd/stream/${route}/${numericId || animeId}/${episode}/${lang}`;
}

// Get fallback embed URLs to try (tries both AniList and MAL routes + other servers)
export function getFallbackEmbedUrl(animeId, episode, lang = 'sub') {
  const numericId = extractNumericId(animeId);
  const id = numericId || animeId;
  const servers = [
    `https://player.vidplus.to/embed/anime/${id}/${episode}?dub=${lang === 'dub' ? 'true' : 'false'}`,
    `https://animeplay.cfd/stream/ani/${id}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/mal/${id}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/ani/${id}/${episode}/dub`,
    `https://vsembed.su/embed/tv/${id}/${episode}`,
    `https://multiembed.mov/directstream.php?video_id=${id}&s=anime&e=${episode}`,
  ];
  return servers;
}