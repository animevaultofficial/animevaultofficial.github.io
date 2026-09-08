import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import App from './AppMobile';
import ErrorBoundary from '../components/ErrorBoundary';
import { UserProvider } from '../api/UserContext';
import { isTvRuntime } from '../utils/tvMode.js';
import { installChunkRecovery } from '../utils/chunkRecovery.js';
import { installMobileNavigationGuard } from './security/mobileNavigationGuard.js';
import '../styles.css';
import '../styles/mobile-fixes.css';
import './mobile-v2.css';
import './mobile-v2-shell.css';
import './mobile-v2-details.css';

installChunkRecovery();
installMobileNavigationGuard();

try {
  const key = 'animevault_favorites';
  const raw = localStorage.getItem(key);
  const parsed = raw ? JSON.parse(raw) : null;
  localStorage.setItem(key, JSON.stringify({
    animes: Array.isArray(parsed?.animes) ? parsed.animes : [],
    studios: Array.isArray(parsed?.studios) ? parsed.studios : [],
    characters: Array.isArray(parsed?.characters) ? parsed.characters : [],
  }));
} catch {
  try { localStorage.setItem('animevault_favorites', JSON.stringify({ animes: [], studios: [], characters: [] })); } catch {}
}

const isTouchDevice = typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
init({ debug: false, visualDebug: false, nativeMode: !isTouchDevice && isTvRuntime(), throttle: 70 });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister())).catch(() => {});
  });
}

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchInterval: false, refetchOnWindowFocus: false, retry: 2, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000) } } });
const root = document.getElementById('root');
if (!root) throw new Error('AnimeVault Android: root element was not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <UserProvider><App /></UserProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
