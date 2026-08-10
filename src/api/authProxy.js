const PROXY_TOKEN_KEY = 'animevault_proxy_session_token';

function getProxyBaseUrl() {
  const raw = import.meta.env.VITE_AUTH_PROXY_URL || import.meta.env.VITE_RENDER_AUTH_PROXY_URL || '';
  return raw.replace(/\/+$/, '');
}

function getProxyUrl(path) {
  const base = getProxyBaseUrl();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : '';
}

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const cookie = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
  return cookie ? cookie.split('=')[1] : '';
}

function setCookie(name, value, days = 30) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; samesite=lax`;
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; max-age=0; path=/; samesite=lax`;
}

export function getStoredProxyToken() {
  return getCookie(PROXY_TOKEN_KEY);
}

function storeProxyToken(token) {
  if (token) setCookie(PROXY_TOKEN_KEY, token, 30);
}

export function clearStoredProxyToken() {
  deleteCookie(PROXY_TOKEN_KEY);
}

async function requestProxy(path, body = {}, { includeToken = false } = {}) {
  const url = getProxyUrl(path);
  if (!url) return { configured: false, success: false, message: 'Auth proxy is not configured.' };

  const headers = { 'Content-Type': 'application/json' };
  const token = getStoredProxyToken();
  if (includeToken && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    return {
      configured: true,
      success: false,
      message: data?.message || data?.error || `Auth proxy request failed (${res.status}).`,
    };
  }

  if (data?.token || data?.sessionToken) storeProxyToken(data.token || data.sessionToken);
  return { configured: true, success: data?.success !== false, ...data };
}

export async function proxyLogin(email, password) {
  return requestProxy('/auth/login', { email, password });
}

export async function proxySignup(email, password) {
  return requestProxy('/auth/signup', { email, password });
}

export async function proxySyncAuthUser(authUser) {
  return requestProxy('/auth/sync', { user: authUser }, { includeToken: true });
}

export async function proxyRestoreSession() {
  const token = getStoredProxyToken();
  if (!token) return { configured: Boolean(getProxyBaseUrl()), success: false };
  return requestProxy('/auth/session', {}, { includeToken: true });
}

export async function proxyLogout() {
  try {
    await requestProxy('/auth/logout', {}, { includeToken: true });
  } finally {
    clearStoredProxyToken();
  }
}
