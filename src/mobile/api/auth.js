// Simple local auth for mobile - stores user in localStorage
// In production, this would use Neon Auth or similar

const AUTH_KEY = 'av_mobile_user';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function storeUser(user) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch {}
}

export function clearUser() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

export function login(username, password) {
  // Simple local login for demo - stores user in localStorage
  const user = { id: Date.now(), username, avatar: '/logo.png', isLoggedIn: true };
  storeUser(user);
  return { success: true, user };
}

export function signup(username, password) {
  const user = { id: Date.now(), username, avatar: '/logo.png', isLoggedIn: true };
  storeUser(user);
  return { success: true, user };
}

export function logout() {
  clearUser();
}