import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppMobile from './AppMobile';
import ErrorBoundary from '../components/ErrorBoundary';
import { UserProvider } from '../api/UserContext';
import SubAccountGate from '../components/SubAccountGate';
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
