import React, { useState, useEffect } from 'react';
import { Home, Search, Film, Calendar, User, Menu, X, Heart, ChevronRight } from 'lucide-react';
import './mobile.css';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import AnimeDetailsPage from './pages/AnimeDetailsPage';
import CollectionsPage from './pages/CollectionsPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import DramaDetailPage from './pages/DramaDetailPage';
import SettingsPage from './pages/SettingsPage';

function Splash() {
  return (
    <div className="splash">
      <img src="/logo.png" alt="AnimeVault" className="splash-logo" />
      <div className="splash-title">AnimeVault</div>
      <div className="splash-sub">Your ultimate anime hub</div>
    </div>
  );
}

function Sidebar({ currentPage, navigate, open, close, user }) {
  const sections = [
    { label: 'Browse', items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'dramas', label: 'Shows & Movies', icon: Film },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
    ]},
    { label: 'Library', items: [
      { id: 'collections', label: 'My List', icon: Heart },
    ]},
  ];

  return (
    <>
      {open && <div className="overlay" onClick={close} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-hdr">
          <div className="sb-col">
            <img src="/logo.png" alt="" className="sb-logo" />
            <span className="sb-title">AnimeVault</span>
          </div>
          <button className="sb-close" onClick={close}><X size={20} /></button>
        </div>
        <nav className="sb-nav">
          {sections.map(s => (
            <div key={s.label}>
              <div className="sb-label">{s.label}</div>
              {s.items.map(item => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button key={item.id} className={`sb-item ${active ? 'active' : ''}`}
                    onClick={() => { navigate(item.id); close(); }}>
                    <Icon size={18} /> {item.label}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="sb-div" />
          <button className={`sb-item ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => { navigate('profile'); close(); }}>
            <User size={18} /> Profile
          </button>
        </nav>
        <div className="sb-foot" onClick={() => { navigate('profile'); close(); }}>
          <img src={user?.avatar || '/logo.png'} alt="" className="sb-av" />
          <div style={{ flex: 1 }}>
            <div className="sb-un">{user?.username || 'Guest'}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>{user ? 'Signed in' : 'Tap to sign in'}</div>
          </div>
          <ChevronRight size={16} color="var(--text3)" />
        </div>
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
  const [page, setPage] = useState('home');
  const [params, setParams] = useState({});
  const [splash, setSplash] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { const t = setTimeout(() => setSplash(true), 1500); return () => clearTimeout(t); }, []);
  useEffect(() => { try { const s = localStorage.getItem('av_mobile_user'); if (s) setUser(JSON.parse(s)); } catch {} }, []);

  const nav = (p, pr = {}) => { setPage(p); setParams(pr); setSidebar(false); };
  const back = () => { setPage('home'); setParams({}); };

  const render = () => {
    switch (page) {
      case 'anime-detail': return <AnimeDetailsPage params={params} goBack={back} />;
      case 'drama-detail': return <DramaDetailPage params={params} goBack={back} />;
      case 'search': return <SearchPage navigate={nav} />;
      case 'collections': return <CollectionsPage navigate={nav} />;
      case 'schedule': return <SchedulePage navigate={nav} />;
      case 'dramas': return <DramasMoviesPage navigate={nav} />;
      case 'settings': return <SettingsPage goBack={back} />;
      case 'profile': return <ProfilePage navigate={nav} onUserChange={setUser} />;
      default: return <HomePage navigate={nav} />;
    }
  };

  const showNav = page !== 'anime-detail' && page !== 'drama-detail';

  return (
    <>
      {!splash && <Splash />}
      <Sidebar currentPage={page} navigate={nav} open={sidebar} close={() => setSidebar(false)} user={user} />
      <div className="app" style={{ opacity: splash ? 1 : 0, transition: 'opacity .4s' }}>
        {showNav && (
          <header className="header">
            <div className="header-left">
              <button className="hamburger" onClick={() => setSidebar(true)}><Menu size={20} /></button>
              <img src="/logo.png" alt="" className="logo" />
              <span className="brand">AnimeVault</span>
            </div>
            <span className="badge">v0.2</span>
          </header>
        )}
        <main className="area">{render()}</main>
        {showNav && (
          <nav className="bnav">
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={`bnav-item ${page === item.id ? 'active' : ''}`} onClick={() => nav(item.id)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}