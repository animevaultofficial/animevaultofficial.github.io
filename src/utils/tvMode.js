export function isTvRuntime() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const query = new URLSearchParams(window.location.search);
  return query.get('tv') === '1' || /web0s|webos|lg browser|smart-tv|smarttv|netcast|tizen|bravia|hbbtv/i.test(ua);
}

export function applyTvModeClass() {
  const enabled = isTvRuntime();
  document.documentElement.classList.toggle('tv-mode', enabled);
  document.body.classList.toggle('tv-mode', enabled);
  return enabled;
}
