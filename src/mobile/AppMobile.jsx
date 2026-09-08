import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Search, Library, CalendarDays, History, Heart, Download, Bell, Users, UserCircle, Settings, ChevronRight } from 'lucide-react';
import WebApp from '../App';

const NAV = [['Home', Home, '/'], ['Explore', Search, '/search'], ['Library', Library, '/collections'], ['Schedule', CalendarDays, '/schedule']];
const VAULT = [['Continue Watching', History, '/'], ['Favorites', Heart, '/collections'], ['Downloads', Download, '/download'], ['Notifications', Bell, '/notifications'], ['Community', Users, '/community']];

export default function AppMobile() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    const onBack = () => {
      if (open) { setOpen(false); return; }
      if (location.pathname !== '/') navigate(-1);
    };
    window.addEventListener('av-android-back', onBack);
    return () => window.removeEventListener('av-android-back', onBack);
  }, [open, location.pathname, navigate]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : previous;
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const go = (path) => { setOpen(false); navigate(path); };
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const renderItem = ([label, Icon, path]) => (
    <button key={label} type="button" className={`av-v2-drawer-item ${isActive(path) ? 'is-active' : ''}`} onClick={() => go(path)}>
      <Icon size={19} strokeWidth={2} /><span>{label}</span><ChevronRight className="av-v2-drawer-chevron" size={16} />
    </button>
  );

  return <div className="av-v2-shell">
    <header className="av-v2-topbar">
      <button className="av-v2-icon-button" type="button" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={23} /></button>
      <button className="av-v2-brand" type="button" onClick={() => go('/')} aria-label="AnimeVault home"><span className="av-v2-brand-mark">A</span><span>AnimeVault</span></button>
      <button className="av-v2-icon-button" type="button" aria-label="Notifications" onClick={() => go('/notifications')}><Bell size={21} /></button>
    </header>
    <div className={`av-v2-drawer-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <aside className={`av-v2-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="av-v2-drawer-header">
        <div className="av-v2-drawer-brand"><span className="av-v2-brand-mark">A</span><div><strong>AnimeVault</strong><small>Android</small></div></div>
        <button className="av-v2-icon-button" type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={22} /></button>
      </div>
      <div className="av-v2-drawer-scroll">
        <p className="av-v2-drawer-label">DISCOVER</p><nav>{NAV.map(renderItem)}</nav>
        <p className="av-v2-drawer-label">YOUR VAULT</p><nav>{VAULT.map(renderItem)}</nav>
        <div className="av-v2-drawer-divider" />
        <button className="av-v2-drawer-item" type="button" onClick={() => go('/profile')}><UserCircle size={19} strokeWidth={2} /><span>Profile</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button>
        <button className="av-v2-drawer-item" type="button" onClick={() => go('/settings')}><Settings size={19} strokeWidth={2} /><span>Settings</span><ChevronRight className="av-v2-drawer-chevron" size={16} /></button>
      </div>
    </aside>
    <main className="av-v2-content"><WebApp /></main>
  </div>;
}
