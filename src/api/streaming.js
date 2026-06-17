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

const TIMEOUT_MS = 6000;
const HEALTH_CACHE_KEY = 'animevault_api_health';
const HEALTH_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// ── Public Consumet-compatible API mirrors ──────────────────────────────────
// Ordered by expected reliability. Mirrors are probed at runtime and unhealthy
// ones are skipped for the session.
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

// ── Health cache helpers ────────────────────────────────────────────────────
function loadHealthCache() {
  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    // Purge expired entries
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
  // Return mirrors not marked unhealthy (unknown = optimistically try)
  return CONSUMET_MIRRORS.filter(m => {
    const entry = cache[m];
    if (!entry) return true; // never tried, include it
    return entry.healthy;    // only include known-good
  });
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

    for (const mirror of mirrors) {
      const targetUrl = `${mirror}${path}`;
      // First try direct fetch (may succeed if CORS is allowed)
      try {
        const directRes = await fetchWithTimeout(targetUrl, TIMEOUT_MS);
        if (directRes.ok) {
          const data = await directRes.json();
          if (data) {
            markMirrorHealth(mirror, true);
            return data;
          }
        } else if (directRes.status === 404 || directRes.status === 451 || directRes.status >= 500) {
          markMirrorHealth(mirror, false);
        }
      } catch (_) {
        // Direct request failed (likely CORS), fall back to corsproxy.io
        const corsUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        try {
          const res = await fetchWithTimeout(corsUrl, TIMEOUT_MS);
          if (!res.ok) {
            if (res.status === 404 || res.status === 451 || res.status >= 500) {
              markMirrorHealth(mirror, false);
            }
            continue;
          }
          const data = await res.json();
          if (data) {
            markMirrorHealth(mirror, true);
            return data;
          }
        } catch (_) {
          markMirrorHealth(mirror, false);
        }
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

/**
 * Probe all mirrors and update health cache.
 * Call this once on app startup in the background.
 */
export async function probeMirrors() {
  const probes = CONSUMET_MIRRORS.map(async mirror => {
    try {
      const res = await fetchWithTimeout(`${mirror}/anime/gogoanime/search/test`, 4000);
      markMirrorHealth(mirror, res.ok || res.status === 404); // 404 = alive but no results
    } catch {
      markMirrorHealth(mirror, false);
    }
  });
  await Promise.allSettled(probes);
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
