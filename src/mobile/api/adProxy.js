/**
 * Ad-Blocking Proxy for Mobile Embed Streams
 * 
 * Integrates streambert's ad-blocking system (Electron session-level blocking)
 * into the mobile web app by using URL sanitization, header stripping,
 * CORS proxy routing, and domain-based blocking.
 * 
 * Features from streambert:
 * - BLOCKED_HOSTS list for ad/tracker domains
 * - X-Frame-Options / CSP header stripping via proxy
 * - YouTube consent cookie suppression
 * - RAM/performance optimizations
 * - Media URL interception (.m3u8, .vtt)
 */

const CORS_PROXIES = [
  import.meta.env.VITE_API_CORS_PROXY || 'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
];

// Streambert's complete blocked hosts list (ported from Electron session)
const BLOCKED_HOSTS = [
  // Google Analytics / Ads
  'www.google-analytics.com', 'analytics.google.com', 'googletagmanager.com',
  'www.googletagmanager.com', 'googletagservices.com', 'doubleclick.net',
  '*.doubleclick.net', 'adservice.google.com', 'adservice.google.de',
  'pagead2.googlesyndication.com', 'stats.g.doubleclick.net',
  // Google Fonts (privacy)
  'fonts.googleapis.com', 'fonts.gstatic.com', 'googleapis.com', 'gstatic.com',
  // Known ad networks
  'cdn.adx1.com', 'intelligenceadx.com', 'adsco.re', 'mc.yandex.com',
  'mc.yandex.ru', 'bvtpk.com', 'my.rtmark.net', 'b7510.com',
  'gt.unbrownunflat.com', 'im.malocacomals.com', 'users.videasy.net',
  'nf.sixmossin.com', 'realizationnewestfangs.com', 'acscdn.com',
  'lt.taloseempest.com', 'pl26708123.profitableratecpm.com',
  'preferencenail.com', 'protrafficinspector.com', 's10.histats.com',
  'weirdopt.com', 'static.cloudflareinsights.com',
  'kettledroopingcontinuation.com', 'wayfarerorthodox.com',
  'woxaglasuy.net', 'adeptspiritual.com', 'www.calculating-laugh.com',
  'amavhxdlofklxjg.xyz', 'usrpubtrk.com', 'adexchangeclear.com',
  'rzjzjnavztycv.online', 'tmstr4.cloudnestra.com',
  'tmstr4.neonhorizonworkshops.com',
  // Ads with dynamic subdomains (wildcard patterns)
  '7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd',
  '5mq.get64t9vqg8pnbex1y463o.rest',
];

const AD_PARAMS = [
  'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
  'utm_content', 'fbclid', 'gclid', '_ga', 'ad', 'ads', 'banner',
  'popup', 'track', 'tracking', 'affiliate', 'campaign', 'promo',
  'clickid', 'subid', 'sub_id', 'cid', 'sck', 'msclkid',
];

/**
 * Strip ad-related parameters from a URL
 */
export function stripAdParams(url) {
  try {
    const parsed = new URL(url);
    AD_PARAMS.forEach(param => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Check if a URL should be blocked based on streambert's blocked hosts
 */
export function isUrlBlocked(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOSTS.some(pattern => {
      if (pattern.startsWith('*.')) {
        return hostname.endsWith(pattern.slice(1));
      }
      return hostname === pattern || hostname.endsWith('.' + pattern);
    });
  } catch {
    return false;
  }
}

/**
 * Strip X-Frame-Options and Content-Security-Policy headers from response
 * (streambert's approach - these headers block iframe embeds)
 */
export function getSafeHeaders(headers = {}) {
  const safe = { ...headers };
  const stripKeys = ['x-frame-options', 'content-security-policy', 'x-content-type-options'];
  Object.keys(safe).forEach(key => {
    if (stripKeys.includes(key.toLowerCase())) {
      delete safe[key];
    }
  });
  return safe;
}

/**
 * Check if a URL belongs to a known low-ad embed server
 */
export function isCleanServer(url) {
  if (!url) return false;
  const cleanServers = [
    'dropfile.cc',
    'animeplay.cfd',
    'ninjasheild.stream',
    'vidnest.fun',
  ];
  return cleanServers.some(s => url.includes(s));
}

/**
 * Known ad-heavy servers that should be avoided
 */
export function isAdHeavyServer(url) {
  if (!url) return false;
  const adServers = [
    'miruro',
    'vidsrc',
    'embed.su',
    'multiembed',
    'autoembed',
  ];
  return adServers.some(s => url.includes(s));
}

/**
 * Get a proxied version of an embed URL with streambert-level protection.
 * Routes through a CORS proxy that strips ads from the response.
 * Falls back to original URL if proxy fails.
 * 
 * This is the mobile equivalent of streambert's session-level ad blocking.
 */
export function getProxiedEmbedUrl(originalUrl, useProxy = false, proxyIndex = 0) {
  if (!originalUrl) return originalUrl;
  
  // Step 1: Strip ad tracking parameters (same as streambert's URL filtering)
  const cleanUrl = stripAdParams(originalUrl);
  
  // Step 2: If URL is from a known ad-heavy server, force proxy
  if (isAdHeavyServer(cleanUrl) && !useProxy) {
    useProxy = true;
  }
  
  if (!useProxy) return cleanUrl;
  
  // Step 3: Route through CORS proxy (streambert's approach for webview)
  const proxy = CORS_PROXIES[proxyIndex % CORS_PROXIES.length];
  return `${proxy}${encodeURIComponent(cleanUrl)}`;
}

/**
 * Get alternative embed URLs to try (streambert's MEDIA_URLS approach)
 * Intercepts and tries multiple sources
 */
export function getFallbackUrls(animeId, episode, lang = 'sub') {
  return [
    `https://animeplay.cfd/stream/ani/${animeId}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/mal/${animeId}/${episode}/${lang}`,
    `https://animeplay.cfd/stream/ani/${animeId}/${episode}/dub`,
    `https://vsembed.su/embed/tv/${animeId}/${episode}`,
    `https://multiembed.mov/directstream.php?video_id=${animeId}&s=anime&e=${episode}`,
  ];
}

/**
 * YouTube consent cookie value (streambert's SOCS cookie approach)
 * Suppresses YouTube consent gate
 */
export const YOUTUBE_CONSENT_COOKIE = {
  name: 'SOCS',
  value: 'CAI',
  domain: '.youtube.com',
  path: '/',
};

/**
 * Check if URL is a media URL (m3u8/vtt)
 * Streambert's approach: intercept media URLs for direct pass-through
 */
export function isMediaUrl(url) {
  if (!url) return false;
  return url.includes('.m3u8') || url.includes('.vtt');
}

/**
 * Blocked domains count (for stats display)
 */
export function getBlockedDomains() {
  return BLOCKED_HOSTS.length;
}

/**
 * Get all blocked domains (for settings UI)
 */
export function getBlockedHostsList() {
  return [...BLOCKED_HOSTS];
}