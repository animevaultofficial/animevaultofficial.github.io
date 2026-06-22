// EXACT copy of web version's streaming.js for mobile
// Consumet API with multiple mirrors + CORS proxy fallback

const TIMEOUT_MS = 6000;
const HEALTH_CACHE_KEY = 'animevault_api_health';
const HEALTH_CACHE_TTL = 1000 * 60 * 30;

const CONSUMET_MIRRORS = [
  'https://c.delusionz.xyz',
  'https://consumet-api-nu-one.vercel.app',
  'https://consumet-api-clone.vercel.app',
  'https://api-consumet-org-three.vercel.app',
  'https://anime-api-seven-lemon.vercel.app',
  'https://consumet.netlify.app',
  'https://anime-api-phi.vercel.app',
  'https://consumet-instance.onrender.com',
];

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
  const healthy = CONSUMET_MIRRORS.filter(m => {
    const entry = cache[m];
    if (!entry) return true;
    return entry.healthy;
  });
  return healthy.length > 0 ? healthy : CONSUMET_MIRRORS;
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
  for (const mirror of mirrors) {
    const targetUrl = `${mirror}${path}`;
    try {
      const directRes = await fetchWithTimeout(targetUrl, TIMEOUT_MS);
      if (directRes.ok) {
        const data = await directRes.json();
        if (data) { markMirrorHealth(mirror, true); return data; }
      } else if (directRes.status === 404 || directRes.status === 451 || directRes.status >= 500) {
        markMirrorHealth(mirror, false);
      }
    } catch (_) {
      const corsUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      try {
        const res = await fetchWithTimeout(corsUrl, TIMEOUT_MS);
        if (!res.ok) {
          if (res.status === 404 || res.status === 451 || res.status >= 500) markMirrorHealth(mirror, false);
          continue;
        }
        const data = await res.json();
        if (data) { markMirrorHealth(mirror, true); return data; }
      } catch (_) { markMirrorHealth(mirror, false); }
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

export async function probeMirrors() {
  const probes = CONSUMET_MIRRORS.map(async mirror => {
    const targetUrl = `${mirror}/anime/gogoanime/search/test`;
    try {
      const res = await fetchWithTimeout(targetUrl, 4000);
      markMirrorHealth(mirror, res.ok || res.status === 404);
    } catch {
      try {
        const corsUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const res = await fetchWithTimeout(corsUrl, 4000);
        markMirrorHealth(mirror, res.ok || res.status === 404);
      } catch { markMirrorHealth(mirror, false); }
    }
  });
  await Promise.allSettled(probes);
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
    `https://animeplay.cfd/stream/ani/${id}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/mal/${id}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/ani/${id}/${episode}/dub`,
    `https://vsembed.su/embed/tv/${id}/${episode}`,
    `https://multiembed.mov/directstream.php?video_id=${id}&s=anime&e=${episode}`,
  ];
  return servers;
}