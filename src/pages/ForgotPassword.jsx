import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { authClient } from '../auth';
import { savePasswordRecovery } from '../components/PublicPasswordRoutes';

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
      const result = await authClient.emailOtp.requestPasswordReset({ email: normalizedEmail });
      if (result?.error) throw new Error(result.error.message || 'Failed to send verification code.');
      // Keep recovery alive if Android recreates the WebView while the user checks email.
      savePasswordRecovery({ email: normalizedEmail, requestedAt: Date.now() });
      navigate(`/set-new-password?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to send verification code.');
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #05050a)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'rgba(15,15,25,0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,26,117,0.15)', borderRadius: '20px', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.82rem', textDecoration: 'none', marginBottom: '24px' }}><ArrowLeft size={16} /> Back to home</Link>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Mail size={28} color="#ff1a75" />
          <h1 style={{ fontSize: '1.4rem', color: '#ff1a75', margin: '12px 0 8px' }}>Forgot Password</h1>
          <p style={{ color: '#929099', fontSize: 13, lineHeight: 1.5, margin: 0 }}>Enter your email and we'll send a 6-digit verification code.</p>
        </div>
        {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12 }}>{errorMsg}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}><input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={status === 'loading'} autoComplete="email" style={{ boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} /></div>
          <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: '12px', background: status === 'loading' ? 'rgba(255,26,117,0.5)' : '#ff1a75', color: '#000', fontWeight: '900', border: 'none', borderRadius: '12px', fontSize: '0.9rem' }}>{status === 'loading' ? 'Sending code...' : 'Send Verification Code'}</button>
        </form>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16, color: '#71717a', fontSize: 11 }}><ShieldCheck size={14} /> Code-based recovery; no reset link required.</div>
      </div>
    </div>
  );
}
