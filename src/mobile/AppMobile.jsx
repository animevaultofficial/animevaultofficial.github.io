import React, { useEffect, useState } from 'react';
import { Menu, X, Home, Search, Library, CalendarDays, Bell, Heart, History, Download, Users, User, Settings, ChevronRight, Sparkles } from 'lucide-react';
import App from '../App';

const DISCOVER = [
  ['Home', Home, 'home'], ['Explore', Search, 'search'], ['Library', Library, 'favorites'], ['Schedule', CalendarDays, 'schedule'],
];
const VAULT = [
  ['Continue Watching', History, 'history'], ['Favorites', Heart, 'favorites'], ['Downloads', Download, 'downloads'], ['Notifications', Bell, 'notifications'], ['Community', Users, 'community'],
];

export default function AppMobile() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('animevault:close-drawer', close);
    return () => window.removeEventListener('animevault:close-drawer', close);
  }, []);
  const go = route => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('animevault:navigate', { detail: route }));
  };
  const item = ([label, Icon, route]) => (
    <button key={route} className="av-drawer-item" onClick={() => go(route)}>
      <Icon size={19} /><span>{label}</span><ChevronRight size={15} className="av-drawer-arrow" />
    </button>
  );
  return (
    <div className="av-mobile-v2">
      <header className="av-mobile-topbar">
        <button className="av-menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={23} /></button>
        <button className="av-mobile-brand" onClick={() => go('home')} aria-label="AnimeVault home"><span className="av-brand-mark"><Sparkles size={15} /></span><span>ANIMEVAULT</span></button>
        <button className="av-mobile-icon" onClick={() => go('notifications')} aria-label="Notifications"><Bell size={20} /></button>
      </header>

      <div className={`av-mobile-drawer-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`av-mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="av-drawer-head"><div className="av-drawer-brand"><span className="av-brand-mark"><Sparkles size={16} /></span><strong>ANIMEVAULT</strong></div><button className="av-mobile-icon" onClick={() => setOpen(false)} aria-label="Close menu"><X size={21} /></button></div>
        <div className="av-drawer-glow" />
        <nav className="av-drawer-content">
          <div className="av-drawer-label">DISCOVER</div>
          {DISCOVER.map(item)}
          <div className="av-drawer-divider" />
          <div className="av-drawer-label">YOUR VAULT</div>
          {VAULT.map(item)}
          <div className="av-drawer-divider" />
          {item(['Profile', User, 'profile'])}
          {item(['Settings', Settings, 'settings'])}
        </nav>
        <div className="av-drawer-footer">AnimeVault Android <span>V2</span></div>
      </aside>

      <main className="av-mobile-v2-content"><App /></main>
    </div>
  );
}
