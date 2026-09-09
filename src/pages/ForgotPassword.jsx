import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '../auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const { error } = await authClient.requestPasswordReset({
        email: normalizedEmail,
        // Hash routing keeps the reset page working on GitHub Pages and in the Android build.
        redirectTo: `${window.location.origin}/#/set-new-password?email=${encodeURIComponent(normalizedEmail)}`,
      });
      if (error) throw new Error(error.message || 'Failed to send reset link');
      setStatus('sent');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset link');
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #05050a)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'rgba(15,15,25,0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,26,117,0.15)', borderRadius: '20px', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.82rem', textDecoration: 'none', marginBottom: '24px' }}><ArrowLeft size={16} /> Back to home</Link>
        <h1 style={{ fontSize: '1.4rem', color: '#ff1a75', marginBottom: '12px', textAlign: 'center' }}>Forgot Password</h1>
        {status === 'sent' ? <p style={{ color: '#10b981', textAlign: 'center' }}>Reset link sent! Check your email.</p> : <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}><input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={status === 'loading'} style={{ boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} /></div>
          {status === 'error' && <p style={{ color: '#ef4444', marginBottom: '12px', textAlign: 'center' }}>{errorMsg}</p>}
          <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: '12px', background: status === 'loading' ? 'rgba(255,26,117,0.5)' : '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '12px', fontSize: '0.9rem' }}>{status === 'loading' ? 'Sending...' : 'Send Reset Link'}</button>
        </form>}
      </div>
    </div>
  );
}
