import React, { createContext, useEffect, useState, useCallback } from 'react';
import { applyTheme, applyAccentColor } from '../utils/appearance';
import { storage, STORAGE_KEYS } from '../utils/storage';

// Context to expose theme settings and setters
export const ThemeContext = createContext({
  theme: 'dark',
  accent: 'red',
  setTheme: () => {},
  setAccent: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => storage.get(STORAGE_KEYS.THEME) || 'dark');
  const [accent, setAccent] = useState(() => storage.get(STORAGE_KEYS.ACCENT_COLOR) || 'red');

  const apply = useCallback(() => {
    applyTheme(theme);
    applyAccentColor(accent);
  }, [theme, accent]);

  // Persist changes to storage and apply CSS variables
  const changeTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    storage.set(STORAGE_KEYS.THEME, newTheme);
  }, []);

  const changeAccent = useCallback((newAccent) => {
    setAccent(newAccent);
    storage.set(STORAGE_KEYS.ACCENT_COLOR, newAccent);
  }, []);

  // Apply on mount and when settings change
  useEffect(() => {
    apply();
  }, [apply]);

  // Listen for external theme change events (StreamBert style)
  useEffect(() => {
    const handler = () => apply();
    window.addEventListener('streambert:theme-changed', handler);
    return () => window.removeEventListener('streambert:theme-changed', handler);
  }, [apply]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        setTheme: changeTheme,
        setAccent: changeAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
