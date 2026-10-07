import React, { createContext, useContext, useEffect, useState } from 'react';
import { warn } from '../utils/logger.js';
import { clearActiveSubAccount } from '../utils/subAccounts';
import {
  addReminder as dbAddReminder,
  addToHistory as dbAddToHistory,
  clearWatchHistory as dbClearWatchHistory,
  createSubAccount as dbCreateSubAccount,
  createUserSession,
  deleteSubAccount as dbDeleteSubAccount,
  deleteUserSession,
  ensureMainSubAccount as dbEnsureMainSubAccount,
  fetchContinueWatching,
  fetchLikedItems,
  fetchReminders,
  fetchSubAccounts as dbFetchSubAccounts,
  fetchWatchHistory,
  removeReminder as dbRemoveReminder,
  toggleLikeItem as dbToggleLike,
  updateContinueWatching as dbUpdateContinueWatching,
  updateSubAccount as dbUpdateSubAccount,
  updateUserProfile as dbUpdateUserProfile,
  restoreSession
} from './db';
import { userLogin as dbUserLogin, userSignup as dbUserSignup } from './authDb';

const UserContext = createContext(null);
const CACHED_USER_KEY = 'animevault_cached_user';
const GUEST_USER = { id: null, username: 'Guest', avatar: null, banner: null, is_guest: true, is_admin: false, is_verified: false };
const AUTH_PROVIDER_UNAVAILABLE = 'Google and email-code sign-in are temporarily unavailable while the authentication endpoint is being repaired. Use email and password for now.';

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [likes, setLikes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [activeSubAccount, setActiveSubAccountState] = useState(null);
  const [subAccounts, setSubAccounts] = useState([]);

  const setUser = next => {
    setUserState(next);
    try {
      if (next) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(next));
      else localStorage.removeItem(CACHED_USER_KEY);
    } catch (error) {
      warn('[AnimeVault Auth] Could not update cached user:', error?.message || error);
    }
  };

  const establishDatabaseSession = async databaseUser => {
    try {
      const session = await createUserSession(databaseUser.id);
      if (!session) warn('[AnimeVault Auth] Login succeeded, but a persistent session could not be created.');
    } catch (error) {
      warn('[AnimeVault Auth] Database session creation failed:', error?.message || error);
    }
    const authenticatedUser = { ...databaseUser, is_guest: false };
    setUser(authenticatedUser);
    setShowAuthModal(false);
    return { success: true, user: authenticatedUser };
  };

  const login = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return { success: false, message: 'Email and password are required.' };
    try {
      const result = await dbUserLogin(normalizedEmail, password);
      if (!result.success) return result;
      return await establishDatabaseSession(result.user);
    } catch (error) {
      warn('[AnimeVault Auth] Database password sign-in failed:', error?.message || error);
      return { success: false, message: 'Sign-in failed. Please try again.' };
    }
  };

  const signup = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return { success: false, message: 'Email and password are required.' };
    try {
      const result = await dbUserSignup(normalizedEmail, password);
      if (!result.success) return result;
      return await establishDatabaseSession(result.user);
    } catch (error) {
      warn('[AnimeVault Auth] Database signup failed:', error?.message || error);
      return { success: false, message: 'Sign-up failed. Please try again.' };
    }
  };

  const loginAsGuest = async () => {
    const guest = { ...GUEST_USER };
    setUser(guest);
    setShowAuthModal(false);
    return { success: true, user: guest };
  };

  const unavailableProvider = async () => ({ success: false, message: AUTH_PROVIDER_UNAVAILABLE });

  const initSession = async () => {
    setAuthLoading(true);
    try {
      const databaseUser = await restoreSession();
      if (databaseUser) {
        setUser(databaseUser);
        return;
      }
      try {
        localStorage.removeItem(CACHED_USER_KEY);
      } catch (error) {
        warn('[AnimeVault Auth] Could not clear stale cached user:', error?.message || error);
      }
      setUserState(null);
    } catch (error) {
      warn('[AnimeVault Auth] Database session restore failed:', error?.message || error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    void initSession();
  }, []);

  const syncUserData = async userId => {
    if (!userId) return;
    const [hist, cw, liked, rem] = await Promise.all([
      fetchWatchHistory(userId).catch(() => []),
      fetchContinueWatching(userId).catch(() => []),
      fetchLikedItems(userId).catch(() => []),
      fetchReminders(userId).catch(() => [])
    ]);
    setHistory(hist || []);
    setContinueWatching(cw || []);
    setLikes(liked || []);
    setReminders(rem || []);
  };

  useEffect(() => {
    if (user?.id) void syncUserData(user.id);
  }, [user?.id]);

  const logout = async () => {
    try {
      await deleteUserSession();
    } catch (error) {
      warn('[AnimeVault Auth] Database sign-out failed:', error?.message || error);
    }
    clearActiveSubAccount();
    setUser(null);
    setHistory([]);
    setContinueWatching([]);
    setLikes([]);
    setReminders([]);
  };

  const fetchSubAccounts = async () => {
    if (!user?.id) return [];
    const profiles = (await dbFetchSubAccounts(user.id).catch(() => [])) || [];
    setSubAccounts(profiles);
    return profiles;
  };
  const ensureMainSubAccount = async () => user?.id ? dbEnsureMainSubAccount(user.id).catch(() => null) : null;
  const createSubAccount = async data => user?.id
    ? dbCreateSubAccount(user.id, data).catch(error => ({ success: false, message: error.message }))
    : { success: false, message: 'Not signed in' };
  const updateSubAccount = async (id, data) => user?.id
    ? dbUpdateSubAccount(user.id, id, data).catch(error => ({ success: false, message: error.message }))
    : { success: false, message: 'Not signed in' };
  const deleteSubAccount = async id => user?.id
    ? dbDeleteSubAccount(user.id, id).catch(error => ({ success: false, message: error.message }))
    : { success: false, message: 'Not signed in' };

  const addToHistory = async item => {
    setHistory(previous => [item, ...previous.filter(entry => entry.id !== item.id)]);
    if (user?.id) await dbAddToHistory(user.id, item).catch(() => {});
  };
  const clearHistory = async () => {
    setHistory([]);
    if (user?.id) await dbClearWatchHistory(user.id).catch(() => {});
  };
  const updateContinueWatching = async item => {
    setContinueWatching(previous => [item, ...previous.filter(entry => entry.id !== item.id)].slice(0, 50));
    if (user?.id) await dbUpdateContinueWatching(user.id, item).catch(() => {});
  };
  const toggleLike = async item => {
    setLikes(previous => previous.some(entry => entry.id === item.id)
      ? previous.filter(entry => entry.id !== item.id)
      : [...previous, item]);
    if (user?.id) await dbToggleLike(user.id, item).catch(() => {});
  };
  const isLiked = id => likes.some(item => item.id === id);
  const updateProfile = async data => {
    setUser({ ...user, ...data });
    if (user?.id) await dbUpdateUserProfile(user.id, data).catch(error => warn('[AnimeVault Profile] Profile update failed:', error?.message || error));
  };
  const addReminder = async item => {
    setReminders(previous => [...previous.filter(entry => entry.id !== item.id), item]);
    if (user?.id) await dbAddReminder(user.id, item).catch(() => {});
  };
  const removeReminder = async id => {
    setReminders(previous => previous.filter(item => item.id !== id));
    if (user?.id) await dbRemoveReminder(user.id, id).catch(() => {});
  };
  const isReminded = id => reminders.some(item => item.id === id);

  return (
    <UserContext.Provider value={{
      user, authLoading, setUser, history, continueWatching, likes, reminders,
      subAccounts, activeSubAccount, showAuthModal, authTab, setShowAuthModal,
      setAuthTab, setActiveSubAccountState, fetchSubAccounts, ensureMainSubAccount,
      createSubAccount, updateSubAccount, deleteSubAccount, login, signup, loginAsGuest,
      loginWithGoogle: unavailableProvider, sendEmailOtp: unavailableProvider,
      loginWithEmailOtp: unavailableProvider, logout, syncUserData, addToHistory,
      clearHistory, updateContinueWatching, toggleLike, isLiked, updateProfile,
      addReminder, removeReminder, isReminded
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
