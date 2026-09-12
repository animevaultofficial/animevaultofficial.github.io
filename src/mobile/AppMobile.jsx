import React, { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, ChevronRight, Download, Heart, Home, Library, Menu, Plus, Search, Settings, UserCircle, Users, X, History, Tv, BookOpen, BarChart3, Layers, Info } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CapacitorApp } from '@capacitor/app';
import { useUser } from '../api/UserContext';
import { setActiveSubAccount } from '../utils/subAccounts';
import RequireAuth from '../components/RequireAuth';
import RequireAdmin from '../components/RequireAdmin';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SchedulePage from './pages/SchedulePage';
import DownloadsPage from './pages/DownloadsPage';
import NotificationsPage from './pages/NotificationsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AnimeDetailsPage from './pages/AnimeDetailsPage';
import MangaDetailsPage from './pages/MangaDetailsPage';
import DramaDetailPage from './pages/DramaDetailPage';
import DramasMoviesPage from './pages/DramasMoviesPage';
import LibraryPage from './pages/LibraryPage';
import MobileBottomNav from './components/MobileBottomNav';
import MangaHome from '../pages/MangaHome';
import MovieWatch from '../pages/MovieWatch';
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

function MobileAnimeDetails({ navigate }) { const { id } = useParams(); return <AnimeDetailsPage params={{ id }} goBack={() => navigate(-1)} navigate={navigate} />; }
function MobileDramaDetails({ navigate }) { const { id } = useParams(); const query = new URLSearchParams(useLocation().search); const mediaType = query.get('type') || 'tv'; const title = query.get('title') || undefined; return <DramaDetailPage params={{ id, mediaType, title }} goBack={() => navigate(-1)} navigate={navigate} />; }
function MobileMangaDetails({ navigate }) { const { id } = useParams(); return <MangaDetailsPage id={id} goBack={() => navigate(-1)} />; }
function LegacyPage({ children, className = '' }) { return <div className={`av-mobile-legacy-page ${className}`}>{children}</div>; }

function AccountSwitcher() {
  const { user, subAccounts, activeSubAccount, setActiveSubAccountState } = useUser();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const profiles = subAccounts.length ? subAccounts : [activeSubAccount].filter(Boolean);
  const current = activeSubAccount || profiles[0];
  const avatar = current?.avatar || user.avatar;
  const name = current?.name || user.username || 'Account';
  const choose = profile => { setActiveSubAccount(user.id, profile); setActiveSubAccountState(profile); setOpen(false); };
  return <div className="av-account-wrap">
    <button className="av-account-button" type="button" aria-label="Switch account profile" onClick={() => setOpen(value => !value)}><span className="av-account-avatar">{avatar ? <img src={avatar} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}</span></button>
    {open && <><button className="av-account-backdrop" type="button" aria-label="Close account switcher" onClick={() => setOpen(false)} /><div className="av-account-menu" role="dialog" aria-label="Account profiles"><strong>Who's watching?</strong>{profiles.map(profile => <button key={profile.id} className={`av-profile-option ${current?.id === profile.id ? 'is-active' : ''}`} type="button" onClick={() => choose(profile)}><span className="av-profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{profile.name?.charAt(0).toUpperCase() || 'A'}</span>}</span><span><b>{profile.name}</b><small>{profile.isMain ? 'Main profile' : 'Sub profile'}</small></span>{current?.id === profile.id && <Check size={17} />}</button>)}{profiles.length < 5 && <button className="av-profile-option" type="button" onClick={() => { setOpen(false); navigate('/profile'); }}><span className="av-profile-avatar av-add-avatar"><Plus size={18} /></span><span><b>Add profile</b><small>Create another profile</small></span></button>}<button className="av-manage-profiles" type="button" onClick={() => { setOpen(false); navigate('/profile'); }}><UserCircle size={16} /> Manage profiles</button></div></>}
  </div>;
}

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
  const drawerItem = ([label, Icon, path]) => <button key={`${label}-${path}`} type="button" className={`av-mobile-drawer-item ${active(path) ? 'is-active' : ''}`} onClick={() => go(path)}><Icon size={19} /><span>{label}</span><ChevronRight className="av-mobile-drawer-chevron" size={16} /></button>;

  let content = <HomePage navigate={mobileNavigate} />;
  if (location.pathname === '/search') content = <SearchPage navigate={mobileNavigate} />;
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
  else if (/^\/watch\/(movie|tv|series)\/[^/]+$/.test(location.pathname)) content = <RequireAuth><LegacyPage className="av-mobile-watch-page"><MovieWatch /></LegacyPage></RequireAuth>;
  else if (/^\/admin(?:\/.*)?$/.test(location.pathname)) content = <RequireAdmin><LegacyPage><AdminDashboard /></LegacyPage></RequireAdmin>;
  else if (/^\/anime\/[^/]+$/.test(location.pathname)) content = <MobileAnimeDetails navigate={mobileNavigate} />;
  else if (/^\/drama\/[^/]+$/.test(location.pathname)) content = <MobileDramaDetails navigate={mobileNavigate} />;
  else if (/^\/manga\/[^/]+$/.test(location.pathname)) content = <MobileMangaDetails navigate={navigate} />;

  return <div className="av-mobile-shell">
    <header className="av-mobile-topbar"><button className="av-mobile-icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button><button className="av-mobile-brand" type="button" onClick={() => go('/')}><span className="av-mobile-brand-mark"><span aria-hidden="true" /></span><span>AnimeVault</span></button><button className="av-mobile-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button></header>
    <button className={`av-mobile-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
    <aside className={`av-mobile-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
      <div className="av-mobile-drawer-header"><div className="av-mobile-drawer-brand"><span className="av-mobile-brand-mark"><span aria-hidden="true" /></span><div><strong>AnimeVault</strong><small>ANDROID</small></div></div><button className="av-mobile-icon-button" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={22} /></button></div>
      <div className="av-mobile-drawer-scroll"><p className="av-mobile-drawer-label">DISCOVER</p><nav>{DISCOVER.map(drawerItem)}</nav><p className="av-mobile-drawer-label">YOUR VAULT</p><nav>{VAULT.map(drawerItem)}</nav><div className="av-mobile-drawer-divider" /><button className={`av-mobile-drawer-item ${location.pathname.startsWith('/profile') ? 'is-active' : ''}`} type="button" onClick={() => go('/profile')}><UserCircle size={19} /><span>Profile</span><ChevronRight className="av-mobile-drawer-chevron" size={16} /></button><button className={`av-mobile-drawer-item ${location.pathname === '/settings' ? 'is-active' : ''}`} type="button" onClick={() => go('/settings')}><Settings size={19} /><span>Settings</span><ChevronRight className="av-mobile-drawer-chevron" size={16} /></button><button className="av-mobile-drawer-item" type="button" onClick={() => go('/about')}><Info size={19} /><span>About</span><ChevronRight className="av-mobile-drawer-chevron" size={16} /></button></div>
    </aside>
    <main className="av-mobile-content">{content}</main>
    <MobileBottomNav pathname={location.pathname} navigate={go} />
  </div>;
}
