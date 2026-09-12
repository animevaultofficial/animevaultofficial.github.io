import React, { useEffect, useState } from 'react';
import { Bell, CalendarDays, ChevronRight, Download, Heart, Home, Library, Menu, Search, Settings, UserCircle, Users, X, History, Tv, BookOpen, BarChart3, Layers, Info } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import RequireAuth from '../components/RequireAuth';
import RequireAdmin from '../components/RequireAdmin';
import MixedHome from '../pages/MixedHome';
import WebSearch from '../pages/Search';
import AnimeUnavailable from '../pages/AnimeUnavailable';
import SchedulePage from './pages/SchedulePage';
import DownloadsPage from './pages/DownloadsPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import MangaDetailsPage from './pages/MangaDetailsPage';
import DramaDetailPage from './pages/DramaDetailPage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import LibraryPage from './pages/LibraryPage';
import MobileBottomNav from './components/MobileBottomNav';
import MangaHome from '../pages/MangaHome';
import Collections from '../pages/Collections';
import Stats from '../pages/Stats';
import About from '../pages/About';
import StaticPages from '../pages/StaticPageRoute';
import AdminDashboard from '../pages/AdminDashboard';
import ForgotPassword from '../pages/ForgotPassword';
import SetNewPassword from '../pages/SetNewPassword';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import './styles/animations.css';
import './styles/utilities.css';
import './styles/mobile-native.css';
import './styles/account.css';
import './styles/safe-area.css';
import './mobile-android-design.css';
import './styles/android-v3.css';

const DISCOVER = [
  ['Home', Home, '/'],
  ['Explore', Search, '/search'],
  ['Library', Library, '/collections'],
  ['Schedule', CalendarDays, '/schedule'],
  ['Manga', BookOpen, '/manga'],
  ['Dramas & Movies', Tv, '/dramas-movies'],
  ['Collections', Layers, '/collections-web'],
  ['Stats', BarChart3, '/stats'],
];
const VAULT = [
  ['Continue Watching', History, '/collections'],
  ['Favorites', Heart, '/collections'],
  ['Downloads', Download, '/download'],
  ['Notifications', Bell, '/notifications'],
  ['Community', Users, '/community'],
];

function MobileAnimeUnavailable() { return <AnimeUnavailable />; }
function MobileDramaDetails({ navigate }) { const { id } = useParams(); const query = new URLSearchParams(useLocation().search); const mediaType = query.get('type') || 'tv'; const title = query.get('title') || undefined; return <DramaDetailPage params={{ id, mediaType, title }} goBack={() => navigate(-1)} navigate={navigate} />; }
function MobileMangaDetails({ navigate }) { const { id } = useParams(); return <MangaDetailsPage id={id} goBack={() => navigate(-1)} />; }
function MobileWatchRoute({ navigate }) { const { kind, id } = useParams(); useEffect(() => { if (!id) return; const mediaType = kind === 'movie' ? 'movie' : 'tv'; navigate(`/drama/${id}?type=${mediaType}`); }, [kind, id, navigate]); return <div className="av-empty-state"><span className="av-loading-line" style={{ width: 160 }} /><p>Opening the native Android player…</p></div>; }
function LegacyPage({ children, className = '' }) { return <div className={`av-mobile-legacy-page ${className}`}>{children}</div>; }

export default function AppMobile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setDrawerOpen(false), [location.pathname, location.search]);
  useEffect(() => { const onKeyDown = event => { if (event.key === 'Escape') setDrawerOpen(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  useEffect(() => { let active = true; const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => { if (!active) return; if (drawerOpen) return setDrawerOpen(false); if (location.pathname !== '/') navigate(-1); else if (canGoBack) CapacitorApp.exitApp(); }); return () => { active = false; listener.then(handle => handle.remove()).catch(() => {}); }; }, [drawerOpen, location.pathname, navigate]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = drawerOpen ? 'hidden' : previous; return () => { document.body.style.overflow = previous; }; }, [drawerOpen]);

  const go = path => { setDrawerOpen(false); navigate(path); };
  const mobileNavigate = (route, params = {}) => {
    if (route === 'anime-detail' && params.id != null) return navigate(`/anime/${params.id}`);
    if (route === 'drama-detail' && params.id != null) { const type = params.mediaType || params.type || 'tv'; const query = new URLSearchParams({ type: String(type), ...(params.title ? { title: params.title } : {}) }); return navigate(`/drama/${params.id}?${query.toString()}`); }
    if (route === 'profile' && params.id != null) return navigate(`/profile/${params.id}`);
    if (route === 'profile') return navigate('/profile');
    if (typeof route === 'string' && route.startsWith('/')) return navigate(route);
    return navigate(route);
  };
  const active = path => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const drawerItem = ([label, Icon, path]) => <button key={`${label}-${path}`} type="button" className={`av-v2-drawer-item ${active(path) ? 'is-active' : ''}`} onClick={() => go(path)}><Icon size={19} /><span>{label}</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button>;

  let content = <MixedHome />;
  if (location.pathname === '/search') content = <WebSearch />;
  else if (location.pathname === '/collections') content = <LibraryPage navigate={mobileNavigate} />;
  else if (location.pathname === '/collections-web') content = <RequireAuth><LegacyPage><Collections /></LegacyPage></RequireAuth>;
  else if (location.pathname === '/schedule') content = <SchedulePage navigate={mobileNavigate} />;
  else if (location.pathname === '/download') content = <DownloadsPage navigate={mobileNavigate} />;
  else if (location.pathname === '/notifications') content = <NotificationsPage navigate={mobileNavigate} />;
  else if (location.pathname === '/community') content = <CommunityPage navigate={mobileNavigate} />;
  else if (location.pathname === '/profile' || /^\/profile\/[^/]+(?:\/.*)?$/.test(location.pathname)) content = <ProfilePage navigate={mobileNavigate} />;
  else if (location.pathname === '/settings') content = <SettingsPage goBack={() => navigate(-1)} />;
  else if (location.pathname === '/manga') content = <LegacyPage><MangaHome /></LegacyPage>;
  else if (location.pathname === '/dramas-movies') content = <DramasMoviesPage navigate={mobileNavigate} />;
  else if (location.pathname === '/stats') content = <RequireAuth><LegacyPage><Stats /></LegacyPage></RequireAuth>;
  else if (location.pathname === '/about') content = <LegacyPage><About /></LegacyPage>;
  else if (location.pathname === '/contact') content = <LegacyPage><StaticPages page="contact" /></LegacyPage>;
  else if (location.pathname === '/faq') content = <LegacyPage><StaticPages page="faq" /></LegacyPage>;
  else if (location.pathname === '/terms') content = <LegacyPage><StaticPages page="terms" /></LegacyPage>;
  else if (location.pathname === '/privacy') content = <LegacyPage><StaticPages page="privacy" /></LegacyPage>;
  else if (location.pathname === '/dmca') content = <LegacyPage><StaticPages page="dmca" /></LegacyPage>;
  else if (location.pathname === '/request') content = <LegacyPage><StaticPages page="request" /></LegacyPage>;
  else if (location.pathname === '/forgot-password') content = <LegacyPage><ForgotPassword /></LegacyPage>;
  else if (location.pathname === '/set-new-password') content = <LegacyPage><SetNewPassword /></LegacyPage>;
  else if (/^\/watch\/(movie|tv|series)\/[^/]+$/.test(location.pathname)) content = <RequireAuth><MobileWatchRoute navigate={navigate} /></RequireAuth>;
  else if (/^\/admin(?:\/.*)?$/.test(location.pathname)) content = <RequireAdmin><LegacyPage><AdminDashboard /></LegacyPage></RequireAuth>;
  else if (location.pathname === '/anime' || /^\/anime\/[^/]+$/.test(location.pathname)) content = <MobileAnimeUnavailable />;
  else if (/^\/drama\/[^/]+$/.test(location.pathname)) content = <MobileDramaDetails navigate={mobileNavigate} />;
  else if (/^\/manga\/[^/]+$/.test(location.pathname)) content = <MobileMangaDetails navigate={navigate} />;

  return <div className="av-v2-shell">
    <header className="av-v2-topbar"><button className="av-v2-icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button><button className="av-v2-brand" type="button" onClick={() => go('/')}><span className="av-v2-brand-mark"><span aria-hidden="true" /></span><span>AnimeVault</span></button><button className="av-v2-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button></header>
    <button className={`av-v2-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
    <aside className={`av-v2-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
      <div className="av-v2-drawer-header"><div className="av-v2-drawer-brand"><span className="av-v2-brand-mark"><span aria-hidden="true" /></span><div><strong>AnimeVault</strong><small>ANDROID</small></div></div><button className="av-v2-icon-button" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22} /></button></div>
      <div className="av-v2-drawer-scroll"><p className="av-v2-drawer-label">DISCOVER</p><nav>{DISCOVER.map(drawerItem)}</nav><p className="av-v2-drawer-label">YOUR VAULT</p><nav>{VAULT.map(drawerItem)}</nav><div className="av-v2-drawer-divider" /><button className={`av-v2-drawer-item ${location.pathname.startsWith('/profile') ? 'is-active' : ''}`} type="button" onClick={() => go('/profile')}><UserCircle size={19} /><span>Profile</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button><button className={`av-v2-drawer-item ${location.pathname === '/settings' ? 'is-active' : ''}`} type="button" onClick={() => go('/settings')}><Settings size={19} /><span>Settings</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button><button className="av-v2-drawer-item" type="button" onClick={() => go('/about')}><Info size={19} /><span>About</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button></div>
    </aside>
    <main className="av-v2-content">{content}</main>
    <MobileBottomNav pathname={location.pathname} navigate={go} />
  </div>;
}
