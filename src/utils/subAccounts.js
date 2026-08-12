export const MAX_SUB_ACCOUNTS = 5;
export const SUB_ACCOUNT_COLORS = ['#ff3b3b', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const ACTIVE_SUB_ACCOUNT_KEY = 'animevault_active_sub_account';
const SUB_ACCOUNTS_KEY_PREFIX = 'animevault_sub_accounts_';

function storageKey(userId) {
  return `${SUB_ACCOUNTS_KEY_PREFIX}${userId}`;
}

export function getSubAccounts(userId) {
  if (!userId) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function saveSubAccounts(userId, accounts) {
  if (!userId) return [];
  const normalized = accounts.slice(0, MAX_SUB_ACCOUNTS);
  localStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
}

export function getActiveSubAccount(userId) {
  if (!userId) return null;
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_SUB_ACCOUNT_KEY) || 'null');
    return active?.userId === userId ? active.profile : null;
  } catch {
    return null;
  }
}

export function setActiveSubAccount(userId, profile) {
  if (!userId || !profile) return;
  localStorage.setItem(ACTIVE_SUB_ACCOUNT_KEY, JSON.stringify({ userId, profile }));
}

export function clearActiveSubAccount() {
  localStorage.removeItem(ACTIVE_SUB_ACCOUNT_KEY);
}

export function createDefaultSubAccount(user) {
  const name = user?.username?.split('@')[0] || 'Main';
  return {
    id: `profile-${Date.now()}`,
    name,
    color: SUB_ACCOUNT_COLORS[0],
    avatar: user?.avatar || null,
    isMain: true,
    createdAt: new Date().toISOString()
  };
}

export function ensureSubAccounts(user) {
  if (!user?.id) return [];
  const existing = getSubAccounts(user.id);
  if (existing.length > 0) return existing;
  return saveSubAccounts(user.id, [createDefaultSubAccount(user)]);
}
