import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authClient } from '../../auth';

export default function ForgotPasswordPage({ navigate }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setStatus('loading');
    setMessage('');
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email: normalizedEmail });
      if (result?.error) throw new Error(result.error.message || 'Failed to send verification code.');
      setStatus('sent');
      setMessage('If an account exists for that email, a 6-digit verification code has been sent.');
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Failed to send verification code. Please try again.');
    }
  };

  const continueToCode = () => navigate?.(`/set-new-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);

  return (
    <section style={{ minHeight: 'calc(100vh - 64px)', display: 'grid', placeItems: 'center', padding: '28px 18px' }}>
      <div style={{ width: '100%', maxWidth: 430, padding: 24, borderRadius: 22, background: 'rgba(15,15,25,.92)', border: '1px solid rgba(255,26,117,.18)', boxShadow: '0 18px 60px rgba(0,0,0,.45)' }}>
        <button type="button" onClick={() => navigate?.(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, background: 'none', color: '#a1a1aa', padding: 0, marginBottom: 24, fontSize: 13 }}><ArrowLeft size={17} /> Back</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 58, height: 58, margin: '0 auto 14px', borderRadius: 18, display: 'grid', placeItems: 'center', background: 'rgba(255,26,117,.12)', color: '#ff1a75' }}><Mail size={26} /></div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 24 }}>Forgot password?</h1>
          <p style={{ margin: '9px 0 0', color: '#929099', fontSize: 13, lineHeight: 1.55 }}>Enter your AnimeVault email and we'll send a secure 6-digit verification code.</p>
        </div>
        {message && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 12, marginBottom: 16, borderRadius: 12, background: status === 'sent' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)', border: `1px solid ${status === 'sent' ? 'rgba(16,185,129,.22)' : 'rgba(239,68,68,.22)'}`, color: status === 'sent' ? '#10b981' : '#ef4444', fontSize: 12.5, lineHeight: 1.45 }}>{status === 'sent' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{message}</span></div>}
        {status !== 'sent' ? <form onSubmit={submit}>
          <label style={{ display: 'block', color: '#d4d4d8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Email address</label>
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={status === 'loading'} style={{ boxSizing: 'border-box', width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.045)', color: '#fff', outline: 'none', fontSize: 14 }} />
          <button type="submit" disabled={status === 'loading'} style={{ width: '100%', marginTop: 13, padding: '13px 14px', border: 0, borderRadius: 12, background: '#ff1a75', color: '#05050a', fontWeight: 900, fontSize: 14, opacity: status === 'loading' ? .7 : 1 }}>{status === 'loading' ? <><Loader2 size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Sending...</> : 'Send Verification Code'}</button>
        </form> : <>
          <button type="button" onClick={continueToCode} style={{ width: '100%', padding: 13, border: 0, borderRadius: 12, background: '#ff1a75', color: '#05050a', fontWeight: 900 }}>Enter Verification Code</button>
          <button type="button" onClick={() => { setStatus('idle'); setMessage(''); }} style={{ width: '100%', marginTop: 10, padding: 13, borderRadius: 12, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.04)', color: '#fff', fontWeight: 800 }}>Send Again</button>
        </>}
      </div>
    </section>
  );
}
