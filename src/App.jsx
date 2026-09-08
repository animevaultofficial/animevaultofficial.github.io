import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Info, Home as HomeIcon, Tv as TvIcon, AlertTriangle, User, Sparkles, Menu, X, Bell, Download as DownloadIcon, Users, Award, BookOpen } from 'lucide-react';
import './styles/designTokens.css';
import { useUser } from './api/UserContext';
import { fetchSiteSettings, initDatabase } from './api/db';
import { applyTheme, applyAccentColor } from './utils/appearance';
import { storage } from './utils/storage';
import { applyTvModeClass } from './utils/tvMode';
import { assetPath } from './utils/assetPath';
import { FocusableNavLink, FocusableLink, FocusableButton } from './components/FocusableWrapper';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import MixedHome from './pages/MixedHome';
import Search from './pages/Search';
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
import SubAccountGate from './components/SubAccountGate';
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
  const { user, authLoading, activeSubAccount, subAccounts, setShowAuthModal, setAuthTab } = useUser();
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
        // Database schema initialization is maintenance work, never a render prerequisite.
        void initDatabase().catch(() => {});
      } catch (err) { if (!cancelled) console.warn('Global settings load skipped:', err?.message); }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const windowParams = new URLSearchParams(window.location.search), hashParams = new URLSearchParams(location.search);
    const token = windowParams.get('token') || hashParams.get('token');
    if (token && location.pathname !== '/set-new-password') navigate(`/set-new-password?token=${encodeURIComponent(token)}`, { replace: true });
    if (hashParams.get('login') === 'true') { setAuthTab('login'); setShowAuthModal(true); navigate(location.pathname, { replace: true }); }
  }, [location.search, location.pathname, navigate, setAuthTab, setShowAuthModal]);
  useEffect(() => { const handleKeyDown = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); } }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, []);
  useEffect(() => { if (location.pathname !== '/search') return; const params = new URLSearchParams(location.search); setTopbarQuery(params.get('q') || ''); }, [location.pathname, location.search]);
  function handleTopbarSearch(event) { event.preventDefault(); const trimmedQuery = topbarQuery.trim(), params = new URLSearchParams(); params.set('type', 'ANIME'); if (trimmedQuery) params.set('q', trimmedQuery); navigate(`/search?${params.toString()}`); }

  return <SubAccountGate><div className={`app-shell ${isTvMode ? 'tv-app-shell' : ''}`}>
    {announcement && <div className="site-announcement"><span>{announcement}</span></div>}
    {isTvMode && <div className="tv-welcome-strip"><span>LG webOS TV mode</span><strong>Use the Magic Remote pointer or arrow keys to browse. Press OK/Enter to select.</strong></div>}
    <header className="topbar">
      <div style={{display:'flex',alignItems:'center',gap:'1rem'}}><button className="hamburger-btn" aria-label="Open menu" aria-expanded={isMobileMenuOpen} onClick={()=>setIsMobileMenuOpen(v=>!v)} style={{background:'transparent',border:'none',color:'white',cursor:'pointer',display:'flex'}}>{isMobileMenuOpen?<X size={24}/>:<Menu size={24}/>}</button><FocusableLink to="/" className="brand" style={{display:'flex',alignItems:'center',gap:'.75rem'}}><img src={assetPath('logo.png')} alt="AnimeVault" style={{height:40,width:'auto'}}/><span>AnimeVault</span></FocusableLink></div>
      <nav className="topnav">
        {[["/","Home",HomeIcon],["/anime","Anime",null],["/manga","Manga",BookOpen],["/dramas-movies","Dramas & Movies",TvIcon],["/schedule","Schedule",null],["/collections","Collections",null],["/community","Community",Users],["/stats","Stats",null],["/notifications","Notifications",Bell],["/download","Download",DownloadIcon]].map(([to,label,Icon])=><FocusableNavLink key={to} to={to} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{Icon&&<Icon size={16}/>} {label}</FocusableNavLink>)}
        {user?.is_admin&&<FocusableNavLink to="/admin/dashboard" className={({isActive})=>isActive?'nav-link active':'nav-link'} style={{color:'#ffd700'}}><Award size={16}/> Admin</FocusableNavLink>}
      </nav>
      <div className="topbar-actions"><button className="topbar-search-form" aria-label="Search" onClick={()=>setIsSearchOpen(true)}><SearchIcon size={18}/><span>Search anime...</span><kbd>⌘K</kbd></button>{user?<FocusableLink to={ownProfilePath}><User size={14}/><span>{user.username}</span></FocusableLink>:authLoading?<div>Checking session...</div>:<FocusableButton onClick={()=>{setAuthTab('login');setShowAuthModal(true)}}><User size={14}/><span>Sign In</span></FocusableButton>}</div>
    </header>
    {isMobileMenuOpen&&<div className="mobile-menu-overlay" onClick={()=>setIsMobileMenuOpen(false)}><div className="mobile-menu" onClick={e=>e.stopPropagation()}>{[['/','Home'],['/anime','Anime'],['/manga','Manga'],['/dramas-movies','Dramas & Movies'],['/schedule','Schedule'],['/collections','Collections'],['/community','Community'],['/stats','Stats'],['/notifications','Notifications'],['/download','Download'],['/about','About']].map(([to,label])=><FocusableNavLink key={to} to={to} onClick={()=>setIsMobileMenuOpen(false)} className={({isActive})=>isActive?'mobile-nav-link active':'mobile-nav-link'}>{label}</FocusableNavLink>)}</div></div>}
    <main className="content"><Routes><Route path="/" element={<MixedHome/>}/><Route path="/search" element={<Search/>}/><Route path="/anime" element={<Home/>}/><Route path="/anime/:id" element={<AnimeDetails/>}/><Route path="/manga" element={<MangaHome/>}/><Route path="/manga/:id" element={<MangaDetails/>}/><Route path="/dramas-movies" element={<DramasMovies/>}/><Route path="/watch/:type/:id" element={<RequireAuth><MovieWatch/></RequireAuth>}/><Route path="/schedule" element={<Schedule/>}/><Route path="/collections" element={<RequireAuth><Collections/></RequireAuth>}/><Route path="/community" element={<Community/>}/><Route path="/stats" element={<RequireAuth><Stats/></RequireAuth>}/><Route path="/notifications" element={<RequireAuth><Notifications/></RequireAuth>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="/faq" element={<FAQ/>}/><Route path="/terms" element={<Terms/>}/><Route path="/privacy" element={<Privacy/>}/><Route path="/dmca" element={<DMCA/>}/><Route path="/request" element={<RequestAnime/>}/><Route path="/profile/:userid/*" element={<Profile/>}/><Route path="/settings" element={<RequireAuth><Settings/></RequireAuth>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/set-new-password" element={<SetNewPassword/>}/><Route path="/download" element={<Download/>}/><Route path="/admin/*" element={<RequireAdmin><AdminDashboard/></RequireAdmin>}/><Route path="*" element={<NotFound/>}/></Routes></main>
    <Footer/><nav className="bottom-nav"><NavLink to="/" end className={({isActive})=>isActive?'bottom-nav-link active':'bottom-nav-link'}><HomeIcon size={20}/><span>Home</span></NavLink><NavLink to="/anime" className={({isActive})=>isActive?'bottom-nav-link active':'bottom-nav-link'}><span style={{fontSize:'.8rem',fontWeight:'bold'}}>アニメ</span><span>Anime</span></NavLink><NavLink to="/dramas-movies" className={({isActive})=>isActive?'bottom-nav-link active':'bottom-nav-link'}><TvIcon size={20}/><span>Dramas</span></NavLink><NavLink to="/search" className={({isActive})=>isActive?'bottom-nav-link active':'bottom-nav-link'}><SearchIcon size={20}/><span>Search</span></NavLink></nav>
    <AuthModal/><UpdateCenter/><ProfileModal isOpen={isProfileOpen} onClose={()=>setIsProfileOpen(false)}/>{isSearchOpen&&<SearchModal onClose={()=>setIsSearchOpen(false)}/>} 
    <style>{`.mobile-menu-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;justify-content:flex-start}.mobile-menu{width:min(75%,300px);height:100%;background:rgba(15,23,42,.98);padding:2rem 1.5rem;display:flex;flex-direction:column;gap:.75rem;border-right:1px solid rgba(255,255,255,.1);overflow-y:auto}.mobile-nav-link{padding:.75rem 1rem;border-radius:8px;color:#94a3b8;text-decoration:none;display:flex;align-items:center;gap:.75rem;font-weight:600}.mobile-nav-link.active{background:rgba(255,26,117,.15);border:1px solid rgba(255,26,117,.3);color:#ff1a75}.hamburger-btn{display:none}@media(max-width:1024px){.hamburger-btn{display:flex!important}.topnav{display:none!important}.topbar-search-form span,.topbar-search-form kbd{display:none!important}.topbar-search-form{padding:8px}.content{padding-left:1rem;padding-right:1rem}.app-shell{width:100%;overflow-x:hidden}}@media(max-width:600px){.content{padding:.75rem .65rem 5rem}.topbar{padding:.45rem .65rem}.topbar .brand img{height:32px!important}.topbar .brand span{font-size:.9rem}.bottom-nav{display:flex!important}}`}</style>
  </div></SubAccountGate>;
}
export default App;
