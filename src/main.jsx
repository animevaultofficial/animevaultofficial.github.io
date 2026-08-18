import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isTvRuntime } from './utils/tvMode.js';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import './styles.css';
import { UserProvider } from './api/UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Spatial navigation is useful for TV/keyboard navigation, but it should not
// install its TV-oriented behaviour on ordinary touch devices.
const isTouchDevice =
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

init({
  debug: false,
  visualDebug: false,
  nativeMode: !isTouchDevice && isTvRuntime(),
  throttle: 70,
});

// Do not install the ad-blocking service worker in the web app.
// It intercepted arbitrary URL paths containing words such as "stats",
// "track", "target", and "ad", which can break legitimate API/media
// requests and is especially disruptive on mobile browsers. Existing
// registrations are removed once so an older deployed worker cannot keep
// intercepting requests after an update.
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
      // Mobile connections are frequently suspended/resumed. Avoid an
      // unconditional polling loop and refetch only when the app requests it.
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <UserProvider>
            <App />
          </UserProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);