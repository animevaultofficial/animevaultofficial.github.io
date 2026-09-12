import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { X, Lock, Sparkles, AlertCircle, CheckCircle, UserRound, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../api/UserContext';
import { checkUser2FA } from '../api/db';

const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
const isNativeApp = Capacitor.isNativePlatform();
const hcaptchaEnabled = Boolean(hcaptchaSiteKey) && !isNativeApp;

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authTab, setAuthTab, login, signup, loginAsGuest, sendVerificationCode, sendEmailOtp, loginWithEmailOtp } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email_password');
  const [otpMode, setOtpMode] = useState(false);

  if (!showAuthModal) return null;

  const resetForm = () => { setUsername(''); setPassword(''); setVerificationCode(''); setCaptchaToken(''); setError(''); setSuccess(''); setStep('email_password'); setOtpMode(false); };
  const switchToOtp = () => { setError(''); setSuccess(''); setVerificationCode(''); setStep('email_password'); setOtpMode(true); };
  const switchToPassword = () => { setError(''); setSuccess(''); setVerificationCode(''); setStep('email_password'); setOtpMode(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!username.trim()) throw new Error('Email is required.');
      if (hcaptchaEnabled && !captchaToken) throw new Error('Please complete the security check before continuing.');
      if (authTab === 'login') {
        if (otpMode) {
          if (step === 'email_password') {
            const res = await sendEmailOtp(username.trim());
            if (res.success) { setStep('otp'); setVerificationCode(''); setSuccess(`Code sent to ${username.trim()}.`); }
            else setError(res.message || 'Failed to send verification code.');
          } else {
            if (verificationCode.trim().length !== 6) throw new Error('Enter the 6-digit code from your email.');
            const res = await loginWithEmailOtp(username.trim(), verificationCode.trim());
            if (res.success) { setSuccess('Welcome back!'); setTimeout(resetForm, 800); }
            else setError(res.message || 'Invalid or expired verification code.');
          }
        } else {
          if (!password) throw new Error('Password is required.');
          if (step === 'email_password') {
            const needs2FA = await checkUser2FA(username.trim());
            if (needs2FA) {
              const res = await sendVerificationCode(username.trim());
              if (res.success) { setSuccess('2-Step Verification required. Code sent to email!'); setStep('otp'); }
              else setError(res.message || 'Failed to send 2FA code.');
            } else {
              const res = await login(username, password, null, captchaToken);
              if (res.success) { setSuccess('Welcome back!'); setTimeout(resetForm, 800); }
              else setError(res.message);
            }
          } else {
            if (!verificationCode.trim()) throw new Error('Verification code is required.');
            const res = await login(username, password, verificationCode.trim(), captchaToken);
            if (res.success) { setSuccess('Welcome back!'); setTimeout(resetForm, 800); }
            else setError(res.message);
          }
        }
      } else {
        if (!password) throw new Error('Password is required.');
        const res = await signup(username, password, captchaToken);
        if (res.success) { setSuccess('Account created!'); setTimeout(resetForm, 800); }
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

  const handleResend = async () => {
    if (!username.trim() || loading) return;
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await sendEmailOtp(username.trim());
      if (res.success) { setVerificationCode(''); setSuccess(`A new code was sent to ${username.trim()}.`); }
      else setError(res.message || 'Failed to resend verification code.');
    } finally { setLoading(false); }
  };

  const handleOtpDigit = (e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));

  return (
    <div className="auth-overlay" onClick={() => setShowAuthModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg, rgba(22,22,34,0.97), rgba(11,11,19,0.97))', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,26,117,0.22)', borderRadius: '22px', padding: '30px', width: '100%', maxWidth: '420px', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
        <button aria-label="Close" onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', width: '34px', height: '34px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><X size={17} /></button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}><div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ff1a75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Sparkles size={20} /> AnimeVault</div><p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{otpMode && step === 'otp' ? 'Verify your email to continue' : 'Sync your progress & favorites'}</p></div>

        {otpMode && step === 'otp' ? (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '66px', height: '66px', borderRadius: '20px', margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: 'rgba(255,26,117,0.1)', border: '1px solid rgba(255,26,117,0.2)', color: '#ff1a75' }}><Mail size={28} /></div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>Check your email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5, margin: '8px 0 0' }}>We sent a 6-digit sign-in code to</p>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.85rem', marginTop: '4px', wordBreak: 'break-all' }}>{username}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>{['login', 'signup'].map(tab => <button key={tab} onClick={() => { setAuthTab(tab); resetForm(); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: authTab === tab ? '#ff1a75' : 'rgba(255,255,255,0.04)', color: authTab === tab ? '#000' : '#fff', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer' }}>{tab === 'login' ? 'Sign In' : 'Sign Up'}</button>)}</div>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '12px', padding: '11px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{error}</span></div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '12px', padding: '11px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle size={16} /><span>{success}</span></div>}

        <form onSubmit={handleSubmit}>
          {!otpMode || step !== 'otp' ? (
            <>
              <div style={{ marginBottom: '14px', position: 'relative' }}><Mail size={16} style={{ position: 'absolute', top: '13px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email address" autoComplete="email" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', color: '#fff', outline: 'none', fontSize: '0.86rem' }} /></div>
              {!otpMode && <div style={{ marginBottom: '20px', position: 'relative' }}><Lock size={16} style={{ position: 'absolute', top: '13px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', color: '#fff', outline: 'none', fontSize: '0.86rem' }} /></div>}
              {authTab === 'login' && !otpMode && <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}><button type="button" onClick={() => { setShowAuthModal(false); navigate('/forgot-password'); }} style={{ background: 'none', border: 'none', color: '#ff1a75', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Forgot password?</button></div>}
            </>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#fff', fontWeight: '800', fontSize: '0.78rem', marginBottom: '10px' }}>Enter your 6-digit code</label>
              <input inputMode="numeric" autoComplete="one-time-code" autoFocus value={verificationCode} onChange={handleOtpDigit} maxLength={6} placeholder="000000" aria-label="6-digit verification code" style={{ width: '100%', boxSizing: 'border-box', padding: '15px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,26,117,0.45)', borderRadius: '13px', color: '#fff', outline: 'none', fontSize: '1.65rem', letterSpacing: '0.55em', textAlign: 'center', fontWeight: '900', boxShadow: '0 0 24px rgba(255,26,117,0.08)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button type="button" onClick={() => { setStep('email_password'); setVerificationCode(''); setError(''); setSuccess(''); }} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><ArrowLeft size={14} /> Change email</button>
                <button type="button" onClick={handleResend} disabled={loading} style={{ background: 'none', border: 'none', color: '#ff1a75', fontSize: '0.75rem', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><RefreshCw size={13} /> Resend code</button>
              </div>
            </div>
          )}

          {hcaptchaEnabled && <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><HCaptcha sitekey={hcaptchaSiteKey} theme="dark" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} /></div>}
          <button type="submit" disabled={loading || (hcaptchaEnabled && !captchaToken)} style={{ width: '100%', padding: '13px', background: '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.86rem', boxShadow: '0 0 20px rgba(255,26,117,0.25)', opacity: loading || (hcaptchaEnabled && !captchaToken) ? 0.65 : 1 }}>{loading ? 'Processing...' : (authTab === 'login' ? (otpMode ? (step === 'otp' ? 'Verify & Sign In' : 'Send Login Code') : 'Sign In') : 'Create Account')}</button>

          {authTab === 'login' && !otpMode && <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '12px' }}><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>OR</span><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} /></div>
            <button type="button" onClick={switchToOtp} disabled={loading} style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: '900', border: 'none', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}><Mail size={18} /> Continue with Email OTP</button>
          </>}
          {authTab === 'login' && otpMode && step === 'otp' && <button type="button" onClick={switchToPassword} disabled={loading} style={{ width: '100%', padding: '11px', marginTop: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.8rem' }}>Use Password Instead</button>}
          <button type="button" onClick={handleGuest} disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', opacity: loading ? 0.65 : 1 }}><UserRound size={17} /> Use as Guest</button>
        </form>
      </div>
    </div>
  );
}
