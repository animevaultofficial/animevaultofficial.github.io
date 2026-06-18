import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '../auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // 'loading' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        // optional redirect after reset link click
        redirectTo: `${window.location.origin}/set-new-password`,
      });
      if (error) {
        throw new Error(error.message || 'Failed to send reset link');
      }
      setStatus('sent');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset link');
      setStatus('error');
    }
  };

  const goHome = () => navigate('/');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #05050a)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15,15,25,0.7)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,26,117,0.15)',
        borderRadius: '20px',
        padding: '36px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '160px',
          height: '160px',
          background: 'radial-gradient(circle, rgba(255,26,117,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.82rem',
          textDecoration: 'none',
          marginBottom: '24px',
          transition: 'color 0.2s',
        }}>
          <ArrowLeft size={16} /> Back to home
        </Link>
        <h1 style={{
          fontSize: '1.4rem',
          color: '#ff1a75',
          marginBottom: '12px',
          textAlign: 'center',
        }}>Forgot Password</h1>
        {status === 'sent' ? (
          <p style={{ color: '#10b981', textAlign: 'center' }}>
            Reset link sent! Check your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                }}
              />
            </div>
            {status === 'error' && (
              <p style={{ color: '#ef4444', marginBottom: '12px', textAlign: 'center' }}>{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                padding: '12px',
                background: status === 'loading' ? 'rgba(255,26,117,0.5)' : '#ff1a75',
                color: '#000',
                fontWeight: '900',
                border: 'none',
                borderRadius: '12px',
                cursor: status === 'loading' ? 'wait' : 'pointer',
                fontSize: '0.9rem',
                transition: 'background 0.2s',
              }}>
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
