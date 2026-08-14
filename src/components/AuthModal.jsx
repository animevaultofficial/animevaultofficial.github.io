
import { useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { X, User, Lock, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../api/UserContext';
import { checkUser2FA } from '../api/db';

const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
const hcaptchaEnabled = Boolean(hcaptchaSiteKey);

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authTab, setAuthTab, login, signup, sendVerificationCode, loginWithGoogle } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email_password'); // 'email_password' or 'otp'

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!username.trim() || !password) throw new Error('All fields are required.');
      if (hcaptchaEnabled && !captchaToken) {
        throw new Error('Please complete the security check before continuing.');
      }

      if (authTab === 'login') {
        if (step === 'email_password') {
          const needs2FA = await checkUser2FA(username.trim());
          if (needs2FA) {
            const res = await sendVerificationCode(username.trim());
            if (res.success) {
              setSuccess('2-Step Verification required. Code sent to email!');
              setStep('otp');
            } else {
              setError(res.message || 'Failed to send 2FA code.');
            }
          } else {
            // No 2FA required, login directly
            const res = await login(username, password, null, captchaToken);
            if (res.success) {
              setSuccess('Welcome back!');
              setTimeout(() => { resetForm(); }, 800);
            } else setError(res.message);
          }
        } else if (step === 'otp') {
          if (!verificationCode.trim()) throw new Error('Verification code is required.');
          const res = await login(username, password, verificationCode.trim(), captchaToken);
          if (res.success) {
            setSuccess('Welcome back!');
            setTimeout(() => { resetForm(); }, 800);
          } else setError(res.message);
        }
      } else {
        const res = await signup(username, password, captchaToken);
        if (res.success) {
          setSuccess('Account created!');
          setTimeout(() => { resetForm(); }, 800);
        } else setError(res.message);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setUsername(''); setPassword(''); setVerificationCode(''); setCaptchaToken(''); setError(''); setSuccess(''); setStep('email_password'); };

  return (
    <div className="auth-overlay" onClick={() => setShowAuthModal(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(15, 15, 25, 0.7)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 26, 117, 0.2)', borderRadius: '16px',
          padding: '30px', width: '100%', maxWidth: '400px', position: 'relative'
        }}>
        <button onClick={() => setShowAuthModal(false)}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', border: 'none' }}>
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ff1a75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Sparkles size={20} /> AnimeVault
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sync your progress & favorites</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['login', 'signup'].map(tab => (
            <button key={tab} onClick={() => { setAuthTab(tab); resetForm(); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: authTab === tab ? '#ff1a75' : 'rgba(255,255,255,0.04)',
                color: authTab === tab ? '#000' : '#fff', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer'
              }}>
              {tab === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle size={16} /><span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px', position: 'relative', display: step === 'otp' ? 'none' : 'block' }}>
            <User size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
            <input type="email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email" disabled={step === 'otp'}
              style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
          </div>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div style={{ display: step === 'otp' ? 'none' : 'block' }}>
              <Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" disabled={step === 'otp'}
                style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
            </div>
            
            {authTab === 'login' && step === 'otp' && (
              <div style={{ marginTop: '0px', position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="6-Digit Verification Code" autoFocus
                  style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,26,117,0.3)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem', boxShadow: '0 0 10px rgba(255,26,117,0.1)' }} />
                
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <button type="button" onClick={() => setStep('email_password')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Back to Login
                  </button>
                </div>
              </div>
            )}
            {authTab === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    navigate('/forgot-password');
                  }}
                  style={{
                    background: 'none', border: 'none', color: '#ff1a75',
                    fontSize: '0.75rem', cursor: 'pointer', padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          {hcaptchaEnabled && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <HCaptcha
                sitekey={hcaptchaSiteKey}
                theme="dark"
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken('')}
                onError={() => setCaptchaToken('')}
              />
            </div>
          )}

          <button type="submit" disabled={loading || (hcaptchaEnabled && !captchaToken)}
            style={{ width: '100%', padding: '12px', background: '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', marginBottom: '16px', boxShadow: '0 0 15px rgba(255,26,117,0.3)', opacity: loading || (hcaptchaEnabled && !captchaToken) ? 0.65 : 1 }}>
            {loading ? 'Processing...' : (authTab === 'login' ? (step === 'otp' ? 'Verify & Sign In' : 'Sign In') : 'Create Account')}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
          
          <button type="button" onClick={loginWithGoogle}
            style={{ width: '100%', padding: '12px', background: '#ffffff', color: '#000', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
