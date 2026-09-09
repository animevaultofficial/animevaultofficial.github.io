const INTERNAL_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://animevaultofficial.fun',
  'https://www.animevaultofficial.fun',
]);

function isInternal(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'about:') return parsed.href === 'about:blank';
    return INTERNAL_ORIGINS.has(parsed.origin);
  } catch {
    return false;
  }
}

function blockNavigation(event, url) {
  if (!url || isInternal(url)) return;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') return;
  } catch {}
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  console.warn('[AnimeVault Mobile] Blocked unsafe navigation:', url);
}

export function installMobileNavigationGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window.__ANIMEVAULT_MOBILE_NAV_GUARD__) return window.__ANIMEVAULT_MOBILE_NAV_GUARD_CLEANUP__ || (() => {});

  const onClick = (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    blockNavigation(event, href);
  };

  const onAuxClick = (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    blockNavigation(event, anchor.getAttribute('href'));
  };

  const originalOpen = window.open;
  const guardedOpen = (url, ...args) => {
    if (!url) return originalOpen.call(window, url, ...args);
    try { const protocol = new URL(String(url), window.location.href).protocol; if (['https:', 'http:', 'mailto:', 'tel:'].includes(protocol)) return originalOpen.call(window, url, ...args); } catch {}
    console.warn('[AnimeVault Mobile] Blocked unsafe window.open:', url); return null;
  };

  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onAuxClick, true);
  window.open = guardedOpen;
  window.__ANIMEVAULT_MOBILE_NAV_GUARD__ = true;

  const cleanup = () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('auxclick', onAuxClick, true);
    window.open = originalOpen;
    delete window.__ANIMEVAULT_MOBILE_NAV_GUARD__;
    delete window.__ANIMEVAULT_MOBILE_NAV_GUARD_CLEANUP__;
  };

  window.__ANIMEVAULT_MOBILE_NAV_GUARD_CLEANUP__ = cleanup;
  return cleanup;
}
