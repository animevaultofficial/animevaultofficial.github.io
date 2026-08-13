import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppMobile from './AppMobile';
import ErrorBoundary from '../components/ErrorBoundary';
import { UserProvider } from '../api/UserContext';
import { assetPath } from '../utils/assetPath';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchInterval: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(assetPath('sw.js')).catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <AppMobile />
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
