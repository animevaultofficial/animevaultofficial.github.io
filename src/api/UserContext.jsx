import React, { createContext, useContext, useState, useEffect } from 'react';
import { log, warn, error } from '../utils/logger.js';
import { createAnimeVaultAuthClient } from './authClient';
import { clearActiveSubAccount } from '../utils/subAccounts';

// Neon Auth client
const authClient = createAnimeVaultAuthClient();

import {
  fetchWatchHistory, addToHistory as dbAddToHistory, clearWatchHistory as dbClearWatchHistory,
  fetchContinueWatching, updateContinueWatching as dbUpdateContinueWatching,
  fetchLikedItems, toggleLikeItem as dbToggleLike,
  updateUserProfile as dbUpdateUserProfile,
  fetchReminders, addReminder as dbAddReminder, removeReminder as dbRemoveReminder,
  syncGoogleUserToDb,
  createUserSession, restoreSession, deleteUserSession,
  userLogin as dbUserLogin,
  userSignup as dbUserSignup,
  initializeTrendingDefaults,
  getUserStats, updateUserStats,
  getFavorites, toggleFavorite, setFavorite,
  getWatchHistory as dbGetWatchHistory, addWatchHistory as dbAddWatchHistory,
  getLevel, addXP, addActivity
} from './db';
import {
  proxyLogin,
  proxySignup,
  proxySyncAuthUser,
  proxyRestoreSession,
  proxyLogout,
  clearStoredProxyToken
} from './authProxy';

const UserContext = createContext(null);
const CACHED_USER_KEY = 'animevault_cached_user';

function getAuthCallbackURL() {
  const webFallback = 'https://animevaultofficial.github.io/';
  const mobileFallback = 'https://localhost/';
  try {
    const origin = window.location.origin;
    const isNativeShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
    if (isNativeShell) return mobileFallback;
    return origin.endsWith('/') ? origin : `${origin}/`;
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

function isNativeMobileShell() {
  if (typeof window === 'undefined') return false;
  const origin = window.location.origin;
  const ua = window.navigator.userAgent || '';
  const isCapacitorShell = !origin || origin === 'null' || origin.startsWith('capacitor://') || origin.startsWith('file://');
  const isLocalhostMobile = origin.includes('localhost') && /android|iphone|ipad|capacitor/i.test(ua);
  return isCapacitorShell || isLocalhostMobile;
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

function normalizeProxyUser(proxyUser) {
  if (!proxyUser) return null;
  const user = proxyUser.user || proxyUser;
  return {
    id: user.id || null,
    username: user.username || user.email || user.name || 'User',
    avatar: user.avatar || user.image || null,
    banner: user.banner || null,
    is_admin: user.is_admin || false,
    is_verified: user.is_verified || false
  };
}

async function tryCreateUserSession(userId) {
  try {
    return await createUserSession(userId);
  } catch (err) {
    warn('[AnimeVault Auth] Persistent DB session creation failed; using local session only:', err?.message || err);
    return null;
  }
}

export function UserProvider({ children }) {
  const [user, setUserState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHED_USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);

  const setUser = (nextUser) => {
    setUserState(nextUser);
    try {
      if (nextUser) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch { }
  };

  const [history, setHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [likes, setLikes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [activeSubAccount, setActiveSubAccountState] = useState(null);

  const loginWithDbCredentials = async (email, password) => {
    const dbRes = await dbUserLogin(email, password);
    if (!dbRes.success) {
      return { success: false, message: dbRes.message || 'Login failed. Please check your credentials.' };
    }
    await tryCreateUserSession(dbRes.user.id);
    setUser(dbRes.user);
    setShowAuthModal(false);
    return { success: true };
  };

  const signupWithDbCredentials = async (email, password) => {
    const dbRes = await dbUserSignup(email, password);
    if (!dbRes.success) {
      return { success: false, message: dbRes.message || 'Signup failed. Please try again.' };
    }
    await tryCreateUserSession(dbRes.user.id);
    setUser(dbRes.user);
    setShowAuthModal(false);
    return { success: true };
  };

  const loginWithGoogleDb = async () => {
    const email = window.prompt('Enter your Google email to sign in on mobile:');
    if (!email || !email.trim()) {
      return { success: false, message: 'Google sign-in cancelled.' };
    }

    const syncRes = await syncGoogleUserToDb(email.trim(), null, true);
    if (!syncRes.success) {
      return { success: false, message: syncRes.message || 'Google DB login failed.' };
    }

    const dbUser = syncRes.user;
    await tryCreateUserSession(dbUser.id);
    setUser(dbUser);
    setShowAuthModal(false);
    return { success: true };
  };

  // Restore auth on mount without letting the UI treat a pending check as logged out.
  const initSession = async () => {
    setAuthLoading(true);
    try {
      const authSessionPromise = authClient.getSession().catch((err) => {
        warn('[AnimeVault Auth] Neon Auth session check failed:', err?.message || err);
        return null;
      });

      const { data } = await authSessionPromise || {};
      if (data?.session || data?.user) {
        const sessionUser = await syncAuthSessionUser(data);
        if (sessionUser) return sessionUser;
      }

      const proxySession = await proxyRestoreSession();
      if (proxySession.success && proxySession.user) {
        const proxyUser = normalizeProxyUser(proxySession.user);
        setUser(proxyUser);
        return proxyUser;
      }

      const dbUser = await restoreSession();
      if (dbUser) {
        log('[AnimeVault Auth] Session restored from DB');
        setUser(dbUser);
        return dbUser;
      }

      setUser(null);
      return null;
    } catch (err) {
      warn('[AnimeVault Auth] Session init failed:', err);
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    initSession();
    // Initialize trending defaults on app load
    initializeTrendingDefaults().catch(err => console.warn('Failed to init trending defaults:', err));

    const subscription = authClient.onAuthStateChange?.((_event, session) => {
      if (session?.user) {
        syncAuthSessionUser({ session, user: session.user }).finally(() => setAuthLoading(false));
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });
    return () => subscription?.data?.subscription?.unsubscribe?.();
  }, []);

  const syncAuthSessionUser = async (existingSessionData = null) => {
    const data = existingSessionData || (await authClient.getSession()).data;
    const currentUser = data?.user || data?.session?.user;
    if (!currentUser?.email) return null;

    const syncRes = await syncGoogleUserToDb(
      currentUser.email,
      currentUser.image || currentUser.avatar_url || null,
      currentUser.emailVerified || currentUser.email_verified || false
    );

    const sessionUser = syncRes.success
      ? syncRes.user
      : {
          id: currentUser.id,
          username: currentUser.email || currentUser.name || 'User',
          avatar: currentUser.image || currentUser.avatar_url || null,
          banner: null,
          is_admin: false
        };

    const sessionCreated = await tryCreateUserSession(sessionUser.id);
    if (!sessionCreated) {
      warn('[AnimeVault Auth] Could not persist auth session to DB');
      return null;
    }

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
      if (isNativeMobileShell()) {
        return await loginWithDbCredentials(email, password);
      }
      // If we have a verification code, try Neon Auth OTP first
      if (verificationCode) {
        try {
          const res = await authClient.signIn.emailOtp({ email, otp: verificationCode });
          const loggedInUser = getAuthUserFromResponse(res);
          if (loggedInUser || (!res?.error && res?.data)) {
            const sessionUser = await syncAuthSessionUser();
            if (!sessionUser) {
              return { success: false, message: 'Verification succeeded, but AnimeVault could not create a local session. Please refresh and try again.' };
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
          const sessionUser = await syncAuthSessionUser();
          if (!sessionUser) {
            return { success: false, message: 'Sign-in succeeded, but AnimeVault could not create a local session. Please refresh and try again.' };
          }
          setShowAuthModal(false);
          return { success: true };
        }
        // Neon Auth failed - fall through to DB login
        warn('[AnimeVault Auth] Neon Auth login failed, falling back to DB login:', res?.error?.message);
      } catch (neonErr) {
        warn('[AnimeVault Auth] Neon Auth login threw, falling back to DB login:', neonErr.message);
      }

      // Fallback: try DB login.
      const dbRes = await dbUserLogin(email, password);
      if (dbRes.success) {
        await tryCreateUserSession(dbRes.user.id);
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
      if (isNativeMobileShell()) {
        return await signupWithDbCredentials(email, password);
      }
      const name = email.split('@')[0];
      const proxyRes = await proxySignup(email, password);
      if (proxyRes.success && proxyRes.user) {
        const proxyUser = normalizeProxyUser(proxyRes.user);
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
        const sessionUser = await syncAuthSessionUser();
        if (!sessionUser) {
          return { success: false, message: 'Account created, but AnimeVault could not create a local session. Please sign in again.' };
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
    if (isNativeMobileShell()) {
      return await loginWithGoogleDb();
    }
    const callbackURL = getAuthCallbackURL();
    try {
      // Trigger Google OAuth flow via Neon Auth.
      // Keep the callback on the site root so it matches the Neon allowed domain
      // entry and the app can restore the session on load.
      const res = await authClient.signIn.social({
        provider: 'google',
        callbackURL,
        redirectTo: callbackURL,
      });
      const oauthUrl = res?.url || res?.data?.url || res?.redirectTo || res?.data?.redirectTo;
      if (oauthUrl) {
        window.location.href = oauthUrl;
        return { success: true };
      }
      return { success: false, message: 'Unable to initiate Google sign-in. Please try again.' };
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
    // Then sign out of Neon Auth
    try { await authClient.signOut(); } catch (e) { /* ignore */ }
    setUser(null);
    setActiveSubAccountState(null);
    clearActiveSubAccount();
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

      const favorites = await getFavorites(user.id);
      const isAlreadyFavorite = favorites.animes?.some(f => String(f.id) === String(mediaId));

      if (result.action === 'liked' && !isAlreadyFavorite) {
        await setFavorite(user.id, 'animes', { id: mediaId, title: mediaTitle, image: mediaPoster });
        await addXP(2);
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
      authLoading,
      setUser,
      history,
      continueWatching,
      likes,
      reminders,
      activeSubAccount,
      showAuthModal,
      authTab,
      setShowAuthModal,
      setAuthTab,
      setActiveSubAccountState,
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
