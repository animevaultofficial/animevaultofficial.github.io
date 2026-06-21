import React, { useState, useEffect } from 'react';
import { getStoredUser, login, signup, logout, clearUser } from '../api/auth';
import { getFavorites, getContinueWatching } from '../api/storage';

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('All fields required'); return; }
    if (tab === 'login') {
      const res = login(username, password);
      if (res.success) onLogin(res.user);
      else setError(res.message || 'Login failed');
    } else {
      const res = signup(username, password);
      if (res.success) onLogin(res.user);
      else setError(res.message || 'Signup failed');
    }
  };

  return (
    <div className="mobile-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/logo.png" alt="AnimeVault" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>AnimeVault</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>Sign in to sync your data</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
        <button onClick={() => setTab('login')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            background: tab === 'login' ? 'var(--brand-color)' : 'transparent', color: tab === 'login' ? '#fff' : '#94a3b8' }}>Sign In</button>
        <button onClick={() => setTab('signup')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            background: tab === 'signup' ? 'var(--brand-color)' : 'transparent', color: tab === 'signup' ? '#fff' : '#94a3b8' }}>Sign Up</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <span>👤</span>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <span>🔒</span>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
        </div>
        {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginBottom: 12, textAlign: 'center' }}>{error}</p>}
        <button type="submit"
          style={{ width: '100%', padding: '14px', background: 'var(--brand-color)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
          {tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage({ navigate }) {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('favorites');

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (!user) {
    return <AuthScreen onLogin={(u) => setUser(u)} />;
  }

  const favorites = getFavorites();
  const continueWatching = getContinueWatching();

  return (
    <div className="mobile-content">
      {/* Profile Header */}
      <div style={{ textAlign: 'center', padding: '1rem 0', marginBottom: 16 }}>
        <img src={user.avatar || '/logo.png'} alt="" style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 8, border: '2px solid var(--brand-color)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user.username}</h2>
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{favorites.length} favorites · {continueWatching.length} watching</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{favorites.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Favorites</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{continueWatching.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Watching</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
        {['favorites', 'watching', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              background: tab === t ? 'var(--brand-color)' : 'transparent', color: tab === t ? '#fff' : '#94a3b8', textTransform: 'capitalize' }}>
            {t === 'favorites' ? '❤️ Favs' : t === 'watching' ? '▶ Watching' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {tab === 'favorites' && (
        favorites.length === 0
          ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}><p>No favorites yet</p></div>
          : <div className="grid-scroll">
              {favorites.map(item => (
                <div key={item.id} className="grid-card" onClick={() => navigate('detail', { id: item.id })}>
                  <img src={item.image} alt={item.title} className="grid-card-image" style={{ objectFit: 'cover' }} />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
      )}

      {tab === 'watching' && (
        continueWatching.length === 0
          ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}><p>Nothing watched yet</p></div>
          : <div className="grid-scroll">
              {continueWatching.map(item => (
                <div key={item.id} className="grid-card" onClick={() => navigate('detail', { id: item.id })}>
                  <img src={item.image} alt={item.title} className="grid-card-image" style={{ objectFit: 'cover' }} />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
      )}

      {tab === 'settings' && (
        <div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>App Version</p>
            <p style={{ fontWeight: 600 }}>0.2.117</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>Data</p>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Favorites: {favorites.length} · History: {continueWatching.length}</p>
          </div>
          <button onClick={() => { clearUser(); setUser(null); }}
            style={{ width: '100%', padding: '14px', background: 'rgba(255,50,50,0.1)', color: '#ff4444', border: '1px solid rgba(255,50,50,0.3)', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}