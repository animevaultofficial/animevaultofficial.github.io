import React from 'react';
import { CalendarDays, Home, Library, Search, UserCircle } from 'lucide-react';

const ITEMS = [
  ['Home', Home, '/'],
  ['Explore', Search, '/search'],
  ['Library', Library, '/collections'],
  ['Schedule', CalendarDays, '/schedule'],
  ['Profile', UserCircle, '/profile'],
];

export default function MobileBottomNav({ pathname = '/', navigate }) {
  const active = path => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
  return (
    <nav className="av-mobile-bottom-nav" aria-label="Primary navigation">
      {ITEMS.map(([label, Icon, path]) => {
        const isActive = active(path);
        return <button key={path} type="button" className={`av-mobile-bottom-item ${isActive ? 'is-active' : ''}`} aria-current={isActive ? 'page' : undefined} aria-label={label} onClick={() => navigate(path)}>
          <span className="av-mobile-bottom-icon"><Icon size={22} strokeWidth={isActive ? 2.4 : 2} /></span>
          <span>{label}</span>
        </button>;
      })}
    </nav>
  );
}
