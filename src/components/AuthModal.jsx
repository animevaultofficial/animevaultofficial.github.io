import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { X, Lock, Sparkles, AlertCircle, CheckCircle, UserRound, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../api/UserContext';

const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
const isNativeApp = Capacitor.isNativePlatform();
const hcaptchaEnabled = Boolean(hcaptchaSiteKey) && !isNativeApp;

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authTab, setAuthTab, login, signup, loginAsGuest } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  const resetForm = () => { setUsername(''); setPassword(''); setCaptchaToken(''); setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!username.trim()) throw new Error('Email is required.');
      if (hcaptchaEnabled && !captchaToken) throw new Error('Please complete the security check before continuing.');
      if (authTab === 'login') {
        if (!password) throw new Error('Password is required.');
        const res = await login(username, password, null, captchaToken);
        if (res.success) { setSuccess('Welcome back!'); setTimeout(resetForm, 800); }
        else setError(res.message);
      } else {
        if (!password) throw new Error('Password is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        const res = await signup(username, password, captchaToken);
        if (res.success) { setSuccess(res.message || 'Account created!'); setTimeout(resetForm, 1800); }
        else setError(res.message);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGuest = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await loginAsGuest();
      if (!res?.success) throw new Error(res?.message || 'Guest mode could not be started.');
    } catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="auth-overlay" onClick={() => setShowAuthModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, rgba(22,22,34,0.97), rgba(11,11,19,0.97))', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,26,117,0.22)', borderRadius: '22px', padding: '30px', width: '100%', maxWidth: '420px', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
        <button aria-label="Close" onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', width: '34px', height: '34px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><X size={17} /></button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}><div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ff1a75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Sparkles size={20} /> AnimeVault</div><p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Sync your progress & favorites</p></div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>{['login', 'signup'].map(tab => <button key={tab} onClick={() => { setAuthTab(tab); resetForm(); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: authTab === tab ? '#ff1a75' : 'rgba(255,255,255,0.04)', color: authTab === tab ? '#000' : '#fff', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer' }}>{tab === 'login' ? 'Sign In' : 'Sign Up'}</button>)}</div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '12px', padding: '11px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{error}</span></div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '12px', padding: '11px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle size={16} /><span>{success}</span></div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px', position: 'relative' }}><Mail size={16} style={{ position: 'absolute', top: '13px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email address" autoComplete="email" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', color: '#fff', outline: 'none', fontSize: '0.86rem' }} /></div>
          <div style={{ marginBottom: '20px', position: 'relative' }}><Lock size={16} style={{ position: 'absolute', top: '13px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete={authTab === 'login' ? 'current-password' : 'new-password'} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', color: '#fff', outline: 'none', fontSize: '0.86rem' }} /></div>
          {authTab === 'login' && <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}><button type="button" onClick={() => { setShowAuthModal(false); navigate('/forgot-password'); }} style={{ background: 'none', border: 'none', color: '#ff1a75', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Forgot password?</button></div>}

          {hcaptchaEnabled && <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><HCaptcha sitekey={hcaptchaSiteKey} theme="dark" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} /></div>}
          <button type="submit" disabled={loading || (hcaptchaEnabled && !captchaToken)} style={{ width: '100%', padding: '13px', background: '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.86rem', boxShadow: '0 0 20px rgba(255,26,117,0.25)', opacity: loading || (hcaptchaEnabled && !captchaToken) ? 0.65 : 1 }}>{loading ? 'Processing...' : (authTab === 'login' ? 'Sign In' : 'Create Account')}</button>

          {authTab === 'login' && <>
            <div role="status" style={{ padding: '11px 12px', marginBottom: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.5, textAlign: 'center' }}>
              Google and email-code sign-in are temporarily unavailable. Use email and password while authentication is repaired.
            </div>
          </>}
          <button type="button" onClick={handleGuest} disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', opacity: loading ? 0.65 : 1 }}><UserRound size={17} /> Use as Guest</button>
        </form>
      </div>
    </div>
  );
}
