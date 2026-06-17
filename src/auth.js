import { createAuthClient } from '@neondatabase/auth';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL,
});
