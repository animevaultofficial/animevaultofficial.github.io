import React, { useState, useEffect } from 'react';
import { Home, Search, Film, Calendar, User, Menu, X, Heart, Clock, Sparkles, Tv, BookOpen, Info, LogOut, ChevronRight } from 'lucide-react';
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

function SplashScreen() {
  return (
    <div className="splash-screen">
      <img src="/logo.png" alt="AnimeVault" className="splash-logo" />
      <div className="splash-title">AnimeVault</div>
      <div className="splash-subtitle">Your ultimate anime hub</div>
    </div>
  );
}

// ── Sidebar content ──────────────────────────────────────
function Sidebar({ currentPage, navigate, sidebarOpen, closeSidebar, user, onLogout }) {
  const mainLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'dramas', label: 'Shows & Movies', icon: Film },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];
  const libraryLinks = [
    { id: 'collections', label: 'My List', icon: Heart },
  ];
  const bottomLinks = [
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderLink = (item) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        onClick={() => { navigate(item.id); closeSidebar(); }}
      >
        <span className="sidebar-item-icon"><Icon size={18} /></span>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="AnimeVault" className="sidebar-logo" />
            <span className="sidebar-title">AnimeVault</span>
          </div>
          <button className="sidebar-close" onClick={closeSidebar}><X size={20} /></button>
        </div>

        <nav className="sidebar-nav">
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '0.5rem 0.75rem' }}>Browse</div>
          {mainLinks.map(renderLink)}

          <div className="sidebar-divider" />
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '0.5rem 0.75rem' }}>Library</div>
          {libraryLinks.map(renderLink)}

          <div className="sidebar-divider" />
          {bottomLinks.map(renderLink)}
        </nav>

        <div className="sidebar-footer" onClick={() => { navigate('profile'); closeSidebar(); }}>
          <img src={user?.avatar || '/logo.png'} alt="" className="sidebar-avatar" />
          <div style={{ flex: 1 }}>
            <div className="sidebar-username">{user?.username || 'Guest'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{user ? 'Signed in' : 'Tap to sign in'}</div>
          </div>
          <ChevronRight size={16} color="var(--text3)" />
        </div>
      </aside>
    </>
  );
}

// ── Bottom Nav Items ─────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'dramas', label: 'Shows', icon: Film },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function AppMobile() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});
  const [splashDone, setSplashDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('av_mobile_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  function navigate(page, params = {}) { setCurrentPage(page); setPageParams(params); setSidebarOpen(false); }
  function goBack() { setCurrentPage('home'); setPageParams({}); }

  function renderPage() {
    switch (currentPage) {
      case 'anime-detail': return <AnimeDetailsPage params={pageParams} goBack={goBack} />;
      case 'drama-detail': return <DramaDetailPage params={pageParams} goBack={goBack} />;
      case 'search': return <SearchPage navigate={navigate} />;
      case 'collections': return <CollectionsPage navigate={navigate} />;
      case 'schedule': return <SchedulePage navigate={navigate} />;
      case 'dramas': return <DramasMoviesPage navigate={navigate} />;
      case 'settings': return <SettingsPage goBack={goBack} />;
      case 'profile': return <ProfilePage navigate={navigate} onUserChange={setUser} />;
      case 'home':
      default: return <HomePage navigate={navigate} />;
    }
  }

  const showNav = currentPage !== 'anime-detail' && currentPage !== 'drama-detail';

  return (
    <>
      {!splashDone && <SplashScreen />}
      <Sidebar currentPage={currentPage} navigate={navigate} sidebarOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} user={user} />
      
      <div className="mobile-app" style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {showNav && (
          <header className="mobile-header">
            <div className="mobile-header-left">
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <img src="/logo.png" alt="" className="mobile-logo" />
              <span className="mobile-brand">AnimeVault</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--brand)', fontSize: '0.65rem', fontWeight: 700, background: 'var(--brand-dim)', padding: '3px 8px', borderRadius: 6 }}>v0.2</span>
            </div>
          </header>
        )}

        <main className="mobile-content-area">{renderPage()}</main>

        {showNav && (
          <nav className="bottom-nav">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={`bottom-nav-item ${currentPage === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
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