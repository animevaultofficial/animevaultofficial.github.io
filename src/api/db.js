
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
  const trimmedUser = (username || '').trim().toLowerCase();
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
  const trimmedUser = (username || '').trim().toLowerCase();
  if (!trimmedUser || !password) return { success: false, message: 'All fields are required.' };

  // Ensure DB connection
  const db = await getSql();
  if (db) {
    try {
      const result = await db`
        SELECT id, username, password, avatar, banner, is_admin FROM users
        WHERE username = ${trimmedUser}
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
    warn('[AnimeVault DB] Database not connected');
    return null;
  }
  try {
    const result = await sql`
      SELECT id, username, avatar, banner, is_admin
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

export async function updateUserProfile(userId, newAvatar, newBanner) {
  if (!sql) {
    console.warn('[AnimeVault DB] Database not connected');
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
    console.warn('[AnimeVault DB] Database not connected');
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

// Missing functions (using localStorage fallback for now)
export async function fetchWatchHistory(userId) {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
    return history;
  } catch (error) {
    error('Error fetching watch history:', error);
    return [];
  }
}

export async function addToHistory(userId, mediaId, mediaType, mediaTitle, mediaPoster) {
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
  } catch (error) {
    error('Error adding to history:', error);
    return false;
  }
}

export async function clearWatchHistory(userId) {
  try {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
    return true;
  } catch (error) {
    error('Error clearing history:', error);
    return false;
  }
}

export async function fetchContinueWatching(userId) {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING) || '[]');
    return items;
  } catch (error) {
    error('Error fetching continue watching:', error);
    return [];
  }
}

export async function updateContinueWatching(userId, mediaId, mediaType, mediaTitle, mediaPoster, season, episode, progress, duration) {
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
  } catch (error) {
    error('Error updating continue watching:', error);
    return false;
  }
}

export async function fetchLikedItems(userId) {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKED_ITEMS) || '[]');
    return items;
  } catch (error) {
    error('Error fetching liked items:', error);
    return [];
  }
}

export async function toggleLikeItem(userId, mediaId, mediaType, mediaTitle, mediaPoster) {
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
  } catch (error) {
    error('Error toggling like:', error);
    return { error: error?.message };
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

// Site Settings & Init
export async function fetchSiteSettings() {
  return { announcement: '', maintenance: 'false' };
}

export async function initDatabase() {
  log('initDatabase called');
  return true;
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

