import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ForgotPasswordForm } from '@neondatabase/auth-ui';
import { authClient } from '../auth';

export default function ForgotPassword() {
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

        <ForgotPasswordForm authClient={authClient} />
      </div>
    </div>
  );
}
