// Dedicated credential-auth implementation.
// Keeps password handling isolated from the legacy db.js helpers so production
// credential auth can use bcrypt without changing unrelated data functions.
import bcrypt from 'bcryptjs';
import { error } from '../utils/logger.js';

let sql = null;

async function getSql() {
  if (sql) return sql;
  const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;
  if (!DATABASE_URL) return null;

  try {
    const mod = await import('@neondatabase/serverless');
    if (mod.neonConfig) {
      mod.neonConfig.disableWarningInBrowsers = true;
      mod.neonConfig.fetchFunction = (url, options) => {
        const newOptions = { ...options, headers: { ...(options?.headers || {}) } };
        if (!newOptions.headers.Origin && !newOptions.headers.origin) {
          newOptions.headers.Origin =
            typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
              ? window.location.origin
              : 'https://animevaultofficial.fun';
        }
        return fetch(url, newOptions);
      };
    }
    sql = mod.neon(DATABASE_URL, { disableWarningInBrowsers: true });
    return sql;
  } catch (err) {
    error('[AnimeVault Auth DB] Neon initialization failed:', err);
    return null;
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function usernameFromEmail(email) {
  return normalizeEmail(email).split('@')[0];
}

// Legacy compatibility only. Successful legacy logins are immediately upgraded
// to bcrypt so the weak hash is removed from the account on first login.
function legacySimpleHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

export async function userSignup(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const username = usernameFromEmail(normalizedEmail);

  if (!normalizedEmail || !password) return { success: false, message: 'All fields are required.' };
  if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
  if (username.length < 3) return { success: false, message: 'Email username must be at least 3 characters.' };

  const db = await getSql();
  if (!db) return { success: false, message: 'Database connection unavailable. Please try again later.' };

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db`
      INSERT INTO users (username, password, is_admin)
      VALUES (${username}, ${hashedPassword}, false)
      RETURNING id, username, avatar, banner, is_admin, is_verified
    `;
    return { success: true, user: result[0] };
  } catch (err) {
    error('[AnimeVault Auth DB] signup error:', err);
    const message = String(err?.message || '');
    if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    return { success: false, message: 'Unable to create account. Please try again later.' };
  }
}

export async function userLogin(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const username = usernameFromEmail(normalizedEmail);
  if (!username || !password) return { success: false, message: 'All fields are required.' };

  const db = await getSql();
  if (!db) return { success: false, message: 'Database connection unavailable. Please try again later.' };

  try {
    const result = await db`
      SELECT id, username, password, avatar, banner, is_admin, is_verified, two_factor_enabled
      FROM users
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1
    `;

    if (!result.length) return { success: false, message: 'Invalid username or password' };

    const userRow = result[0];
    const stored = String(userRow.password || '');
    let valid = false;
    let legacy = false;

    if (stored.startsWith('hash_')) {
      legacy = true;
      valid = legacySimpleHash(password) === stored;
    } else {
      valid = await bcrypt.compare(password, stored);
    }

    if (!valid) return { success: false, message: 'Invalid username or password' };

    if (legacy) {
      try {
        const upgradedHash = await bcrypt.hash(password, 12);
        await db`UPDATE users SET password = ${upgradedHash} WHERE id = ${userRow.id}`;
      } catch (upgradeError) {
        // Do not reject a valid login solely because the opportunistic migration failed.
        error('[AnimeVault Auth DB] legacy password upgrade failed:', upgradeError);
      }
    }

    const { password: _password, ...safeUser } = userRow;
    return { success: true, user: safeUser };
  } catch (err) {
    error('[AnimeVault Auth DB] login error:', err);
    return { success: false, message: 'Invalid username or password' };
  }
}

export async function updateUserPassword(email, newPassword) {
  const normalizedEmail = normalizeEmail(email);
  const username = usernameFromEmail(normalizedEmail);
  if (!username || !newPassword) return { success: false, message: 'Email and new password are required.' };
  if (newPassword.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };

  const db = await getSql();
  if (!db) return { success: false, message: 'Database connection unavailable. Please try again later.' };

  try {
    const hashed = await bcrypt.hash(newPassword, 12);
    const result = await db`
      UPDATE users
      SET password = ${hashed}
      WHERE LOWER(username) = LOWER(${username})
      RETURNING id
    `;
    if (!result.length) return { success: false, message: 'User not found.' };
    return { success: true };
  } catch (err) {
    error('[AnimeVault Auth DB] update password error:', err);
    return { success: false, message: 'Unable to update password. Please try again later.' };
  }
}
