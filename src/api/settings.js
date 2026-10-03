
// Default settings
const DEFAULT_SETTINGS = {
  // Profile & Personalization
  username: '',
  email: '',
  bio: '',
  theme: 'dark',
  accentColor: '#ff1a75',
  fontSize: 'medium',
  profileVisibility: 'public',
  hideHistory: false,
  hideLikes: false,

  // Playback & Streaming
  defaultQuality: 'auto',
  autoplay: true,
  subtitleLanguage: 'en',
  subtitleFontSize: 'medium',
  subtitleOpacity: 0.8,
  audioLanguage: 'en',
  volumeNormalization: true,
  playbackSpeed: 1,
  autoResume: true,

  // Library & Collections
  favoriteGenres: [],
  defaultSortOrder: 'dateAdded',
  defaultCollectionPrivacy: 'private',
  autoAddContinueWatching: true,

  // Notifications
  pushNotifications: true,
  emailAlerts: true,
  emailMarketing: false,
  reminderTiming: '15min',

  // App Settings
  language: 'en',
  region: 'US',
  dataSaver: false,
  autoUpdates: true,
  hardwareAcceleration: true,

  // Discord RPC
  discordRpcEnabled: true,

  // Advanced
  analyticsEnabled: true,
  debugMode: false,
};

const SETTINGS_KEY = 'animevault_settings';
const isBrowser = typeof window !== 'undefined';

export function getSettings() {
  if (!isBrowser) return { ...DEFAULT_SETTINGS, favoriteGenres: [] };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const parsedSettings = stored ? JSON.parse(stored) : {};
    const savedSettings = parsedSettings && typeof parsedSettings === 'object'
      ? parsedSettings
      : {};
    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
      favoriteGenres: Array.isArray(savedSettings.favoriteGenres)
        ? savedSettings.favoriteGenres
        : [...DEFAULT_SETTINGS.favoriteGenres],
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return { ...DEFAULT_SETTINGS, favoriteGenres: [] };
  }
}

export function saveSettings(newSettings) {
  if (!isBrowser) return false;
  try {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

export function resetSettings() {
  if (!isBrowser) return false;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return true;
  } catch (e) {
    console.error('Failed to reset settings:', e);
    return false;
  }
}

export function updateSetting(key, value) {
  return saveSettings({ [key]: value });
}
