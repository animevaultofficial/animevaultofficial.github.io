import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { probeMirrors } from './api/streaming';
import { init } from '@noriginmedia/norigin-spatial-navigation';

init({
  debug: false,
  visualDebug: false
});
import './styles.css';

import { UserProvider } from './api/UserContext';

// Probe streaming API mirrors in the background immediately on startup
// so health data is warm by the time a user opens an anime page.
probeMirrors().catch(() => {});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Register the ad-blocking service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      log('[SW] Ad-blocker registered');
    }).catch(err => {
      warn('[SW] Registration failed:', err.message);
    });
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <UserProvider>
            <App />
          </UserProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);