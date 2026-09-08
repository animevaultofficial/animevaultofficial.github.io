// Recover automatically from stale Vite/ES module chunks after a deployment.
// Browsers can keep an old HTML document while Vite has removed old hashed chunks.

const RECOVERY_KEY = 'animevault:chunk-recovery';
const MAX_ATTEMPTS = 2;

function isChunkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    (message.includes('module script') && message.includes('failed')) ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('unable to preload css') ||
    message.includes('failed to load module script')
  );
}

async function clearAppCaches() {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => /animevault|vite/i.test(key))
        .map(key => caches.delete(key))
    );
  } catch {}
}

async function clearServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  } catch {}
}

async function recover() {
  try {
    const attempts = Number(sessionStorage.getItem(RECOVERY_KEY) || '0');
    if (attempts >= MAX_ATTEMPTS) return;
    sessionStorage.setItem(RECOVERY_KEY, String(attempts + 1));

    // Clear client caches and old service workers before retrying.
    await Promise.all([clearAppCaches(), clearServiceWorkers()]);

    // A query-string cache buster forces GitHub Pages/CDN to fetch the current
    // index instead of replaying a stale HTML response that references the
    // missing hashed chunk.
    const url = new URL(window.location.href);
    url.searchParams.set('av-recover', `${Date.now()}-${attempts + 1}`);
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export function installChunkRecovery() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', event => {
    if (isChunkError(event?.error) || isChunkError(event?.message)) recover();
  }, true);

  window.addEventListener('unhandledrejection', event => {
    if (isChunkError(event?.reason)) recover();
  });

  // Only clear the recovery marker after a successful page load.
  window.addEventListener('load', () => {
    try {
      sessionStorage.removeItem(RECOVERY_KEY);
    } catch {}
  }, { once: true });
}
