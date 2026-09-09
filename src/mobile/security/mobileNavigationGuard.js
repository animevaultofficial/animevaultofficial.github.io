const BLOCKED_PROTOCOLS = new Set(['javascript:','data:','vbscript:','file:']);

function isBlocked(url) {
  try {
    const parsed = new URL(String(url), window.location.href);
    return BLOCKED_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return true;
  }
}

function blockNavigation(event, url) {
  if (!url || !isBlocked(url)) return;
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
    blockNavigation(event, anchor.getAttribute('href'));
  };

  const onAuxClick = (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    blockNavigation(event, anchor.getAttribute('href'));
  };

  const originalOpen = window.open;
  const guardedOpen = (url, ...args) => {
    if (!url || !isBlocked(String(url))) return originalOpen.call(window, url, ...args);
    console.warn('[AnimeVault Mobile] Blocked unsafe window.open:', url);
    return null;
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
