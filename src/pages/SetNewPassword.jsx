import React from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ResetPasswordForm } from '@neondatabase/auth-ui';
import { authClient } from '../auth';
import { useState } from 'react';

export default function SetNewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [errorMsg, setErrorMsg] = useState('');

  // If token is present on a non‑set‑new‑password route, redirect there
  React.useEffect(() => {
    if (token && location.pathname !== '/set-new-password') {
      navigate(`/set-new-password?token=${encodeURIComponent(token)}`);
    }
  }, [token, location.pathname, navigate]);

  const handleSuccess = () => {
    // After successful password reset, redirect to sign‑in page
    navigate('/login');
  };

  const handleError = (error) => {
    console.error('Reset password error:', error);
    setErrorMsg(error?.message || 'Failed to reset password');
  };

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
        {errorMsg && (
          <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '12px' }}>{errorMsg}</p>
        )}
        {/* Neon Auth reset password form */}
        <ResetPasswordForm
          authClient={authClient}
          token={token}
          onSuccess={handleSuccess}
          onError={handleError}
          submitButtonText="Update Password"
        />
      </div>
    </div>
  );
}
