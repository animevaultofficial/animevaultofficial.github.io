import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnimeUnavailable() {
  const navigate = useNavigate();
  return (
    <section style={{ minHeight: '58vh', display: 'grid', placeItems: 'center', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: 620, width: '100%', textAlign: 'center', padding: '2.5rem 2rem', border: '1px solid var(--white-10)', borderRadius: 24, background: 'rgba(255,255,255,.03)' }}>
        <span style={{ display: 'block', marginBottom: '.7rem', color: 'var(--brand-color)', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: '.75rem' }}>Temporarily unavailable</span>
        <h1 style={{ margin: 0 }}>Anime is temporarily unavailable</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '1rem auto 1.5rem' }}>The anime section is temporarily disabled while its service is offline. Please check back later.</p>
        <button type="button" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', padding: '.75rem 1rem', border: '1px solid var(--white-10)', borderRadius: 12, background: 'var(--white-05)', color: 'var(--text-primary)', fontWeight: 750, cursor: 'pointer' }}><ArrowLeft size={17} /> Back to AnimeVault</button>
      </div>
    </section>
  );
}
