import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { X, User, Lock, Sparkles, AlertCircle, CheckCircle, UserRound, Mail } from 'lucide-react';
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
            if (res.success) { setSuccess(`Verification code sent to ${username.trim()}.`); setStep('otp'); }
            else setError(res.message || 'Failed to send verification code.');
          } else {
            if (!verificationCode.trim()) throw new Error('Verification code is required.');
            const res = await loginWithEmailOtp(username.trim(), verificationCode.trim());
            if (res.success) { setSuccess('Welcome back!'); setTimeout(() => resetForm(), 800); }
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
              if (res.success) { setSuccess('Welcome back!'); setTimeout(() => resetForm(), 800); }
              else setError(res.message);
            }
          } else {
            if (!verificationCode.trim()) throw new Error('Verification code is required.');
            const res = await login(username, password, verificationCode.trim(), captchaToken);
            if (res.success) { setSuccess('Welcome back!'); setTimeout(() => resetForm(), 800); }
            else setError(res.message);
          }
        }
      } else {
        if (!password) throw new Error('Password is required.');
        const res = await signup(username, password, captchaToken);
        if (res.success) { setSuccess('Account created!'); setTimeout(() => resetForm(), 800); }
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

  const resetForm = () => { setUsername(''); setPassword(''); setVerificationCode(''); setCaptchaToken(''); setError(''); setSuccess(''); setStep('email_password'); setOtpMode(false); };

  const switchToOtp = () => { setError(''); setSuccess(''); setVerificationCode(''); setStep('email_password'); setOtpMode(true); };
  const switchToPassword = () => { setError(''); setSuccess(''); setVerificationCode(''); setStep('email_password'); setOtpMode(false); };

  return (
    <div className="auth-overlay" onClick={() => setShowAuthModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(15, 15, 25, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 26, 117, 0.2)', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '400px', position: 'relative' }}>
        <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', border: 'none' }}><X size={18} /></button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}><div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ff1a75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Sparkles size={20} /> AnimeVault</div><p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sync your progress & favorites</p></div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>{['login', 'signup'].map(tab => <button key={tab} onClick={() => { setAuthTab(tab); resetForm(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authTab === tab ? '#ff1a75' : 'rgba(255,255,255,0.04)', color: authTab === tab ? '#000' : '#fff', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer' }}>{tab === 'login' ? 'Sign In' : 'Sign Up'}</button>)}</div>
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{error}</span></div>}
        {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle size={16} /><span>{success}</span></div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px', position: 'relative', display: step === 'otp' ? 'none' : 'block' }}><Mail size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email" disabled={step === 'otp'} style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} /></div>
          {!otpMode && <div style={{ marginBottom: '20px', position: 'relative' }}><div style={{ display: step === 'otp' ? 'none' : 'block' }}><Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" disabled={step === 'otp'} style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} /></div>{authTab === 'login' && step === 'otp' && <div style={{ marginTop: '0px', position: 'relative' }}><Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} /><input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-Digit Verification Code" autoFocus style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,26,117,0.3)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem', boxShadow: '0 0 10px rgba(255,26,117,0.1)' }} /><div style={{ textAlign: 'center', marginTop: '12px' }}><button type="button" onClick={() => setStep('email_password')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Back</button></div></div>}</div>}
          {authTab === 'login' && !otpMode && <div style={{ textAlign: 'right', marginTop: '8px' }}><button type="button" onClick={() => { setShowAuthModal(false); navigate('/forgot-password'); }} style={{ background: 'none', border: 'none', color: '#ff1a75', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Forgot password?</button></div>}
          {authTab === 'login' && otpMode && step === 'otp' && <div style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Check your email for the 6-digit code. Codes expire according to the auth server settings.</div>}
          {hcaptchaEnabled && <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><HCaptcha sitekey={hcaptchaSiteKey} theme="dark" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} /></div>}
          <button type="submit" disabled={loading || (hcaptchaEnabled && !captchaToken)} style={{ width: '100%', padding: '12px', background: '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', marginBottom: '16px', boxShadow: '0 0 15px rgba(255,26,117,0.3)', opacity: loading || (hcaptchaEnabled && !captchaToken) ? 0.65 : 1 }}>{loading ? 'Processing...' : (authTab === 'login' ? (otpMode ? (step === 'otp' ? 'Verify & Sign In' : 'Send Login Code') : (step === 'otp' ? 'Verify & Sign In' : 'Sign In')) : 'Create Account')}</button>
          {authTab === 'login' && <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 16px', gap: '12px' }}><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>OR</span><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} /></div>
            {otpMode ? <button type="button" onClick={switchToPassword} disabled={loading} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: '900', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem' }}>Use Password Instead</button> : <button type="button" onClick={switchToOtp} disabled={loading} style={{ width: '100%', padding: '12px', background: '#ffffff', color: '#000', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><Mail size={18} />Continue with Email OTP</button>}
          </>}
          <button type="button" onClick={handleGuest} disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '10px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: '800', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', opacity: loading ? 0.65 : 1 }}><UserRound size={17} />Use as Guest</button>
        </form>
      </div>
    </div>
  );
}
