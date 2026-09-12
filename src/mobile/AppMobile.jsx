import React, { useEffect, useState } from 'react';
import { Bell, ChevronRight, Download, Heart, Home, Library, Menu, Search, Settings, UserCircle, Users, X, History, Tv, BarChart3, Layers, Info } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import RequireAuth from '../components/RequireAuth';
import RequireAdmin from '../components/RequireAdmin';
import MixedHome from '../pages/MixedHome';
import WebSearch from '../pages/Search';
import AnimeUnavailable from '../pages/AnimeUnavailable';
import DownloadsPage from './pages/DownloadsPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import DramaDetailPage from './pages/DramaDetailPage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import LibraryPage from './pages/LibraryPage';
import AndroidBottomNav from './components/AndroidBottomNav';
import About from '../pages/About';
import StaticPages from '../pages/StaticPageRoute';
import AdminDashboard from '../pages/AdminDashboard';
import ForgotPassword from '../pages/ForgotPassword';
import SetNewPassword from '../pages/SetNewPassword';
import { useUser } from '../api/UserContext';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import './styles/animations.css';
import './styles/utilities.css';
import './styles/mobile-native.css';
import './styles/account.css';
import './styles/safe-area.css';
import './mobile-android-design.css';
import './mobile-v2.css';
import './mobile-v2-shell.css';
import './mobile-v2-details.css';
import './mobile-v2-player.css';
import './mobile-v2-library.css';
import './mobile-v2-downloads.css';
import './mobile-v2-notifications.css';
import './mobile-v2-community.css';
import './mobile-v2-profile.css';
import './mobile-v2-settings.css';
import './mobile-v2-schedule.css';
import './mobile-v2-account.css';
import './styles/android-v3.css';
import './styles/android-v4-fixes.css';

const DISCOVER = [
  ['Home', Home, '/'],
  ['Search', Search, '/search'],
  ['Library', Library, '/collections'],
  ['Dramas & Movies', Tv, '/dramas-movies'],
];
const VAULT = [
  ['Continue Watching', History, '/collections'],
  ['Favorites', Heart, '/collections'],
  ['Downloads', Download, '/download'],
  ['Notifications', Bell, '/notifications'],
  ['Community', Users, '/community'],
];

function MobileAnimeUnavailable() { return <AnimeUnavailable />; }
function MobileDramaDetails({ navigate }) {
  const { id } = useParams();
  const query = new URLSearchParams(useLocation().search);
  return <DramaDetailPage params={{ id, mediaType: query.get('type') || 'tv', title: query.get('title') || undefined }} goBack={() => navigate(-1)} navigate={navigate} />;
}
function MobileWatchRoute({ navigate }) {
  const { kind, id } = useParams();
  useEffect(() => { if (id) navigate(`/drama/${id}?type=${kind === 'movie' ? 'movie' : 'tv'}`); }, [id, kind, navigate]);
  return <div className="av-empty-state"><span className="av-loading-line" style={{ width: 160 }} /><p>Opening details…</p></div>;
}
function LegacyPage({ children, className = '' }) { return <div className={`av-mobile-legacy-page ${className}`}>{children}</div>; }
function MobileStats() {
  const { history = [], likes = [], continueWatching = [] } = useUser();
  const countType = type => [...history, ...likes, ...continueWatching].filter(item => String(item?.media_type || item?.mediaType || item?.type || '').toLowerCase() === type).length;
  return <div className="av-mobile-page" style={{ padding: 16 }}><span className="av-eyebrow-v2">YOUR VAULT</span><h1 style={{ margin: '4px 0 6px' }}>Stats</h1><p style={{ color: 'var(--av-muted)', marginTop: 0 }}>Your movie and series activity at a glance.</p><div className="av-profile-stats" style={{ marginTop: 18 }}><div className="av-profile-stat"><strong>{history.length}</strong><span>History</span></div><div className="av-profile-stat"><strong>{continueWatching.length}</strong><span>Progress</span></div><div className="av-profile-stat"><strong>{likes.length}</strong><span>Favorites</span></div><div className="av-profile-stat"><strong>{countType('movie') + countType('tv')}</strong><span>Movie / TV</span></div></div><div className="av-profile-empty" style={{ marginTop: 14 }}><BarChart3 size={28}/><strong>Keep watching to build your stats</strong><span>Anime statistics are unavailable while that catalog is disabled.</span></div></div>;
}

export default function AppMobile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setDrawerOpen(false), [location.pathname, location.search]);
  useEffect(() => { const f = e => e.key === 'Escape' && setDrawerOpen(false); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);
  useEffect(() => { let active = true; const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => { if (!active) return; if (drawerOpen) return setDrawerOpen(false); if (location.pathname !== '/') navigate(-1); else if (canGoBack) CapacitorApp.exitApp(); }); return () => { active = false; listener.then(h => h.remove()).catch(() => {}); }; }, [drawerOpen, location.pathname, navigate]);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = drawerOpen ? 'hidden' : previous; return () => { document.body.style.overflow = previous; }; }, [drawerOpen]);

  const go = path => { setDrawerOpen(false); navigate(path); };
  const mobileNavigate = (route, params = {}) => {
    if (route === 'drama-detail' && params.id != null) { const type = params.mediaType || params.type || 'tv'; const query = new URLSearchParams({ type: String(type), ...(params.title ? { title: params.title } : {}) }); return navigate(`/drama/${params.id}?${query}`); }
    if (route === 'profile' && params.id != null) return navigate(`/profile/${params.id}`);
    if (route === 'profile') return navigate('/profile');
    if (typeof route === 'string' && route.startsWith('/')) return navigate(route);
    return navigate(route);
  };
  const active = path => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const drawerItem = ([label, Icon, path]) => <button key={`${label}-${path}`} type="button" className={`av-v2-drawer-item ${active(path) ? 'is-active' : ''}`} onClick={() => go(path)}><Icon size={19} /><span>{label}</span><ChevronRight className="av-drawer-arrow" size={16} /></button>;

  let content = <MixedHome />;
  if (location.pathname === '/search') content = <WebSearch />;
  else if (location.pathname === '/collections' || location.pathname === '/collections-web') content = <LibraryPage navigate={mobileNavigate} />;
  else if (location.pathname === '/schedule') content = <MobileAnimeUnavailable />;
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
  else if (/^\/watch\/(movie|tv|series)\/[^/]+$/.test(location.pathname)) content = <RequireAuth><MobileWatchRoute navigate={navigate} /></RequireAuth>;
  else if (/^\/admin(?:\/.*)?$/.test(location.pathname)) content = <RequireAdmin><LegacyPage><AdminDashboard /></LegacyPage></RequireAdmin>;
  else if (location.pathname === '/anime' || /^\/anime\/[^/]+$/.test(location.pathname)) content = <MobileAnimeUnavailable />;
  else if (/^\/drama\/[^/]+$/.test(location.pathname)) content = <MobileDramaDetails navigate={mobileNavigate} />;

  return <div className="av-v2-shell">
    <header className="av-v2-topbar"><button className="av-v2-icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button><button className="av-v2-brand" type="button" onClick={() => go('/')}><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><span>AnimeVault</span></button><button className="av-v2-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button></header>
    <button className={`av-v2-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
    <aside className={`av-v2-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}><div className="av-v2-drawer-header"><div className="av-v2-drawer-brand"><span className="av-v2-brand-mark"><img src="/logo.png" alt="" aria-hidden="true" /></span><div><strong>AnimeVault</strong><small>ANDROID</small></div></div><button className="av-v2-icon-button" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22} /></button></div><div className="av-v2-drawer-scroll"><p className="av-v2-drawer-label">DISCOVER</p><nav>{DISCOVER.map(drawerItem)}</nav><p className="av-v2-drawer-label">YOUR VAULT</p><nav>{VAULT.map(drawerItem)}</nav><div className="av-v2-drawer-divider" /><button className={`av-v2-drawer-item ${location.pathname.startsWith('/profile') ? 'is-active' : ''}`} type="button" onClick={() => go('/profile')}><UserCircle size={19} /><span>Profile</span><ChevronRight className="av-drawer-arrow" size={16} /></button><button className={`av-v2-drawer-item ${location.pathname === '/settings' ? 'is-active' : ''}`} type="button" onClick={() => go('/settings')}><Settings size={19} /><span>Settings</span><ChevronRight className="av-drawer-arrow" size={16} /></button><button className="av-v2-drawer-item" type="button" onClick={() => go('/about')}><Info size={19} /><span>About</span><ChevronRight className="av-drawer-arrow" size={16} /></button></div></aside>
    <main className="av-v2-content">{content}</main>
    <AndroidBottomNav pathname={location.pathname} navigate={go} />
  </div>;
}
