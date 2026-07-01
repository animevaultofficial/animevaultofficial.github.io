import { createAuthClient } from '@neondatabase/auth';

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  fetch: (url, options = {}) => {
    const newOptions = { ...options };
    newOptions.headers = { ...newOptions.headers };
    const origin = window.location.origin;
    const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
    newOptions.headers['Origin'] = newOptions.headers['Origin'] || newOptions.headers['origin'] ||
      (!isNativeShell ? origin : 'https://localhost');
    newOptions.credentials = newOptions.credentials || 'include';
    return fetch(url, newOptions);
  }
});
