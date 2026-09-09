import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { authClient } from '../auth';
import { updateUserPassword } from '../api/authDb.js';
import { clearPasswordRecovery, getPasswordRecovery, savePasswordRecovery } from '../components/PublicPasswordRoutes';

export default function SetNewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search || window.location.search);
  const recovery = getPasswordRecovery();
  const initialEmail = params.get('email') || recovery?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (email) savePasswordRecovery({ email: email.trim().toLowerCase(), requestedAt: recovery?.requestedAt || Date.now() });
  }, [email, recovery?.requestedAt]);

  const submit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const code = otp.replace(/\D/g, '').slice(0, 6);
    if (!normalizedEmail) return setMessage('Enter your email address.');
    if (!/^\d{6}$/.test(code)) return setMessage('Enter the 6-digit verification code.');
    if (password.length < 6) return setMessage('Password must be at least 6 characters.');
    if (password !== confirm) return setMessage("Passwords don't match.");

    setStatus('loading');
    setMessage('');
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: normalizedEmail,
        otp: code,
        password,
      });
      if (result?.error) throw new Error(result.error.message || 'Invalid or expired verification code.');

      const sync = await updateUserPassword(normalizedEmail, password);
      if (!sync.success) {
        console.warn('[AnimeVault Auth] Legacy password sync failed after successful Neon reset:', sync.message);
      }

      clearPasswordRecovery();
      setStatus('success');
      setMessage('Password reset successfully. You can now sign in with your new password.');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Invalid or expired verification code.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-primary, #05050a)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 20, background: 'rgba(15,15,25,.85)', border: '1px solid rgba(255,26,117,.15)' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'none', color: '#a1a1aa', padding: 0, marginBottom: 20 }}><ArrowLeft size={16} /> Back</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}><KeyRound size={28} color="#ff1a75" /><h1 style={{ color: '#ff1a75', margin: '10px 0 6px' }}>Reset Password</h1><p style={{ color: '#929099', margin: 0, fontSize: 13 }}>Enter the verification code from your email and choose a new password.</p></div>
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required style={{ boxSizing: 'border-box', width: '100%', padding: 12, marginBottom: 12, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#fff' }} />
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit verification code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" required style={{ boxSizing: 'border-box', width: '100%', padding: 12, marginBottom: 12, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#fff', letterSpacing: 4, textAlign: 'center' }} />
        <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" style={{ boxSizing: 'border-box', width: '100%', padding: 12, marginBottom: 12, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#fff' }} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required autoComplete="new-password" style={{ boxSizing: 'border-box', width: '100%', padding: 12, marginBottom: 16, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#fff' }} />
        {message && <p style={{ color: status === 'success' ? '#10b981' : '#ef4444', textAlign: 'center', fontSize: 13 }}>{message}</p>}
        <button type="submit" disabled={status === 'loading' || status === 'success'} style={{ width: '100%', padding: 12, border: 0, borderRadius: 12, background: '#ff1a75', color: '#000', fontWeight: 800 }}>{status === 'loading' ? 'Verifying...' : status === 'success' ? 'Password Updated' : 'Reset Password'}</button>
      </form>
    </main>
  );
}
