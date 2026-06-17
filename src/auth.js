import { createAuthClient } from '@neondatabase/auth';

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);
