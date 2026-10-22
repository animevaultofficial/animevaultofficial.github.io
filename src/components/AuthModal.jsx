import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../api/UserContext';
import './AuthModal.css';

const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
const hcaptchaEnabled = Boolean(hcaptchaSiteKey) && !Capacitor.isNativePlatform();

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authTab, setAuthTab, login, signup, loginAsGuest } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirmPassword(''); setShowPassword(false);
    setCaptchaToken(''); setError(''); setSuccess('');
  };

  useEffect(() => {
    if (!showAuthModal) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape' && !loading) setShowAuthModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAuthModal, loading, setShowAuthModal]);

  if (!showAuthModal) return null;

  const switchTab = tab => { setAuthTab(tab); resetForm(); };

  const handleSubmit = async event => {
    event.preventDefault();
    setError(''); setSuccess('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setError('Enter your email address to continue.'); return; }
    if (!password) { setError('Enter your password to continue.'); return; }
    if (authTab === 'signup') {
      if (password.length < 6) { setError('Choose a password with at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Those passwords do not match. Try again.'); return; }
    }
    if (hcaptchaEnabled && !captchaToken) { setError('Complete the security check before continuing.'); return; }

    setLoading(true);
    try {
      const result = authTab === 'login'
        ? await login(normalizedEmail, password, null, captchaToken)
        : await signup(normalizedEmail, password, captchaToken);
      if (!result?.success) {
        setError(result?.message || 'We couldn’t complete that request. Please try again.');
        return;
      }
      setSuccess(authTab === 'login' ? 'You’re signed in. Welcome back!' : (result.message || 'Your account is ready.'));
      window.setTimeout(resetForm, 900);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const result = await loginAsGuest();
      if (!result?.success) { setError(result?.message || 'Guest mode could not be started.'); setLoading(false); }
    } catch (err) {
      setError(err?.message || 'Guest mode could not be started.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !loading) setShowAuthModal(false);
    }}>
      <section className="auth-dialog auth-dialog-compact" role="dialog" aria-modal="true" aria-labelledby="auth-heading" aria-describedby="auth-subheading">
        <div className="auth-form-panel">
          <button className="auth-close" type="button" aria-label="Close sign in" onClick={() => setShowAuthModal(false)} disabled={loading}><X size={18} /></button>
          <h1 className="auth-heading" id="auth-heading">{authTab === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth-subheading" id="auth-subheading">
            {authTab === 'login' ? 'Sign in to continue watching and manage your list.' : 'Create an account to save your anime and keep your progress.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button className="auth-tab" type="button" role="tab" aria-selected={authTab === 'login'} onClick={() => switchTab('login')} disabled={loading}>Sign in</button>
            <button className="auth-tab" type="button" role="tab" aria-selected={authTab === 'signup'} onClick={() => switchTab('signup')} disabled={loading}>Create account</button>
          </div>

          {error && <div className="auth-feedback auth-feedback-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
          {success && <div className="auth-feedback auth-feedback-success" role="status"><CheckCircle2 size={17} /><span>{success}</span></div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="animevault-auth-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" aria-hidden="true" />
                <input className="auth-input" id="animevault-auth-email" name="email" type="email" value={email}
                  onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email"
                  autoCapitalize="none" spellCheck="false" autoFocus required disabled={loading} />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="animevault-auth-password">Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" aria-hidden="true" />
                <input className="auth-input auth-password-input" id="animevault-auth-password" name="password"
                  type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)}
                  placeholder={authTab === 'login' ? 'Enter your password' : 'At least 6 characters'}
                  autoComplete={authTab === 'login' ? 'current-password' : 'new-password'} minLength={6} required disabled={loading} />
                <button className="auth-reveal" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>

            {authTab === 'signup' && <div className="auth-field">
              <label htmlFor="animevault-auth-confirm-password">Confirm password</label>
              <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" aria-hidden="true" />
                <input className="auth-input" id="animevault-auth-confirm-password" name="confirmPassword"
                  type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again" autoComplete="new-password" minLength={6} required disabled={loading} />
              </div>
            </div>}

            {authTab === 'login' && <div className="auth-form-options">
              <button className="auth-text-link" type="button" onClick={() => {
                setShowAuthModal(false); navigate('/forgot-password');
              }}>Forgot password?</button>
            </div>}

            {hcaptchaEnabled && <div className="auth-captcha"><HCaptcha sitekey={hcaptchaSiteKey} theme="dark"
              onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} /></div>}

            <button className="auth-submit" type="submit" disabled={loading || (hcaptchaEnabled && !captchaToken)}>
              <span>{loading ? 'Please wait…' : authTab === 'login' ? 'Sign in to AnimeVault' : 'Create my account'}</span>
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-divider"><span>or keep exploring</span></div>
          <button className="auth-guest" type="button" onClick={handleGuest} disabled={loading}>
            <UserRound size={17} /><span>Continue as guest</span>
          </button>
          <p className="auth-legal">By continuing, you agree to use AnimeVault responsibly. <strong>Your account, your watchlist, your pace.</strong></p>
        </div>
      </section>
    </div>
  );
}
