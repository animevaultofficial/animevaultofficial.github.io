import React, { useState } from 'react';
import { ArrowLeft, Palette, User, Bell, Cog, Save, Download, Upload } from 'lucide-react';
import { APP_VERSION } from '../../version.js';
import { assetPath } from '../../utils/assetPath';
import { applyAccentColor, applyTheme, ACCENT_PRESETS } from '../../utils/appearance';
import { storage } from '../../utils/storage';
import { useUser } from '../../api/UserContext';

const ACCENTS = ACCENT_PRESETS.map(({ id, color, label }) => ({ id, color, label }));
const THEMES = [
  { id: 'dark', label: 'Dark', bg: '#0a0a0a', surface: '#111' },
  { id: 'amoled', label: 'AMOLED', bg: '#000', surface: '#0a0a0a' },
  { id: 'mocha', label: 'Mocha', bg: '#0e0b09', surface: '#1a1410' },
  { id: 'slate', label: 'Slate', bg: '#0d1117', surface: '#161b22' },
  { id: 'light', label: 'Light', bg: '#ebebed', surface: '#f8f8fa' },
];

function safeRead(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

export default function SettingsPage({ goBack }) {
  const { user, updateProfile } = useUser();
  const [tab, setTab] = useState('appearance');
  const [accent, setAccent] = useState(() => safeRead('av_accent', 'red'));
  const [theme, setTheme] = useState(() => safeRead('av_theme', 'dark'));
  const [notifEnabled, setNotifEnabled] = useState(() => safeRead('av_notifications', 'true') === 'true');
  const [saveStatus, setSaveStatus] = useState('');
  const [username, setUsername] = useState(user?.username || 'AnimeVault User');
  const [bio, setBio] = useState(user?.bio || '');

  const showSaved = () => { setSaveStatus('Saved!'); window.setTimeout(() => setSaveStatus(''), 1500); };
  const applyAccent = (id) => { setAccent(id); try { localStorage.setItem('av_accent', id); } catch {} applyAccentColor(id); showSaved(); };
  const applySelectedTheme = (id) => { setTheme(id); try { localStorage.setItem('av_theme', id); } catch {} applyTheme(id, storage.get('customThemeVars')); showSaved(); };
  const toggleNotifications = () => { const next = !notifEnabled; setNotifEnabled(next); try { localStorage.setItem('av_notifications', String(next)); } catch {} showSaved(); };
  const saveProfile = async () => { if (!user) return; await updateProfile({ username: username.trim() || user.username, bio }); showSaved(); };
  const exportData = () => {
    try {
      const payload = {};
      for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i); if (key?.startsWith('av_') || key?.startsWith('animevault_')) payload[key] = localStorage.getItem(key); }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'animevault-mobile-backup.json'; a.click(); URL.revokeObjectURL(url); showSaved();
    } catch { setSaveStatus('Export failed'); }
  };
  const importData = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid backup'); Object.entries(data).forEach(([key, value]) => { if (key.startsWith('av_') || key.startsWith('animevault_')) localStorage.setItem(key, String(value)); }); setSaveStatus('Imported — reload to apply'); } catch { setSaveStatus('Invalid backup'); } };
    input.click();
  };

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
      <div className="tab-bar">{tabs.map(t => { const Icon = t.icon; return <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><Icon size={14} /> {t.label}</button>; })}</div>
      {tab === 'appearance' && <div>
        <div className="section"><div className="section-title" style={{ fontSize: '.85rem', marginBottom: 8 }}>Accent Color</div><div className="palette-grid">{ACCENTS.map(a => <button key={a.id} className={`palette-swatch ${accent === a.id ? 'active' : ''}`} style={{ background: a.color }} onClick={() => applyAccent(a.id)} title={a.label} aria-label={a.label} />)}</div></div>
        <div className="section"><div className="section-title" style={{ fontSize: '.85rem', marginBottom: 8 }}>Theme</div><div className="grid-3">{THEMES.map(t => <button type="button" key={t.id} className={`theme-card ${theme === t.id ? 'active' : ''}`} onClick={() => applySelectedTheme(t.id)} style={{ color: 'inherit', textAlign: 'left' }}><div className="theme-card-preview" style={{ background: t.bg, border: '1px solid var(--border)' }}><div style={{ height: 20, background: t.surface, margin: 8, borderRadius: 4 }} /></div><div style={{ fontSize: '.75rem', fontWeight: 600 }}>{t.label}</div></button>)}</div></div>
        <div className="section"><div className="setting-row"><div><div className="setting-label">Font Size</div><div className="setting-desc">Adjust text size</div></div><select className="select-input" defaultValue="Medium" style={{ width: 'auto' }}><option>Small</option><option>Medium</option><option>Large</option></select></div></div>
      </div>}
      {tab === 'profile' && <div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}><div className="avatar-edit"><img src={user?.avatar || assetPath('logo.png')} alt="" /></div><p style={{ color: 'var(--text3)', fontSize: '.75rem', marginTop: 6 }}>Avatar changes are available from Profile</p></div>
        <div className="section"><div className="info-label" style={{ marginBottom: 4 }}>Username</div><input className="text-input" value={username} onChange={e => setUsername(e.target.value)} maxLength={40} style={{ marginBottom: 12 }} /><div className="info-label" style={{ marginBottom: 4 }}>Bio</div><textarea className="text-input" rows={3} value={bio} onChange={e => setBio(e.target.value)} maxLength={300} placeholder="Tell us about yourself..." style={{ marginBottom: 12, resize: 'vertical' }} /><button className="btn btn-primary" onClick={saveProfile} style={{ width: '100%' }}><Save size={16} /> Save Profile</button></div>
      </div>}
      {tab === 'notifications' && <div><div className="setting-row"><div><div className="setting-label">Push Notifications</div><div className="setting-desc">Get notified about new episodes</div></div><button type="button" className={`toggle ${notifEnabled ? 'on' : 'off'}`} onClick={toggleNotifications} aria-pressed={notifEnabled} /></div><div className="setting-row"><div><div className="setting-label">Reminders</div><div className="setting-desc">Episode airing reminders</div></div><button type="button" className="toggle on" aria-label="Reminders enabled" /></div><div className="setting-row"><div><div className="setting-label">Recommendations</div><div className="setting-desc">Personalized recommendations</div></div><button type="button" className="toggle on" aria-label="Recommendations enabled" /></div></div>}
      {tab === 'about' && <div><div className="info-card" style={{ marginBottom: 8 }}><div className="info-label">Version</div><div className="info-value">{APP_VERSION}</div></div><div className="info-card" style={{ marginBottom: 8 }}><div className="info-label">Build</div><div className="info-value">Mobile Android</div></div><div className="info-card" style={{ marginBottom: 16, textAlign: 'center', color: 'var(--text3)', fontSize: '.8rem' }}>Made with ❤️ by AnimeVault Team</div><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-ghost" onClick={exportData} style={{ flex: 1 }}><Download size={14} /> Export Data</button><button className="btn btn-ghost" onClick={importData} style={{ flex: 1 }}><Upload size={14} /> Import</button></div></div>}
    </div>
  );
}
