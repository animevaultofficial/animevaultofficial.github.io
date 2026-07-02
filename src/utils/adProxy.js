/**
 * Ad-Blocking Proxy for Embed Streams
 * 
 * Since service workers cannot intercept cross-origin iframe requests (browser security),
 * this utility provides an alternative approach: route embed URLs through a CORS proxy
 * that strips ad content, or convert embeds to a sandboxed viewer approach.
 */

// Free CORS proxies that support media streaming
const CORS_PROXIES = [
  import.meta.env.VITE_API_CORS_PROXY || 'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
];

// Known ad patterns to strip from URLs
const AD_PARAMS = [
  'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 
  'utm_content', 'fbclid', 'gclid', '_ga', 'ad', 'ads', 'banner',
  'popup', 'track', 'tracking', 'affiliate', 'campaign', 'promo'
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
 * Get a proxied version of an embed URL (Option B approach)
 * This routes through a CORS proxy that strips ads from the response.
 * Falls back to original URL if proxy fails.
 */
export function getProxiedEmbedUrl(originalUrl, useProxy = false) {
  if (!useProxy) return originalUrl;
  
  const cleanUrl = stripAdParams(originalUrl);
  const proxy = CORS_PROXIES[0]; // Use first available proxy
  return `${proxy}${encodeURIComponent(cleanUrl)}`;
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