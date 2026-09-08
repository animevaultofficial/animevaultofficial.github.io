import React, { useEffect, useState } from 'react';
import { Menu, X, Home, Search, Library, CalendarDays, Bell, Heart, History, Download, Users, User, Settings, ChevronRight, Sparkles } from 'lucide-react';
import App from '../App';

const NAV = [
  ['Home', Home, '/'], ['Explore', Search, '/search'], ['Library', Library, '/collections'], ['Schedule', CalendarDays, '/schedule'],
];
const VAULT = [
  ['Continue Watching', History, '/'], ['Favorites', Heart, '/collections'], ['Downloads', Download, '/download'], ['Notifications', Bell, '/notifications'], ['Community', Users, '/community'],
];

export default function AppMobile() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('animevault:close-drawer', close);
    return () => window.removeEventListener('animevault:close-drawer', close);
  }, []);

  const go = path => {
    setOpen(false);
    const next = `#${path}`;
    if (window.location.hash === next) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    window.location.hash = next;
  };

  const renderItem = ([label, Icon, path]) => (
    <button key={`${label}-${path}`} className="av-drawer-item" onClick={() => go(path)}>
      <Icon size={19} /><span>{label}</span><ChevronRight size={15} className="av-drawer-arrow" />
    </button>
  );

  return (
    <div className="av-mobile-v2">
      <header className="av-mobile-topbar">
        <button className="av-menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={23} /></button>
        <button className="av-mobile-brand" onClick={() => go('/')} aria-label="AnimeVault home"><span className="av-brand-mark"><Sparkles size={15} /></span><span>ANIMEVAULT</span></button>
        <button className="av-mobile-icon" onClick={() => go('/notifications')} aria-label="Notifications"><Bell size={20} /></button>
      </header>

      <div className={`av-mobile-drawer-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`av-mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="av-drawer-head"><div className="av-drawer-brand"><span className="av-brand-mark"><Sparkles size={16} /></span><strong>ANIMEVAULT</strong></div><button className="av-mobile-icon" onClick={() => setOpen(false)} aria-label="Close menu"><X size={21} /></button></div>
        <div className="av-drawer-glow" />
        <nav className="av-drawer-content">
          <div className="av-drawer-label">DISCOVER</div>
          {NAV.map(renderItem)}
          <div className="av-drawer-divider" />
          <div className="av-drawer-label">YOUR VAULT</div>
          {VAULT.map(renderItem)}
          <div className="av-drawer-divider" />
          {renderItem(['Profile', User, '/profile'])}
          {renderItem(['Settings', Settings, '/settings'])}
        </nav>
        <div className="av-drawer-footer">AnimeVault Android <span>V2</span></div>
      </aside>

      <main className="av-mobile-v2-content"><App /></main>
    </div>
  );
}
