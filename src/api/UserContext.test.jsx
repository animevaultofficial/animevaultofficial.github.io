import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authMocks = vi.hoisted(() => ({
  userLogin: vi.fn(),
  userSignup: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  addReminder: vi.fn(),
  addToHistory: vi.fn(),
  clearWatchHistory: vi.fn(),
  createSubAccount: vi.fn(),
  createUserSession: vi.fn(),
  deleteSubAccount: vi.fn(),
  deleteUserSession: vi.fn(),
  ensureMainSubAccount: vi.fn(),
  fetchContinueWatching: vi.fn(),
  fetchLikedItems: vi.fn(),
  fetchReminders: vi.fn(),
  fetchSubAccounts: vi.fn(),
  fetchWatchHistory: vi.fn(),
  removeReminder: vi.fn(),
  restoreSession: vi.fn(),
  toggleLikeItem: vi.fn(),
  updateContinueWatching: vi.fn(),
  updateSubAccount: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('./authDb', () => authMocks);
vi.mock('./db', () => dbMocks);

import { UserProvider, useUser } from './UserContext';

describe('UserProvider database authentication', () => {
  let container;
  let root;
  let context;

  function ContextCapture() {
    context = useUser();
    return null;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    authMocks.userLogin.mockResolvedValue({ success: false, message: 'Invalid username or password' });
    authMocks.userSignup.mockResolvedValue({ success: false, message: 'Unable to create account.' });
    dbMocks.createUserSession.mockResolvedValue({ session_token: 'test-session' });
    dbMocks.restoreSession.mockResolvedValue(null);
    dbMocks.fetchContinueWatching.mockResolvedValue([]);
    dbMocks.fetchLikedItems.mockResolvedValue([]);
    dbMocks.fetchReminders.mockResolvedValue([]);
    dbMocks.fetchWatchHistory.mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<UserProvider><ContextCapture /></UserProvider>);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('authenticates a legacy user and creates a database session without Neon Auth', async () => {
    const legacyUser = { id: 42, username: 'olduser', is_admin: false };
    authMocks.userLogin.mockResolvedValue({ success: true, user: legacyUser });

    let result;
    await act(async () => {
      result = await context.login(' OldUser@example.com ', 'correct-password');
    });

    expect(authMocks.userLogin).toHaveBeenCalledWith('olduser@example.com', 'correct-password');
    expect(dbMocks.createUserSession).toHaveBeenCalledWith(42);
    expect(result).toMatchObject({ success: true, user: { id: 42, is_guest: false } });
  });

  it('creates a database account and session for signup', async () => {
    const createdUser = { id: 57, username: 'newuser', is_admin: false };
    authMocks.userSignup.mockResolvedValue({ success: true, user: createdUser });

    let result;
    await act(async () => {
      result = await context.signup('NewUser@example.com', 'long-password');
    });

    expect(authMocks.userSignup).toHaveBeenCalledWith('newuser@example.com', 'long-password');
    expect(dbMocks.createUserSession).toHaveBeenCalledWith(57);
    expect(result).toMatchObject({ success: true, user: { id: 57 } });
  });

  it('restores the existing database session on startup', async () => {
    const sessionUser = { id: 71, username: 'returning-user', is_admin: false };
    dbMocks.restoreSession.mockResolvedValue(sessionUser);

    await act(async () => {
      root.unmount();
      root = createRoot(container);
      root.render(<UserProvider><ContextCapture /></UserProvider>);
    });

    expect(context.user).toEqual(sessionUser);
  });

  it('reports unavailable alternative providers without calling an auth endpoint', async () => {
    let otpResult;
    let googleResult;
    await act(async () => {
      otpResult = await context.sendEmailOtp('user@example.com');
      googleResult = await context.loginWithGoogle();
    });

    expect(otpResult.success).toBe(false);
    expect(otpResult.message).toContain('temporarily unavailable');
    expect(googleResult).toEqual(otpResult);
    expect(authMocks.userLogin).not.toHaveBeenCalled();
    expect(authMocks.userSignup).not.toHaveBeenCalled();
  });
});
