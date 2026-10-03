import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Home as HomeIcon, PlayCircle, Tv as TvIcon, Menu, X, Bell, Download as DownloadIcon, Users, Award, BookOpen, User, CalendarDays, BarChart3, Library, Settings as SettingsIcon, Info, MessageSquare, MoreVertical } from 'lucide-react';
import './styles/designTokens.css';
import './styles/header.css';
import { useUser } from './api/UserContext';
import { applyTheme, applyAccentColor } from './utils/appearance';
import { storage } from './utils/storage';
import { applyTvModeClass } from './utils/tvMode';
import { assetPath } from './utils/assetPath';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import Footer from './components/Footer';
import { useReminderNotifications } from './hooks/useReminderNotifications';

const MixedHome = lazy(() => import('./pages/MixedHome'));
const Search = lazy(() => import('./pages/Search'));
const AnimeWatch = lazy(() => import('./pages/AnimeWatch'));
const AnimeDetails = lazy(() => import('./pages/AnimeDetails'));
const AnimeHome = lazy(() => import('./pages/AnimeHome'));
const AnnouncementPopup = lazy(() => import('./components/AnnouncementPopup'));
const MangaHome = lazy(() => import('./pages/MangaHome'));
const MangaDetails = lazy(() => import('./pages/MangaDetails'));
const DramasMovies = lazy(() => import('./pages/DramasMovies'));
const MovieWatch = lazy(() => import('./pages/MovieWatch'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const About = lazy(() => import('./pages/About'));
const StaticPages = lazy(() => import('./pages/StaticPageRoute'));
const Download = lazy(() => import('./pages/Download'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Collections = lazy(() => import('./pages/Collections'));
const Stats = lazy(() => import('./pages/Stats'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Community = lazy(() => import('./pages/Community'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const SetNewPassword = lazy(() => import('./pages/SetNewPassword'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const UpdateCenter = lazy(() => import('./components/UpdateCenter'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const SubAccountGate = lazy(() => import('./components/SubAccountGate'));

function RouteFallback() { return <div className="route-loading" role="status" aria-live="polite"><span className="loading-dot" /> Loading…</div>; }

const primaryNav = [
  ['/', 'Home', HomeIcon], ['/anime', 'Anime', PlayCircle], ['/manga', 'Manga', BookOpen],
  ['/dramas-movies', 'Dramas & Movies', TvIcon], ['/schedule', 'Schedule', CalendarDays],
  ['/collections', 'Collections', Library], ['/community', 'Community', Users], ['/stats', 'Stats', BarChart3],
  ['/notifications', 'Notifications', Bell], ['/download', 'Download', DownloadIcon],
];

const referenceNav = [
  ['/', 'Home'],
  ['/anime', 'Browse'],
  ['/schedule', 'Latest'],
  ['/anime', 'Genres'],
  ['/manga', 'Manga'],
  ['/collections', 'Library'],
  ['/community', 'Community'],
  ['/community', 'Watch Together'],
];

function App() {
  useReminderNotifications();
  const { user, authLoading, setShowAuthModal, setAuthTab, activeSubAccount, subAccounts } = useUser();
  const activeSubAccountIndex = activeSubAccount ? subAccounts.findIndex(profile => profile.id === activeSubAccount.id) : -1;
  const activeSubAccountRouteId = activeSubAccount ? (activeSubAccountIndex >= 0 ? String(activeSubAccountIndex + 1) : encodeURIComponent(activeSubAccount.id)) : null;
  const ownProfilePath = user ? `/profile/${user.id}${activeSubAccountRouteId ? `/sub=${activeSubAccountRouteId}` : ''}` : '/profile';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isAnimeDetailsPage = /^\/anime\/[^/]+$/.test(location.pathname);
  const isMediaDetailsPage = /^\/media\/(?:movie|tv|series)\/[^/]+$/.test(location.pathname);
  const isAnimePlayerPage = /^\/anime\/[^/]+\/watch$/.test(location.pathname);
  const isMoviePlayerPage = /^\/watch\/(?:movie|tv|series)\/[^/]+$/.test(location.pathname);
  const isPlayerPage = isAnimePlayerPage || isMoviePlayerPage;

  useEffect(() => { setIsTvMode(applyTvModeClass()); }, []);

  useEffect(() => {
    applyAccentColor(storage.get('accentColor') || 'red');
    applyTheme(storage.get('theme') || 'dark', storage.get('customThemeVars'));
  }, []);

  useEffect(() => { void import('./pages/MixedHome'); }, []);

  useEffect(() => {
    const windowParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(location.search);
    const token = windowParams.get('token') || hashParams.get('token');
    if (token && location.pathname !== '/set-new-password') navigate(`/set-new-password?token=${encodeURIComponent(token)}`, { replace: true });
    if (hashParams.get('login') === 'true') {
      setAuthTab('login'); setShowAuthModal(true); navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, setAuthTab, setShowAuthModal]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setIsSearchOpen(true); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const openLogin = () => { setAuthTab('login'); setShowAuthModal(true); setIsMobileMenuOpen(false); };
  const closeAuthAndMenu = () => { setShowAuthModal(false); setIsMobileMenuOpen(false); };

  return <Suspense fallback={<RouteFallback />}><SubAccountGate><div className={`app-shell ${isTvMode ? 'tv-app-shell' : ''} ${isHomePage ? 'home-route' : ''} ${isAnimeDetailsPage ? 'anime-details-route' : ''} ${isAnimePlayerPage ? 'anime-player-route' : ''} ${isMoviePlayerPage ? 'movie-player-route' : ''}`}>
    {isTvMode && <div className="tv-welcome-strip"><span>LG webOS TV mode</span><strong>Use the Magic Remote pointer or arrow keys to browse. Press OK/Enter to select.</strong></div>}

    <header className={`topbar topbar-reference ${isAnimeDetailsPage ? 'topbar-anime-details' : ''} ${isPlayerPage ? 'topbar-player' : ''}`}>
      <div className="topbar-brand-wrap">
        <Link to="/" className="brand" aria-label="AnimeVault home" onClick={closeAuthAndMenu}><img src={assetPath('logo.png')} alt="" />{isPlayerPage && <span className="player-brand-name">AnimeVault</span>}</Link>
      </div>
      <nav className="topnav topnav-reference" aria-label="Primary navigation">{referenceNav.map(([to, label]) => <NavLink key={label} to={to} end={to === '/'} onClick={closeAuthAndMenu} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}</nav>
      <div className="topbar-actions">
        <Link to="/community" className="topbar-icon-action" aria-label="Community messages" onClick={closeAuthAndMenu}><MessageSquare size={16} /></Link>
        <button className="topbar-search-form" type="button" aria-label="Open search" onClick={() => { closeAuthAndMenu(); setIsSearchOpen(true); }}><SearchIcon size={17} /><span>Search anime...</span><kbd>⌘K</kbd></button>
        <button className="hamburger-btn topbar-menu-button" type="button" aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-controls="mobile-navigation" aria-expanded={isMobileMenuOpen} onClick={() => { setShowAuthModal(false); setIsMobileMenuOpen(value => !value); }}>
          {isMobileMenuOpen ? <X size={18} /> : <MoreVertical size={18} />}
        </button>
        {user ? <Link to={ownProfilePath} onClick={closeAuthAndMenu} className="header-profile"><User size={15} /><span>{user.username}</span></Link> : authLoading ? <div className="session-status">Checking session...</div> : <button type="button" onClick={openLogin} className="header-signin"><User size={14} /><span>Sign in</span></button>}
      </div>
    </header>

    {isMobileMenuOpen && <>
      <div className="mobile-menu-overlay" role="presentation" onClick={() => setIsMobileMenuOpen(false)} />
      <aside id="mobile-navigation" className="mobile-menu" aria-label="Mobile navigation">
        <div className="mobile-menu-header"><div className="mobile-menu-title"><img src={assetPath('logo.png')} alt="" aria-hidden="true" /><div><strong>AnimeVault</strong><span>Navigation</span></div></div><button className="mobile-menu-close" type="button" aria-label="Close navigation menu" onClick={() => setIsMobileMenuOpen(false)}><X size={22} /></button></div>
        <div className="mobile-menu-links">{primaryNav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>{Icon && <Icon size={18} />}<span>{label}</span></NavLink>)}<NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}><Info size={18} /><span>About</span></NavLink>{user?.is_admin && <NavLink to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active admin-link' : 'mobile-nav-link admin-link'}><Award size={18} /><span>Admin Dashboard</span></NavLink>}</div>
        <div className="mobile-menu-account">{user ? <Link to={ownProfilePath} onClick={() => setIsMobileMenuOpen(false)} className="mobile-account-link"><User size={18} /><span><strong>{user.username}</strong><small>View profile</small></span></Link> : !authLoading && <button type="button" onClick={openLogin} className="mobile-account-link"><User size={18} /><span>Sign In</span></button>}{user && <NavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="mobile-account-link"><SettingsIcon size={18} /><span>Settings</span></NavLink>}</div>
      </aside>
    </>}

    <main className={`content ${isHomePage ? 'content-home' : ''} ${isAnimeDetailsPage ? 'content-anime-details' : ''} ${isMediaDetailsPage ? 'content-media-details' : ''}`}><Routes>
      <Route path="/" element={<MixedHome />} /><Route path="/search" element={<Search />} /><Route path="/anime" element={<AnimeHome />} /><Route path="/anime/:id" element={<AnimeDetails />} /><Route path="/anime/:id/watch" element={<RequireAuth><AnimeWatch /></RequireAuth>} /><Route path="/manga" element={<MangaHome />} /><Route path="/manga/:id" element={<MangaDetails />} /><Route path="/dramas-movies" element={<DramasMovies />} /><Route path="/media/:type/:id" element={<MovieDetails />} /><Route path="/watch/:type/:id" element={<RequireAuth><MovieWatch /></RequireAuth>} /><Route path="/schedule" element={<Schedule />} /><Route path="/collections" element={<RequireAuth><Collections /></RequireAuth>} /><Route path="/community" element={<Community />} /><Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} /><Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} /><Route path="/about" element={<About />} /><Route path="/contact" element={<StaticPages page="contact" />} /><Route path="/faq" element={<StaticPages page="faq" />} /><Route path="/terms" element={<StaticPages page="terms" />} /><Route path="/privacy" element={<StaticPages page="privacy" />} /><Route path="/dmca" element={<StaticPages page="dmca" />} /><Route path="/request" element={<StaticPages page="request" />} /><Route path="/profile/:userid/*" element={<Profile />} /><Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/set-new-password" element={<SetNewPassword />} /><Route path="/download" element={<Download />} /><Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} /><Route path="*" element={<NotFound />} />
    </Routes></main>{!isPlayerPage && <Footer />}
    {!isAnimeDetailsPage && !isPlayerPage && <nav className="bottom-nav" aria-label="Mobile quick navigation"><NavLink to="/" end className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><HomeIcon size={20} /><span>Home</span></NavLink><NavLink to="/dramas-movies" className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><TvIcon size={20} /><span>Dramas</span></NavLink><NavLink to="/search" className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><SearchIcon size={20} /><span>Search</span></NavLink></nav>}
    <AuthModal /><UpdateCenter />{!isPlayerPage && <AnnouncementPopup />}{isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
    <style>{`
      .topbar-brand-wrap{display:flex;align-items:center;gap:.65rem;min-width:0;flex:0 0 auto}.topbar .brand{display:flex;align-items:center;gap:.65rem;min-width:0;white-space:nowrap}.topbar .brand img{height:34px;width:auto;display:block;flex:0 0 auto}.topbar .brand span{font-weight:900}.hamburger-btn{display:none;align-items:center;justify-content:center;background:transparent!important;border:1px solid transparent!important;color:#fff;cursor:pointer;padding:.45rem;border-radius:10px;flex:0 0 auto}.hamburger-btn:hover,.hamburger-btn:focus-visible{background:var(--white-05)!important;border-color:var(--white-10)!important}.header-profile{display:inline-flex;align-items:center;gap:.4rem;min-width:0;max-width:150px;white-space:nowrap;overflow:hidden}.header-profile span{overflow:hidden;text-overflow:ellipsis}.session-status{font-size:.78rem;color:var(--text-secondary);white-space:nowrap}.route-loading{min-height:35vh;display:grid;place-items:center;color:var(--text-secondary)}.loading-dot{width:9px;height:9px;border-radius:50%;background:var(--brand-color);box-shadow:0 0 18px rgba(255,26,117,.55)}
      .mobile-menu-overlay{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.68);backdrop-filter:blur(3px)}.mobile-menu{position:fixed;inset:0 auto 0 0;z-index:1000;width:min(86vw,350px);height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:rgba(10,16,25,.985);border-right:1px solid var(--white-10);box-shadow:24px 0 70px rgba(0,0,0,.45);animation:mobileNavIn .18s ease-out}.mobile-menu-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1rem .85rem;border-bottom:1px solid var(--white-10);flex:0 0 auto}.mobile-menu-title{display:flex;align-items:center;gap:.7rem;min-width:0}.mobile-menu-title img{width:34px;height:34px;object-fit:contain}.mobile-menu-title div{display:flex;flex-direction:column;min-width:0}.mobile-menu-title strong{font-size:1rem}.mobile-menu-title span{font-size:.72rem;color:var(--text-tertiary)}.mobile-menu-close{display:flex;align-items:center;justify-content:center;padding:.5rem;border-radius:9px;background:var(--white-05);border:1px solid var(--white-10);color:#fff;cursor:pointer}.mobile-menu-links{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:.7rem .65rem;display:flex;flex-direction:column;gap:.2rem;touch-action:pan-y}.mobile-nav-link{display:flex;align-items:center;gap:.8rem;padding:.75rem .8rem;border-radius:10px;color:var(--text-secondary);text-decoration:none;font-weight:650;min-height:44px}.mobile-nav-link:hover{background:var(--white-05);color:#fff}.mobile-nav-link.active{background:rgba(255,26,117,.13);color:var(--brand-color)}.mobile-nav-link.admin-link{margin-top:.45rem;border-top:1px solid var(--white-10);border-radius:0 0 10px 10px;padding-top:1rem}.mobile-menu-account{flex:0 0 auto;border-top:1px solid var(--white-10);padding:.65rem;display:flex;flex-direction:column;gap:.25rem;padding-bottom:calc(.65rem + env(safe-area-inset-bottom))}.mobile-account-link{display:flex!important;align-items:center;gap:.75rem;width:100%;padding:.75rem .8rem;border-radius:10px;color:var(--text-secondary);text-decoration:none;min-height:44px}.mobile-account-link:hover{background:var(--white-05);color:#fff}.mobile-account-link span{display:flex;flex-direction:column;min-width:0}.mobile-account-link small{color:var(--text-tertiary);font-size:.7rem}@keyframes mobileNavIn{from{transform:translateX(-18px);opacity:.7}to{transform:translateX(0);opacity:1}}
      @media(max-width:1180px){.hamburger-btn{display:flex!important}.topnav{display:none!important}.topbar{padding:.55rem .8rem;max-width:100%;overflow:visible}.topbar-actions{gap:.45rem;min-width:0}.topbar-actions>a span,.topbar-actions>button span,.topbar-actions kbd,.session-status{display:none!important}.topbar-search-form{padding:.55rem!important}.content{width:100%;max-width:100%;padding:1rem .9rem 5rem;overflow:visible}.app-shell{width:100%;max-width:100vw;overflow-x:hidden}.home-v2,.home-main-v2,.section-v2,.trending-grid-v2,.anime-grid-v2{min-width:0;max-width:100%}.hero-v2{max-width:100%;overflow:hidden}}
      @media(max-width:600px){html,body,#root{width:100%;min-width:0;max-width:100%;height:auto;min-height:100%;overflow-x:hidden;overflow-y:auto!important}body{overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-y}.content{padding:.65rem .55rem 5.5rem;touch-action:pan-y}.app-shell{min-height:100dvh;overflow-x:hidden;touch-action:pan-y}.home-v2,.home-main-v2,.section-v2{touch-action:pan-y}.topbar{min-height:54px}.topbar .brand img{height:30px}.topbar .brand span{font-size:.9rem}.bottom-nav{display:flex!important;position:fixed;left:0;right:0;bottom:0;z-index:90;padding-bottom:env(safe-area-inset-bottom)}.home-v2{gap:1rem}.hero-v2,.anime-hero-carousel{height:min(430px,68svh)!important;min-height:330px!important;border-radius:12px}.hero-content-v2{padding:1rem!important}.hero-title-v2{font-size:clamp(1.45rem,7vw,2.2rem)!important;line-height:1.05}.hero-desc-v2{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-btns-v2{flex-wrap:wrap}.section-header-v2{align-items:flex-start!important;flex-wrap:wrap}.section-header-v2>div{min-width:0}.section-header-v2 h2{font-size:1.25rem!important}.trending-grid-v2,.anime-grid-v2{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.65rem!important}.anime-card-v2{min-width:0!important;max-width:100%;overflow:hidden}.card-media,.card-image-wrapper-v2{width:100%;min-width:0}.card-media img,.card-image-v2{width:100%;height:auto;aspect-ratio:2/3;object-fit:cover}.seasonal-controls-v2{display:flex;flex-wrap:wrap;gap:.4rem}.seasonal-controls-v2 select{max-width:46vw}.mobile-menu{width:min(88vw,350px)}.mobile-menu-overlay{touch-action:auto}.site-announcement,.tv-welcome-strip{max-width:100%;overflow:hidden}.site-announcement span{white-space:normal}.topbar-search-form{flex:0 0 auto}.footer{max-width:100%;overflow:hidden}}
    `}</style>
  </div></SubAccountGate></Suspense>;
}
export default App;