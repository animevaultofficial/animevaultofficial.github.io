/**
 * Ad-Blocking Proxy for Mobile Embed Streams
 * Exact copy of web version's adProxy.js ported for mobile use
 */

const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
];

const AD_PARAMS = [
  'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 
  'utm_content', 'fbclid', 'gclid', '_ga', 'ad', 'ads', 'banner',
  'popup', 'track', 'tracking', 'affiliate', 'campaign', 'promo'
];

export function stripAdParams(url) {
  try {
    const parsed = new URL(url);
    AD_PARAMS.forEach(param => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getProxiedEmbedUrl(originalUrl, useProxy = false) {
  if (!useProxy) return originalUrl;
  const cleanUrl = stripAdParams(originalUrl);
  const proxy = CORS_PROXIES[0];
  return `${proxy}${encodeURIComponent(cleanUrl)}`;
}

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