import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, ChevronRight, Download, Heart, Home, Library, Menu, Search, Settings, UserCircle, Users, X, History, Tv, BarChart3, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import RequireAuth from '../components/RequireAuth';
import RequireAdmin from '../components/RequireAdmin';
import AuthModal from '../components/AuthModal';
import MixedHome from '../pages/MixedHome';
import WebSearch from '../pages/Search';
import AnimeHome from '../pages/AnimeHome';
import AnimeWatch from '../pages/AnimeWatch';
import AnimeDetailsPage from './pages/AnimeDetailsPage';
import DownloadsPage from './pages/DownloadsPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import DramaDetailPage from './pages/DramaDetailPage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import SchedulePage from './pages/SchedulePage';
import LibraryPage from './pages/LibraryPage';
import AndroidBottomNav from './components/AndroidBottomNav';
import Footer from '../components/Footer';
import About from '../pages/About';
import StaticPages from '../pages/StaticPageRoute';
import AdminDashboard from '../pages/AdminDashboard';
import ForgotPassword from '../pages/ForgotPassword';
import SetNewPassword from '../pages/SetNewPassword';
import { useUser } from '../api/UserContext';
import { applyAccentColor, applyTheme } from '../utils/appearance';
import { storage } from '../utils/storage';
import './styles/tokens.css'; import './styles/base.css'; import './styles/typography.css'; import './styles/animations.css'; import './styles/utilities.css'; import './styles/mobile-native.css'; import './styles/account.css'; import './styles/safe-area.css'; import './mobile-android-design.css'; import './mobile-v2.css'; import './mobile-v2-shell.css'; import './mobile-v2-details.css'; import './mobile-v2-player.css'; import './mobile-v2-library.css'; import './mobile-v2-downloads.css'; import './mobile-v2-notifications.css'; import './mobile-v2-community.css'; import './mobile-v2-profile.css'; import './mobile-v2-settings.css'; import './mobile-v2-schedule.css'; import './mobile-v2-account.css'; import './styles/android-v3.css'; import './styles/android-v4-fixes.css'; import './styles/android-appearance.css'; import './styles/android-static-pages.css'; import './tv-mode.css';
const DISCOVER = [['Home', Home, '/'], ['Search', Search, '/search'], ['Library', Library, '/collections'], ['Dramas & Movies', Tv, '/dramas-movies']];
const VAULT = [['Continue Watching', History, '/collections'], ['Favorites', Heart, '/collections'], ['Downloads', Download, '/download'], ['Notifications', Bell, '/notifications'], ['Community', Users, '/community']];
const TV_NAV = [['Home', Home, '/'], ['Search', Search, '/search'], ['Movies & shows', Tv, '/dramas-movies'], ['Library', Library, '/collections'], ['Schedule', CalendarDays, '/schedule'], ['Downloads', Download, '/download'], ['Notifications', Bell, '/notifications'], ['Profile', UserCircle, '/profile'], ['Settings', Settings, '/settings']];
function TvNavigationRail({ pathname, navigate }) {
  const active = path => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
  return <nav className="tv-navigation-rail" aria-label="Main navigation"><div className="tv-navigation-brand"><img src="/logo.png" alt="AnimeVault" /></div><div className="tv-navigation-items">{TV_NAV.map(([label, Icon, path]) => <button key={path} type="button" className="tv-navigation-item" aria-label={label} title={label} aria-current={active(path) ? 'page' : undefined} onClick={() => navigate(path)}><Icon size={23} aria-hidden="true" /></button>)}</div></nav>;
}
function MobileAnimeUnavailable({ id, navigate }) {
  const mobileNavigate = (route, params = {}) => {
    if (route === 'anime-detail' && params.id != null) return navigate(`/anime/${params.id}`);
    if (route === 'anime-watch' && params.id != null) return navigate(`/anime/${params.id}/watch`);
    if (route === 'profile') return navigate('/profile');
    if (route === 'drama-detail' && params.id != null) {
      const query = new URLSearchParams({ type: String(params.mediaType || params.type || 'tv') });
      if (params.title) query.set('title', params.title);
      return navigate(`/drama/${params.id}?${query}`);
    }
    return navigate(route);
  };
  if (!id) return <AnimeHome />;
  if (id) return <AnimeDetailsPage params={{ id }} goBack={() => navigate(-1)} navigate={mobileNavigate} />;
  return <AnimeHome />;
}
function MobileDramaDetails({ id, navigate, search }) {
  const query = new URLSearchParams(search);
  return <DramaDetailPage params={{ id, mediaType: query.get('type') || 'tv', title: query.get('title') || undefined }} goBack={() => navigate(-1)} navigate={navigate} />;
}
function MobileWatchRoute({ id, kind, navigate, search }) {
  const query = new URLSearchParams(search);
  return <DramaDetailPage key={`${kind}-${id}`} params={{ id, mediaType: kind === 'movie' ? 'movie' : 'tv', season: query.get('season'), episode: query.get('episode') }} initialWatch goBack={() => navigate(-1)} navigate={navigate} />;
}
function LegacyPage({ children, className = '' }) { return <div className={`av-mobile-legacy-page ${className}`}>{children}</div>; }
function MobileStats() { const { history = [], likes = [], continueWatching = [] } = useUser(); const countType = type => [...history, ...likes, ...continueWatching].filter(item => String(item?.media_type || item?.mediaType || item?.type || '').toLowerCase() === type).length; return <div className="av-mobile-page" style={{ padding: 16 }}><span className="av-eyebrow-v2">YOUR VAULT</span><h1 style={{ margin: '4px 0 6px' }}>Stats</h1><p style={{ color: 'var(--av-muted)', marginTop: 0 }}>Your movie and series activity at a glance.</p><div className="av-profile-stats" style={{ marginTop: 18 }}><div className="av-profile-stat"><strong>{history.length}</strong><span>History</span></div><div className="av-profile-stat"><strong>{continueWatching.length}</strong><span>Progress</span></div><div className="av-profile-stat"><strong>{likes.length}</strong><span>Favorites</span></div><div className="av-profile-stat"><strong>{countType('movie') + countType('tv')}</strong><span>Movie / TV</span></div></div><div className="av-profile-empty" style={{ marginTop: 14 }}><BarChart3 size={28}/><strong>Keep watching to build your stats</strong><span>Anime statistics are unavailable while that catalog is disabled.</span></div></div>; }
export default function AppMobile() {
  const [drawerOpen, setDrawerOpen] = useState(false); const [headerHidden, setHeaderHidden] = useState(false); const location = useLocation(); const navigate = useNavigate();
  const menuTriggerRef = useRef(null);
  const drawerRef = useRef(null);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const bottomNavRef = useRef(null);
  const drawerWasOpen = useRef(false);
  const { user, setShowAuthModal, setAuthTab } = useUser();
  useEffect(() => { try { const accent = localStorage.getItem('av_accent') || 'red'; const theme = localStorage.getItem('av_theme') || 'dark'; const font = localStorage.getItem('av_font_size') || 'medium'; applyAccentColor(accent); applyTheme(theme, storage.get('customThemeVars')); document.documentElement.dataset.avFontSize = font; } catch (err) { console.warn('[AnimeVault Mobile] appearance restore failed:', err); } }, []);
  useEffect(() => setDrawerOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (headerRef.current) headerRef.current.inert = drawerOpen;
    if (contentRef.current) contentRef.current.inert = drawerOpen;
    if (bottomNavRef.current) bottomNavRef.current.inert = drawerOpen;
    if (drawerRef.current) drawerRef.current.inert = !drawerOpen;
  }, [drawerOpen]);
  useEffect(() => {
    if (drawerOpen) {
      drawerWasOpen.current = true;
      const frame = window.requestAnimationFrame(() => {
        const target = drawerRef.current?.querySelector('.av-v2-drawer-item.is-active')
          || drawerRef.current?.querySelector('.av-v2-drawer-item')
          || drawerRef.current?.querySelector('button');
        try { target?.focus({ preventScroll: true }); } catch { target?.focus(); }
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (drawerWasOpen.current) {
      drawerWasOpen.current = false;
      const frame = window.requestAnimationFrame(() => {
        try { menuTriggerRef.current?.focus({ preventScroll: true }); } catch { menuTriggerRef.current?.focus(); }
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [drawerOpen]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setHeaderHidden(false);
  }, [location.pathname]);
  useEffect(() => {
    let lastY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
      if (drawerOpen) { setHeaderHidden(false); lastY = currentY; return; }
      const delta = currentY - lastY;
      if (currentY < 72) setHeaderHidden(false);
      else if (delta > 7) setHeaderHidden(true);
      else if (delta < -7) setHeaderHidden(false);
      lastY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [drawerOpen]);
  useEffect(() => {
    const onRemoteBack = event => {
      if (event.key === 'Escape') {
        if (drawerOpen) { event.preventDefault(); setDrawerOpen(false); }
        return;
      }
      const isBack = ['Back', 'BrowserBack', 'GoBack', 'Backspace'].includes(event.key) || [4, 461, 10009].includes(event.keyCode);
      if (!isBack) return;
      event.preventDefault();
      if (drawerOpen) setDrawerOpen(false);
      else if (location.pathname !== '/') navigate(-1);
    };
    window.addEventListener('keydown', onRemoteBack);
    return () => window.removeEventListener('keydown', onRemoteBack);
  }, [drawerOpen, location.pathname, navigate]);
  useEffect(() => { let active = true; const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => { if (!active) return; if (drawerOpen) return setDrawerOpen(false); if (location.pathname !== '/') navigate(-1); else if (canGoBack) CapacitorApp.exitApp(); }); return () => { active = false; listener.then(h => h.remove()).catch(() => {}); }; }, [drawerOpen, location.pathname, navigate]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = drawerOpen ? 'hidden' : previous; return () => { document.body.style.overflow = previous; }; }, [drawerOpen]);
  const go = path => { setDrawerOpen(false); navigate(path); };
  const openLogin = () => { setAuthTab('login'); setShowAuthModal(true); setDrawerOpen(false); };
  const mobileNavigate = (route, params = {}) => { if (route === 'anime-detail' && params.id != null) return navigate(`/anime/${params.id}`); if (route === 'anime-watch' && params.id != null) return navigate(`/anime/${params.id}/watch`); if (route === 'drama-detail' && params.id != null) { const type = params.mediaType || params.type || 'tv'; const query = new URLSearchParams({ type: String(type), ...(params.title ? { title: params.title } : {}) }); return navigate(`/drama/${params.id}?${query}`); } if (route === 'profile' && params.id != null) return navigate(`/profile/${params.id}`); if (route === 'profile') return navigate('/profile'); if (typeof route === 'string' && route.startsWith('/')) return navigate(route); return navigate(route); };
  const active = path => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const drawerItem = ([label, Icon, path]) => <button key={`${label}-${path}`} type="button" className={`av-v2-drawer-item ${active(path) ? 'is-active' : ''}`} onClick={() => go(path)}><Icon size={19} /><span>{label}</span><ChevronRight className="av-drawer-arrow" size={16} /></button>;
  const animeWatchMatch = location.pathname.match(/^\/anime\/([^/]+)\/watch$/);
  const animeDetailMatch = location.pathname.match(/^\/anime\/([^/]+)$/);
  const mobileMediaMatch = location.pathname.match(/^\/(?:media|watch)\/(movie|tv|series)\/([^/]+)$/);
  const dramaMatch = location.pathname.match(/^\/drama\/([^/]+)$/);
  let content = <MixedHome mobile />;
  if (animeWatchMatch) content = <RequireAuth><AnimeWatch mediaId={animeWatchMatch[1]} /></RequireAuth>;
  else if (location.pathname === '/anime' || animeDetailMatch) content = <MobileAnimeUnavailable id={animeDetailMatch?.[1]} navigate={navigate} />;
  else if (mobileMediaMatch?.[0].startsWith('/watch/')) content = <RequireAuth><MobileWatchRoute id={mobileMediaMatch[2]} kind={mobileMediaMatch[1]} navigate={navigate} search={location.search} /></RequireAuth>;
  else if (mobileMediaMatch) content = <DramaDetailPage params={{ id: mobileMediaMatch[2], mediaType: mobileMediaMatch[1] === 'movie' ? 'movie' : 'tv' }} goBack={() => navigate(-1)} navigate={mobileNavigate} />;
  else if (dramaMatch) content = <MobileDramaDetails id={dramaMatch[1]} navigate={mobileNavigate} search={location.search} />;
  else if (location.pathname === '/search') content = <WebSearch />;
  else if (location.pathname === '/collections' || location.pathname === '/collections-web') content = <LibraryPage navigate={mobileNavigate} />;
  else if (location.pathname === '/schedule') content = <SchedulePage navigate={mobileNavigate} />;
  else if (location.pathname === '/download') content = <DownloadsPage navigate={mobileNavigate} />;
  else if (location.pathname === '/notifications') content = <NotificationsPage navigate={mobileNavigate} />;
  else if (location.pathname === '/community') content = <CommunityPage navigate={mobileNavigate} />;
  else if (location.pathname === '/profile' || /^\/profile\/[^/]+(?:\/.*)?$/.test(location.pathname)) content = <ProfilePage navigate={mobileNavigate} />;
  else if (location.pathname === '/settings') content = <SettingsPage goBack={() => navigate(-1)} />;
  else if (location.pathname === '/dramas-movies') content = <DramasMoviesPage navigate={mobileNavigate} />;
  else if (location.pathname === '/stats') content = <RequireAuth><MobileStats /></RequireAuth>;
  else if (location.pathname === '/about') content = <LegacyPage><About /></LegacyPage>;
  else if (location.pathname === '/contact') content = <LegacyPage><StaticPages page="contact" /></LegacyPage>;
  else if (location.pathname === '/faq') content = <LegacyPage><StaticPages page="faq" /></LegacyPage>;
  else if (location.pathname === '/terms') content = <LegacyPage><StaticPages page="terms" /></LegacyPage>;
  else if (location.pathname === '/privacy') content = <LegacyPage><StaticPages page="privacy" /></LegacyPage>;
  else if (location.pathname === '/dmca') content = <LegacyPage><StaticPages page="dmca" /></LegacyPage>;
  else if (location.pathname === '/request') content = <LegacyPage><StaticPages page="request" /></LegacyPage>;
  else if (location.pathname === '/forgot-password') content = <LegacyPage><ForgotPassword /></LegacyPage>;
  else if (location.pathname === '/set-new-password') content = <LegacyPage><SetNewPassword /></LegacyPage>;
  else if (/^\/admin(?:\/.*)?$/.test(location.pathname)) content = <RequireAdmin><LegacyPage><AdminDashboard /></LegacyPage></RequireAdmin>;
  return <div className="av-v2-shell"><TvNavigationRail pathname={location.pathname} navigate={go} /><header ref={headerRef} className={`av-v2-topbar ${headerHidden ? 'is-hidden' : ''}`}><button ref={menuTriggerRef} className="av-v2-icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button><button className="av-v2-brand" type="button" onClick={() => go('/')}><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><span>AnimeVault</span></button><button className="av-v2-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button></header><button className={`av-v2-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} type="button" tabIndex={-1} aria-hidden={!drawerOpen} aria-label="Close menu" onClick={() => setDrawerOpen(false)} /><aside ref={drawerRef} className={`av-v2-drawer ${drawerOpen ? 'is-open' : ''}`} role="dialog" aria-label="Main menu" aria-modal={drawerOpen} aria-hidden={!drawerOpen}><div className="av-v2-drawer-header"><div className="av-v2-drawer-brand"><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><div><strong>AnimeVault</strong><small>ENTERTAINMENT</small></div></div><button className="av-v2-icon-button" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22} /></button></div><div className="av-v2-drawer-scroll"><p className="av-v2-drawer-label">DISCOVER</p><nav>{DISCOVER.map(drawerItem)}</nav><p className="av-v2-drawer-label">YOUR VAULT</p><nav>{VAULT.map(drawerItem)}</nav><div className="av-v2-drawer-divider" /><button className={`av-v2-drawer-item ${location.pathname.startsWith('/profile') ? 'is-active' : ''}`} type="button" onClick={() => go('/profile')}><UserCircle size={19} /><span>Profile</span><ChevronRight className="av-drawer-arrow" size={16} /></button><button className={`av-v2-drawer-item ${location.pathname === '/settings' ? 'is-active' : ''}`} type="button" onClick={() => go('/settings')}><Settings size={19} /><span>Settings</span><ChevronRight className="av-drawer-arrow" size={16} /></button>{!user && <button className="av-v2-drawer-item" type="button" onClick={openLogin}><UserCircle size={19} /><span>Sign In</span><ChevronRight className="av-drawer-arrow" size={16} /></button>}<button className="av-v2-drawer-item" type="button" onClick={() => go('/about')}><Info size={19} /><span>About</span><ChevronRight className="av-drawer-arrow" size={16} /></button></div></aside><main ref={contentRef} className="av-v2-content">{content}<Footer /></main><AndroidBottomNav navRef={bottomNavRef} pathname={location.pathname} navigate={go} /><AuthModal /></div>;
  return <div className="av-v2-shell"><TvNavigationRail pathname={location.pathname} navigate={go} /><header ref={headerRef} className="av-v2-topbar"><button ref={menuTriggerRef} className="av-v2-icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button><button className="av-v2-brand" type="button" onClick={() => go('/')}><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><span>AnimeVault</span></button><button className="av-v2-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button></header><button className={`av-v2-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} type="button" tabIndex={-1} aria-hidden={!drawerOpen} aria-label="Close menu" onClick={() => setDrawerOpen(false)} /><aside ref={drawerRef} className={`av-v2-drawer ${drawerOpen ? 'is-open' : ''}`} role="dialog" aria-label="Main menu" aria-modal={drawerOpen} aria-hidden={!drawerOpen}><div className="av-v2-drawer-header"><div className="av-v2-drawer-brand"><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><div><strong>AnimeVault</strong><small>ENTERTAINMENT</small></div></div><button className="av-v2-icon-button" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22} /></button></div><div className="av-v2-drawer-scroll"><p className="av-v2-drawer-label">DISCOVER</p><nav>{DISCOVER.map(drawerItem)}</nav><p className="av-v2-drawer-label">YOUR VAULT</p><nav>{VAULT.map(drawerItem)}</nav><div className="av-v2-drawer-divider" /><button className={`av-v2-drawer-item ${location.pathname.startsWith('/profile') ? 'is-active' : ''}`} type="button" onClick={() => go('/profile')}><UserCircle size={19} /><span>Profile</span><ChevronRight className="av-drawer-arrow" size={16} /></button><button className={`av-v2-drawer-item ${location.pathname === '/settings' ? 'is-active' : ''}`} type="button" onClick={() => go('/settings')}><Settings size={19} /><span>Settings</span><ChevronRight className="av-drawer-arrow" size={16} /></button>{!user && <button className="av-v2-drawer-item" type="button" onClick={openLogin}><UserCircle size={19} /><span>Sign In</span><ChevronRight className="av-drawer-arrow" size={16} /></button>}<button className="av-v2-drawer-item" type="button" onClick={() => go('/about')}><Info size={19} /><span>About</span><ChevronRight className="av-drawer-arrow" size={16} /></button></div></aside><main ref={contentRef} className="av-v2-content">{content}<Footer /></main><AndroidBottomNav navRef={bottomNavRef} pathname={location.pathname} navigate={go} /><AuthModal /></div>;
}
