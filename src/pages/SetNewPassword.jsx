import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ResetPasswordForm } from '@neondatabase/auth-ui';
import { authClient } from '../auth';

export default function SetNewPassword() {
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
          position: 'absolute', top: '-60px', left: '-60px', width: '160px', height: '160px',
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
            Set New Password
          </h1>
          <p style={{
            fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '6px', lineHeight: '1.5',
          }}>
            Choose a strong password for your account.
          </p>
        </div>

        {/* Verifying spinner */}
        {verifying && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '30px 0',
          }}>
            <Loader2 size={32} style={{ color: '#ff1a75', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verifying your reset link…</p>
          </div>
        )}

        {/* Success state */}
        {!verifying && success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981', borderRadius: '12px', padding: '20px 16px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Password updated!</strong>
              <p style={{ marginTop: '6px', opacity: 0.85, lineHeight: '1.5' }}>
                Your password has been reset successfully. Redirecting you to sign in…
              </p>
            </div>
          </div>
        )}

        {/* Error state (no valid token) */}
        {!verifying && !tokenValid && !success && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444', borderRadius: '12px', padding: '18px 14px',
            fontSize: '0.84rem', display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Invalid or expired link</strong>
              <p style={{ marginTop: '6px', opacity: 0.85, lineHeight: '1.5' }}>{error}</p>
              <Link to="/forgot-password" style={{
                display: 'inline-block', marginTop: '10px', color: '#ff1a75',
                fontWeight: '600', textDecoration: 'none',
              }}>
                Request a new reset link →
              </Link>
            </div>
          </div>
        )}

        {/* Form (token is valid, not yet submitted) */}
        {!verifying && tokenValid && !success && (
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
              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', top: '13px', left: '14px',
                  color: 'var(--text-tertiary, #64748b)',
                }} />
                <input
                  id="new-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,26,117,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', top: '13px', left: '14px',
                  color: 'var(--text-tertiary, #64748b)',
                }} />
                <input
                  id="confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,26,117,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              <button
                id="set-password-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? 'rgba(255,26,117,0.5)' : '#ff1a75',
                  color: '#000', fontWeight: '900', border: 'none', borderRadius: '12px',
                  cursor: loading ? 'wait' : 'pointer', fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
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
