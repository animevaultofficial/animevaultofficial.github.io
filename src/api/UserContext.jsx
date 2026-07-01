import React, { createContext, useContext, useState, useEffect } from 'react';
import { createAuthClient } from '@neondatabase/auth';
import { log, warn, error } from '../utils/logger.js';

// Neon Auth client
const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  fetch: (url, options = {}) => {
    const newOptions = { ...options };
    newOptions.headers = { ...newOptions.headers };
    // Fix for Capacitor WebView: Origin may be null/missing, provide a fallback
    if (!newOptions.headers['Origin'] && !newOptions.headers['origin']) {
      newOptions.headers['Origin'] = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'https://animevaultofficial.github.io';
    }
    return fetch(url, newOptions);
  }
});

import {
  fetchWatchHistory, addToHistory as dbAddToHistory, clearWatchHistory as dbClearWatchHistory,
  fetchContinueWatching, updateContinueWatching as dbUpdateContinueWatching,
  fetchLikedItems, toggleLikeItem as dbToggleLike,
  updateUserProfile as dbUpdateUserProfile,
  fetchReminders, addReminder as dbAddReminder, removeReminder as dbRemoveReminder,
  syncGoogleUserToDb,
  createUserSession, restoreSession, deleteUserSession,
  userLogin as dbUserLogin,
  userSignup as dbUserSignup
} from './db';
import { initializeTrendingDefaults } from './db';
import {
  getUserStats, updateUserStats,
  getFavorites, addFavorite, removeFavorite,
  getWatchHistory as dbGetWatchHistory, addWatchHistory as dbAddWatchHistory,
  getLevel, addXP, addActivity
} from './database';
import {
  proxyLogin,
  proxySignup,
  proxySyncAuthUser,
  proxyRestoreSession,
  proxyLogout,
  clearStoredProxyToken
} from './authProxy';

const UserContext = createContext(null);
const LOCAL_SESSION_USER_KEY = 'animevault_session_user';

function getAuthCallbackURL() {
  const webFallback = 'https://animevaultofficial.github.io/';
  const mobileFallback = 'https://localhost/';
  try {
    const { origin, protocol, hostname } = window.location;
    const isCapacitorRuntime = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor);
    const isNativeShell = origin === 'null' || protocol === 'capacitor:' || protocol === 'file:';

    if (isNativeShell) return isCapacitorRuntime ? mobileFallback : webFallback;

    // Android/iOS Capacitor serves bundled assets from https://localhost by default.
    // That exact origin must be present in Neon Auth's Allowed Domains for mobile OAuth.
    if (isCapacitorRuntime || hostname === 'localhost') return `${origin}/`;

    return `${origin}/`;
  } catch {
    return webFallback;
  }
}

function getAuthAllowedDomainHint(callbackURL) {
  try {
    const url = new URL(callbackURL);
    if (url.hostname === 'localhost') {
      return 'Mobile sign-in needs https://localhost/ in Neon Auth Allowed Domains and Google OAuth authorized redirect URLs.';
    }
  } catch {}
  return `Make sure ${callbackURL} is added to Neon Auth Allowed Domains and Google OAuth authorized redirect URLs.`;
}

function readLocalSessionUser() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistLocalSessionUser(user) {
  try {
    if (user) localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage can be unavailable in some mobile webview/privacy modes.
  }
}

function clearLocalSessionUser() {
  try {
    localStorage.removeItem(LOCAL_SESSION_USER_KEY);
  } catch {}
}

function getAuthUserFromResponse(res) {
  return res?.user || res?.data?.user || res?.data?.session?.user || res?.session?.user || null;
}

function getAuthEmail(authUser, fallbackEmail = '') {
  return authUser?.email || authUser?.user_metadata?.email || fallbackEmail;
}

function getAuthName(authUser, fallbackEmail = '') {
  return authUser?.name || authUser?.user_metadata?.name || getAuthEmail(authUser, fallbackEmail).split('@')[0] || 'User';
}

function getAuthAvatar(authUser) {
  return authUser?.image || authUser?.avatar_url || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null;
}

async function tryCreateUserSession(userId) {
  try {
    return await createUserSession(userId);
  } catch (err) {
    warn('[AnimeVault Auth] Persistent DB session creation failed; using local session only:', err?.message || err);
    return null;
  }
}

function normalizeProxyUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username || user.email?.split('@')[0] || 'User',
    avatar: user.avatar || user.image || null,
    banner: user.banner || null,
    is_admin: Boolean(user.is_admin || user.isAdmin),
    is_verified: Boolean(user.is_verified || user.isVerified),
    created_at: user.created_at || user.createdAt,
  };
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const [history, setHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [likes, setLikes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  // Try to restore session from DB on mount (survives refresh)
  const initSession = async () => {
    try {
      // 1. First try restoring from our DB session token (fast, survives refresh)
      const dbUser = await restoreSession();
      if (dbUser) {
        log('[AnimeVault Auth] Session restored from DB');
        persistLocalSessionUser(dbUser);
        setUser(dbUser);
        return;
      }

      // 2. Try the optional Render auth proxy. This avoids mobile WebView
      // Origin issues because Render talks to Neon server-side.
      const proxySession = await proxyRestoreSession();
      if (proxySession.success && proxySession.user) {
        const proxyUser = normalizeProxyUser(proxySession.user);
        persistLocalSessionUser(proxyUser);
        setUser(proxyUser);
        return;
      }

      // 3. Fall back to Neon Auth session (only works if not refreshed)
      const { data } = await authClient.getSession();

      if (data?.session && data?.user) {
        await syncAuthSessionUser();
      } else {
        setUser(readLocalSessionUser());
      }
    } catch (err) {
      warn('[AnimeVault Auth] Session init failed:', err);
      setUser(readLocalSessionUser());
    }
  };

  useEffect(() => {
    initSession();
    // Initialize trending defaults on app load
    initializeTrendingDefaults().catch(err => console.warn('Failed to init trending defaults:', err));
  }, []);

  const syncAuthSessionUser = async (authUserOverride = null, fallbackEmail = '') => {
    let currentUser = authUserOverride;

    if (!currentUser) {
      const { data } = await authClient.getSession();
      currentUser = data?.user || data?.session?.user;
    }

    const currentEmail = getAuthEmail(currentUser, fallbackEmail);
    if (!currentEmail) return null;

    const proxyRes = await proxySyncAuthUser({
      id: currentUser?.id,
      email: currentEmail,
      name: getAuthName(currentUser, currentEmail),
      avatar: getAuthAvatar(currentUser),
      emailVerified: currentUser?.emailVerified || currentUser?.email_verified || false,
    });
    if (proxyRes.success && proxyRes.user) {
      const proxyUser = normalizeProxyUser(proxyRes.user);
      persistLocalSessionUser(proxyUser);
      setUser(proxyUser);
      return proxyUser;
    }

    const syncRes = await syncGoogleUserToDb(
      currentEmail,
      getAuthAvatar(currentUser),
      currentUser?.emailVerified || currentUser?.email_verified || false
    );

    const sessionUser = syncRes.success
      ? syncRes.user
      : {
          id: currentUser?.id || currentEmail,
          username: getAuthName(currentUser, currentEmail),
          avatar: getAuthAvatar(currentUser),
          banner: null,
          is_admin: false
        };

    // Do not block login on the persistent DB session table. Mobile can fail here
    // because Neon serverless requests are Origin-restricted, but localStorage is
    // enough for the app to become signed in immediately.
    await tryCreateUserSession(sessionUser.id);
    persistLocalSessionUser(sessionUser);
    setUser(sessionUser);
    return sessionUser;
  };

  const syncUserData = async () => {
    if (!user) return;
    try {
      const [histData, contData, likedData, remData] = await Promise.all([
        fetchWatchHistory(user.id),
        fetchContinueWatching(user.id),
        fetchLikedItems(user.id),
        fetchReminders(user.id)
      ]);
      setHistory(histData || []);
      setContinueWatching(contData || []);
      setLikes(likedData || []);
      setReminders(remData || []);
    } catch (err) {
      warn('[AnimeVault DB] Failed to sync user data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      syncUserData();
    } else {
      setHistory([]);
      setContinueWatching([]);
      setLikes([]);
      setReminders([]);
    }
  }, [user]);

  const login = async (email, password, verificationCode) => {
    try {
      // If we have a verification code, try Neon Auth OTP first
      if (verificationCode) {
        try {
          const res = await authClient.signIn.emailOtp({ email, otp: verificationCode });
          const loggedInUser = getAuthUserFromResponse(res);
          if (loggedInUser || (!res?.error && res?.data)) {
            const sessionUser = await syncAuthSessionUser(loggedInUser, email);
            if (!sessionUser) {
              return { success: false, message: 'Verification succeeded, but AnimeVault could not read your account email. Please refresh and try again.' };
            }
            setShowAuthModal(false);
            return { success: true };
          }
          return { success: false, message: res?.error?.message || 'Verification failed.' };
        } catch (otpErr) {
          return { success: false, message: otpErr.message || 'Verification failed.' };
        }
      }

      // Prefer the optional Render auth proxy on mobile/static hosting. It can
      // connect to Neon server-side from an allowed Render domain.
      const proxyRes = await proxyLogin(email, password);
      if (proxyRes.success && proxyRes.user) {
        const proxyUser = normalizeProxyUser(proxyRes.user);
        persistLocalSessionUser(proxyUser);
        setUser(proxyUser);
        setShowAuthModal(false);
        return { success: true };
      }
      if (proxyRes.configured) {
        warn('[AnimeVault Auth] Render proxy login failed, falling back to Neon Auth:', proxyRes.message);
      }

      // Try Neon Auth email/password login
      try {
        const res = await authClient.signIn.email({ email, password });
        const loggedInUser = getAuthUserFromResponse(res);
        if (loggedInUser || (!res?.error && res?.data)) {
          const sessionUser = await syncAuthSessionUser(loggedInUser, email);
          if (!sessionUser) {
            return { success: false, message: 'Sign-in succeeded, but AnimeVault could not read your account email. Please refresh and try again.' };
          }
          setShowAuthModal(false);
          return { success: true };
        }
        // Neon Auth failed - fall through to DB login
        warn('[AnimeVault Auth] Neon Auth login failed, falling back to DB login:', res?.error?.message);
      } catch (neonErr) {
        warn('[AnimeVault Auth] Neon Auth login threw, falling back to DB login:', neonErr.message);
      }

      // Fallback: try local DB login (works with users stored in Neon DB or localStorage)
      const dbRes = await dbUserLogin(email, password);
      if (dbRes.success) {
        await tryCreateUserSession(dbRes.user.id);
        persistLocalSessionUser(dbRes.user);
        setUser(dbRes.user);
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, message: dbRes.message || 'Login failed. Please check your credentials.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const signup = async (email, password) => {
    try {
      const name = email.split('@')[0];
      const proxyRes = await proxySignup(email, password);
      if (proxyRes.success && proxyRes.user) {
        const proxyUser = normalizeProxyUser(proxyRes.user);
        persistLocalSessionUser(proxyUser);
        setUser(proxyUser);
        setShowAuthModal(false);
        return { success: true };
      }
      if (proxyRes.configured) {
        warn('[AnimeVault Auth] Render proxy signup failed, falling back to Neon Auth:', proxyRes.message);
      }

      let res = null;
      try {
        res = await authClient.signUp.email({ email, password, name });
      } catch (neonErr) {
        warn('[AnimeVault Auth] Neon Auth signup threw, falling back to DB signup:', neonErr.message);
      }
      const signedUpUser = getAuthUserFromResponse(res);
      if (signedUpUser || (!res?.error && res?.data)) {
        const sessionUser = await syncAuthSessionUser(signedUpUser, email);
        if (!sessionUser) {
          return { success: false, message: 'Account created, but AnimeVault could not read your account email. Please sign in again.' };
        }
        setShowAuthModal(false);
        return { success: true };
      }

      if (res?.error?.message) {
        warn('[AnimeVault Auth] Neon Auth signup failed, falling back to DB signup:', res.error.message);
      }

      const dbRes = await dbUserSignup(email, password);
      if (dbRes.success) {
        await tryCreateUserSession(dbRes.user.id);
        persistLocalSessionUser(dbRes.user);
        setUser(dbRes.user);
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, message: dbRes.message || res?.error?.message || 'Signup failed' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const sendVerificationCode = async (email) => {
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const loginWithGoogle = async () => {
    const callbackURL = getAuthCallbackURL();
    try {
      // Trigger Google OAuth flow via Neon Auth.
      // Use the current mobile/web origin root so the callback matches the
      // configured Neon/Google allowed domain and the app can restore session.
      await authClient.signIn.social({
        provider: 'google',
        callbackURL,
        redirectTo: callbackURL,
      });
      return { success: true };
    } catch (e) {
      console.error('Google login failed:', e);
      const detail = e?.message ? ` (${e.message})` : '';
      return {
        success: false,
        message: `${getAuthAllowedDomainHint(callbackURL)}${detail}`
      };
    }
  };

  const logout = async () => {
    // Delete DB/proxy sessions first
    await deleteUserSession();
    await proxyLogout();
    clearStoredProxyToken();
    clearLocalSessionUser();
    // Then sign out of Neon Auth
    try { await authClient.signOut(); } catch (e) { /* ignore */ }
    setUser(null);
  };

  const addToHistory = async (mediaId, mediaType, mediaTitle, mediaPoster) => {
    if (!user) return false;

    await dbAddWatchHistory({ id: mediaId, title: mediaTitle, image: mediaPoster });
    await dbAddToHistory(user.id, mediaId, mediaType, mediaTitle, mediaPoster);
    await addXP(5);
    await addActivity();

    syncUserData();
    return true;
  };

  const clearHistory = async () => {
    if (!user) return false;
    const success = await dbClearWatchHistory(user.id);
    if (success) {
      setHistory([]);
    }
    return success;
  };

  const updateContinueWatching = async (mediaId, mediaType, mediaTitle, mediaPoster, season = 1, episode = 1, progress = 0, duration = 0) => {
    if (!user) return false;
    const success = await dbUpdateContinueWatching(user.id, mediaId, mediaType, mediaTitle, mediaPoster, season, episode, progress, duration);
    if (success) {
      syncUserData();

      const stats = await getUserStats();
      await updateUserStats({
        ...stats,
        episodesWatched: (stats.episodesWatched || 0) + 1,
        totalWatchTime: (stats.totalWatchTime || 0) + (duration || 0)
      });

      await addXP(10);
      await addActivity();
    }
    return success;
  };

  const toggleLike = async (mediaId, mediaType, mediaTitle, mediaPoster) => {
    if (!user) {
      setAuthTab('login');
      setShowAuthModal(true);
      return { promptLogin: true };
    }

    const result = await dbToggleLike(user.id, mediaId, mediaType, mediaTitle, mediaPoster);
    if (!result.error) {
      syncUserData();

      const favorites = await getFavorites();
      const isAlreadyFavorite = favorites.animes?.some(f => String(f.id) === String(mediaId));

      if (result.action === 'liked' && !isAlreadyFavorite) {
        await addFavorite('animes', { id: mediaId, title: mediaTitle, image: mediaPoster });
        await addXP(2);
      } else if (result.action === 'unliked' && isAlreadyFavorite) {
        await removeFavorite('animes', mediaId);
      }
    }
    return result;
  };

  const isLiked = (mediaId, mediaType) => {
    return likes.some(item => String(item.media_id) === String(mediaId) && item.media_type === mediaType);
  };

  const updateProfile = async (avatarUrl, bannerUrl) => {
    if (!user) return false;
    const res = await dbUpdateUserProfile(user.id, avatarUrl, bannerUrl);
    if (res.success) {
      persistLocalSessionUser(res.user);
      setUser(res.user);
      return true;
    }
    return false;
  };

  const addReminder = async (scheduleId, animeId, title, episode, airingAt, image) => {
    if (!user) {
      setAuthTab('login');
      setShowAuthModal(true);
      return { promptLogin: true };
    }
    const result = await dbAddReminder(user.id, scheduleId, animeId, title, episode, airingAt, image);
    if (result) {
      syncUserData();
    }
    return result;
  };

  const removeReminder = async (scheduleId) => {
    if (!user) return false;
    const success = await dbRemoveReminder(user.id, scheduleId);
    if (success) {
      syncUserData();
    }
    return success;
  };

  const isReminded = (scheduleId) => {
    return reminders.some(item => String(item.schedule_id) === String(scheduleId));
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      history,
      continueWatching,
      likes,
      reminders,
      showAuthModal,
      authTab,
      setShowAuthModal,
      setAuthTab,
      login,
      signup,
      sendVerificationCode,
      loginWithGoogle,
      logout,
      syncUserData,
      addToHistory,
      clearHistory,
      updateContinueWatching,
      toggleLike,
      isLiked,
      updateProfile,
      addReminder,
      removeReminder,
      isReminded
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
