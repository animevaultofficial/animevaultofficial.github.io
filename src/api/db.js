// src/api/db.js
// Simple DB wrapper with Neon fallback
import { log, warn, error } from "../utils/logger.js";
// For self-hosting: set VITE_DATABASE_URL env var for Neon PostgreSQL

// LocalStorage fallback keys
const STORAGE_KEYS = {
  REMINDERS: 'animevault_reminders',
  NOTIFICATIONS: 'animevault_notifications',
  USER_STATS: 'animevault_user_stats',
  FAVORITES: 'animevault_favorites',
  WATCH_HISTORY: 'animevault_watch_history',
  LEVEL: 'animevault_level',
  ACTIVITY: 'animevault_activity',
  POSTS: 'animevault_posts',
  FRIENDS: 'animevault_friends',
  FRIEND_REQUESTS: 'animevault_friend_requests',
  CONTINUE_WATCHING: 'animevault_continue_watching',
  LIKED_ITEMS: 'animevault_liked_items'
};

// Simple hash for passwords (browser-safe, no node deps)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

// Try to connect to Neon DB if configured
let sql = null;

// Helper to initialize Neon DB connection lazily and await it
async function getSql() {
  if (sql) return sql;
  const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;
  if (!DATABASE_URL) return null;
  try {
    const mod = await import('@neondatabase/serverless');

    // Fix for Capacitor 'Missing or null Origin' error
    if (mod.neonConfig) {
      mod.neonConfig.fetchFunction = (url, options) => {
        const newOptions = { ...options };
        newOptions.headers = { ...newOptions.headers };
        // If we are in Capacitor, Origin might be missing or null. Provide a fallback.
        if (!newOptions.headers['Origin'] && !newOptions.headers['origin']) {
          newOptions.headers['Origin'] = (window.location.origin && window.location.origin !== 'null')
            ? window.location.origin
            : 'https://animevaultofficial.github.io';
        }
        return fetch(url, newOptions);
      };
    }

    sql = mod.neon(DATABASE_URL);
    // Test the connection immediately
    await sql`SELECT 1`;
    log('[AnimeVault DB] Connected to Neon DB successfully');
    return sql;
  } catch (e) {
    error('[AnimeVault DB] Failed to connect to Neon DB:', e);
    log('[AnimeVault DB] Neon not available, using localStorage fallback');
    sql = null;
    return null;
  }
}

// LocalStorage users storage
const USERS_KEY = 'animevault_users';

function getUsers() {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    error('Failed to save users:', e);
  }
}

// User Functions
export async function userSignup(username, password) {
  const trimmedUser = (username || '').trim().toLowerCase().split('@')[0];
  if (!trimmedUser || !password) return { success: false, message: 'All fields are required.' };
  if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
  if (trimmedUser.length < 3) return { success: false, message: 'Username must be at least 3 characters.' };

  // Ensure DB connection
  const db = await getSql();
  if (db) {
    try {
      const hashedPassword = simpleHash(password);
      const result = await db`
        INSERT INTO users (username, password, is_admin)
        VALUES (${trimmedUser}, ${hashedPassword}, false)
        RETURNING id, username, avatar, banner, is_admin
      `;
      const user = result[0];
      // Sync to localStorage fallback for future offline use
      const users = getUsers();
      users.push({ ...user, password: hashedPassword, created_at: new Date().toISOString() });
      saveUsers(users);
      const { password: _, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (e) {
      console.warn('[AnimeVault DB] Neon signup failed, falling back:', e?.message);
    }
  }

  // LocalStorage fallback (no DB)
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
    return { success: false, message: 'Username already taken.' };
  }

  const newUser = {
    id: Date.now(),
    username: trimmedUser,
    password: simpleHash(password),
    avatar: null,
    banner: null,
    is_admin: false,
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);

  const { password: _, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export async function userLogin(username, password) {
  const trimmedUser = (username || '').trim().toLowerCase().split('@')[0];
  if (!trimmedUser || !password) return { success: false, message: 'All fields are required.' };

  // Ensure DB connection
  const db = await getSql();
  if (db) {
    try {
      const result = await db`
        SELECT id, username, password, avatar, banner, is_admin, is_verified, two_factor_enabled FROM users
        WHERE LOWER(username) = LOWER(${trimmedUser})
      `;
      if (result.length) {
        const storedHash = result[0].password;
        const inputHash = simpleHash(password);
        if (storedHash === inputHash) {
          const { password: _, ...user } = result[0];
          // Sync to localStorage for offline fallback
          const users = getUsers();
          const existing = users.find(u => u.id === user.id);
          if (!existing) {
            users.push({ ...user, password: storedHash, created_at: new Date().toISOString() });
            saveUsers(users);
          }
          return { success: true, user };
        }
        return { success: false, message: 'Invalid password. Please try again.' };
      }
    } catch (e) {
      warn('[AnimeVault DB] Neon login failed, falling back:', e?.message);
    }
  }

  // LocalStorage fallback (or DB returned no match)
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
  if (!user) {
    return { success: false, message: 'Account does not exist. Please sign up first.' };
  }

  const inputHash = simpleHash(password);
  if (user.password !== inputHash) {
    return { success: false, message: 'Invalid password. Please try again.' };
  }

  const { password: _, ...safeUser } = user;
  return { success: true, user: safeUser };
}



export async function getProfile(userIdOrUsername) {
  if (!sql) {
    return null;
  }
  try {
    const result = await sql`
      SELECT id, username, avatar, banner, is_admin, is_verified
      FROM users
      WHERE id = ${userIdOrUsername} OR username = ${userIdOrUsername}
    `;
    if (result.length) {
      return result[0];
    }
    return null;
  } catch (e) {
    error('[AnimeVault DB] Failed to fetch profile:', e?.message);
    return null;
  }
}

// Update password for a given username (email)
export async function updateUserPassword(username, newPassword) {
  if (!username || !newPassword) return { success: false, message: 'Username and new password required.' };
  const hashed = simpleHash(newPassword);
  // Neon DB update if available
  const db = await getSql();
  if (db) {
    try {
      await db`UPDATE users SET password = ${hashed} WHERE username = ${username.toLowerCase()}`;
    } catch (e) {
      warn('[AnimeVault DB] Neon password update failed, falling back:', e?.message);
    }
  }
  // LocalStorage fallback
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (user) {
    user.password = hashed;
    saveUsers(users);
    return { success: true };
  }
  return { success: false, message: 'User not found.' };
}

export async function updateUserProfile(userId, newAvatar, newBanner) {
  if (!sql) {
    return { success: false };
  }
  try {
    const result = await sql`
      UPDATE users
      SET avatar = ${newAvatar || null},
          banner = ${newBanner || null}
      WHERE id = ${userId}
      RETURNING id, username, avatar, banner, is_admin
    `;
    if (result.length) {
      return { success: true, user: result[0] };
    }
    return { success: false };
  } catch (e) {
    error('[AnimeVault DB] Failed to update profile:', e?.message);
    return { success: false };
  }
}

// Progress Functions
export async function getProgress(userId) {
  if (!sql) {
    return {};
  }
  try {
    const result = await sql`
      SELECT anime_id, episode, progress, rating, last_updated
      FROM user_progress
      WHERE user_id = ${userId}
    `;
    const progressMap = {};
    result.forEach(row => {
      progressMap[row.anime_id] = {
        episode: row.episode,
        progress: row.progress,
        rating: row.rating,
        lastUpdated: row.last_updated,
      };
    });
    return progressMap;
  } catch (e) {
    error('[AnimeVault DB] Failed to fetch progress:', e?.message);
    return {};
  }
}

export async function updateProgress(userId, animeId, episode, progress, rating) {
  if (!sql) {
    console.warn('[AnimeVault DB] Database not connected');
    return false;
  }
  try {
    const now = new Date().toISOString();
    await sql`
      INSERT INTO user_progress (user_id, anime_id, episode, progress, rating, last_updated)
      VALUES (${userId}, ${animeId}, ${episode || 1}, ${progress || 0}, ${rating || null}, ${now})
      ON CONFLICT (user_id, anime_id) DO UPDATE
      SET episode = ${episode || 1},
          progress = ${progress || 0},
          rating = ${rating || null},
          last_updated = ${now}
    `;
    return true;
  } catch (e) {
    error('[AnimeVault DB] Failed to update progress:', e?.message);
    return false;
  }
}

// Favorites Functions
export async function getFavorites(userId) {
  if (!sql) {
    console.warn('[AnimeVault DB] Database not connected');
    return [];
  }
  try {
    const result = await sql`
      SELECT anime_id, favorited_at
      FROM user_favorites
      WHERE user_id = ${userId}
      ORDER BY favorited_at DESC
    `;
    return result.map(row => row.anime_id);
  } catch (e) {
    error('[AnimeVault DB] Failed to fetch favorites:', e?.message);
    return [];
  }
}

export async function toggleFavorite(userId, animeId) {
  if (!sql) {
    console.warn('[AnimeVault DB] Database not connected');
    return false;
  }
  try {
    const existing = await sql`
      SELECT id FROM user_favorites
      WHERE user_id = ${userId} AND anime_id = ${animeId}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM user_favorites
        WHERE user_id = ${userId} AND anime_id = ${animeId}
      `;
      return { action: 'unliked' };
    } else {
      await sql`
        INSERT INTO user_favorites (user_id, anime_id)
        VALUES (${userId}, ${animeId})
      `;
      return { action: 'liked' };
    }
  } catch (e) {
    error('[AnimeVault DB] Failed to toggle favorite:', e?.message);
    return { error: e?.message };
  }
}

// ── DB-backed user data functions (with localStorage fallback) ──

export async function fetchWatchHistory(userId) {
  const db = await getSql();
  if (db) {
    try {
      const result = await db`
        SELECT media_id, media_type, media_title as title, media_poster as image, watched_at
        FROM user_watch_history
        WHERE user_id = ${userId}
        ORDER BY watched_at DESC
        LIMIT 50
      `;
      return result;
    } catch (e) {
      warn('[AnimeVault DB] fetchWatchHistory DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
    return history;
  } catch (e) {
    return [];
  }
}

export async function addToHistory(userId, mediaId, mediaType, mediaTitle, mediaPoster) {
  const db = await getSql();
  if (db) {
    try {
      await db`
        INSERT INTO user_watch_history (user_id, media_id, media_type, media_title, media_poster)
        VALUES (${userId}, ${mediaId}, ${mediaType}, ${mediaTitle}, ${mediaPoster})
      `;
      return true;
    } catch (e) {
      warn('[AnimeVault DB] addToHistory DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
    const newItem = {
      id: mediaId,
      media_type: mediaType,
      title: mediaTitle,
      image: mediaPoster,
      watched_at: new Date().toISOString()
    };
    history.unshift(newItem);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history.slice(0, 50)));
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearWatchHistory(userId) {
  const db = await getSql();
  if (db) {
    try {
      await db`DELETE FROM user_watch_history WHERE user_id = ${userId}`;
      return true;
    } catch (e) {
      warn('[AnimeVault DB] clearWatchHistory DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
    return true;
  } catch (e) {
    return false;
  }
}

export async function fetchContinueWatching(userId) {
  const db = await getSql();
  if (db) {
    try {
      const result = await db`
        SELECT media_id, media_type, media_title as title, media_poster as image, season, episode, progress, duration, updated_at
        FROM user_continue_watching
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 50
      `;
      return result;
    } catch (e) {
      warn('[AnimeVault DB] fetchContinueWatching DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING) || '[]');
    return items;
  } catch (e) {
    return [];
  }
}

export async function updateContinueWatching(userId, mediaId, mediaType, mediaTitle, mediaPoster, season, episode, progress, duration) {
  const db = await getSql();
  if (db) {
    try {
      await db`
        INSERT INTO user_continue_watching (user_id, media_id, media_type, media_title, media_poster, season, episode, progress, duration, updated_at)
        VALUES (${userId}, ${mediaId}, ${mediaType}, ${mediaTitle}, ${mediaPoster}, ${season || 1}, ${episode || 1}, ${progress || 0}, ${duration || 0}, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, media_id, media_type)
        DO UPDATE SET media_title = ${mediaTitle}, media_poster = ${mediaPoster}, season = ${season || 1}, episode = ${episode || 1}, progress = ${progress || 0}, duration = ${duration || 0}, updated_at = CURRENT_TIMESTAMP
      `;
      return true;
    } catch (e) {
      warn('[AnimeVault DB] updateContinueWatching DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING) || '[]');
    const existingIndex = items.findIndex(i => i.media_id === mediaId && i.media_type === mediaType);
    const newItem = {
      media_id: mediaId,
      media_type: mediaType,
      title: mediaTitle,
      image: mediaPoster,
      season: season,
      episode: episode,
      progress: progress,
      duration: duration,
      updated_at: new Date().toISOString()
    };
    if (existingIndex !== -1) {
      items[existingIndex] = newItem;
    } else {
      items.unshift(newItem);
    }
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(items.slice(0, 50)));
    return true;
  } catch (e) {
    return false;
  }
}

export async function fetchLikedItems(userId) {
  const db = await getSql();
  if (db) {
    try {
      const result = await db`
        SELECT media_id, media_type, media_title as title, media_poster as image, liked_at
        FROM user_likes
        WHERE user_id = ${userId}
        ORDER BY liked_at DESC
        LIMIT 100
      `;
      return result;
    } catch (e) {
      warn('[AnimeVault DB] fetchLikedItems DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKED_ITEMS) || '[]');
    return items;
  } catch (e) {
    return [];
  }
}

export async function toggleLikeItem(userId, mediaId, mediaType, mediaTitle, mediaPoster) {
  const db = await getSql();
  if (db) {
    try {
      const existing = await db`
        SELECT id FROM user_likes WHERE user_id = ${userId} AND media_id = ${mediaId} AND media_type = ${mediaType}
      `;
      if (existing.length > 0) {
        await db`DELETE FROM user_likes WHERE user_id = ${userId} AND media_id = ${mediaId} AND media_type = ${mediaType}`;
        return { action: 'unliked' };
      } else {
        await db`
          INSERT INTO user_likes (user_id, media_id, media_type, media_title, media_poster)
          VALUES (${userId}, ${mediaId}, ${mediaType}, ${mediaTitle}, ${mediaPoster})
        `;
        return { action: 'liked' };
      }
    } catch (e) {
      warn('[AnimeVault DB] toggleLikeItem DB failed:', e?.message);
    }
  }
  // localStorage fallback
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKED_ITEMS) || '[]');
    const existingIndex = items.findIndex(i => i.media_id === mediaId && i.media_type === mediaType);
    if (existingIndex !== -1) {
      items.splice(existingIndex, 1);
      localStorage.setItem(STORAGE_KEYS.LIKED_ITEMS, JSON.stringify(items));
      return { action: 'unliked' };
    } else {
      items.unshift({
        media_id: mediaId,
        media_type: mediaType,
        title: mediaTitle,
        image: mediaPoster,
        liked_at: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.LIKED_ITEMS, JSON.stringify(items));
      return { action: 'liked' };
    }
  } catch (e) {
    return { error: e?.message };
  }
}

export async function fetchReminders(userId) {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    return reminders.sort((a, b) => (a.airing_at || a.airingAt) - (b.airing_at || b.airingAt));
  } catch (error) {
    error('Error fetching reminders:', error);
    return [];
  }
}

export async function addReminder(userId, scheduleId, animeId, title, episode, airingAt, image) {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    const newReminder = {
      id: Date.now(),
      user_id: userId,
      schedule_id: scheduleId,
      anime_id: animeId,
      title: title,
      episode: episode,
      airing_at: airingAt,
      image: image,
      created_at: new Date().toISOString()
    };

    const exists = reminders.find(r => r.schedule_id === newReminder.schedule_id);
    if (!exists) {
      reminders.push(newReminder);
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    }

    return newReminder;
  } catch (error) {
    error('Error adding reminder:', error);
    return null;
  }
}

export async function removeReminder(userId, scheduleId) {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    const filtered = reminders.filter(r => r.schedule_id !== scheduleId);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    error('Error removing reminder:', error);
    return false;
  }
}

// Admin Functions
export async function isAdmin(userId) {
  if (!sql) return false;
  try {
    const result = await sql`
      SELECT is_admin FROM users WHERE id = ${userId}
    `;
    return result[0]?.is_admin || false;
  } catch (e) {
    return false;
  }
}

export async function listAllUsers(page = 1, limit = 50) {
  const db = await getSql();
  if (!db) return { users: [], total: 0 };
  try {
    const offset = (page - 1) * limit;
    const users = await db`
      SELECT id, username, avatar, is_admin, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await db`SELECT COUNT(*) as total FROM users`;
    return { users, total: parseInt(countResult[0].total, 10) };
  } catch (e) {
    error('[AnimeVault DB] listAllUsers failed:', e?.message);
    return { users: [], total: 0 };
  }
}

export async function searchUsersAdmin(query) {
  const db = await getSql();
  if (!db) return [];
  try {
    const searchTerm = `%${(query || '').toLowerCase()}%`;
    return await db`
      SELECT id, username, avatar, is_admin, is_verified, created_at
      FROM users
      WHERE LOWER(username) LIKE ${searchTerm}
      ORDER BY created_at DESC
      LIMIT 50
    `;
  } catch (e) {
    error('[AnimeVault DB] searchUsersAdmin failed:', e?.message);
    return [];
  }
}

export async function toggleUserVerification(userId) {
  const db = await getSql();
  if (!db) return { success: false };
  try {
    const result = await db`
      UPDATE users SET is_verified = NOT is_verified
      WHERE id = ${userId}
      RETURNING id, username, is_verified
    `;
    if (result.length > 0) return { success: true, user: result[0] };
    return { success: false };
  } catch (e) {
    error('[AnimeVault DB] toggleUserVerification failed:', e?.message);
    return { success: false };
  }
}

export async function toggleUserAdmin(userId) {
  const db = await getSql();
  if (!db) return { success: false };
  try {
    const result = await db`
      UPDATE users SET is_admin = NOT is_admin
      WHERE id = ${userId}
      RETURNING id, username, is_admin
    `;
    if (result.length > 0) return { success: true, user: result[0] };
    return { success: false };
  } catch (e) {
    error('[AnimeVault DB] toggleUserAdmin failed:', e?.message);
    return { success: false };
  }
}

export async function deleteUserAccount(userId) {
  const db = await getSql();
  if (!db) return { success: false };
  try {
    await db`DELETE FROM users WHERE id = ${userId}`;
    return { success: true };
  } catch (e) {
    error('[AnimeVault DB] deleteUserAccount failed:', e?.message);
    return { success: false };
  }
}

export async function getSiteStats() {
  const db = await getSql();
  if (!db) return { totalUsers: 0, totalAdmins: 0, totalVerified: 0 };
  try {
    const totalUsers = await db`SELECT COUNT(*) as count FROM users`;
    const totalAdmins = await db`SELECT COUNT(*) as count FROM users WHERE is_admin = true`;
    const totalVerified = await db`SELECT COUNT(*) as count FROM users WHERE is_verified = true`;
    return {
      totalUsers: parseInt(totalUsers[0].count, 10),
      totalAdmins: parseInt(totalAdmins[0].count, 10),
      totalVerified: parseInt(totalVerified[0].count, 10)
    };
  } catch (e) {
    return { totalUsers: 0, totalAdmins: 0, totalVerified: 0 };
  }
}

// ── ADVANCED ADMIN FUNCTIONS ──

export async function updateSiteSettings(settings) {
  const db = await getSql();
  if (!db) return { success: false };
  try {
    // Store site settings in a dedicated table
    await db`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;
    for (const [key, value] of Object.entries(settings)) {
      await db`
        INSERT INTO site_settings (key, value) VALUES (${key}, ${String(value)})
        ON CONFLICT (key) DO UPDATE SET value = ${String(value)}
      `;
    }
    return { success: true };
  } catch (e) {
    error('[AnimeVault DB] updateSiteSettings failed:', e?.message);
    return { success: false };
  }
}

export async function fetchSiteSettings() {
  const db = await getSql();
  if (!db) return { announcement: '', maintenance: 'false' };
  try {
    await db`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;
    const rows = await db`SELECT key, value FROM site_settings`;
    const settings = { announcement: '', maintenance: 'false' };
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  } catch (e) {
    return { announcement: '', maintenance: 'false' };
  }
}

export async function getDatabaseStats() {
  const db = await getSql();
  if (!db) return {};
  try {
    const tables = ['users', 'stories', 'notes', 'user_watch_history', 'user_continue_watching', 'user_likes', 'user_reminders', 'user_favorites', 'user_follows', 'user_blocks', 'media_comments', 'user_sessions', 'site_settings'];
    const stats = {};
    for (const table of tables) {
      try {
        // Use raw SQL for dynamic table names
        const result = await db.unsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        stats[table] = parseInt(result[0].count, 10);
      } catch { stats[table] = 0; }
    }
    return stats;
  } catch (e) {
    return {};
  }
}

export async function getSystemInfo() {
  const db = await getSql();
  if (!db) return { dbConnected: false };
  try {
    const version = await db`SELECT version()`;
    return {
      dbConnected: true,
      dbVersion: version[0]?.version || 'Unknown',
      nodeEnv: import.meta.env.MODE || 'unknown',
      buildTime: new Date().toISOString()
    };
  } catch (e) {
    return { dbConnected: false, error: e?.message };
  }
}

export async function bulkDeleteUsers(userIds) {
  const db = await getSql();
  if (!db) return { success: false, deleted: 0 };
  try {
    const result = await db`DELETE FROM users WHERE id = ANY(${userIds})`;
    return { success: true, deleted: result.count || userIds.length };
  } catch (e) {
    error('[AnimeVault DB] bulkDeleteUsers failed:', e?.message);
    return { success: false, deleted: 0 };
  }
}

export async function updateUsername(userId, newUsername) {
  const db = await getSql();
  if (!db) return { success: false, message: 'Database offline' };
  try {
    const trimmed = (newUsername || '').trim().toLowerCase().split('@')[0];
    if (trimmed.length < 3) return { success: false, message: 'Username must be at least 3 characters' };
    await db`UPDATE users SET username = ${trimmed} WHERE id = ${userId}`;
    return { success: true };
  } catch (e) {
    if (e?.message?.includes('duplicate') || e?.message?.includes('unique')) {
      return { success: false, message: 'Username already taken' };
    }
    return { success: false, message: e?.message };
  }
}

export async function getUserDetails(userId) {
  const db = await getSql();
  if (!db) return null;
  try {
    const users = await db`
      SELECT id, username, avatar, banner, is_admin, is_verified, two_factor_enabled, created_at
      FROM users WHERE id = ${userId}
    `;
    if (users.length === 0) return null;
    const u = users[0];
    // Get counts
    const watchCount = await db`SELECT COUNT(*) as c FROM user_watch_history WHERE user_id = ${userId}`;
    const likeCount = await db`SELECT COUNT(*) as c FROM user_likes WHERE user_id = ${userId}`;
    const followCount = await db`SELECT COUNT(*) as c FROM user_follows WHERE follower_id = ${userId}`;
    return {
      ...u,
      watchHistoryCount: parseInt(watchCount[0].c, 10),
      likesCount: parseInt(likeCount[0].c, 10),
      followingCount: parseInt(followCount[0].c, 10)
    };
  } catch (e) {
    error('[AnimeVault DB] getUserDetails failed:', e?.message);
    return null;
  }
}

export async function getRecentStories(limit = 20) {
  const db = await getSql();
  if (!db) return [];
  try {
    return await db`
      SELECT s.id, s.user_id, s.media_url, s.media_type, s.created_at, s.expires_at, u.username
      FROM stories s
      LEFT JOIN users u ON u.id::text = s.user_id
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    return [];
  }
}

export async function getRecentNotes(limit = 20) {
  const db = await getSql();
  if (!db) return [];
  try {
    return await db`
      SELECT n.id, n.user_id, n.content, n.created_at, n.expires_at, u.username
      FROM notes n
      LEFT JOIN users u ON u.id::text = n.user_id
      ORDER BY n.created_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    return [];
  }
}

export async function getRecentComments(limit = 20) {
  const db = await getSql();
  if (!db) return [];
  try {
    return await db`
      SELECT id, user_id, username, media_id, comment_text, created_at
      FROM media_comments
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    return [];
  }
}

export async function deleteStory(storyId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM stories WHERE id = ${storyId}`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteNote(noteId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM notes WHERE id = ${noteId}`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteComment(commentId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM media_comments WHERE id = ${commentId}`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function getActiveSessions(limit = 50) {
  const db = await getSql();
  if (!db) return [];
  try {
    return await db`
      SELECT s.id, s.user_id, s.device_name, s.created_at, s.last_active, s.expires_at, u.username
      FROM user_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > NOW()
      ORDER BY s.last_active DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    return [];
  }
}

export async function revokeSession(sessionId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM user_sessions WHERE id = ${sessionId}`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function initDatabase() {
  log('initDatabase called');
  const db = await getSql();
  if (db) {
    try {
      await db`
        CREATE TABLE IF NOT EXISTS user_follows (
          follower_id TEXT NOT NULL,
          following_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (follower_id, following_id)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS user_blocks (
          blocker_id TEXT NOT NULL,
          blocked_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (blocker_id, blocked_id)
        )
      `;
      await db`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        banner TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
      try { await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`; } catch (e) { }
      try { await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`; } catch (e) { }
      await db`
        CREATE TABLE IF NOT EXISTS stories (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_url TEXT NOT NULL,
          media_type TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS story_views (
          story_id INTEGER NOT NULL,
          viewer_id TEXT NOT NULL,
          viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (story_id, viewer_id)
        )
      `;
      try { await db`ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption TEXT`; } catch (e) { }

      await db`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          song_data TEXT
        )
      `;
      try { await db`ALTER TABLE notes ADD COLUMN IF NOT EXISTS song_data TEXT`; } catch (e) { }

      // ── New tables for localStorage → DB migration ──
      await db`
        CREATE TABLE IF NOT EXISTS user_watch_history (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          media_type TEXT NOT NULL,
          media_title TEXT,
          media_poster TEXT,
          watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await db`
        CREATE INDEX IF NOT EXISTS idx_watch_history_user ON user_watch_history(user_id, watched_at DESC)
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_continue_watching (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          media_type TEXT NOT NULL,
          media_title TEXT,
          media_poster TEXT,
          season INTEGER DEFAULT 1,
          episode INTEGER DEFAULT 1,
          progress DOUBLE PRECISION DEFAULT 0,
          duration DOUBLE PRECISION DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, media_id, media_type)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_likes (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          media_type TEXT NOT NULL,
          media_title TEXT,
          media_poster TEXT,
          liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, media_id, media_type)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_reminders (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          schedule_id TEXT NOT NULL,
          anime_id TEXT,
          title TEXT,
          episode INTEGER,
          airing_at DOUBLE PRECISION,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, schedule_id)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_stats (
          user_id TEXT PRIMARY KEY,
          total_watch_time DOUBLE PRECISION DEFAULT 0,
          anime_completed INTEGER DEFAULT 0,
          episodes_watched INTEGER DEFAULT 0
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_levels (
          user_id TEXT PRIMARY KEY,
          level INTEGER DEFAULT 1,
          xp DOUBLE PRECISION DEFAULT 0,
          xp_to_next_level DOUBLE PRECISION DEFAULT 100
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_activity (
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER DEFAULT 1,
          PRIMARY KEY (user_id, date)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          type TEXT,
          title TEXT,
          description TEXT,
          image TEXT,
          time TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id TEXT PRIMARY KEY,
          settings JSONB DEFAULT '{}'::jsonb
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS media_comments (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT,
          media_id TEXT NOT NULL,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await db`
        CREATE INDEX IF NOT EXISTS idx_media_comments_media ON media_comments(media_id, created_at DESC)
      `;

      log('[AnimeVault DB] All user data tables initialized');
    } catch (e) {
      warn('[AnimeVault DB] Failed to init tables:', e?.message);
    }
  }
  return true;
}

// ── SOCIAL API FUNCTIONS ──

export async function searchUsers(query, currentUserId) {
  const db = await getSql();
  if (!db) return [];
  try {
    const searchTerm = `%${(query || '').toLowerCase()}%`;

    if (!currentUserId) {
      const result = await db`
        SELECT id, username, avatar, banner, is_admin, is_verified
        FROM users
        WHERE LOWER(username) LIKE ${searchTerm}
        LIMIT 50
      `;
      return result;
    } else {
      const result = await db`
        SELECT id, username, avatar, banner, is_admin, is_verified
        FROM users
        WHERE LOWER(username) LIKE ${searchTerm}
          AND id::text != ${currentUserId}::text
          AND id::text NOT IN (
            SELECT blocked_id::text FROM user_blocks WHERE blocker_id::text = ${currentUserId}::text
          )
          AND id::text NOT IN (
            SELECT blocker_id::text FROM user_blocks WHERE blocked_id::text = ${currentUserId}::text
          )
        LIMIT 50
      `;
      return result;
    }
  } catch (e) {
    error('[AnimeVault DB] Search users failed:', e?.message);
    return [];
  }
}

export async function getUserSocialStats(userId) {
  const db = await getSql();
  if (!db) return { followers: 0, following: 0 };
  try {
    const followers = await db`SELECT COUNT(*) as count FROM user_follows WHERE following_id = ${userId}`;
    const following = await db`SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ${userId}`;
    return {
      followers: parseInt(followers[0].count, 10),
      following: parseInt(following[0].count, 10)
    };
  } catch (e) {
    return { followers: 0, following: 0 };
  }
}

export async function getConnections(currentUserId) {
  const db = await getSql();
  if (!db) return { following: [], blocked: [] };
  try {
    const following = await db`SELECT following_id FROM user_follows WHERE follower_id = ${currentUserId}`;
    const blocked = await db`SELECT blocked_id FROM user_blocks WHERE blocker_id = ${currentUserId}`;
    return {
      following: following.map(f => f.following_id),
      blocked: blocked.map(b => b.blocked_id)
    };
  } catch (e) {
    return { following: [], blocked: [] };
  }
}

export async function followUser(followerId, targetId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`INSERT INTO user_follows (follower_id, following_id) VALUES (${followerId}, ${targetId}) ON CONFLICT DO NOTHING`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function unfollowUser(followerId, targetId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM user_follows WHERE follower_id = ${followerId} AND following_id = ${targetId}`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function blockUser(blockerId, targetId) {
  const db = await getSql();
  if (!db) return false;
  try {
    // Blocking also forces unfollow both ways
    await db`DELETE FROM user_follows WHERE (follower_id = ${blockerId} AND following_id = ${targetId}) OR (follower_id = ${targetId} AND following_id = ${blockerId})`;
    await db`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${blockerId}, ${targetId}) ON CONFLICT DO NOTHING`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function unblockUser(blockerId, targetId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${targetId}`;
    return true;
  } catch (e) {
    return false;
  }
}

// ── STORIES & NOTES API FUNCTIONS ──

export async function uploadStory(userId, mediaUrl, mediaType, hoursToExpire, caption = '') {
  const db = await getSql();
  if (!db) return false;
  try {
    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);
    await db`
      INSERT INTO stories (user_id, media_url, media_type, expires_at, caption)
      VALUES (${userId}, ${mediaUrl}, ${mediaType}, ${expiresAt.toISOString()}, ${caption})
    `;
    return true;
  } catch (e) {
    error('[AnimeVault DB] Upload story failed:', e?.message);
    return false;
  }
}

export async function addNote(userId, content, hoursToExpire = 24, songData = null) {
  const db = await getSql();
  if (!db) return false;
  try {
    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);
    const songDataStr = songData ? JSON.stringify(songData) : null;
    // Delete existing unexpired notes for user
    await db`DELETE FROM notes WHERE user_id = ${userId}`;
    await db`
      INSERT INTO notes (user_id, content, expires_at, song_data)
      VALUES (${userId}, ${content}, ${expiresAt.toISOString()}, ${songDataStr})
    `;
    return true;
  } catch (e) {
    return false;
  }
}

export async function getActiveStories(targetUserId, viewerUserId) {
  const db = await getSql();
  if (!db) return { stories: [], allViewed: true, note: null };
  try {
    const now = new Date().toISOString();

    // Get unexpired note
    const notesResult = await db`
      SELECT content, song_data FROM notes
      WHERE user_id = ${targetUserId}::text AND expires_at > ${now}
      ORDER BY created_at DESC LIMIT 1
    `;
    let note = null;
    if (notesResult.length > 0) {
      note = {
        content: notesResult[0].content,
        songData: notesResult[0].song_data ? JSON.parse(notesResult[0].song_data) : null
      };
    }

    // Get unexpired stories for this user
    const stories = await db`
      SELECT id, user_id, media_url, media_type, created_at, expires_at, caption
      FROM stories
      WHERE user_id = ${targetUserId}::text AND expires_at > ${now}
      ORDER BY created_at ASC
    `;

    if (stories.length === 0) return { stories: [], allViewed: true, note };

    // Check views
    let allViewed = true;
    if (viewerUserId) {
      const storyIds = stories.map(s => s.id);
      const views = await db`
        SELECT story_id FROM story_views 
        WHERE viewer_id = ${viewerUserId}::text AND story_id IN ${db(storyIds)}
      `;
      const viewedIds = new Set(views.map(v => v.story_id));
      stories.forEach(s => {
        s.viewed = viewedIds.has(s.id);
        if (!s.viewed) allViewed = false;
      });
    } else {
      allViewed = false; // Not logged in, so nothing is "viewed"
    }

    return { stories, allViewed, note };
  } catch (e) {
    error('[AnimeVault DB] Get active stories failed:', e?.message);
    return { stories: [], allViewed: true, note: null };
  }
}

export async function markStoryViewed(storyId, viewerId) {
  const db = await getSql();
  if (!db || !viewerId) return false;
  try {
    await db`
      INSERT INTO story_views (story_id, viewer_id)
      VALUES (${storyId}, ${viewerId})
      ON CONFLICT DO NOTHING
    `;
    return true;
  } catch (e) {
    return false;
  }
}

// Public User Profile
export async function fetchPublicUserProfile(username) {
  return getProfile(username);
}

// Collections Functions (localStorage fallback)
export async function fetchAllCollections() {
  return [];
}

export async function fetchUserCollections(userId) {
  return [];
}

export async function fetchTrendingCollections() {
  return [];
}

export async function fetchCollectionById(id) {
  return null;
}

export async function fetchCollectionItems(collectionId) {
  return [];
}

export async function createCollection(collection) {
  return { success: true, collection: { ...collection, id: Date.now() } };
}

export async function updateCollection(id, updates) {
  return { success: true };
}

export async function deleteCollection(id) {
  return { success: true };
}

export async function addItemToCollection(collectionId, item) {
  return { success: true };
}

export async function removeItemFromCollection(collectionId, itemId) {
  return { success: true };
}

export async function toggleLikeCollection(collectionId, userId) {
  return { action: 'liked' };
}

export async function toggleFollowCollection(collectionId, userId) {
  return { action: 'followed' };
}

export async function duplicateCollection(collectionId, userId) {
  return { success: true };
}

// LocalStorage functions from database.js (exported for compatibility)
export async function initializeDatabase() {
  log('Initializing localStorage storage');
  if (!localStorage.getItem(STORAGE_KEYS.REMINDERS)) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_STATS)) {
    localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify({
      totalWatchTime: 0,
      animeCompleted: 0,
      episodesWatched: 0
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify({
      animes: [],
      studios: [],
      characters: []
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY)) {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LEVEL)) {
    localStorage.setItem(STORAGE_KEYS.LEVEL, JSON.stringify({
      level: 1,
      xp: 0,
      xpToNextLevel: 100
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FRIENDS)) {
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify([]));
  }
  log('LocalStorage initialized successfully');
}

export async function getNotifications() {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    return notifications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } catch (error) {
    error('Error fetching notifications:', error);
    return [];
  }
}

export async function addNotification(notification) {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const newNotification = {
      id: Date.now(),
      type: notification.type,
      title: notification.title,
      description: notification.description,
      image: notification.image,
      time: notification.time,
      read: notification.read,
      created_at: new Date().toISOString()
    };
    notifications.unshift(newNotification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    return newNotification;
  } catch (error) {
    error('Error adding notification:', error);
    return null;
  }
}

export async function markNotificationAsRead(id) {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    return updated.find(n => n.id === id);
  } catch (error) {
    error('Error marking notification as read:', error);
    return null;
  }
}

export async function getUserStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STATS) || '{}');
  } catch (error) {
    error('Error fetching user stats:', error);
    return {};
  }
}

export async function updateUserStats(updates) {
  try {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STATS) || '{}');
    const updatedStats = { ...stats, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(updatedStats));
    return updatedStats;
  } catch (error) {
    error('Error updating user stats:', error);
    return null;
  }
}

export async function getFavoritesLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
  } catch (error) {
    error('Error fetching favorites:', error);
    return { animes: [], studios: [], characters: [] };
  }
}

export async function addFavoriteLocal(type, item) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    if (!favorites[type].find(f => f.id === item.id)) {
      favorites[type].push(item);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
    return favorites;
  } catch (error) {
    error('Error adding favorite:', error);
    return null;
  }
}

export async function removeFavoriteLocal(type, itemId) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    favorites[type] = favorites[type].filter(f => f.id !== itemId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return favorites;
  } catch (error) {
    error('Error removing favorite:', error);
    return null;
  }
}

export async function setFavoriteItem(type, item) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    favorites[type] = [item];
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return favorites;
  } catch (error) {
    error('Error setting favorite:', error);
    return null;
  }
}

export async function getFavoriteItem(type) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    return favorites[type]?.[0] || null;
  } catch (error) {
    error('Error getting favorite:', error);
    return null;
  }
}

export async function getWatchHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
  } catch (error) {
    error('Error fetching watch history:', error);
    return [];
  }
}

export async function addWatchHistory(anime) {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
    history.unshift({ ...anime, watchedAt: new Date().toISOString() });
    const recentHistory = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(recentHistory));
    return recentHistory;
  } catch (error) {
    error('Error adding watch history:', error);
    return null;
  }
}

export async function getLevel() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVEL) || '{}');
  } catch (error) {
    error('Error fetching level:', error);
    return { level: 1, xp: 0, xpToNextLevel: 100 };
  }
}

export async function addXP(amount) {
  try {
    const levelData = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVEL) || '{}');
    let { level, xp, xpToNextLevel } = levelData;
    xp += amount;

    while (xp >= xpToNextLevel) {
      xp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = Math.floor(xpToNextLevel * 1.5);
    }

    const updatedLevel = { level, xp, xpToNextLevel };
    localStorage.setItem(STORAGE_KEYS.LEVEL, JSON.stringify(updatedLevel));
    return updatedLevel;
  } catch (error) {
    error('Error adding XP:', error);
    return null;
  }
}

export async function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '{}');
  } catch (error) {
    error('Error fetching activity:', error);
    return {};
  }
}

export async function addActivity() {
  try {
    const activity = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '{}');
    const today = new Date().toISOString().split('T')[0];
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activity));
    return activity;
  } catch (error) {
    error('Error adding activity:', error);
    return null;
  }
}

export async function getPosts() {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    error('Error fetching posts:', error);
    return [];
  }
}

export async function addPost(post) {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const newPost = {
      id: Date.now(),
      ...post,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      shares: 0
    };
    posts.unshift(newPost);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    return newPost;
  } catch (error) {
    error('Error adding post:', error);
    return null;
  }
}

export async function toggleLikePost(postId, userId = 'current-user') {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const post = posts[postIndex];
      const likeIndex = post.likes.indexOf(userId);
      if (likeIndex === -1) {
        post.likes.push(userId);
      } else {
        post.likes.splice(likeIndex, 1);
      }
      posts[postIndex] = post;
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      return post;
    }
    return null;
  } catch (error) {
    error('Error toggling like:', error);
    return null;
  }
}

export async function addCommentToPost(postId, comment) {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const post = posts[postIndex];
      post.comments.push({
        id: Date.now(),
        ...comment,
        createdAt: new Date().toISOString()
      });
      posts[postIndex] = post;
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      return post;
    }
    return null;
  } catch (error) {
    error('Error adding comment:', error);
    return null;
  }
}

export async function getFriends() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
  } catch (error) {
    error('Error fetching friends:', error);
    return [];
  }
}

export async function addFriend(friend) {
  try {
    const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
    if (!friends.find(f => f.id === friend.id)) {
      friends.push({ ...friend, addedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
    }
    return friends;
  } catch (error) {
    error('Error adding friend:', error);
    return null;
  }
}

export async function removeFriend(friendId) {
  try {
    const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
    const updatedFriends = friends.filter(f => f.id !== friendId);
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(updatedFriends));
    return updatedFriends;
  } catch (error) {
    error('Error removing friend:', error);
    return null;
  }
}

export async function getFriendRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
  } catch (error) {
    error('Error fetching friend requests:', error);
    return [];
  }
}

export async function sendFriendRequest(request) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    if (!requests.find(r => r.id === request.id || r.fromId === request.fromId)) {
      requests.push({
        ...request,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));
    }
    return requests;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return null;
  }
}

export async function acceptFriendRequest(requestId) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    const requestIndex = requests.findIndex(r => r.id === requestId);
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = 'accepted';
      requests[requestIndex] = request;
      localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));

      const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
      if (!friends.find(f => f.id === request.fromId)) {
        friends.push({
          id: request.fromId,
          name: request.fromName,
          avatar: request.fromAvatar,
          addedAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
      }

      return { request, friends };
    }
    return null;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return null;
  }
}

export async function declineFriendRequest(requestId) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    const updatedRequests = requests.filter(r => r.id !== requestId);
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(updatedRequests));
    return updatedRequests;
  } catch (error) {
    console.error('Error declining friend request:', error);
    return null;
  }
}

// Media Comments Functions
export async function fetchMediaComments(mediaId) {
  try {
    const comments = JSON.parse(localStorage.getItem('animevault_media_comments') || '[]');
    return comments.filter(c => c.media_id === mediaId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Error fetching media comments:', error);
    return [];
  }
}

export async function addMediaComment(userId, username, mediaId, commentText) {
  try {
    const comments = JSON.parse(localStorage.getItem('animevault_media_comments') || '[]');
    const newComment = {
      id: Date.now(),
      user_id: userId,
      username: username,
      media_id: mediaId,
      comment_text: commentText,
      created_at: new Date().toISOString()
    };
    comments.push(newComment);
    localStorage.setItem('animevault_media_comments', JSON.stringify(comments));
    return { success: true, comment: newComment };
  } catch (error) {
    console.error('Error adding media comment:', error);
    return { success: false, message: 'Failed to add comment' };
  }
}

export async function deleteMediaComment(commentId, userId) {
  try {
    const comments = JSON.parse(localStorage.getItem('animevault_media_comments') || '[]');
    const updatedComments = comments.filter(c => !(c.id === commentId && c.user_id === userId));
    localStorage.setItem('animevault_media_comments', JSON.stringify(updatedComments));
    return true;
  } catch (error) {
    console.error('Error deleting media comment:', error);
    return false;
  }
}

// Settings Functions
const SETTINGS_KEY = 'animevault_settings';
const DEFAULT_SETTINGS = {
  theme: 'dark',
  accentColor: '#ff1a75',
  fontSize: 'medium',
  defaultQuality: 'auto',
  autoplay: true,
  autoResume: true,
  playbackSpeed: 1,
  subtitleLanguage: 'en',
  subtitleFontSize: 'medium',
  subtitleOpacity: 0.8,
  audioLanguage: 'en',
  volumeNormalization: true,
  favoriteGenres: [],
  defaultSortOrder: 'dateAdded',
  defaultCollectionPrivacy: 'private',
  autoAddContinueWatching: true,
  pushNotifications: true,
  emailAlerts: true,
  emailMarketing: false,
  reminderTiming: '15min',
  profileVisibility: 'public',
  hideHistory: false,
  hideLikes: false,
  twoFAEnabled: false
};

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

export function resetSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return true;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return false;
  }
}

export async function updateSetting(key, value) {
  try {
    const settings = getSettings();
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { key, value };
  } catch (error) {
    console.error('Error updating setting:', error);
    return null;
  }
}

export async function syncGoogleUserToDb(email, googleAvatar, isEmailVerified) {
  try {
    const db = await getSql();
    if (!db) return { success: false, message: 'Database not available' };

    const trimmedUser = email.trim().toLowerCase().split('@')[0];

    const existing = await db`
      SELECT id, username, avatar, banner, is_admin, is_verified, created_at
      FROM users WHERE LOWER(username) = ${trimmedUser}
    `;

    if (existing.length > 0) {
      // Update email verified status if it became true
      if (isEmailVerified && !existing[0].is_verified) {
        await db`UPDATE users SET is_verified = true WHERE id = ${existing[0].id}`;
        existing[0].is_verified = true;
      }
      return { success: true, user: existing[0] };
    }

    // User doesn't exist, create a new record!
    // If the email includes 'admin', let's make them an admin!
    const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'adiyanhehe@gmail.com';

    const result = await db`
      INSERT INTO users (username, password, avatar, is_admin, is_verified) 
      VALUES (${trimmedUser}, 'google_oauth_bypass', ${googleAvatar || ''}, ${isAdmin}, ${isEmailVerified || false})
      RETURNING id, username, avatar, banner, is_admin, is_verified, created_at
    `;
    return { success: true, user: result[0] };
  } catch (err) {
    console.error('Failed to sync Google user to database:', err);
    return { success: false, message: 'Sync failed' };
  }
}

// ==================== SESSION PERSISTENCE ====================

// Ensure the user_sessions table exists
async function ensureSessionTable() {
  const db = await getSql();
  if (!db) return false;
  try {
    // Ensure the user_sessions table exists with required columns
    // If the table exists but lacks the device_id column, recreate it to avoid schema mismatches.
    const hasDeviceId = await db`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'device_id'`;
    if (hasDeviceId.length === 0) {
      // Drop and recreate the table to ensure proper schema
      await db`DROP TABLE IF EXISTS user_sessions`;
      await db`
        CREATE TABLE user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token TEXT NOT NULL UNIQUE,
          device_id TEXT NOT NULL,
          device_name TEXT DEFAULT 'Unknown Device',
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
          last_active TIMESTAMP DEFAULT NOW()
        )
      `;
    } else {
      // Table exists with device_id, ensure device_name column exists
      await db`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Unknown Device'`;
    }
    return true;
  } catch (e) {
    console.error('[AnimeVault DB] Failed to create/alter user_sessions table:', e);
    return false;
  }
}

// Generate a random session token
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Get or create a device ID for this browser
export function getDeviceId() {
  let deviceId = localStorage.getItem('animevault_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + generateSessionToken().slice(0, 24);
    localStorage.setItem('animevault_device_id', deviceId);
  }
  return deviceId;
}

// Create a new session for a user
export async function createUserSession(userId) {
  const db = await getSql();
  if (!db) return null;
  try {
    await ensureSessionTable();
    const deviceId = getDeviceId();
    const token = generateSessionToken();
    const deviceName = navigator.userAgent.slice(0, 100);

    // Remove any existing session for this device
    await db`DELETE FROM user_sessions WHERE user_id = ${userId} AND device_id = ${deviceId}`;

    const result = await db`
      INSERT INTO user_sessions (user_id, session_token, device_id, device_name)
      VALUES (${userId}, ${token}, ${deviceId}, ${deviceName})
      RETURNING id, session_token, expires_at
    `;

    if (result.length > 0) {
      localStorage.setItem('animevault_session_token', result[0].session_token);
      return result[0];
    }
    return null;
  } catch (e) {
    console.error('[AnimeVault DB] Failed to create session:', e);
    return null;
  }
}

// Restore user from a stored session token
export async function restoreSession() {
  const token = localStorage.getItem('animevault_session_token');
  if (!token) return null;

  const db = await getSql();
  if (!db) return null;

  try {
    await ensureSessionTable();
    const result = await db`
      SELECT s.id as session_id, s.expires_at, s.user_id,
             u.id, u.username, u.avatar, u.banner, u.is_admin, u.created_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.session_token = ${token}
        AND s.expires_at > NOW()
    `;

    if (result.length > 0) {
      const row = result[0];
      // Update last_active timestamp
      await db`UPDATE user_sessions SET last_active = NOW() WHERE session_token = ${token}`;
      return {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
        banner: row.banner,
        is_admin: row.is_admin,
        created_at: row.created_at
      };
    } else {
      // Session expired or invalid, clean up
      localStorage.removeItem('animevault_session_token');
      return null;
    }
  } catch (e) {
    console.error('[AnimeVault DB] Failed to restore session:', e);
    return null;
  }
}

// Delete session (logout)
export async function deleteUserSession() {
  const token = localStorage.getItem('animevault_session_token');
  if (!token) return;

  const db = await getSql();
  if (db) {
    try {
      await db`DELETE FROM user_sessions WHERE session_token = ${token}`;
    } catch (e) {
      console.error('[AnimeVault DB] Failed to delete session:', e);
    }
  }
  localStorage.removeItem('animevault_session_token');
}

// Get all active sessions/devices for a user
export async function getUserDevices(userId) {
  const db = await getSql();
  if (!db) return [];
  try {
    await ensureSessionTable();
    const result = await db`
      SELECT id, device_id, device_name, created_at, last_active, expires_at
      FROM user_sessions
      WHERE user_id = ${userId} AND expires_at > NOW()
      ORDER BY last_active DESC
    `;
    return result;
  } catch (e) {
    console.error('[AnimeVault DB] Failed to get user devices:', e);
    return [];
  }
}

// Remove a specific device session
export async function removeDeviceSession(sessionId, userId) {
  const db = await getSql();
  if (!db) return false;
  try {
    await db`DELETE FROM user_sessions WHERE id = ${sessionId} AND user_id = ${userId}`;
    return true;
  } catch (e) {
    console.error('[AnimeVault DB] Failed to remove device session:', e);
    return false;
  }
}

export async function checkUser2FA(email) {
  try {
    const trimmedUser = email.trim().toLowerCase().split('@')[0];
    const db = await getSql();
    if (!db) return false;
    const result = await db`SELECT two_factor_enabled FROM users WHERE LOWER(username) = ${trimmedUser}`;
    return result.length > 0 ? result[0].two_factor_enabled : false;
  } catch (err) {
    console.error('Error checking 2FA:', err);
    return false;
  }
}

export async function toggle2FA(userId, enabled) {
  try {
    const db = await getSql();
    if (!db) return false;
    await db`UPDATE users SET two_factor_enabled = ${enabled} WHERE id = ${userId}`;
    return true;
  } catch (err) {
    console.error('Error toggling 2FA:', err);
    return false;
  }
}
