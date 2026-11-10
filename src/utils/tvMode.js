export function isTvRuntime() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const outerQuery = new URLSearchParams(window.location.search);
  const hashQuery = new URLSearchParams(window.location.hash.split('?').slice(1).join('?'));
  const screenWidth = window.screen?.width || window.innerWidth || 0;
  const screenHeight = window.screen?.height || window.innerHeight || 0;
  const androidTvViewport = /android/i.test(ua) && Number(navigator.maxTouchPoints || 0) <= 1 &&
    screenWidth >= 960 && screenWidth / Math.max(screenHeight, 1) >= 1.5;
  return outerQuery.get('tv') === '1' || hashQuery.get('tv') === '1' ||
    /web0s|webos|lg browser|smart-tv|smarttv|netcast|tizen|bravia|hbbtv|android[^)]*(?:tv|leanback)|googletv|google tv|fire tv|aft[a-z0-9]+|shield android tv|silk|appletv|roku/i.test(ua) ||
    androidTvViewport;
}

export function applyTvModeClass() {
  const enabled = isTvRuntime();
  document.documentElement.classList.toggle('tv-mode', enabled);
  document.body.classList.toggle('tv-mode', enabled);
  return enabled;
}
