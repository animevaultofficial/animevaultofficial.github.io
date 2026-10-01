import { createAuthClient } from '@neondatabase/auth';

function getFallbackOrigin() {
  if (typeof window === 'undefined') return 'https://animevaultofficial.fun';
  const origin = window.location.origin;
  const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  return !isNativeShell ? origin : 'https://localhost';
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

  return createAuthClient(authUrl);
}
