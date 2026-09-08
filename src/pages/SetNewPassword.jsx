import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authClient } from '../auth';
import { updateUserPassword } from '../api/authDb.js';

export default function SetNewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(`${window.location.search}${location.search ? `&${location.search.slice(1)}` : ''}`);
  const token = params.get('token');
  const email = params.get('email');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (!token) navigate('/');
  }, [token, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 6) return setMessage('Password must be at least 6 characters.');
    if (password !== confirm) return setMessage("Passwords don't match.");

    setStatus('loading');
    setMessage('');
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result?.error) throw new Error(result.error.message || 'Failed to reset password.');

      // Keep AnimeVault's legacy users table in sync using bcrypt as well.
      if (email) {
        const sync = await updateUserPassword(email, password);
        if (!sync.success) throw new Error(sync.message || 'Password was reset but account sync failed.');
      }

      setStatus('success');
      setMessage('Password reset successfully.');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Failed to reset password.');
    }
  };

  if (!token) return null;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-primary, #05050a)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 20, background: 'rgba(15,15,25,.85)', border: '1px solid rgba(255,26,117,.15)' }}>
        <h1 style={{ color: '#ff1a75', textAlign: 'center', marginBottom: 24 }}>Set New Password</h1>
        <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required style={{ width: '100%', padding: 12, marginBottom: 12 }} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required style={{ width: '100%', padding: 12, marginBottom: 16 }} />
        {message && <p style={{ color: status === 'success' ? '#10b981' : '#ef4444', textAlign: 'center' }}>{message}</p>}
        <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: 12, border: 0, borderRadius: 12, background: '#ff1a75', color: '#000', fontWeight: 800 }}>
          {status === 'loading' ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </main>
  );
}
