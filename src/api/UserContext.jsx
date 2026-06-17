import React, { createContext, useContext, useState, useEffect } from 'react';
import { createAuthClient } from '@neondatabase/auth';
import { log, warn, error } from '../utils/logger.js';

// Neon Auth client
const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);

import {
  fetchWatchHistory, addToHistory as dbAddToHistory, clearWatchHistory as dbClearWatchHistory,
  fetchContinueWatching, updateContinueWatching as dbUpdateContinueWatching,
  fetchLikedItems, toggleLikeItem as dbToggleLike,
  updateUserProfile as dbUpdateUserProfile,
  fetchReminders, addReminder as dbAddReminder, removeReminder as dbRemoveReminder
} from './db';
import {
  getUserStats, updateUserStats,
  getFavorites, addFavorite, removeFavorite,
  getWatchHistory as dbGetWatchHistory, addWatchHistory as dbAddWatchHistory,
  getLevel, addXP, addActivity
} from './database';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const [history, setHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [likes, setLikes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  useEffect(() => {
    const unsubscribe = authClient.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser({ id: currentUser.id, username: currentUser.email, avatar: null, banner: null, is_admin: false });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const login = async (email, password) => {
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res?.user) {
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, message: res?.error?.message || 'Login failed' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const signup = async (email, password) => {
    try {
      const res = await authClient.signUp.email({ email, password });
      if (res?.user) {
        setShowAuthModal(false);
        return { success: true };
      }
      return { success: false, message: res?.error?.message || 'Signup failed' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const logout = async () => {
    await authClient.signOut();
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
