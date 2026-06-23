import React, { useState, useEffect } from 'react';
import { ArrowLeft, Palette, User, Shield, Bell, Cog, RefreshCw, Save, Download, Upload, Eye, EyeOff, Check, X, Camera } from 'lucide-react';
import { APP_VERSION } from '../../version.js';

const ACCENTS = [
  { id: 'red', color: '#e50914', label: 'Red' },
  { id: 'blue', color: '#2563eb', label: 'Blue' },
  { id: 'purple', color: '#7c3aed', label: 'Purple' },
  { id: 'green', color: '#059669', label: 'Green' },
  { id: 'orange', color: '#d97706', label: 'Orange' },
  { id: 'pink', color: '#db2777', label: 'Pink' },
];

const THEMES = [
  { id: 'dark', label: 'Dark', bg: '#0a0a0a', surface: '#111' },
  { id: 'amoled', label: 'AMOLED', bg: '#000', surface: '#0a0a0a' },
  { id: 'dim', label: 'Dim', bg: '#171717', surface: '#1f1f1f' },
];

export default function SettingsPage({ goBack }) {
  const [tab, setTab] = useState('appearance');
  const [accent, setAccent] = useState(() => localStorage.getItem('av_accent') || 'red');
  const [theme, setTheme] = useState(() => localStorage.getItem('av_theme') || 'dark');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  const applyAccent = (id) => {
    setAccent(id);
    localStorage.setItem('av_accent', id);
    const preset = ACCENTS.find(a => a.id === id);
    if (preset) {
      document.documentElement.style.setProperty('--brand', preset.color);
      document.documentElement.style.setProperty('--brand-dim', `${preset.color}26`);
    }
    showSaved();
  };

  const applyTheme = (id) => {
    setTheme(id);
    localStorage.setItem('av_theme', id);
    showSaved();
  };

  const showSaved = () => { setSaveStatus('Saved!'); setTimeout(() => setSaveStatus(''), 1500); };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'about', label: 'About', icon: Cog },
  ];

  return (
    <div className="mobile-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={goBack} className="btn btn-ghost" style={{ padding: '6px 10px' }}><ArrowLeft size={18} /></button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Settings</h2>
        {saveStatus && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>{saveStatus}</span>}
      </div>

      <div className="tab-bar">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Appearance */}
      {tab === 'appearance' && (
        <div>
          <div className="section">
            <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: 8 }}>Accent Color</div>
            <div className="palette-grid">
              {ACCENTS.map(a => (
                <button key={a.id} className={`palette-swatch ${accent === a.id ? 'active' : ''}`}
                  style={{ background: a.color }} onClick={() => applyAccent(a.id)} title={a.label} />
              ))}
            </div>
          </div>
          <div className="section">
            <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: 8 }}>Theme</div>
            <div className="grid-3">
              {THEMES.map(t => (
                <div key={t.id} className={`theme-card ${theme === t.id ? 'active' : ''}`} onClick={() => applyTheme(t.id)}>
                  <div className="theme-card-preview" style={{ background: t.bg, border: '1px solid var(--border)' }}>
                    <div style={{ height: 20, background: t.surface, margin: 8, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="section">
            <div className="setting-row">
              <div><div className="setting-label">Font Size</div><div className="setting-desc">Adjust text size</div></div>
              <select className="select-input" style={{ width: 'auto' }}>
                <option>Small</option><option selected>Medium</option><option>Large</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="avatar-edit">
              <img src="/logo.png" alt="" />
              <div className="avatar-overlay"><Camera size={20} /></div>
            </div>
            <p style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 6 }}>Tap to change avatar</p>
          </div>
          <div className="section">
            <div className="info-label" style={{ marginBottom: 4 }}>Username</div>
            <input className="text-input" defaultValue="AnimeVault User" style={{ marginBottom: 12 }} />
            <div className="info-label" style={{ marginBottom: 4 }}>Bio</div>
            <textarea className="text-input" rows={3} placeholder="Tell us about yourself..." style={{ marginBottom: 12, resize: 'vertical' }} />
            <button className="btn btn-primary" style={{ width: '100%' }}><Save size={16} /> Save Profile</button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div>
          <div className="setting-row">
            <div><div className="setting-label">Push Notifications</div><div className="setting-desc">Get notified about new episodes</div></div>
            <button className={`toggle ${notifEnabled ? 'on' : 'off'}`} onClick={() => setNotifEnabled(!notifEnabled)} />
          </div>
          <div className="setting-row">
            <div><div className="setting-label">Reminders</div><div className="setting-desc">Episode airing reminders</div></div>
            <button className="toggle on" />
          </div>
          <div className="setting-row">
            <div><div className="setting-label">Recommendations</div><div className="setting-desc">Personalized recommendations</div></div>
            <button className="toggle on" />
          </div>
        </div>
      )}

      {/* About */}
      {tab === 'about' && (
        <div>
          <div className="info-card" style={{ marginBottom: 8 }}>
            <div className="info-label">Version</div>
            <div className="info-value">{APP_VERSION}</div>
          </div>
          <div className="info-card" style={{ marginBottom: 8 }}>
            <div className="info-label">Build</div>
            <div className="info-value">Mobile Android</div>
          </div>
          <div className="info-card" style={{ marginBottom: 16, textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>
            Made with ❤️ by AnimeVault Team
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }}><Download size={14} /> Export Data</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}><Upload size={14} /> Import</button>
          </div>
        </div>
      )}
    </div>
  );
}