import React, { useState, useEffect } from 'react';
import { Home, Search, Film, Calendar, User, Menu, X, Heart, ChevronRight, Bell, BarChart3, Settings, Users, RefreshCw } from 'lucide-react';
import './mobile.css';
import './mobile-fixes.css';
import { useUser } from '../api/UserContext';
import { initDatabase, fetchSiteSettings } from '../api/db';
import { applyAccentColor, applyTheme } from '../utils/appearance';
import { storage } from '../utils/storage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import AnimeDetailsPage from './pages/AnimeDetailsPage';
import CollectionsPage from './pages/CollectionsPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import DramaDetailPage from './pages/DramaDetailPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';
import UpdatesPage from './pages/UpdatesPage';
import { assetPath } from '../utils/assetPath';
import { clearActiveSubAccount } from '../utils/subAccounts';

function Splash() {
  return (
    <div className="splash">
      <img src={assetPath('logo.png')} alt="AnimeVault" className="splash-logo" />
      <div className="splash-title">AnimeVault</div>
      <div className="splash-sub">Your ultimate anime hub</div>
    </div>
  );
}

function Sidebar({ currentPage, navigate, open, close, user, activeSubAccount, onSwitchAccount }) {
  const sections = [
    { label: 'Browse', items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'dramas', label: 'Shows & Movies', icon: Film },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
    ]},
    { label: 'Library', items: [
      { id: 'collections', label: 'My List', icon: Heart },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'stats', label: 'Stats', icon: BarChart3 },
      { id: 'community', label: 'Community', icon: Users },
    ]},
  ];

  return (
    <>
      {open && <div className="overlay" onClick={close} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-hdr"><div className="sb-col"><img src={assetPath('logo.png')} alt="" className="sb-logo" /><span className="sb-title">AnimeVault</span></div><button className="sb-close" onClick={close}><X size={20} /></button></div>
        <nav className="sb-nav">
          {sections.map(s => <div key={s.label}><div className="sb-label">{s.label}</div>{s.items.map(item => { const Icon = item.icon; return <button key={item.id} className={`sb-item ${currentPage === item.id ? 'active' : ''}`} onClick={() => { navigate(item.id); close(); }}><Icon size={18} /> {item.label}</button>; })}</div>)}
          <div className="sb-div" />
          <button className={`sb-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => { navigate('profile'); close(); }}><User size={18} /> Profile</button>
          {user && <button className="sb-item" onClick={() => { onSwitchAccount(); close(); }}><Users size={18} /> Switch Account</button>}
          <button className={`sb-item ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => { navigate('settings'); close(); }}><Settings size={18} /> Settings</button>
          <button className={`sb-item ${currentPage === 'updates' ? 'active' : ''}`} onClick={() => { navigate('updates'); close(); }}><RefreshCw size={18} /> Updates</button>
        </nav>
        <div className="sb-foot" onClick={() => { if (user) onSwitchAccount(); else navigate('profile'); close(); }}><img src={user?.avatar || assetPath('logo.png')} alt="" className="sb-av" /><div style={{ flex: 1 }}><div className="sb-un">{activeSubAccount?.name || user?.username || 'Guest'}</div><div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>{user ? 'Tap to switch profile' : 'Tap to sign in'}</div></div><ChevronRight size={16} color="var(--text3)" /></div>
      </aside>
    </>
  );
}

const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'dramas', label: 'Shows', icon: Film },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function AppMobile() {
  const { user, activeSubAccount, setActiveSubAccountState } = useUser();
  const [page, setPage] = useState('home');
  const [params, setParams] = useState({});
  const [splash, setSplash] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => { const t = setTimeout(() => setSplash(true), 1500); return () => clearTimeout(t); }, []);
  useEffect(() => {
    async function boot() {
      try {
        try { await initDatabase(); } catch { }
        const settings = await fetchSiteSettings();
        if (settings?.announcement) setAnnouncement(settings.announcement);
        applyAccentColor(storage.get('accentColor') || 'red');
        applyTheme(storage.get('theme') || 'dark', storage.get('customThemeVars'));
      } catch (err) { console.warn('[AnimeVault Mobile] startup skipped:', err?.message || err); }
    }
    boot();
  }, []);

  const nav = (p, pr = {}) => { setPage(p); setParams(pr); setSidebar(false); window.scrollTo({ top: 0, behavior: 'auto' }); };
  const switchAccount = () => { clearActiveSubAccount(); setActiveSubAccountState(null); setPage('home'); setParams({}); window.scrollTo(0, 0); };
  const back = () => { setPage('home'); setParams({}); window.scrollTo(0, 0); };

  const render = () => {
    switch (page) {
      case 'anime-detail': return <AnimeDetailsPage params={params} goBack={back} navigate={nav} />;
      case 'drama-detail': return <DramaDetailPage params={params} goBack={back} navigate={nav} />;
      case 'search': return <SearchPage navigate={nav} />;
      case 'collections': return <CollectionsPage navigate={nav} />;
      case 'schedule': return <SchedulePage navigate={nav} />;
      case 'dramas': return <DramasMoviesPage navigate={nav} />;
      case 'settings': return <SettingsPage goBack={back} />;
      case 'notifications': return <NotificationsPage navigate={nav} />;
      case 'stats': return <StatsPage navigate={nav} />;
      case 'community': return <CommunityPage navigate={nav} />;
      case 'updates': return <UpdatesPage goBack={back} />;
      case 'profile': return <ProfilePage navigate={nav} />;
      default: return <HomePage navigate={nav} />;
    }
  };

  const showNav = page !== 'anime-detail' && page !== 'drama-detail';

  return (
    <>
      {!splash && <Splash />}
      <Sidebar currentPage={page} navigate={nav} open={sidebar} close={() => setSidebar(false)} user={user} activeSubAccount={activeSubAccount} onSwitchAccount={switchAccount} />
      <div className="app" style={{ opacity: splash ? 1 : 0, transition: 'opacity .4s' }}>
        {announcement && showNav && <div className="mobile-announcement">{announcement}</div>}
        {showNav && <header className="header"><div className="header-left"><button className="hamburger" onClick={() => setSidebar(true)}><Menu size={20} /></button><img src={assetPath('logo.png')} alt="" className="logo" /><span className="brand">AnimeVault</span></div><span className="badge">v0.2</span></header>}
        <main className="area">{render()}</main>
        {showNav && <nav className="bnav">{NAV.map(item => { const Icon = item.icon; return <button key={item.id} className={`bnav-item ${page === item.id ? 'active' : ''}`} onClick={() => nav(item.id)}><Icon size={18} /><span>{item.label}</span></button>; })}</nav>}
      </div>
    </>
  );
}
