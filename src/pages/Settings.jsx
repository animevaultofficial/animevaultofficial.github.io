
import '../styles/settings.css';
import ToggleSwitch from '../components/ToggleSwitch';
import SettingsSelect from '../components/SettingsSelect';
import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Shield,
  Tv,
  BookOpen,
  Bell,
  Cog,
  Code,
  ArrowLeft,
  Save,
  RefreshCw,
  Trash2,
  Gamepad2,
  Globe,
  Palette,
  Volume2,
  Subtitles,
  Eye,
  EyeOff,
  BellRing,
  Database,
  Smartphone,
  Zap,
  BarChart3,
  AlertTriangle,
  Check,
  X,
  Download,
  Upload,
  Layout,
  GripVertical,
  EyeOff as EyeOffIcon,
  Eye as EyeIcon,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useUser } from '../api/UserContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  getSettings,
  saveSettings,
  resetSettings,
  toggle2FA,
  updateUsername,
  getUserDevices,
} from '../api/db';
import { storage } from '../utils/storage';
import {
  ACCENT_PRESETS,
  applyAccentColor,
  THEME_PRESETS,
  DEFAULT_CUSTOM_VARS,
  applyTheme,
} from '../utils/appearance';
import { collectBackupData, restoreBackupData, BACKUP_KEYS } from '../utils/backup';
import { HOME_ROWS, loadHomeLayout, saveHomeLayout } from '../utils/homeLayout';

const FONT_SIZES = ['small', 'medium', 'large'];
const QUALITIES = ['auto', '480p', '720p', '1080p', '4K'];
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const REMINDER_TIMINGS = ['15min', '30min', '1hour', '2hours'];
const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Thriller',
];
const SORT_ORDERS = ['dateAdded', 'name', 'rating'];
const LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'];
const REGIONS = ['US', 'CA', 'UK', 'EU', 'AU', 'JP', 'KR'];

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile } = useUser();
  const [settings, setSettings] = useState(getSettings());
  const [activeTab, setActiveTab] = useState('personalization');
  const [saveStatus, setSaveStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner || '');
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [emailInput, setEmailInput] = useState(user?.email || settings.email || '');
  const [bioInput, setBioInput] = useState(user?.bio || settings.bio || '');
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.two_factor_enabled || false);
  const [sessions, setSessions] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Appearance state
  const [accentColor, setAccentColor] = useState(
    storage.get('accentColor') || 'red'
  );
  const [theme, setTheme] = useState(storage.get('theme') || 'dark');
  const [customVars, setCustomVars] = useState(
    storage.get('customThemeVars') || DEFAULT_CUSTOM_VARS
  );
  const [fontSize, setFontSize] = useState(storage.get('fontSize') || 'medium');

  // Home customization state
  const [homeLayout, setHomeLayout] = useState(loadHomeLayout());

  // Block stats
  const [blockStats, setBlockStats] = useState({ blocked: 0, timestamp: 0 });

  const updateSettings = (changes) => {
    const updated = { ...getSettings(), ...changes };
    setSettings(updated);
    if (!saveSettings(updated)) setSaveStatus('Failed to save settings!');
  };

  useEffect(() => {
    setSettings(getSettings());
    // Load local storage settings
    setAccentColor(storage.get('accentColor') || 'red');
    setTheme(storage.get('theme') || 'dark');
    setCustomVars(storage.get('customThemeVars') || DEFAULT_CUSTOM_VARS);
    setFontSize(storage.get('fontSize') || 'medium');
    setHomeLayout(loadHomeLayout());

    // Load block stats if electron
    if (window.electron?.getBlockStats) {
      window.electron.getBlockStats().then(setBlockStats);
      const unsub = window.electron.onBlockedUpdate(setBlockStats);
      return unsub;
    }
  }, []);

  const handleSave = () => {
    const success = saveSettings(settings);
    if (success) {
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      setSaveStatus('Failed to save settings!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleViewSessions = async () => {
    if (!user?.id) return;
    setSessionsLoading(true);
    try {
      setSessions(await getUserDevices(user.id));
    } catch (error) {
      console.error('[AnimeVault Settings] Could not load active sessions:', error);
      setSessions([]);
      setSaveStatus('Could not load active sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      if (!resetSettings()) {
        setSaveStatus('Failed to reset settings!');
        return;
      }
      const newSettings = getSettings();
      setSettings(newSettings);
      setTheme('dark');
      setAccentColor('red');
      setCustomVars(DEFAULT_CUSTOM_VARS);
      setFontSize('medium');
      applyTheme('dark');
      applyAccentColor('red');
      document.documentElement.style.fontSize = '16px';
      storage.set('theme', 'dark');
      storage.set('accentColor', 'red');
      storage.set('fontSize', 'medium');
      storage.remove('customThemeVars');
      const defaultLayout = {
        order: HOME_ROWS.map((row) => row.id),
        visible: Object.fromEntries(HOME_ROWS.map((row) => [row.id, true])),
      };
      setHomeLayout(defaultLayout);
      saveHomeLayout(defaultLayout.order, defaultLayout.visible);
      setSaveStatus('Settings reset!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const profile = {
        avatar: avatarUrl,
        banner: bannerUrl,
        email: emailInput,
        bio: bioInput,
      };

      await updateProfile(profile);
      updateSettings({ email: emailInput, bio: bioInput });

      if (usernameInput && usernameInput !== user.username) {
        const res = await updateUsername(user.id, usernameInput);
        if (!res.success) {
          setSaveStatus(res.message || 'Failed to update username');
          return;
        }
        await updateProfile({ ...profile, username: usernameInput.trim().toLowerCase().split('@')[0] });
      }
      setSaveStatus('Profile saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus('Failed to save profile');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };
 
    // Home customization handlers
  const toggleHomeRow = (id) => {
    const newVisible = { ...homeLayout.visible, [id]: !homeLayout.visible[id] };
    const newLayout = { ...homeLayout, visible: newVisible };
    setHomeLayout(newLayout);
    saveHomeLayout(newLayout.order, newLayout.visible);
  };

  const moveHomeRow = (index, direction) => {
    const newOrder = [...homeLayout.order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[index],
    ];
    const newLayout = { ...homeLayout, order: newOrder };
    setHomeLayout(newLayout);
    saveHomeLayout(newLayout.order, newLayout.visible);
  };

  // Backup handlers
  const handleExport = () => {
    const data = collectBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animevault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        restoreBackupData(data);
        alert('Backup imported! Please refresh to apply changes.');
      } catch {
        alert('Invalid backup file!');
      }
    };
    reader.readAsText(file);
  };

  

  const handleToggleGenre = (genre) => {
    const newGenres = settings.favoriteGenres.includes(genre)
      ? settings.favoriteGenres.filter(g => g !== genre)
      : [...settings.favoriteGenres, genre];
    updateSettings({ favoriteGenres: newGenres });
  };

  const tabs = [
    { id: 'personalization', label: 'Personalization', icon: Palette },
    { id: 'home', label: 'Home', icon: Layout },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'playback', label: 'Playback', icon: Tv },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'app', label: 'App Settings', icon: Cog },
    { id: 'advanced', label: 'Advanced', icon: Code },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="discord-settings-layout">
      {/* Sidebar */}
      <div className="discord-settings-sidebar"><div className="discord-sidebar-content">
        <Link to="/profile" className="discord-sidebar-item" style={{ marginBottom: "16px" }}>
          <ArrowLeft size={18} />
          Back to Profile
        </Link>

        <div className="discord-sidebar-category" style={{ marginBottom: "12px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}><SettingsIcon size={20} /> Settings</div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`discord-sidebar-item ${activeTab === tab.id ? "active" : ""}`}> <Icon size={18} /> {tab.label} </button>
          );
        })}
      </div>
      </div>
      {/* Main Content */}
      <div className="discord-settings-main"><div className="discord-main-content">
        {/* Save/Reset Buttons */}
        <div className="discord-settings-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "24px" }}>
          {saveStatus && (
            <span style={{
              alignSelf: 'center',
              color: saveStatus.includes('success') || saveStatus.includes('Saved') ? '#10b981' : '#ef4444',
              fontWeight: '600',
            }}>
              {saveStatus}
            </span>
          )}
          <button onClick={handleReset} className="discord-btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px" }}> <RefreshCw size={16} /> Reset to Defaults </button>
          <button onClick={handleSave} className="discord-btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}> <Save size={16} /> Save Changes </button>
        </div>

        {/* Tab Content */}
        <div className="discord-card" style={{ background: "transparent", padding: 0, border: "none" }}>
          {activeTab === 'personalization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Personalization</h2>

              <div>
                <label className="discord-input-label">
                  Theme
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={theme === t.id}
                      onClick={() => {
                        setTheme(t.id);
                        const vars = t.id === 'custom' ? customVars : undefined;
                        applyTheme(t.id, vars);
                        storage.set('theme', t.id);
                        updateSettings({ theme: t.id });
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: theme === t.id ? 'var(--red)' : 'rgba(255,255,255,0.05)',
                        color: theme === t.id ? '#fff' : 'var(--text-secondary)',
                        border: theme === t.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {theme === 'custom' && (
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="discord-section-subtitle" style={{ color: "Custom Colors" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Custom Colors</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {Object.entries(DEFAULT_CUSTOM_VARS).map(([key, _]) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {key.replace('--', '').replace(/-/g, ' ')}
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={customVars[key]}
                            onChange={(e) => {
                              const newVars = { ...customVars, [key]: e.target.value };
                              setCustomVars(newVars);
                              applyTheme('custom', newVars);
                              storage.set('customThemeVars', newVars);
                              updateSettings({ theme: 'custom' });
                            }}
                            style={{
                              width: '40px',
                              height: '40px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: 'transparent',
                            }}
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{customVars[key]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="discord-input-label">
                  Accent Color
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {ACCENT_PRESETS.map((a) => (
                    <button
                      key={a.id}
                      aria-label={`Accent color: ${a.label}`}
                      aria-pressed={accentColor === a.id}
                      onClick={() => {
                        setAccentColor(a.id);
                        applyAccentColor(a.id);
                        storage.set('accentColor', a.id);
                        updateSettings({ accentColor: a.id });
                      }}
                      title={a.label}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: a.color,
                        border: accentColor === a.id ? '3px solid #fff' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="discord-input-label">
                  Font Size
                </label>
                <SettingsSelect
                  value={fontSize}
                  ariaLabel="Font size"
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    storage.set('fontSize', e.target.value);
                    const sizeMap = { small: '14px', medium: '16px', large: '18px' };
                    document.documentElement.style.fontSize = sizeMap[e.target.value];
                    updateSettings({ fontSize: e.target.value });
                  }}
                  options={FONT_SIZES.map(size => ({ value: size, label: size.charAt(0).toUpperCase() + size.slice(1) }))}
                />
              </div>
            </div>
          )}

          {activeTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Home Page</h2>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Home Rows" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Home Rows</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {homeLayout.order.map((rowId, index) => {
                    const row = HOME_ROWS.find(r => r.id === rowId);
                    if (!row) return null;
                    return (
                      <div
                        key={row.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <GripVertical size={20} style={{ color: 'var(--text-secondary)', cursor: 'grab' }} />
                        <span style={{ flex: 1, fontWeight: '600' }}>{row.label}</span>
                        <button
                          aria-label={`Move ${row.label} up`}
                          onClick={() => moveHomeRow(index, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: index === 0 ? 'var(--text-secondary)' : '#fff',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.5 : 1,
                          }}
                        >
                          <Maximize2 size={16} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          aria-label={`Move ${row.label} down`}
                          onClick={() => moveHomeRow(index, 'down')}
                          disabled={index === homeLayout.order.length - 1}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: index === homeLayout.order.length - 1 ? 'var(--text-secondary)' : '#fff',
                            cursor: index === homeLayout.order.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === homeLayout.order.length - 1 ? 0.5 : 1,
                          }}
                        >
                          <Maximize2 size={16} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button
                          aria-label={`${homeLayout.visible[row.id] ? 'Hide' : 'Show'} ${row.label}`}
                          onClick={() => toggleHomeRow(row.id)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {homeLayout.visible[row.id] ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Profile Settings</h2>

              <div>
                <label className="discord-input-label">
                  Username
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="discord-input"
                />
              </div>

              <div>
                <label className="discord-input-label">
                  Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="discord-input"
                />
              </div>

              <div>
                <label className="discord-input-label">
                  Bio
                </label>
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  rows={4}
                  className="discord-input"
                />
              </div>

              <div>
                <label className="discord-input-label">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="discord-input"
                />
              </div>

              <div>
                <label className="discord-input-label">
                  Banner URL
                </label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="discord-input"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--red-glow)',
                  width: 'fit-content',
                }}
              >
                <Save size={16} />
                Update Profile
              </button>

              <div style={{ marginTop: '16px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Profile Visibility" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Profile Visibility</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <SettingsSelect
                      value={settings.profileVisibility}
                      ariaLabel="Profile visibility"
                      onChange={(e) => updateSettings({ profileVisibility: e.target.value })}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </SettingsSelect>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Profile visibility</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <ToggleSwitch
                        checked={settings.hideHistory}
                        ariaLabel="Hide watch history"
                        onChange={(val) => updateSettings({ hideHistory: val })}
                      />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hide watch history</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <ToggleSwitch
                        checked={settings.hideLikes}
                        ariaLabel="Hide likes and favorites"
                        onChange={(val) => updateSettings({ hideLikes: val })}
                      />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hide likes & favorites</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Security Settings</h2>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Password" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Password</h3>
                <button
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                >
                  Change Password
                </button>
              </div>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Two-Factor Authentication (2FA)" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Two-Factor Authentication (2FA)</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ToggleSwitch
                    checked={is2FAEnabled}
                    ariaLabel="Two-factor authentication"
                    onChange={async (val) => {
                      setIs2FAEnabled(val);
                      const success = await toggle2FA(user.id, val);
                      if (success) {
                        setSaveStatus(val ? '2-Step Verification Enabled!' : '2-Step Verification Disabled!');
                        setTimeout(() => setSaveStatus(''), 3000);
                      } else {
                        setIs2FAEnabled(!val);
                        setSaveStatus('Failed to update 2FA!');
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: is2FAEnabled ? 'var(--accent)' : 'var(--text-secondary)' }}>{is2FAEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Add an extra layer of security to your account
                </p>
              </div>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Session Management" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Session Management</h3>
                <button
                  onClick={handleViewSessions}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  View All Active Sessions
                </button>
                {sessionsLoading && <p className="discord-help-text">Loading active sessions…</p>}
                {!sessionsLoading && sessions?.length > 0 && (
                  <ul className="discord-session-list">
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <strong>{session.device_name || 'Unknown device'}</strong>
                        <span>
                          Last active {session.last_active
                            ? new Date(session.last_active).toLocaleString()
                            : 'unknown'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!sessionsLoading && sessions?.length === 0 && (
                  <p className="discord-help-text">No active sessions were found.</p>
                )}
              </div>

              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Danger Zone" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Danger Zone</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Permanently delete your account and all associated data
                </p>
                <button
                  onClick={() => navigate('/contact')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}

          {activeTab === 'playback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Playback Settings</h2>

              <div>
                <label className="discord-input-label">
                  Default Video Quality
                </label>
                <SettingsSelect
                      value={settings.defaultQuality}
                      ariaLabel="Default video quality"
                      onChange={(e) => updateSettings({ defaultQuality: e.target.value })}
                      options={QUALITIES.map(q => ({ value: q, label: q.charAt(0).toUpperCase() + q.slice(1) }))}
                    />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <ToggleSwitch
                      checked={settings.autoplay}
                      ariaLabel="Autoplay next episode"
                      onChange={(val) => updateSettings({ autoplay: val })}
                    />
                  <span style={{ fontSize: '0.95rem' }}>Autoplay next episode</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <ToggleSwitch
                      checked={settings.autoResume}
                      ariaLabel="Auto-resume from last position"
                      onChange={(val) => updateSettings({ autoResume: val })}
                    />
                  <span style={{ fontSize: '0.95rem' }}>Auto-resume from last position</span>
                </label>
              </div>

              <div>
                <label className="discord-input-label">
                  Default Playback Speed
                </label>
                <SettingsSelect
                  value={settings.playbackSpeed}
                  ariaLabel="Default playback speed"
                  onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                  options={PLAYBACK_SPEEDS.map(speed => ({ value: speed, label: `${speed}x` }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <h3 className="discord-section-subtitle" style={{ color: "Subtitles" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Subtitles</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="discord-input-label">
                        Default Language
                      </label>
                      <SettingsSelect
                        value={settings.subtitleLanguage}
                        ariaLabel="Subtitle language"
                        onChange={(e) => updateSettings({ subtitleLanguage: e.target.value })}
                        options={LANGUAGES.map(l => ({ value: l, label: l.toUpperCase() }))}
                      />
                    </div>

                    <div>
                      <label className="discord-input-label">
                        Font Size
                      </label>
                      <SettingsSelect
                        value={settings.subtitleFontSize}
                        ariaLabel="Subtitle font size"
                        onChange={(e) => updateSettings({ subtitleFontSize: e.target.value })}
                        options={FONT_SIZES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                      />
                    </div>

                    <div>
                      <label className="discord-input-label">
                        Background Opacity: {Math.round(settings.subtitleOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        aria-label="Subtitle background opacity"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.subtitleOpacity}
                        onChange={(e) => updateSettings({ subtitleOpacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', maxWidth: '400px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ flex: '1 1 300px' }}>
                  <h3 className="discord-section-subtitle" style={{ color: "Audio" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Audio</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="discord-input-label">
                        Default Language
                      </label>
                      <SettingsSelect
                        value={settings.audioLanguage}
                        ariaLabel="Default audio language"
                        onChange={(e) => updateSettings({ audioLanguage: e.target.value })}
                        options={LANGUAGES.map(l => ({ value: l, label: l.toUpperCase() }))}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                      <input
                        type="checkbox"
                        checked={settings.volumeNormalization}
                        onChange={(e) => updateSettings({ volumeNormalization: e.target.checked })}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.95rem' }}>Volume normalization</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Library & Collections</h2>

              <div>
                <label className="discord-input-label">
                  Favorite Genres
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      aria-pressed={settings.favoriteGenres.includes(genre)}
                      onClick={() => handleToggleGenre(genre)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        background: settings.favoriteGenres.includes(genre) ? 'var(--red)' : 'rgba(255,255,255,0.05)',
                        color: settings.favoriteGenres.includes(genre) ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="discord-input-label">
                  Default Sort Order
                </label>
                <SettingsSelect
                      value={settings.defaultSortOrder}
                    ariaLabel="Default sort order"
                      onChange={(e) => updateSettings({ defaultSortOrder: e.target.value })}
                      options={SORT_ORDERS.map(order => ({ value: order, label: order === 'dateAdded' ? 'Date Added' : order.charAt(0).toUpperCase() + order.slice(1) }))}
                    />
              </div>

              <div>
                <label className="discord-input-label">
                  Default Collection Privacy
                </label>
                <SettingsSelect
                      value={settings.defaultCollectionPrivacy}
                    ariaLabel="Default collection privacy"
                      onChange={(e) => updateSettings({ defaultCollectionPrivacy: e.target.value })}
                      options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]}
                    />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                <input
                  type="checkbox"
                  checked={settings.autoAddContinueWatching}
                  onChange={(e) => updateSettings({ autoAddContinueWatching: e.target.checked })}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.95rem' }}>Auto-add to Continue Watching</span>
              </label>

              <div style={{ marginTop: '16px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="discord-section-subtitle" style={{ color: "Backup & Restore" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Backup & Restore</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Backup your library, watch history, and settings to a JSON file
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleExport}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      background: 'var(--red)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Download size={16} />
                    Export Backup
                  </button>
                  <label style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Upload size={16} />
                    Import Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Notifications</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Push notifications</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={(e) => updateSettings({ emailAlerts: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Email alerts (new episodes, etc.)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.emailMarketing}
                    onChange={(e) => updateSettings({ emailMarketing: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Marketing emails</span>
                </label>
              </div>

              <div>
                <label className="discord-input-label">
                  Reminder Timing
                </label>
                <select
                  value={settings.reminderTiming}
                  onChange={(e) => updateSettings({ reminderTiming: e.target.value })}
                  className="discord-select"
                >
                  {REMINDER_TIMINGS.map((timing) => (
                    <option key={timing} value={timing}>
                      {timing === '15min' ? '15 minutes before' :
                       timing === '30min' ? '30 minutes before' :
                       timing === '1hour' ? '1 hour before' :
                       '2 hours before'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'app' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">App Settings</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
                <div>
                  <label className="discord-input-label">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    aria-label="App language"
                    onChange={(e) => updateSettings({ language: e.target.value })}
                    className="discord-select"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="discord-input-label">
                    Region
                  </label>
                  <select
                    value={settings.region}
                    aria-label="Region"
                    onChange={(e) => updateSettings({ region: e.target.value })}
                    className="discord-select"
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {window.electron && (
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="discord-section-subtitle" style={{ color: "Ad Blocker" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>Ad Blocker</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      padding: '16px',
                      background: 'var(--red-dim)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--red2)' }}>
                        {blockStats.blocked}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Ads Blocked
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.dataSaver}
                    onChange={(e) => updateSettings({ dataSaver: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Data saver mode</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoUpdates}
                    onChange={(e) => updateSettings({ autoUpdates: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Auto-updates (Electron only)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.hardwareAcceleration}
                    onChange={(e) => updateSettings({ hardwareAcceleration: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Hardware acceleration (Electron only)</span>
                </label>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '12px' }}>Cache</h3>
                <button
                  onClick={() => {
                    localStorage.removeItem('animevault_anilistCache');
                    localStorage.removeItem('animevault_episodeGroupCache');
                    localStorage.removeItem('animevault_aniskipCache');
                    alert('Cache cleared!');
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Database size={16} />
                  Clear Cache
                </button>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 className="discord-section-title">Advanced Settings</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.analyticsEnabled}
                    onChange={(e) => updateSettings({ analyticsEnabled: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Enable anonymous analytics</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={settings.debugMode}
                    onChange={(e) => updateSettings({ debugMode: e.target.checked })}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.95rem' }}>Debug mode</span>
                </label>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <h3 className="discord-section-subtitle" style={{ color: "API Keys (Coming Soon)" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>API Keys (Coming Soon)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Manage your API keys for developers
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
