import { createAuthClient } from '@neondatabase/auth';

const AUTH_TIMEOUT_MS = 8000;

function getFallbackOrigin() {
  if (typeof window === 'undefined') return 'https://animevaultofficial.fun';
  const origin = window.location.origin;
  const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  return !isNativeShell ? origin : 'https://localhost';
}

function withAuthRequestDefaults(context) {
  const headers = context?.headers instanceof Headers ? context.headers : new Headers(context?.headers);
  if (!headers.has('Origin') && !headers.has('origin')) {
    try {
      headers.set('Origin', getFallbackOrigin());
    } catch {
      // Browser Request guards may reject manually setting Origin.
    }
  }
  return { ...context, headers };
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

  return createAuthClient(authUrl, {
    fetchOptions: {
      timeout: AUTH_TIMEOUT_MS,
      onRequest: withAuthRequestDefaults,
    },
  });
}
