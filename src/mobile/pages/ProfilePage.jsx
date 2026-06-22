import React, { useState } from 'react';
import { Clock, Heart, LogOut, Mail, Shield, Settings, User } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { getContinueWatching, getFavorites } from '../api/storage';

function AuthScreen() {
  const { login, signup, loginWithGoogle } = useUser();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    setBusy(true);
    const result = tab === 'login' ? await login(email, password) : await signup(email, password);
    setBusy(false);
    if (!result.success) setError(result.message || 'Authentication failed.');
  }

  return (
    <div className="mobile-content auth-panel">
      <div className="auth-brand">
        <img src="/logo.png" alt="AnimeVault" />
        <h2>AnimeVault</h2>
        <p>Sign in to sync favorites, history, reminders, and profile data.</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-item ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
        <button className={`tab-item ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="search-bar">
          <Mail size={18} color="var(--text3)" />
          <input type="email" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />
        </label>
        <label className="search-bar">
          <Shield size={18} color="var(--text3)" />
          <input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary wide" disabled={busy}>
          {busy ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        <button type="button" className="btn-ghost wide" onClick={loginWithGoogle}>
          Continue with Google
        </button>
      </form>
    </div>
  );
}

function normalizeLikes(likes) {
  return (likes || []).map(item => ({
    id: item.media_id || item.id,
    title: item.media_title || item.title,
    image: item.media_poster || item.image,
  })).filter(item => item.id);
}

function normalizeContinueWatching(items) {
  return (items || []).map(item => ({
    id: item.media_id || item.id,
    title: item.media_title || item.title,
    image: item.media_poster || item.image,
    episode: item.episode,
  })).filter(item => item.id);
}

export default function ProfilePage({ navigate }) {
  const { user, logout, history, continueWatching: syncedContinue, likes } = useUser();
  const [tab, setTab] = useState('favorites');

  if (!user) return <AuthScreen />;

  const localFavorites = getFavorites();
  const localContinueWatching = getContinueWatching();
  const favorites = likes?.length ? normalizeLikes(likes) : localFavorites;
  const continueWatching = syncedContinue?.length ? normalizeContinueWatching(syncedContinue) : localContinueWatching;

  const nav = id => navigate('anime-detail', { id });

  return (
    <div className="mobile-content">
      <div className="profile-head">
        <img src={user.avatar || '/logo.png'} alt="" />
        <h2>{user.username || user.email || 'AnimeVault User'}</h2>
        <p>{favorites.length} favorites · {continueWatching.length} watching</p>
      </div>

      <div className="grid-3 profile-stats">
        <div className="info-card">
          <strong>{favorites.length}</strong>
          <span>Favorites</span>
        </div>
        <div className="info-card">
          <strong>{history.length || continueWatching.length}</strong>
          <span>History</span>
        </div>
        <div className="info-card">
          <strong>{user.is_admin ? 'Admin' : 'User'}</strong>
          <span>Role</span>
        </div>
      </div>

      <div className="tab-bar">
        {[
          { id: 'favorites', label: 'Favorites', icon: Heart },
          { id: 'watching', label: 'Watching', icon: Clock },
          { id: 'settings', label: 'Account', icon: Settings },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={`tab-item ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <div className="empty"><Heart size={36} /><p>No favorites yet</p></div>
        ) : (
          <div className="grid-3">
            {favorites.map(item => (
              <button key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                <img src={item.image || '/logo.png'} alt={item.title} className="grid-card-img" />
                <span className="grid-card-title">{item.title}</span>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'watching' && (
        continueWatching.length === 0 ? (
          <div className="empty"><Clock size={36} /><p>Nothing watched yet</p></div>
        ) : (
          <div className="grid-3">
            {continueWatching.map(item => (
              <button key={`${item.id}-${item.episode || ''}`} className="grid-card" onClick={() => nav(item.id)}>
                <img src={item.image || '/logo.png'} alt={item.title} className="grid-card-img" />
                <span className="grid-card-title">{item.title}</span>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'settings' && (
        <div>
          <div className="info-card account-row">
            <User size={18} />
            <div>
              <div className="info-label">Signed in as</div>
              <div className="info-value">{user.username || user.email || 'AnimeVault User'}</div>
            </div>
          </div>
          <div className="info-card account-row">
            <Shield size={18} />
            <div>
              <div className="info-label">Synced data</div>
              <div className="info-value">{favorites.length} favorites · {history.length || continueWatching.length} history items</div>
            </div>
          </div>
          <button onClick={logout} className="btn-danger wide">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
