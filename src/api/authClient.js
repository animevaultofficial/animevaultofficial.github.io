import { createAuthClient } from '@neondatabase/auth';

const FETCH_COMPATIBILITY_KEY = Symbol.for('animevault.authFetchCompatibility');

function getFallbackOrigin() {
  if (typeof window === 'undefined') return 'https://animevaultofficial.fun';
  const origin = window.location.origin;
  const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  return !isNativeShell ? origin : 'https://localhost';
}

function installAuthFetchCompatibility(authUrl) {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  const authBase = new URL(authUrl);
  const existingPatch = window.fetch[FETCH_COMPATIBILITY_KEY];
  if (existingPatch) {
    existingPatch.add(authBase);
    return;
  }

  const originalFetch = window.fetch;
  const authBases = new Set([authBase]);
  const compatibleFetch = function (input, init) {
    const requestUrl = typeof Request !== 'undefined' && input instanceof Request ? input.url : String(input);
    const target = new URL(requestUrl, window.location.href);
    const authRequest = [...authBases].some(base => {
      const basePath = base.pathname.replace(/\/+$/, '');
      return target.origin === base.origin
        && (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`));
    });
    const method = init?.method;

    if (!authRequest || !method || typeof method === 'string' || typeof method.then !== 'function') {
      return Reflect.apply(originalFetch, this, [input, init]);
    }

    return Promise.resolve(method).then(resolvedMethod => {
      if (typeof resolvedMethod !== 'string') {
        throw new TypeError('Neon Auth supplied a non-string HTTP method.');
      }
      return Reflect.apply(originalFetch, this, [input, { ...init, method: resolvedMethod }]);
    });
  };
  Object.defineProperty(compatibleFetch, FETCH_COMPATIBILITY_KEY, { value: authBases });
  window.fetch = compatibleFetch;
}

function createUnavailableAuthClient() {
  const unavailable = (operation) => Promise.resolve({
    error: { message: `Neon Auth is not configured (${operation}).` },
    data: null,
  });

  return {
    getSession: () => unavailable('getSession'),
    signIn: {
      email: (...args) => unavailable('signIn.email'),
      emailOtp: (...args) => unavailable('signIn.emailOtp'),
      social: (...args) => unavailable('signIn.social'),
    },
    signUp: {
      email: (...args) => unavailable('signUp.email'),
    },
    emailOtp: {
      sendVerificationOtp: (...args) => unavailable('emailOtp.sendVerificationOtp'),
    },
    requestPasswordReset: (...args) => unavailable('requestPasswordReset'),
    resetPassword: (...args) => unavailable('resetPassword'),
    signOut: () => unavailable('signOut'),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  };
}

export function createAnimeVaultAuthClient() {
  const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
  if (!authUrl) {
    console.warn('[AnimeVault Auth] VITE_NEON_AUTH_URL is missing. Auth features are unavailable until the deployment secret is configured.');
    return createUnavailableAuthClient();
  }

  installAuthFetchCompatibility(authUrl);
  return createAuthClient(authUrl);
}
