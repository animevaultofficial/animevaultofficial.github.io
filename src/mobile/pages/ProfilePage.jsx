import React, { useState, useEffect } from 'react';
import { User, Heart, Clock, Settings, LogOut, ChevronRight, Bookmark, Star } from 'lucide-react';
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
    const res = tab === 'login' ? login(username, password) : signup(username, password);
    if (res.success) onLogin(res.user);
    else setError(res.message || 'Failed');
  };

  return (
    <div className="mobile-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/logo.png" alt="AnimeVault" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>AnimeVault</h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.85rem', marginTop: 4 }}>Sign in to sync your data</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-item ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
        <button className={`tab-item ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <User size={18} color="var(--text3)" />
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginBottom: 12, textAlign: 'center' }}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.9rem' }}>
          {tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage({ navigate, onUserChange }) {
  const nav = (id) => navigate('anime-detail', { id });
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('favorites');

  useEffect(() => { setUser(getStoredUser()); }, []);

  const handleLogout = () => { clearUser(); setUser(null); onUserChange?.(null); };

  if (!user) return <AuthScreen onLogin={(u) => { setUser(u); onUserChange?.(u); }} />;

  const favorites = getFavorites();
  const continueWatching = getContinueWatching();

  return (
    <div className="mobile-content">
      {/* Profile Header */}
      <div style={{ textAlign: 'center', padding: '1rem 0', marginBottom: 16 }}>
        <img src={user.avatar || '/logo.png'} alt="" style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 8, border: '2px solid var(--brand)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user.username}</h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>{favorites.length} favorites · {continueWatching.length} watching</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="info-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{favorites.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Favorites</div>
        </div>
        <div className="info-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{continueWatching.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Watching</div>
        </div>
        <div className="info-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>0.2</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>Version</div>
        </div>
      </div>

      <div className="tab-bar">
        {[
          { id: 'favorites', label: 'Favorites', icon: Heart },
          { id: 'watching', label: 'Watching', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'favorites' && (
        favorites.length === 0
          ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}><Heart size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p>No favorites yet</p></div>
          : <div className="grid-3">
              {favorites.map(item => (
                <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                  <img src={item.image} alt={item.title} className="grid-card-img" style={{ objectFit: 'cover' }} />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
      )}

      {tab === 'watching' && (
        continueWatching.length === 0
          ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}><Clock size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p>Nothing watched yet</p></div>
          : <div className="grid-3">
              {continueWatching.map(item => (
                <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                  <img src={item.image} alt={item.title} className="grid-card-img" style={{ objectFit: 'cover' }} />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
      )}

      {tab === 'settings' && (
        <div>
          <div className="info-card" style={{ marginBottom: 8 }}>
            <div className="info-label">App Version</div>
            <div className="info-value">0.2.121</div>
          </div>
          <div className="info-card" style={{ marginBottom: 8 }}>
            <div className="info-label">Data</div>
            <div className="info-value">{favorites.length} favorites · {continueWatching.length} in history</div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '0.9rem', background: 'rgba(255,50,50,0.1)', color: '#ff4444', border: '1px solid rgba(255,50,50,0.3)', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}