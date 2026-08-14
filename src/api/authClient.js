import { createAuthClient } from '@neondatabase/auth';

const AUTH_TIMEOUT_MS = 8000;

function getFallbackOrigin() {
  if (typeof window === 'undefined') return 'https://animevaultofficial.github.io';
  const origin = window.location.origin;
  const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  return !isNativeShell ? origin : 'https://localhost';
}

function withAuthRequestDefaults(request) {
  if (request.headers.has('Origin') || request.headers.has('origin')) return;
  try {
    request.headers.set('Origin', getFallbackOrigin());
  } catch {
    // Browser Request guards may reject manually setting Origin.
  }
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS}ms`)), AUTH_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

  const client = createAuthClient(authUrl, {
    fetchOptions: {
      onRequest: withAuthRequestDefaults,
    },
  });

  // Prevent any single Neon Auth operation from leaving the UI stuck on
  // Processing/Checking session when the auth endpoint is unavailable.
  const wrapOperation = (target, key) => {
    if (typeof target?.[key] !== 'function') return;
    const operation = target[key].bind(target);
    target[key] = (...args) => withTimeout(operation(...args), `Neon Auth ${key}`);
  };

  wrapOperation(client, 'getSession');
  wrapOperation(client.signIn, 'email');
  wrapOperation(client.signIn, 'emailOtp');
  wrapOperation(client.signIn, 'social');
  wrapOperation(client.signUp, 'email');
  wrapOperation(client.emailOtp, 'sendVerificationOtp');
  wrapOperation(client, 'signOut');

  return client;
}
