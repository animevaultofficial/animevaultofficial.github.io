
import { useState } from 'react';
import { Mail, ArrowLeft, Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email or username.'); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/resetPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: 'var(--bg-primary, #05050a)',
    }}>
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'rgba(15, 15, 25, 0.7)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 26, 117, 0.15)', borderRadius: '20px',
        padding: '36px 32px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px', width: '160px', height: '160px',
          background: 'radial-gradient(circle, rgba(255,26,117,0.15) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--text-secondary, #94a3b8)', fontSize: '0.82rem',
          textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s',
        }}>
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '1.6rem', fontWeight: '800', color: '#ff1a75',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <Sparkles size={22} /> AnimeVault
          </div>
          <h1 style={{
            fontSize: '1.15rem', fontWeight: '700', color: '#fff', marginTop: '12px',
          }}>
            Forgot your password?
          </h1>
          <p style={{
            fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '6px', lineHeight: '1.5',
          }}>
            Enter your email or username and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981', borderRadius: '12px', padding: '18px 16px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Check your inbox!</strong>
              <p style={{ marginTop: '6px', opacity: 0.85, lineHeight: '1.5' }}>
                If an account with that email/username exists, we've sent a password reset link.
                It expires in 1 hour.
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444', borderRadius: '10px', padding: '10px 12px',
                fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '16px',
              }}>
                <AlertCircle size={16} /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px', position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', top: '13px', left: '14px',
                  color: 'var(--text-tertiary, #64748b)',
                }} />
                <input
                  id="forgot-email-input"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or username"
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px',
                    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '0.88rem',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,26,117,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <button
                id="forgot-submit-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', background: loading ? 'rgba(255,26,117,0.5)' : '#ff1a75',
                  color: '#000', fontWeight: '900', border: 'none', borderRadius: '12px',
                  cursor: loading ? 'wait' : 'pointer', fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s, transform 0.1s',
                }}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <div style={{
          marginTop: '20px', textAlign: 'center', fontSize: '0.8rem',
          color: 'var(--text-secondary, #94a3b8)',
        }}>
          Remember your password?{' '}
          <Link to="/" style={{ color: '#ff1a75', textDecoration: 'none', fontWeight: '600' }}>
            Sign in
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
