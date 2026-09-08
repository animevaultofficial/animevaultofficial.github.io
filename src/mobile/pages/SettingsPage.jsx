import React, { useEffect, useState } from 'react';
import { ArrowLeft, Palette, User, Bell, Cog, Save, Download, Upload, Play, Type, Shield, RotateCcw, ChevronRight, Check, Smartphone } from 'lucide-react';
import { APP_VERSION } from '../../version.js';
import { assetPath } from '../../utils/assetPath';
import { applyAccentColor, applyTheme, ACCENT_PRESETS } from '../../utils/appearance';
import { storage } from '../../utils/storage';
import { useUser } from '../../api/UserContext';
import { notificationsEnabled, requestMobileNotificationPermission, showMobileNotification, cancelAllMobileNotifications } from '../notifications/mobileNotifications';

const ACCENTS = ACCENT_PRESETS.map(({ id, color, label }) => ({ id, color, label }));
const THEMES = [
  { id: 'dark', label: 'Dark', bg: '#09090b', surface: '#15151a' },
  { id: 'amoled', label: 'AMOLED', bg: '#000', surface: '#0a0a0a' },
  { id: 'mocha', label: 'Mocha', bg: '#100c0a', surface: '#1b1512' },
  { id: 'slate', label: 'Slate', bg: '#0d1117', surface: '#161b22' },
  { id: 'light', label: 'Light', bg: '#ededf0', surface: '#fafafd' },
];
const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };

function Row({ icon: Icon, title, desc, children, onClick }) {
  return <button type="button" className={`av-v2-pref-row ${onClick ? 'clickable' : ''}`} onClick={onClick} disabled={!onClick && !children}>
    <span className="av-v2-pref-icon"><Icon size={17} /></span><span className="av-v2-pref-copy"><strong>{title}</strong>{desc && <small>{desc}</small>}</span><span className="av-v2-pref-control">{children || <ChevronRight size={17} />}</span>
  </button>;
}
function Toggle({ on, onChange, label }) { return <button type="button" className={`av-v2-toggle ${on ? 'on' : ''}`} onClick={onChange} aria-label={label || 'Toggle'} aria-pressed={on}><span /></button>; }

export default function SettingsPage({ goBack }) {
  const { user, updateProfile } = useUser();
  const [tab, setTab] = useState('appearance');
  const [accent, setAccent] = useState(() => read('av_accent', 'red'));
  const [theme, setTheme] = useState(() => read('av_theme', 'dark'));
  const [font, setFont] = useState(() => read('av_font_size', 'medium'));
  const [notifications, setNotifications] = useState(() => read('av_notifications', 'true') === 'true');
  const [permission, setPermission] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [autoplay, setAutoplay] = useState(() => read('av_autoplay', 'true') === 'true');
  const [saveStatus, setSaveStatus] = useState('');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');

  useEffect(() => { document.documentElement.dataset.avFontSize = font; }, [font]);
  useEffect(() => { if (user) { setUsername(user.username || ''); setBio(user.bio || ''); } }, [user]);

  const saved = (text = 'Saved') => { setSaveStatus(text); window.setTimeout(() => setSaveStatus(''), 1500); };
  const setA = id => { setAccent(id); write('av_accent', id); applyAccentColor(id); saved(); };
  const setT = id => { setTheme(id); write('av_theme', id); applyTheme(id, storage.get('customThemeVars')); saved(); };
  const setF = id => { setFont(id); write('av_font_size', id); document.documentElement.dataset.avFontSize = id; saved(); };
  const toggleAutoplay = () => { const value = !autoplay; setAutoplay(value); write('av_autoplay', value); saved(value ? 'Autoplay on' : 'Autoplay off'); };

  const toggleNotifications = async () => {
    if (notifications) {
      setNotifications(false); write('av_notifications', false); cancelAllMobileNotifications(); saved('Notifications off'); return;
    }
    const result = await requestMobileNotificationPermission();
    setPermission(result);
    if (result === 'granted') { setNotifications(true); write('av_notifications', true); saved('Notifications enabled'); }
    else saved(result === 'denied' ? 'Permission denied' : 'Notifications unavailable');
  };

  const testNotification = async () => {
    const result = await requestMobileNotificationPermission();
    setPermission(result);
    if (result !== 'granted') { saved(result === 'denied' ? 'Permission denied' : 'Unavailable'); return; }
    write('av_notifications', true); setNotifications(true);
    showMobileNotification({ title: 'AnimeVault notifications work', body: 'Airing reminders are ready.', tag: 'animevault-test' });
    saved('Test sent');
  };

  const save = async () => { if (!user) return; try { await updateProfile({ username: username.trim() || user.username, bio }); saved('Profile saved'); } catch { setSaveStatus('Save failed'); } };
  const reset = () => { ['av_accent', 'av_theme', 'av_font_size', 'av_notifications', 'av_autoplay'].forEach(k => { try { localStorage.removeItem(k); } catch {} }); setAccent('red'); setTheme('dark'); setFont('medium'); setNotifications(true); setAutoplay(true); document.documentElement.dataset.avFontSize = 'medium'; applyAccentColor('red'); applyTheme('dark', storage.get('customThemeVars')); saved('Reset complete'); };
  const exportData = () => { try { const data = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('av_') || k?.startsWith('animevault_')) data[k] = localStorage.getItem(k); } const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.href = url; a.download = 'animevault-mobile-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); saved('Exported'); } catch { setSaveStatus('Export failed'); } };
  const importData = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json'; input.onchange = async () => { try { const file = input.files?.[0]; if (!file) return; const data = JSON.parse(await file.text()); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid'); Object.entries(data).forEach(([k, v]) => { if (k.startsWith('av_') || k.startsWith('animevault_')) write(k, v); }); setSaveStatus('Imported — reload to apply'); } catch { setSaveStatus('Invalid backup'); } }; input.click(); };

  const tabs = [['appearance', Palette, 'Appearance'], ['profile', User, 'Profile'], ['notifications', Bell, 'Notifications'], ['about', Cog, 'About']];
  return <div className="av-v2-settings">
    <div className="av-v2-settings-head"><button className="av-v2-back" onClick={goBack} aria-label="Back"><ArrowLeft size={19} /></button><div><h1>Settings</h1><span>Make AnimeVault yours</span></div>{saveStatus && <span className="av-v2-settings-status"><Check size={13} />{saveStatus}</span>}</div>
    <div className="av-v2-settings-tabs">{tabs.map(([id, Icon, label]) => <button key={id} className={`av-v2-settings-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div>

    {tab === 'appearance' && <><section className="av-v2-settings-section"><div className="av-v2-settings-title"><span>Accent Color</span><small>Choose your signature AnimeVault color</small></div><div className="av-v2-palette">{ACCENTS.map(a => <button key={a.id} className={`av-v2-swatch ${accent === a.id ? 'active' : ''}`} style={{ background: a.color }} onClick={() => setA(a.id)} aria-label={a.label} title={a.label}><span>{accent === a.id ? '✓' : ''}</span></button>)}</div></section><section className="av-v2-settings-section"><div className="av-v2-settings-title"><span>Theme</span><small>Changes apply immediately</small></div><div className="av-v2-themes">{THEMES.map(t => <button key={t.id} className={`av-v2-theme ${theme === t.id ? 'active' : ''}`} onClick={() => setT(t.id)}><div className="av-v2-theme-preview" style={{ background: t.bg }}><div style={{ background: t.surface }} /><i style={{ background: accent === 'red' ? '#ff176f' : 'var(--av-v2-pink)' }} /></div><span>{t.label}</span>{theme === t.id && <Check size={14} />}</button>)}</div></section><section className="av-v2-settings-section"><div className="av-v2-settings-title"><span>Reading & Playback</span><small>Preferences are saved on this device</small></div><Row icon={Type} title="Font Size" desc="Adjust text throughout the app"><select value={font} onChange={e => setF(e.target.value)} className="av-v2-mini-select"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></Row><Row icon={Play} title="Autoplay episodes" desc="Allow playback to start automatically"><Toggle on={autoplay} onChange={toggleAutoplay} /></Row></section></>}

    {tab === 'profile' && <section className="av-v2-settings-section">{user ? <><div className="av-v2-profile-mini"><img src={user.avatar || assetPath('logo.png')} alt="" /><div><strong>{user.username || 'AnimeVault User'}</strong><small>Edit your public profile details</small></div></div><label className="av-v2-label">Username</label><input className="av-v2-input" value={username} onChange={e => setUsername(e.target.value)} maxLength={40} /><label className="av-v2-label" style={{ marginTop: 14 }}>Bio</label><textarea className="av-v2-textarea" rows={4} value={bio} onChange={e => setBio(e.target.value)} maxLength={300} placeholder="Tell us about yourself..." /><div className="av-v2-char-count">{bio.length}/300</div><button className="av-v2-save" onClick={save}><Save size={15} /> Save Profile</button></> : <div className="av-v2-about"><User size={28} /><strong>Sign in to edit your profile</strong><span>Your AnimeVault profile settings will appear here.</span></div>}</section>}

    {tab === 'notifications' && <section className="av-v2-settings-section"><Row icon={Bell} title="Push Notifications" desc={permission === 'denied' ? 'Permission is blocked in Android settings' : 'New episodes, activity and important updates'}><Toggle on={notifications && notificationsEnabled()} onChange={toggleNotifications} /></Row><Row icon={Bell} title="Episode Reminders" desc="Schedule reminders from the Airing page"><span className="av-v2-status-pill">{notifications ? 'Ready' : 'Off'}</span></Row><button className="av-v2-save" style={{ marginTop: 14 }} onClick={testNotification}><Smartphone size={15} /> Test Notification</button><div className="av-v2-notice">Set a reminder on any airing card. AnimeVault will keep the reminder scheduled while the app is running and restore it when you return to the app.</div></section>}

    {tab === 'about' && <><section className="av-v2-settings-section av-v2-about-card"><div className="av-v2-about-logo">A</div><strong>AnimeVault</strong><span>Android V2 · Version {APP_VERSION}</span><p>Built for a fast, private and native-feeling anime experience.</p></section><section className="av-v2-settings-section"><Row icon={Shield} title="Privacy & Security" desc="External navigation protection is enabled" /><Row icon={Download} title="Backup your data" desc="Export your local AnimeVault preferences" onClick={exportData} /><Row icon={Upload} title="Restore a backup" desc="Import an AnimeVault JSON backup" onClick={importData} /><Row icon={RotateCcw} title="Reset app preferences" desc="Restore appearance and playback defaults" onClick={reset} /></section></>}
  </div>;
}
