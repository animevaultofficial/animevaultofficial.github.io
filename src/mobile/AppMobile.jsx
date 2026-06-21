import React, { useState, useEffect } from 'react';
import './mobile.css';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import AnimeDetailPage from './pages/AnimeDetailPage';
import CollectionsPage from './pages/CollectionsPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import DramaDetailPage from './pages/DramaDetailPage';

function SplashScreen() {
  return (
    <div className="splash-screen">
      <img src="/logo.png" alt="AnimeVault" className="splash-logo" />
      <div className="splash-title">AnimeVault</div>
      <div className="splash-subtitle">Your ultimate anime hub</div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'dramas', label: 'Shows', icon: '🎬' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function AppMobile() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  function navigate(page, params = {}) {
    setCurrentPage(page);
    setPageParams(params);
  }

  function goBack() {
    setCurrentPage('home');
    setPageParams({});
  }

  function renderPage() {
    switch (currentPage) {
      case 'detail':
        return <AnimeDetailPage params={pageParams} goBack={goBack} />;
      case 'drama-detail':
        return <DramaDetailPage params={pageParams} goBack={goBack} />;
      case 'search':
        return <SearchPage navigate={navigate} />;
      case 'collections':
        return <CollectionsPage navigate={navigate} />;
      case 'schedule':
        return <SchedulePage navigate={navigate} />;
      case 'dramas':
        return <DramasMoviesPage navigate={navigate} />;
      case 'profile':
        return <ProfilePage navigate={navigate} />;
      case 'home':
      default:
        return <HomePage navigate={navigate} />;
    }
  }

  const showBottomNav = currentPage !== 'detail' && currentPage !== 'drama-detail';

  return (
    <>
      {!splashDone && <SplashScreen />}
      <div className="mobile-app" style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {/* Header - only on non-detail pages */}
        {showBottomNav && (
          <header className="mobile-header">
            <div className="mobile-header-left">
              <img src="/logo.png" alt="AnimeVault" className="mobile-logo" />
              <span className="mobile-brand">AnimeVault</span>
            </div>
            <div className="mobile-header-right">
              <button className="header-icon-btn" onClick={() => navigate('search')}>
                🔍
              </button>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="mobile-content-area">
          {renderPage()}
        </main>

        {/* Bottom Navigation */}
        {showBottomNav && (
          <nav className="bottom-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`bottom-nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}