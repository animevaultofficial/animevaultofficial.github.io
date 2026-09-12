import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '../api/UserContext';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import ErrorBoundary from '../components/ErrorBoundary';
import SubAccountGate from '../components/SubAccountGate';
import { installChunkRecovery } from '../utils/chunkRecovery.js';
import AppMobile from './AppMobile';
import '../styles.css';
import '../styles/mobile-fixes.css';

installChunkRecovery();

try {
  const FAVORITES_KEY = 'animevault_favorites';
  const raw = localStorage.getItem(FAVORITES_KEY);
  const parsed = raw ? JSON.parse(raw) : null;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify({
    animes: Array.isArray(parsed?.animes) ? parsed.animes : [],
    studios: Array.isArray(parsed?.studios) ? parsed.studios : [],
    characters: Array.isArray(parsed?.characters) ? parsed.characters : [],
  }));
} catch {
  try {
    localStorage.setItem('animevault_favorites', JSON.stringify({ animes: [], studios: [], characters: [] }));
  } catch {}
}

init({ debug: false, visualDebug: false, nativeMode: false, throttle: 70 });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    }).catch(() => {});
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('AnimeVault: mobile root element was not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <UserProvider>
            <SubAccountGate>
              <AppMobile />
            </SubAccountGate>
          </UserProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
