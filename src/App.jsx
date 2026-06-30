
import { useState, useEffect } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon, Info, Home as HomeIcon, Tv as TvIcon,
  AlertTriangle, User, Sparkles, Menu, X, Bell, Download as DownloadIcon, Users, Award
} from 'lucide-react';
import './styles/designTokens.css';
import { useUser } from './api/UserContext';
import { fetchSiteSettings, initDatabase, getSettings } from './api/db';
import { initializeDatabase } from './api/database';
import { applyTheme, applyAccentColor } from './utils/appearance';
import { storage } from './utils/storage';
import { applyTvModeClass } from './utils/tvMode';

import { FocusableNavLink, FocusableLink, FocusableButton } from './components/FocusableWrapper';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Search from './pages/Search';
import AnimeHome from './pages/AnimeHome';
import AnimeDetails from './pages/AnimeDetails';
import MangaHome from './pages/MangaHome';
import MangaDetails from './pages/MangaDetails';
import DramasMovies from './pages/DramasMovies';
import MovieWatch from './pages/MovieWatch';
import About from './pages/About';
import { Contact, FAQ, Terms, Privacy, DMCA, RequestAnime } from './pages/StaticPages';
import Download from './pages/Download';
import NotFound from './pages/NotFound';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import UpdateCenter from './components/UpdateCenter';
import Profile from './pages/Profile';
import RequireAdmin from './components/RequireAdmin';
import AdminDashboard from './pages/AdminDashboard';
import Schedule from './pages/Schedule';
import Collections from './pages/Collections';
import Stats from './pages/Stats';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import SearchModal from './components/SearchModal';
import Community from './pages/Community';
import ForgotPassword from './pages/ForgotPassword';
import SetNewPassword from './pages/SetNewPassword';
import { useReminderNotifications } from './hooks/useReminderNotifications';

function App() {
  useReminderNotifications();
  const { user, setShowAuthModal, setAuthTab } = useUser();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [topbarQuery, setTopbarQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [isReady, setIsReady] = useState(true); // Skip loading screen

  useEffect(() => {
    setIsTvMode(applyTvModeClass());
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        await initializeDatabase();
        try { await initDatabase(); } catch (dbErr) { console.warn('Neon init skipped:', dbErr?.message); }
        const settings = await fetchSiteSettings();
        if (settings?.announcement) setAnnouncement(settings.announcement);
        if (settings?.maintenance === 'true') setMaintenanceMode(true);

        const savedAccent = storage.get('accentColor') || 'red';
        const savedTheme = storage.get('theme') || 'dark';
        const savedCustomVars = storage.get('customThemeVars');
        applyAccentColor(savedAccent);
        applyTheme(savedTheme, savedCustomVars);

      } catch (err) {
        console.error('Failed to load global site settings:', err);
      } finally {
        setIsReady(true);
      }
    }
    loadSettings();
  }, []);

  // Handle responsive base font size scaling to zoom out slightly on mobile
  useEffect(() => {
    function adjustFontSize() {
      const savedFontSizeSetting = storage.get('fontSize') || 'medium';
      const isMobile = window.innerWidth <= 768;
      const sizeMap = isMobile
        ? { small: '12px', medium: '14px', large: '16px' }
        : { small: '14px', medium: '16px', large: '18px' };
      document.documentElement.style.fontSize = sizeMap[savedFontSizeSetting];
    }
    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);
    return () => window.removeEventListener('resize', adjustFontSize);
  }, []);

  // Redirect token from root to SetNewPassword page
  useEffect(() => {
    // HashRouter's location.search only looks *after* the hash (#/?token=...).
    // But emails send links like /?token=... (before the hash).
    // So we must check window.location.search directly.
    const windowParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(location.search);
    const token = windowParams.get('token') || hashParams.get('token');

    if (token && location.pathname !== '/set-new-password') {
      navigate(`/set-new-password?token=${encodeURIComponent(token)}`, { replace: true });
    }

    // Also check for login=true to open the modal
    if (hashParams.get('login') === 'true') {
      setAuthTab('login');
      setShowAuthModal(true);
      // Remove it from the URL so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, setAuthTab, setShowAuthModal]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  useEffect(() => {
    if (location.pathname !== '/search') return;
    const params = new URLSearchParams(location.search);
    setTopbarQuery(params.get('q') || '');
  }, [location.pathname, location.search]);

  function handleTopbarSearch(event) {
    event.preventDefault();
    const trimmedQuery = topbarQuery.trim();
    const params = new URLSearchParams();
    params.set('type', 'ANIME');
    if (trimmedQuery) params.set('q', trimmedQuery);
    navigate(`/search?${params.toString()}`);
  }

  // Loading screen removed; app renders immediately.



  if (maintenanceMode && (!user || !user.is_admin)) {
    console.warn('Maintenance mode active - displaying site normally');
    // Optionally show a banner or notification here
  }


  return (
    <div className={`app-shell ${isTvMode ? 'tv-app-shell' : ''}`}>
      {announcement && (
        <div style={{
          background: 'linear-gradient(90deg, #ff1a75, #ffaa00)',
          color: '#000', fontSize: '0.8rem', fontWeight: '900',
          padding: '8px 20px', textAlign: 'center', letterSpacing: '0.5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)', textShadow: '0 1px 2px rgba(255,255,255,0.3)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
        }}>
          <Sparkles size={14} style={{ animation: 'bannerPulse 1.5s infinite alternate' }} />
          <span>{announcement}</span>
          <style>{`@keyframes bannerPulse { from { transform: scale(1); } to { transform: scale(1.2); } }`}</style>
        </div>
      )}

      {isTvMode && (
        <div className="tv-welcome-strip">
          <span>LG webOS TV mode</span>
          <strong>Use the Magic Remote pointer or arrow keys to browse. Press OK/Enter to select.</strong>
        </div>
      )}

      {/* ... header with hamburger menu ... */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{
            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex'
          }}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <FocusableLink to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="l" style={{ height: 40, width: 'auto' }} />
            <span>AnimeVault</span>
          </FocusableLink>
        </div>

        <nav className="topnav">
          <FocusableNavLink
            to="/"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Home
          </FocusableNavLink>
          <FocusableNavLink
            to="/anime"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Anime
          </FocusableNavLink>
          <FocusableNavLink
            to="/dramas-movies"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Dramas & Movies
          </FocusableNavLink>
          <FocusableNavLink
            to="/schedule"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Schedule
          </FocusableNavLink>
          <FocusableNavLink
            to="/collections"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Collections
          </FocusableNavLink>
          <FocusableNavLink
            to="/community"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Community
          </FocusableNavLink>
          <FocusableNavLink
            to="/stats"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Stats
          </FocusableNavLink>
          <FocusableNavLink
            to="/notifications"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Bell size={16} />
              Notifications
            </div>
          </FocusableNavLink>
          <FocusableNavLink
            to="/download"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <DownloadIcon size={16} />
              Download
            </div>
          </FocusableNavLink>
          {user?.is_admin && (
            <FocusableNavLink
              to="/admin/dashboard"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              style={{ color: '#ffd700' }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Award size={16} />
                Admin
              </div>
            </FocusableNavLink>
          )}
        </nav>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="topbar-search-form"
            onClick={() => setIsSearchOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-color)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <SearchIcon size={18} aria-hidden="true" />
            <span style={{ fontSize: '0.9rem' }}>{isTvMode ? 'Search AnimeVault' : 'Search anime...'}</span>
            {!isTvMode && <kbd style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              marginLeft: 'auto'
            }}>⌘K</kbd>}
          </button>
          {user ? (
            <FocusableLink to={`/profile/${user.id}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px',
              border: '1px solid rgba(255, 26, 117, 0.3)', textDecoration: 'none',
              background: 'rgba(255, 26, 117, 0.08)', color: 'var(--brand-color)',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: '0 0 10px rgba(255, 26, 117, 0.1)'
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 26, 117, 0.18)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 26, 117, 0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 26, 117, 0.08)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 26, 117, 0.1)'; }}>
              <User size={14} />
              <span>{user.username}</span>
            </FocusableLink>
          ) : (
            <FocusableButton onClick={() => { setAuthTab('login'); setShowAuthModal(true); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass)', color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-color)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              <User size={14} />
              <span>Sign In</span>
            </FocusableButton>
          )}
        </div>
      </header>

      {/* Mobile Side Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <FocusableNavLink
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <HomeIcon size={18} />
              <span>Home</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/anime"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              Anime
            </FocusableNavLink>
            <FocusableNavLink
              to="/dramas-movies"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <TvIcon size={18} />
              <span>Dramas & Movies</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/schedule"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              Schedule
            </FocusableNavLink>
            <FocusableNavLink
              to="/collections"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              Collections
            </FocusableNavLink>
            <FocusableNavLink
              to="/community"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <Users size={18} />
              <span>Community</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/stats"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              Stats
            </FocusableNavLink>
            <FocusableNavLink
              to="/notifications"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} />
                <span>Notifications</span>
              </div>
            </FocusableNavLink>
            <FocusableNavLink
              to="/download"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <DownloadIcon size={18} />
                <span>Download</span>
              </div>
            </FocusableNavLink>
            <FocusableNavLink
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
            >
              <Info size={18} />
              <span>About</span>
            </FocusableNavLink>
            {user && (
              <FocusableNavLink
                to={`/profile/${user.id}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}
              >
                <User size={18} />
                <span>Profile</span>
              </FocusableNavLink>
            )}
          </div>
        </div>
      )}

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/anime" element={<AnimeHome />} />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/manga" element={<MangaHome />} />
          <Route path="/manga/:id" element={<MangaDetails />} />
          <Route path="/dramas-movies" element={<DramasMovies />} />
          <Route path="/watch/:type/:id" element={<RequireAuth><MovieWatch /></RequireAuth>} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/collections" element={<RequireAuth><Collections /></RequireAuth>} />
          <Route path="/community" element={<Community />} />
          <Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/dmca" element={<DMCA />} />
          <Route path="/request" element={<RequestAnime />} />
          <Route path="/profile/:userid" element={<Profile />} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-new-password" element={<SetNewPassword />} />
          <Route path="/download" element={<Download />} />
          <Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />

      {/* Premium Bottom Navigation for Mobile Devices */}
      <nav className="bottom-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
        >
          <HomeIcon size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/anime"
          className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>アニメ</span>
          <span>Anime</span>
        </NavLink>
        <NavLink
          to="/dramas-movies"
          className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
        >
          <TvIcon size={20} />
          <span>Dramas</span>
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
        >
          <SearchIcon size={20} />
          <span>Search</span>
        </NavLink>
      </nav>

      {/* Postgres Neon Modals */}
      <AuthModal />
      <UpdateCenter />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}

      <style>{`
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          display: flex;
          justify-content: flex-start;
        }
        .mobile-menu {
          width: 75%;
          max-width: 300px;
          background: rgba(15, 23, 42, 0.98);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .mobile-nav-link {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s ease;
          font-weight: 600;
        }
        .mobile-nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        .mobile-nav-link.active {
          background: rgba(255, 26, 117, 0.15);
          border: 1px solid rgba(255, 26, 117, 0.3);
          color: #ff1a75;
        }
        .hamburger-btn {
          display: none;
        }
        @media (max-width: 1024px) {
          .hamburger-btn {
            display: block;
          }
          .topnav {
            display: none !important;
          }
          .topbar-search-form input {
            display: none;
          }
          .topbar-search-form {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
