/**
 * streaming.js — Anime Vault Streaming API
 *
 * Architecture:
 *  1. Embed servers (vidsrc.icu, vidlink, etc.) are the PRIMARY and RELIABLE source.
 *     These are handled directly in AnimeDetails.jsx via iframe embeds.
 *
 *  2. This module handles NATIVE source fetching (background enrichment only).
 *     It tries multiple public Consumet mirrors with short timeouts.
 *     If ALL fail, the app still works perfectly via embed servers.
 *
 *  3. Server health is cached in localStorage to skip dead endpoints on reload.
 */

const TIMEOUT_MS = 4000;
const HEALTH_CACHE_KEY = 'animevault_api_health';
const HEALTH_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// ── Public Consumet-compatible API mirrors ──────────────────────────────────
const CONSUMET_MIRRORS = [
  import.meta.env.VITE_CONSUMET_API_URL,
  'https://consumet-api.vercel.app',
  'https://consumet-api-nu-one.vercel.app',
  'https://consumet-api-clone.vercel.app',
  'https://api-consumet-org-three.vercel.app',
  'https://anime-api-seven-lemon.vercel.app',
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
    } catch {
      continue;
    }
  }
  return null;
}

// ── Health cache helpers ────────────────────────────────────────────────────
function loadHealthCache() {
  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.ts < HEALTH_CACHE_TTL)
    );
  } catch {
    return {};
  }
}

function saveHealthCache(cache) {
  try {
    localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full, ignore */ }
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
    // Include mirror if unprobed/expired OR known to be healthy
    if (!entry || (now - entry.ts >= HEALTH_CACHE_TTL)) {
      healthy.push(mirror);
    } else if (entry.healthy) {
      healthy.push(mirror);
    }
  }

  return healthy;
}

// ── Core fetch with timeout ─────────────────────────────────────────────────
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

// ── Try mirrors in order, fail fast, cache health ──────────────────────────
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
        if (data) {
          markMirrorHealth(mirror, true);
          return data;
        }
      }

      if (!USE_CORS_PROXY_FIRST && CORS_PROXIES.length > 0) {
        const data = await fetchThroughCorsProxy(targetUrl);
        if (data) {
          markMirrorHealth(mirror, true);
          return data;
        }
      }

      markMirrorHealth(mirror, false);
    } catch (_) {
      markMirrorHealth(mirror, false);
    }
  }
  return null;
}

// ── String similarity for title matching ───────────────────────────────────
function cleanTitle(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function titleScore(a, b) {
  const ca = cleanTitle(a);
  const cb = cleanTitle(b);
  if (ca === cb) return 1;
  if (ca.includes(cb) || cb.includes(ca)) return 0.8;
  // Count word overlap
  const wa = new Set(ca.split(' '));
  const wb = new Set(cb.split(' '));
  const common = [...wa].filter(w => wb.has(w)).length;
  return common / Math.max(wa.size, wb.size);
}

// ── Provider search ─────────────────────────────────────────────────────────
const PROVIDERS = ['gogoanime', 'zoro', 'animepahe'];

async function searchProvider(provider, title, year, englishTitle) {
  // Try primary title
  let data = await fetchFromMirrors(
    `/anime/${provider}/search/${encodeURIComponent(title)}`
  );
  let results = data?.results || [];

  // Try English title if no results
  if (!results.length && englishTitle && englishTitle !== title) {
    data = await fetchFromMirrors(
      `/anime/${provider}/search/${encodeURIComponent(englishTitle)}`
    );
    results = data?.results || [];
  }

  if (!results.length) return null;

  // Score and pick best match
  const scored = results.map(r => ({
    r,
    score: titleScore(r.title, title) +
           (year && String(r.releaseDate || '').includes(String(year)) ? 0.3 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score < 0.3) return null; // too different

  return { id: best.r.id, provider, score: best.score };
}

// ── Public exports ──────────────────────────────────────────────────────────

/**
 * Find the best streaming match across providers.
 * Returns { id, provider } or null if nothing found.
 */
export async function findBestStreamingMatch(title, year, englishTitle) {
  // Try providers in parallel with Promise.any for speed
  const attempts = PROVIDERS.map(p => searchProvider(p, title, year, englishTitle));

  try {
    const result = await Promise.any(
      attempts.map(p => p.then(r => {
        if (!r) throw new Error('no match');
        return r;
      }))
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch episode list for a given provider anime ID.
 * Returns [] if unavailable.
 */
export async function fetchStreamingEpisodes(id, provider = 'gogoanime') {
  const data = await fetchFromMirrors(`/anime/${provider}/info/${encodeURIComponent(id)}`);
  return data?.episodes || [];
}

/**
 * Fetch direct video sources for a specific episode.
 * Returns [] if unavailable.
 */
export async function fetchStreamingSources(episodeId, provider = 'gogoanime') {
  const data = await fetchFromMirrors(
    `/anime/${provider}/watch/${encodeURIComponent(episodeId)}`
  );
  return data?.sources || [];
}

let isProbing = false;

/**
 * Probe mirrors sequentially and update health cache.
 * Call this once on app startup in the background.
 */
export async function probeMirrors() {
  if (isProbing) return;

  const cache = loadHealthCache();
  const now = Date.now();

  const unprobed = CONSUMET_MIRRORS.filter(mirror => {
    const entry = cache[mirror];
    return !entry || (now - entry.ts >= HEALTH_CACHE_TTL);
  });

  // If all mirrors have been tested recently, skip probing
  if (unprobed.length === 0) return;

  isProbing = true;
  try {
    for (const mirror of unprobed) {
      const targetUrl = `${mirror}/anime/gogoanime/search/naruto`;
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

      // If we found a working mirror, stop probing the rest
      if (healthy) break;
    }
  } finally {
    isProbing = false;
  }
}

/**
 * Fetch recent episodes (Latest Releases).
 * Returns [] if unavailable.
 */
export async function fetchRecentEpisodes(page = 1) {
  const data = await fetchFromMirrors(`/anime/gogoanime/recent-episodes?page=${page}`);
  return data?.results || [];
}

/**
 * Get current mirror health status for debugging.
 */
export function getMirrorHealth() {
  return loadHealthCache();
}
