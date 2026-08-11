import { createAuthClient } from '@neondatabase/auth';

function getFallbackOrigin() {
  const origin = window.location.origin;
  const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  return !isNativeShell ? origin : 'https://localhost';
}

function withAuthRequestDefaults(request) {
  if (request.headers.has('Origin') || request.headers.has('origin')) return;

  try {
    request.headers.set('Origin', getFallbackOrigin());
  } catch {
    // Some browser Request header guards disallow Origin changes; keep the
    // request usable instead of breaking auth and falling back paths.
  }
}

export function createAnimeVaultAuthClient() {
  return createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
    fetchOptions: {
      onRequest: withAuthRequestDefaults,
    },
  });
}
