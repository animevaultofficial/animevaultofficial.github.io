
import { useState } from 'react';
import { X, User, Lock, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../api/UserContext';


export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authTab, setAuthTab, login, signup, sendVerificationCode } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!username.trim() || !password) throw new Error('All fields are required.');
      if (authTab === 'login') {
        const res = await login(username, password, verificationCode.trim());
        if (res.success) {
          setSuccess('Welcome back!');
          setTimeout(() => { resetForm(); }, 800);
        } else setError(res.message);
      } else {
        const res = await signup(username, password);
        if (res.success) {
          setSuccess('Account created!');
          setTimeout(() => { resetForm(); }, 800);
        } else setError(res.message);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setUsername(''); setPassword(''); setVerificationCode(''); setError(''); setSuccess(''); };

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
            <button key={tab} onClick={() => { setAuthTab(tab); setError(''); setSuccess(''); }}
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
          <div style={{ marginBottom: '14px', position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
            <input type="email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email"
              style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
          </div>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
              style={{ width: '100%', padding: '11px 12px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
            {authTab === 'login' && (
              <div style={{ marginTop: '14px', position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="Verification Code (Optional)"
                  style={{ width: '100%', padding: '11px 100px 11px 38px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
                <button
                  type="button"
                  onClick={async () => {
                    if (!username.trim()) {
                      setError('Please enter your email first.');
                      return;
                    }
                    setError('');
                    setSuccess('');
                    try {
                      setLoading(true);
                      const res = await sendVerificationCode(username.trim());
                      if (res.success) {
                        setSuccess('Verification code sent to email!');
                      } else {
                        setError(res.message || 'Failed to send code.');
                      }
                    } catch (err) {
                      setError(err.message || 'Failed to send code.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ position: 'absolute', right: '8px', top: '8px', background: 'rgba(255,26,117,0.2)', border: '1px solid rgba(255,26,117,0.3)', color: '#ff1a75', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Send Code
                </button>
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
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
            {loading ? 'Processing...' : (authTab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
