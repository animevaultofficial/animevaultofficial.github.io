import React, { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronRight, Clock3, Download, Edit3, Heart, History, Image as ImageIcon, LogOut, Save, Settings, Sparkles, Tv, UserRound, X } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { getUserStats as dbGetUserStats } from '../../api/db';
import { getFavorites, getContinueWatching } from '../api/storage';

const FALLBACK = '/logo.png';
const normalize = (items = []) => items.map(item => ({
  id: item.tmdb_id || item.tmdbId || item.media_id || item.id,
  title: item.media_title || item.title || 'Untitled',
  image: item.media_poster || item.image || item.poster || FALLBACK,
  mediaType: item.media_type || item.mediaType || item.type || '',
  tmdbId: item.tmdb_id || item.tmdbId,
})).filter(x => x.id && (String(x.mediaType).toLowerCase() === 'movie' || String(x.mediaType).toLowerCase() === 'tv'));

function AuthPrompt() {
  const { setShowAuthModal, setAuthTab } = useUser();
  useEffect(() => { setAuthTab('login'); setShowAuthModal(true); }, [setAuthTab, setShowAuthModal]);
  return <section className="av-profile-login"><div className="av-profile-login-icon"><UserRound size={30} /></div><h1>Your Profile</h1><p>Sign in to manage your AnimeVault profile, favorites, history and watch progress.</p><button onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>Sign In</button><button className="secondary" onClick={() => { setAuthTab('signup'); setShowAuthModal(true); }}>Create Account</button></section>;
}

export default function ProfilePage({ navigate }) {
  const { user, history, likes, continueWatching, logout, updateProfile, activeSubAccount } = useUser();
  const [editing, setEditing] = useState(false), [avatar, setAvatar] = useState(FALLBACK), [banner, setBanner] = useState(''), [draftAvatar, setDraftAvatar] = useState(FALLBACK), [draftBanner, setDraftBanner] = useState(''), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [tab, setTab] = useState('favorites'), [stats, setStats] = useState({});
  const displayUser = useMemo(() => activeSubAccount ? { ...user, username: activeSubAccount.name || user?.username, avatar: activeSubAccount.avatar || user?.avatar } : user, [activeSubAccount, user]);
  useEffect(() => { if (!displayUser) return; const a = displayUser.avatar || FALLBACK, b = user?.banner || ''; setAvatar(a); setBanner(b); setDraftAvatar(a); setDraftBanner(b); }, [displayUser, user?.banner]);
  useEffect(() => { if (user?.id) dbGetUserStats(user.id).then(x => setStats(x || {})).catch(() => {}); }, [user?.id]);
  if (!user) return <AuthPrompt />;
  const favorites = normalize(likes?.length ? likes : (getFavorites()?.items || getFavorites()?.animes || [])), watched = normalize(history || []), continuing = normalize(continueWatching?.length ? continueWatching : getContinueWatching()), items = tab === 'favorites' ? favorites : tab === 'history' ? watched : continuing;
  const openItem = item => { const raw = String(item.mediaType || '').toLowerCase(); if (raw !== 'movie' && raw !== 'tv') return navigate('/collections'); return navigate('drama-detail', { id: item.tmdbId || item.id, mediaType: raw, title: item.title }); };
  const chooseImage = (event, setter) => { const file = event.target.files?.[0]; if (!file || file.size > 5 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setter(String(reader.result)); reader.readAsDataURL(file); };
  const save = async () => { setSaving(true); setSaved(false); try { await updateProfile({ avatar: draftAvatar, banner: draftBanner }); setAvatar(draftAvatar); setBanner(draftBanner); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 1800); } finally { setSaving(false); } };
  const signOut = async () => { try { await logout(); } catch {} };
  return <div className="av-profile-page">
    <section className="av-profile-hero"><div className="av-profile-banner" style={banner ? { backgroundImage: `url(${banner})` } : undefined}><div className="av-profile-banner-glow" />{editing && <label className="av-profile-image-edit banner"><ImageIcon size={15} /> Banner<input type="file" accept="image/*" onChange={e => chooseImage(e, setDraftBanner)} /></label>}</div><div className="av-profile-identity"><div className="av-profile-avatar-wrap"><img src={editing ? draftAvatar : avatar} alt="" className="av-profile-avatar" />{editing && <label className="av-profile-image-edit avatar"><Camera size={15} /><input type="file" accept="image/*" onChange={e => chooseImage(e, setDraftAvatar)} /></label>}</div><div className="av-profile-name"><div><h1>{displayUser.username || 'AnimeVault User'}</h1>{(displayUser.is_verified || displayUser.is_admin) && <span className="av-profile-badge">✓ Verified</span>}</div><p>{displayUser.email || 'Guest account'}</p></div><div className="av-profile-actions">{editing ? <><button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : <><Save size={16} /> Save</>}</button><button onClick={() => { setEditing(false); setDraftAvatar(avatar); setDraftBanner(banner); }}><X size={16} /> Cancel</button></> : <button onClick={() => setEditing(true)}><Edit3 size={16} /> Edit</button>}</div></div></section>
    {saved && <div className="av-profile-toast"><Sparkles size={16} /> Profile updated</div>}
    <section className="av-profile-stats">{[['Watched', stats.watched_count ?? watched.length, Tv], ['Favorites', stats.favorites_count ?? favorites.length, Heart], ['History', stats.history_count ?? watched.length, Clock3]].map(([label, value, Icon]) => <div className="av-profile-stat" key={label}><Icon size={18} /><strong>{value}</strong><span>{label}</span></div>)}</section>
    <section className="av-profile-quick"><button onClick={() => navigate('/collections')}><Heart size={18} /><span><b>My Library</b><small>Favorites & history</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('/download')}><Download size={18} /><span><b>Downloads</b><small>Offline media</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('/notifications')}><Sparkles size={18} /><span><b>Notifications</b><small>Account activity</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('/settings')}><Settings size={18} /><span><b>Settings</b><small>App preferences</small></span><ChevronRight size={17} /></button></section>
    <section className="av-profile-library"><div className="av-profile-section-head"><div><p>YOUR VAULT</p><h2>My Library</h2></div><button onClick={() => navigate('/collections')}>View all <ChevronRight size={15} /></button></div><div className="av-profile-tabs">{[['favorites','Favorites',Heart],['history','History',History],['continue','Continue',Clock3]].map(([id,label,Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div>{items.length ? <div className="av-profile-grid">{items.slice(0,12).map(item => <button className="av-profile-card" key={`${item.mediaType}-${item.id}`} onClick={() => openItem(item)}><img src={item.image} alt="" loading="lazy" /><span>{item.title}</span></button>)}</div> : <div className="av-profile-empty"><Sparkles size={25} /><b>Nothing here yet</b><span>Start watching movies or series and your collection will appear here.</span><button onClick={() => navigate('/search')}>Explore</button></div>}</section>
    <section className="av-profile-account"><div><p>ACCOUNT</p><h2>Account actions</h2></div><button className="danger" onClick={signOut}><LogOut size={17} /> Sign out</button></section>
  </div>;
}
