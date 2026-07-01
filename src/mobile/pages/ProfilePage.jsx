import React, { useState, useEffect } from 'react';
import { Heart, Clock, User, LogOut, Calendar, Camera, Edit2, Image, Sparkles, Award, Settings as SettingsIcon, UploadCloud, Loader, BadgeCheck, Tv, Save, Check, Trash2, BarChart3, Bell } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { getUserStats as dbGetUserStats, fetchReminders } from '../../api/db';
import { getContinueWatching, getFavorites } from '../api/storage';
import StoryAvatar from '../../components/StoryAvatar';
import StoryUploadModal from '../../components/StoryUploadModal';

function AuthScreen() {
  const { login, signup, sendVerificationCode, loginWithGoogle } = useUser();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('email_password'); // 'email_password' or 'otp'

  const resetForm = () => { setEmail(''); setPassword(''); setVerificationCode(''); setError(''); setSuccess(''); setStep('email_password'); };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (step === 'otp') {
      if (!verificationCode.trim()) {
        setError('Verification code is required.');
        return;
      }
      setBusy(true);
      try {
        const result = await login(email, password, verificationCode.trim());
        if (result.success) {
          setSuccess('Welcome back!');
          setTimeout(() => resetForm(), 800);
        } else {
          setError(result.message || 'Verification failed.');
        }
      } catch (e) {
        setError(e.message || 'Verification failed.');
      }
      setBusy(false);
      return;
    }

    if (!email.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    setBusy(true);
    try {
      if (tab === 'login') {
        // Check if 2FA is needed (like web version)
        try {
          const { checkUser2FA } = await import('../../api/db');
          const needs2FA = await checkUser2FA(email.trim());
          if (needs2FA) {
            const res = await sendVerificationCode(email.trim());
            if (res.success) {
              setSuccess('2-Step Verification required. Code sent to email!');
              setStep('otp');
            } else {
              setError(res.message || 'Failed to send verification code.');
            }
            setBusy(false);
            return;
          }
        } catch {}
        // No 2FA, login directly
        const result = await login(email, password, null);
        if (result.success) {
          setSuccess('Welcome back!');
          setTimeout(() => resetForm(), 800);
        } else {
          setError(result.message || 'Login failed.');
        }
      } else {
        const result = await signup(email, password);
        if (result.success) {
          setSuccess('Account created!');
          setTimeout(() => resetForm(), 800);
        } else {
          setError(result.message || 'Signup failed.');
        }
      }
    } catch (e) {
      setError(e.message || 'Authentication failed.');
    }
    setBusy(false);
  }

  async function handleGoogleSignIn() {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const result = await loginWithGoogle();
      if (result?.success === false) {
        setError(result.message || 'Google sign-in failed.');
      }
    } catch (e) {
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Please enter your email first.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/resetPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Password reset link sent to your email!');
      } else {
        setError(data.error || 'Failed to send reset link.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="mobile-auth-shell">
      <div className="mobile-auth-card">
        <div className="auth-brand">
          <img src="/logo.png" alt="AnimeVault" className="mobile-auth-logo" />
          <h2 className="mobile-auth-title">AnimeVault</h2>
          <p className="mobile-auth-sub">Sign in to sync favorites, history, reminders and watch progress on every device.</p>
        </div>

        <div className="mobile-auth-tabs" role="tablist" aria-label="Authentication tabs">
          {['login', 'signup'].map(t => (
            <button key={t} type="button" className={`mobile-auth-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); resetForm(); }}>
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && <div className="mobile-auth-alert error"><span>⚠</span><span>{error}</span></div>}
        {success && <div className="mobile-auth-alert success"><span>✓</span><span>{success}</span></div>}

        <form onSubmit={handleSubmit}>
          {step !== 'otp' && (
            <>
              <label className="mobile-auth-field">
                <User size={17} />
                <input className="mobile-auth-input" type="email" inputMode="email" autoComplete="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              <label className="mobile-auth-field">
                <span className="field-icon">🔒</span>
                <input className="mobile-auth-input" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              </label>
            </>
          )}

          {tab === 'login' && step === 'otp' && (
            <label className="mobile-auth-field">
              <span className="field-icon">✉</span>
              <input className="mobile-auth-input" type="text" inputMode="numeric" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="6-digit verification code" autoFocus />
            </label>
          )}

          {tab === 'login' && step === 'otp' ? (
            <div style={{ textAlign: 'center', margin: '-.25rem 0 .75rem' }}>
              <button type="button" className="mobile-auth-link" onClick={() => setStep('email_password')}>Back to sign in</button>
            </div>
          ) : tab === 'login' && (
            <div style={{ textAlign: 'right', margin: '-.25rem 0 .75rem' }}>
              <button type="button" className="mobile-auth-link" onClick={handleForgotPassword}>Forgot password?</button>
            </div>
          )}

          <button type="submit" disabled={busy} className="mobile-auth-submit">
            {busy ? 'Processing...' : tab === 'login' ? (step === 'otp' ? 'Verify & Sign In' : 'Sign In') : 'Create Account'}
          </button>

          <div className="mobile-auth-divider">OR</div>

          <button type="button" onClick={handleGoogleSignIn} disabled={busy} className="mobile-auth-google">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage({ navigate }) {
  const { user, setUser, history, likes, continueWatching: syncedContinue, logout, updateProfile } = useUser();
  const [activeTab, setActiveTab] = useState('likes');
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '/logo.png');
  const [bannerUrl, setBannerUrl] = useState(user?.banner || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);

  // Editable fields
  const [editAvatar, setEditAvatar] = useState(avatarUrl);
  const [editBanner, setEditBanner] = useState(bannerUrl);

  // Sync from user object when it changes
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar || '/logo.png');
      setBannerUrl(user.banner || '');
      setEditAvatar(user.avatar || '/logo.png');
      setEditBanner(user.banner || '');
    }
  }, [user]);

  // Fetch stats and reminders from DB
  useEffect(() => {
    if (user) {
      dbGetUserStats(user.id).then(s => setStats(s)).catch(() => { });
      fetchReminders(user.id).then(r => setReminders(r || [])).catch(() => { });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setReminders([]);
    }
  }, [user]);

  if (!user) return <AuthScreen />;

  // My List - real data from UserContext (likes/continueWatching) synced from DB
  const localFavorites = getFavorites();
  const localContinueWatching = getContinueWatching();

  // Normalize likes data from UserContext (stored as {media_id, media_title, media_poster, ...})
  const normalizeLikes = (items) => (items || []).map(item => ({
    id: item.media_id || item.id,
    title: item.media_title || item.title,
    image: item.media_poster || item.image,
  })).filter(item => item.id);

  const normalizeContinue = (items) => (items || []).map(item => ({
    id: item.media_id || item.id,
    title: item.media_title || item.title,
    image: item.media_poster || item.image,
  })).filter(item => item.id);

  // Prefer synced data from UserContext (fetched from DB), fallback to localStorage
  const displayLikes = likes?.length ? normalizeLikes(likes) : (localFavorites?.animes || localFavorites);
  const displayHistory = history?.length ? normalizeLikes(history) : [];
  const displayContinueWatching = syncedContinue?.length ? normalizeContinue(syncedContinue) : (localContinueWatching || []);

  const statCounts = stats || {};

  const renderGrid = (items, emptyText, emptyIcon) => {
    if (!items?.length) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>{emptyIcon}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{emptyText}</p>
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {items.map(item => (
          <button key={item.id} onClick={() => navigate('anime-detail', { id: item.id })}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              borderRadius: 10, overflow: 'hidden', textAlign: 'left'
            }}>
            <img src={item.image || '/logo.png'} alt={item.title}
              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 10 }} />
            <p style={{ fontSize: '0.7rem', margin: '4px 0 0', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title}
            </p>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Banner */}
      <div style={{
        position: 'relative', height: 160, overflow: 'hidden',
        background: bannerUrl ? 'none' : 'linear-gradient(135deg, #1a1a2e, #16213e)'
      }}>
        {bannerUrl && <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(3,15,22,.95) 0%, transparent 60%)'
        }} />
        {isEditing && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <label style={{
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
              borderRadius: 8, padding: '6px 10px', fontSize: '.7rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {isUploadingBanner ? <Loader size={14} /> : <Image size={14} />} Banner
              <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'banner')} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Avatar + Info */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 16px', marginTop: -40, position: 'relative', zIndex: 5 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <StoryAvatar
            user={user}
            viewerId={user.id}
            size={80}
            style={{
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              borderRadius: '50%', background: '#121220'
            }}
          />
          {isEditing && (
            <label style={{
              position: 'absolute', bottom: 0, right: 0, background: '#ff1a75', color: '#000',
              borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', border: '2px solid #06060c', zIndex: 10
            }}>
              {isUploadingAvatar ? <Loader size={12} /> : <Camera size={12} />}
              <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'avatar')} style={{ display: 'none' }} />
            </label>
          )}
        </div>
        <div style={{ flex: 1, paddingLeft: 12, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#fff' }}>
              {user.username || user.email || 'AnimeVault User'}
            </h2>
            {user.is_verified && <BadgeCheck size={18} fill="#1d9bf0" color="#fff" />}
            {user.is_admin && (
              <span style={{ fontSize: '.6rem', fontWeight: 900, background: 'linear-gradient(135deg,#ffd700,#ffaa00)', color: '#000', padding: '2px 8px', borderRadius: 12 }}>
                ADMIN
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} /> Joined AnimeVault
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => setIsEditing(!isEditing)}
          style={{
            flex: 1, padding: '8px 12px', background: isEditing ? '#ff1a75' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', color: isEditing ? '#000' : '#fff',
            borderRadius: 10, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
          {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
          {isEditing ? 'Done' : 'Edit Profile'}
        </button>
        <button onClick={logout}
          style={{
            padding: '8px 16px', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
            borderRadius: 10, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
          <LogOut size={14} /> Logout
        </button>
      </div>

      {/* Edit mode: save/cancel */}
      {isEditing && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveProfile} disabled={saveStatus === 'saving'}
              style={{
                flex: 1, padding: '8px', background: saveStatus === 'saved' ? '#10b981' : '#ff1a75',
                color: '#000', fontWeight: 900, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem'
              }}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Failed' : <><Save size={14} /> Save</>}
            </button>
            <button onClick={() => { setIsEditing(false); setEditAvatar(avatarUrl); setEditBanner(bannerUrl); }}
              style={{
                padding: '8px 16px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                borderRadius: 10, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px 16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <Heart size={18} style={{ color: '#ff1a75', marginBottom: 4 }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{displayLikes?.length || 0}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Favorites</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <BarChart3 size={18} style={{ color: '#ff1a75', marginBottom: 4 }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{statCounts.totalWatchTime ? Math.round(statCounts.totalWatchTime / 60) : 0}m</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Watch Time</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <Tv size={18} style={{ color: '#ff1a75', marginBottom: 4 }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{displayContinueWatching?.length || 0}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Watching</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 12 }}>
        {[
          { id: 'likes', label: 'Favorites', icon: Heart },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'watching', label: 'Watching', icon: Tv },
          { id: 'notes', label: 'Notes', icon: Bell },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.7rem', fontFamily: 'inherit',
                background: activeTab === t.id ? '#ff1a75' : 'rgba(255,255,255,0.04)',
                color: activeTab === t.id ? '#000' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
              }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {activeTab === 'likes' && renderGrid(displayLikes, 'No favorites yet. Tap the heart icon on any anime!', '♡')}
        {activeTab === 'history' && renderGrid(displayHistory, 'No watch history yet.', '⏱')}
        {activeTab === 'watching' && renderGrid(displayContinueWatching, 'Nothing in progress. Start watching!', '▶')}
        {activeTab === 'notes' && (
          <div>
            {reminders.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>🔔</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>No reminders yet. Add one from the Schedule page.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reminders.map(reminder => (
                  <button key={reminder.id || reminder.schedule_id} onClick={() => navigate('anime-detail', { id: reminder.anime_id || reminder.media_id })}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 12, textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                    <img src={reminder.image || '/logo.png'} alt="" style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{reminder.title}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Episode {reminder.episode}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#ff1a75' }}>
                        {reminder.airing_at ? new Date(reminder.airing_at * 1000).toLocaleString() : 'Airing soon'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showStoryUpload && <StoryUploadModal onClose={() => setShowStoryUpload(false)} />}
    </div>
  );

  // Handlers defined as inner functions to access state
  async function handleSaveProfile() {
    setSaveStatus('saving');
    const success = await updateProfile(editAvatar, editBanner);
    if (success) {
      setAvatarUrl(editAvatar);
      setBannerUrl(editBanner);
      setSaveStatus('saved');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  }

  async function handleFileUpload(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return; }
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) { alert('Missing Cloudinary config in .env'); return; }
    const setUploading = type === 'avatar' ? setIsUploadingAvatar : setIsUploadingBanner;
    const setUrl = type === 'avatar' ? setEditAvatar : setEditBanner;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'animevault_profiles');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.secure_url) setUrl(data.secure_url);
      else alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
    } catch (err) { alert('Upload error: ' + err.message); }
    finally { setUploading(false); }
  }
}
