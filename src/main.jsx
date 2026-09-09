import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import PublicPasswordRoutes from './components/PublicPasswordRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import { isTvRuntime } from './utils/tvMode.js';
import { installChunkRecovery } from './utils/chunkRecovery.js';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import './styles.css';
import './styles/mobile-fixes.css';
import { UserProvider } from './api/UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

installChunkRecovery();
try {
  const FAVORITES_KEY='animevault_favorites';
  const rawFavorites=localStorage.getItem(FAVORITES_KEY);
  const parsedFavorites=rawFavorites?JSON.parse(rawFavorites):null;
  localStorage.setItem(FAVORITES_KEY,JSON.stringify({
    animes:Array.isArray(parsedFavorites?.animes)?parsedFavorites.animes:[],
    studios:Array.isArray(parsedFavorites?.studios)?parsedFavorites.studios:[],
    characters:Array.isArray(parsedFavorites?.characters)?parsedFavorites.characters:[],
  }));
}catch{try{localStorage.setItem('animevault_favorites',JSON.stringify({animes:[],studios:[],characters:[]}))}catch{}}

const isTouchDevice=typeof window!=='undefined'&&(navigator.maxTouchPoints>0||'ontouchstart'in window);
init({debug:false,visualDebug:false,nativeMode:!isTouchDevice&&isTvRuntime(),throttle:70});
if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.getRegistrations().then(registrations=>registrations.forEach(registration=>registration.unregister())).catch(()=>{})})}
const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:5*60*1000,refetchInterval:false,refetchOnWindowFocus:false,retry:2,retryDelay:attempt=>Math.min(1000*2**attempt,5000)}}});
const root=document.getElementById('root');
if(!root)throw new Error('AnimeVault: root element was not found. Check index.html.');
ReactDOM.createRoot(root).render(<React.StrictMode><ErrorBoundary><QueryClientProvider client={queryClient}><HashRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><UserProvider><PublicPasswordRoutes/></UserProvider></HashRouter></QueryClientProvider></ErrorBoundary></React.StrictMode>);
