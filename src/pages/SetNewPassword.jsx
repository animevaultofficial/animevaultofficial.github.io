import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '../auth';

export default function SetNewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  // Extract token from either HashRouter search or window.location.search
  const windowParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(location.search);
  const token = windowParams.get('token') || hashParams.get('token');

  React.useEffect(() => {
    if (!token && location.pathname === '/set-new-password') {
      // If no token is found, redirect to home
      navigate('/');
    }
  }, [token, location.pathname, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords don't match");
      return;
    }
    
    setStatus('loading');
    setErrorMsg('');
    
    try {
      const { error } = await authClient.resetPassword({
        token,
        password,
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to reset password');
      }
      
      setStatus('success');
      // Redirect to home/login after a brief success message
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg(err.message || 'Failed to reset password');
      setStatus('error');
    }
  };

  if (!token) return null; // Wait for redirect if no token

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
          left: '-60px',
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
        }}>Set New Password</h1>
        
        {status === 'success' ? (
          <p style={{ color: '#10b981', textAlign: 'center', margin: '20px 0' }}>
            Password reset successfully! Redirecting...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                }}
              />
            </div>
            {errorMsg && (
              <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem' }}>
                {errorMsg}
              </p>
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
              {status === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
