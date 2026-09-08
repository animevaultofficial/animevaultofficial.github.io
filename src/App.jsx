import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Home as HomeIcon, Tv as TvIcon, Menu, X, Bell, Download as DownloadIcon, Users, Award, BookOpen, User } from 'lucide-react';
import './styles/designTokens.css';
import { useUser } from './api/UserContext';
import { fetchSiteSettings, initDatabase } from './api/db';
import { applyTheme, applyAccentColor } from './utils/appearance';
import { storage } from './utils/storage';
import { applyTvModeClass } from './utils/tvMode';
import { assetPath } from './utils/assetPath';
import { FocusableNavLink, FocusableLink, FocusableButton } from './components/FocusableWrapper';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import Footer from './components/Footer';
import { useReminderNotifications } from './hooks/useReminderNotifications';

const MixedHome = lazy(() => import('./pages/MixedHome'));
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const AnimeDetails = lazy(() => import('./pages/AnimeDetails'));
const MangaHome = lazy(() => import('./pages/MangaHome'));
const MangaDetails = lazy(() => import('./pages/MangaDetails'));
const DramasMovies = lazy(() => import('./pages/DramasMovies'));
const MovieWatch = lazy(() => import('./pages/MovieWatch'));
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
const ProfileModal = lazy(() => import('./components/ProfileModal'));
const UpdateCenter = lazy(() => import('./components/UpdateCenter'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const SubAccountGate = lazy(() => import('./components/SubAccountGate'));

function RouteFallback() { return <div className="route-loading" role="status" aria-live="polite"><span className="loading-dot" /> Loading…</div>; }

function App() {
  useReminderNotifications();
  const { user, authLoading, setShowAuthModal, setAuthTab, activeSubAccount, subAccounts } = useUser();
  const activeSubAccountIndex = activeSubAccount ? subAccounts.findIndex(profile => profile.id === activeSubAccount.id) : -1;
  const activeSubAccountRouteId = activeSubAccount ? (activeSubAccountIndex >= 0 ? String(activeSubAccountIndex + 1) : encodeURIComponent(activeSubAccount.id)) : null;
  const ownProfilePath = user ? `/profile/${user.id}${activeSubAccountRouteId ? `/sub=${activeSubAccountRouteId}` : ''}` : '/profile';
  const [isProfileOpen, setIsProfileOpen] = useState(false), [announcement, setAnnouncement] = useState(''), [maintenanceMode, setMaintenanceMode] = useState(false), [topbarQuery, setTopbarQuery] = useState(''), [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false), [isSearchOpen, setIsSearchOpen] = useState(false), [isTvMode, setIsTvMode] = useState(false);
  const navigate = useNavigate(), location = useLocation();

  useEffect(() => { setIsTvMode(applyTvModeClass()); }, []);
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const settings = await fetchSiteSettings().catch(() => null);
        if (cancelled) return;
        if (settings?.announcement) setAnnouncement(settings.announcement);
        if (settings?.maintenance === 'true') setMaintenanceMode(true);
        applyAccentColor(storage.get('accentColor') || 'red');
        applyTheme(storage.get('theme') || 'dark', storage.get('customThemeVars'));
        void initDatabase().catch(() => {});
      } catch (err) { if (!cancelled) console.warn('Global settings load skipped:', err?.message); }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { void import('./pages/MixedHome'); }, []);
  useEffect(() => {
    const windowParams = new URLSearchParams(window.location.search), hashParams = new URLSearchParams(location.search);
    const token = windowParams.get('token') || hashParams.get('token');
    if (token && location.pathname !== '/set-new-password') navigate(`/set-new-password?token=${encodeURIComponent(token)}`, { replace: true });
    if (hashParams.get('login') === 'true') { setAuthTab('login'); setShowAuthModal(true); navigate(location.pathname, { replace: true }); }
  }, [location.search, location.pathname, navigate, setAuthTab, setShowAuthModal]);
  useEffect(() => { const handleKeyDown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsSearchOpen(true); } }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, []);
  useEffect(() => { if (location.pathname !== '/search') return; const params = new URLSearchParams(location.search); setTopbarQuery(params.get('q') || ''); }, [location.pathname, location.search]);
  function handleTopbarSearch(event) { event.preventDefault(); const trimmedQuery = topbarQuery.trim(), params = new URLSearchParams(); params.set('type', 'ANIME'); if (trimmedQuery) params.set('q', trimmedQuery); navigate(`/search?${params.toString()}`); }

  return <Suspense fallback={<RouteFallback />}><SubAccountGate><div className={`app-shell ${isTvMode ? 'tv-app-shell' : ''}`}>
    {announcement && <div className="site-announcement"><span>{announcement}</span></div>}
    {isTvMode && <div className="tv-welcome-strip"><span>LG webOS TV mode</span><strong>Use the Magic Remote pointer or arrow keys to browse. Press OK/Enter to select.</strong></div>}
    <header className="topbar">
      <div className="topbar-brand-wrap"><button className="hamburger-btn" aria-label="Open menu" aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(v => !v)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button><FocusableLink to="/" className="brand"><img src={assetPath('logo.png')} alt="AnimeVault" /><span>AnimeVault</span></FocusableLink></div>
      <nav className="topnav">{[['/','Home',HomeIcon],['/anime','Anime',null],['/manga','Manga',BookOpen],['/dramas-movies','Dramas & Movies',TvIcon],['/schedule','Schedule',null],['/collections','Collections',null],['/community','Community',Users],['/stats','Stats',null],['/notifications','Notifications',Bell],['/download','Download',DownloadIcon]].map(([to,label,Icon]) => <FocusableNavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{Icon && <Icon size={16} />} {label}</FocusableNavLink>)}{user?.is_admin && <FocusableNavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Award size={16} /> Admin</FocusableNavLink>}</nav>
      <div className="topbar-actions"><button className="topbar-search-form" aria-label="Search anime" onClick={() => setIsSearchOpen(true)}><SearchIcon size={18} /><span>Search anime...</span><kbd>⌘K</kbd></button>{user ? <FocusableLink to={ownProfilePath}><User size={14} /><span>{user.username}</span></FocusableLink> : authLoading ? <div>Checking session...</div> : <FocusableButton onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}><User size={14} /><span>Sign In</span></FocusableButton>}</div>
    </header>
    {isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}><div className="mobile-menu" onClick={e => e.stopPropagation()}>{[['/','Home'],['/anime','Anime'],['/manga','Manga'],['/dramas-movies','Dramas & Movies'],['/schedule','Schedule'],['/collections','Collections'],['/community','Community'],['/stats','Stats'],['/notifications','Notifications'],['/download','Download'],['/about','About']].map(([to,label]) => <FocusableNavLink key={to} to={to} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>{label}</FocusableNavLink>)}</div></div>}
    <main className="content"><Routes>
      <Route path="/" element={<MixedHome />} /><Route path="/search" element={<Search />} /><Route path="/anime" element={<Home />} /><Route path="/anime/:id" element={<AnimeDetails />} /><Route path="/manga" element={<MangaHome />} /><Route path="/manga/:id" element={<MangaDetails />} /><Route path="/dramas-movies" element={<DramasMovies />} /><Route path="/watch/:type/:id" element={<RequireAuth><MovieWatch /></RequireAuth>} /><Route path="/schedule" element={<Schedule />} /><Route path="/collections" element={<RequireAuth><Collections /></RequireAuth>} /><Route path="/community" element={<Community />} /><Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} /><Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} /><Route path="/about" element={<About />} /><Route path="/contact" element={<StaticPages page="contact" />} /><Route path="/faq" element={<StaticPages page="faq" />} /><Route path="/terms" element={<StaticPages page="terms" />} /><Route path="/privacy" element={<StaticPages page="privacy" />} /><Route path="/dmca" element={<StaticPages page="dmca" />} /><Route path="/request" element={<StaticPages page="request" />} /><Route path="/profile/:userid/*" element={<Profile />} /><Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/set-new-password" element={<SetNewPassword />} /><Route path="/download" element={<Download />} /><Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} /><Route path="*" element={<NotFound />} />
    </Routes></main>
    <Footer /><nav className="bottom-nav"><NavLink to="/" end className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><HomeIcon size={20} /><span>Home</span></NavLink><NavLink to="/anime" className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><span style={{ fontSize: '.8rem', fontWeight: 'bold' }}>アニメ</span><span>Anime</span></NavLink><NavLink to="/dramas-movies" className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><TvIcon size={20} /><span>Dramas</span></NavLink><NavLink to="/search" className={({ isActive }) => isActive ? 'bottom-nav-link active' : 'bottom-nav-link'}><SearchIcon size={20} /><span>Search</span></NavLink></nav>
    {isProfileOpen && <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />}<AuthModal /><UpdateCenter />{isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
    <style>{`.topbar-brand-wrap{display:flex;align-items:center;gap:1rem;min-width:0}.topbar .brand{display:flex;align-items:center;gap:.75rem;min-width:0}.topbar .brand img{height:40px;width:auto;display:block}.hamburger-btn{display:none;background:transparent!important;border:0!important;color:#fff;cursor:pointer;padding:.35rem;flex:0 0 auto}.route-loading{min-height:35vh;display:grid;place-items:center;color:var(--text-secondary)}.loading-dot{width:9px;height:9px;border-radius:50%;background:var(--brand-color);box-shadow:0 0 18px rgba(255,26,117,.55)}@media(max-width:1024px){.hamburger-btn{display:flex!important}.topnav{display:none!important}.topbar{padding:.5rem .75rem;max-width:100%;overflow:visible}.topbar-actions{gap:.5rem;min-width:0}.topbar-actions>a span,.topbar-actions>button span,.topbar-actions kbd{display:none!important}.topbar-search-form{padding:.55rem!important}.content{width:100%;max-width:100%;padding:1rem .9rem 5rem;overflow:visible}.app-shell{width:100%;max-width:100vw;overflow-x:hidden}.home-v2,.home-main-v2,.section-v2,.trending-grid-v2,.anime-grid-v2{min-width:0;max-width:100%}.hero-v2{max-width:100%;overflow:hidden}.mobile-menu-overlay{touch-action:auto;overscroll-behavior:none}.mobile-menu{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}}@media(max-width:600px){html,body,#root{width:100%;min-width:0;max-width:100%;height:auto;min-height:100%;overflow-x:hidden;overflow-y:auto!important}body{overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-y}.content{padding:.65rem .55rem 5.5rem;touch-action:pan-y}.app-shell{min-height:100dvh;overflow-x:hidden;touch-action:pan-y}.home-v2,.home-main-v2,.section-v2{touch-action:pan-y}.topbar .brand img{height:32px}.topbar .brand span{font-size:.9rem}.bottom-nav{display:flex!important;position:fixed;left:0;right:0;bottom:0;z-index:90;padding-bottom:env(safe-area-inset-bottom)}.home-v2{gap:1rem}.hero-v2,.anime-hero-carousel{height:min(430px,68svh)!important;min-height:330px!important;border-radius:12px}.hero-content-v2{padding:1rem!important}.hero-title-v2{font-size:clamp(1.45rem,7vw,2.2rem)!important;line-height:1.05}.hero-desc-v2{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-btns-v2{flex-wrap:wrap}.section-header-v2{align-items:flex-start!important;flex-wrap:wrap}.section-header-v2>div{min-width:0}.section-header-v2 h2{font-size:1.25rem!important}.trending-grid-v2,.anime-grid-v2{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.65rem!important}.anime-card-v2{min-width:0!important;max-width:100%;overflow:hidden}.card-media,.card-image-wrapper-v2{width:100%;min-width:0}.card-media img,.card-image-v2{width:100%;height:auto;aspect-ratio:2/3;object-fit:cover}.seasonal-controls-v2{display:flex;flex-wrap:wrap;gap:.4rem}.seasonal-controls-v2 select{max-width:46vw}.mobile-menu-overlay{position:fixed;inset:0;z-index:1000;display:flex;background:rgba(0,0,0,.7);touch-action:auto}.mobile-menu{height:100%;width:min(82vw,320px);overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;gap:.4rem;background:rgba(15,23,42,.98);overscroll-behavior:contain;touch-action:pan-y}.site-announcement,.tv-welcome-strip{max-width:100%;overflow:hidden}.site-announcement span{white-space:normal}.topbar-search-form{flex:0 0 auto}.footer{max-width:100%;overflow:hidden}}`}</style>
  </div></SubAccountGate></Suspense>;
}
export default App;
