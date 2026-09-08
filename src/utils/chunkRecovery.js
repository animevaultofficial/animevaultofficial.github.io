// Recover automatically from stale Vite/ES module chunks after a deployment.
// Browsers can keep an old HTML document while Vite has removed old hashed chunks.
// This prevents users from being trapped on a "Failed to fetch dynamically imported module"
// or "Importing a module script failed" error screen.

const RECOVERY_KEY = 'animevault:chunk-recovery';
const MAX_ATTEMPTS = 1;

function isChunkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('module script') && message.includes('failed') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('unable to preload css') ||
    message.includes('failed to load module script')
  );
}

function recover() {
  try {
    const attempts = Number(sessionStorage.getItem(RECOVERY_KEY) || '0');
    if (attempts >= MAX_ATTEMPTS) return;
    sessionStorage.setItem(RECOVERY_KEY, String(attempts + 1));

    // Remove only AnimeVault's known caches. Never clear unrelated site data.
    if ('caches' in window) {
      caches.keys().then(keys =>
        Promise.all(keys.filter(key => /animevault|vite/i.test(key)).map(key => caches.delete(key)))
      ).catch(() => {});
    }

    const url = new URL(window.location.href);
    url.searchParams.set('av-recover', Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export function installChunkRecovery() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', event => {
    if (isChunkError(event?.error) || isChunkError(event?.message)) recover();
  });

  window.addEventListener('unhandledrejection', event => {
    if (isChunkError(event?.reason)) recover();
  });

  // A successful application load means any previous recovery attempt worked.
  window.addEventListener('load', () => {
    try {
      sessionStorage.removeItem(RECOVERY_KEY);
    } catch {}
  }, { once: true });
}
