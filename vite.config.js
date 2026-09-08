import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import mangaApiApp from './api/manga.js';
import allAnimeApiApp from './api/allanime.js';
import hcaptchaApiApp from './api/hcaptcha.js';

export default defineConfig(({ command, mode }) => {
  const isWebOSBuild = !!process.env.WEBOS || mode === 'webos' || process.env.npm_lifecycle_event === 'webos:package';
  const isElectronBuild = !!process.env.ELECTRON || process.env.npm_lifecycle_event?.startsWith('electron') || (command === 'build' && (mode === 'electron' || !!process.env.npm_package_dependencies_electron));
  const ghPagesBase = process.env.VITE_BASE || process.env.GH_PAGES_BASE || '/';
  const base = command === 'serve' ? '/' : (isElectronBuild || isWebOSBuild) ? './' : ghPagesBase;
  if (command === 'build') console.log(`[Vite] Build base path: "${base}" (electron: ${isElectronBuild}, webos: ${isWebOSBuild})`);

  return {
    plugins: [
      react(),
      {
        name: 'animevault-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/manga')) return mangaApiApp(req, res, next);
            if (req.url?.startsWith('/api/allanime')) return allAnimeApiApp(req, res, next);
            if (req.url?.startsWith('/api/hcaptcha')) return hcaptchaApiApp(req, res, next);
            next();
          });
        }
      }
    ],
    base,
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          bypass: req => {
            if (req.url?.startsWith('/api/manga') || req.url?.startsWith('/api/allanime') || req.url?.startsWith('/api/hcaptcha')) return req.url;
          },
          rewrite: p => p.replace(/^\/api/, '/api'),
        },
      },
    },
    build: {
      outDir: isWebOSBuild ? 'dist-webos' : 'dist',
      rollupOptions: { external: isElectronBuild ? ['bcryptjs'] : [] },
    },
  };
});
