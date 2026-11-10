import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import allAnimeApiApp from '../api/allanime.js';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  envDir: path.resolve(root, '..'),
  base: './',
  publicDir: path.resolve(root, '../public'),
  plugins: [
    react(),
    {
      name: 'animevault-tv-allanime-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/api/allanime')) return allAnimeApiApp(req, res, next);
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(root, '../src'),
    },
  },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  build: { outDir: path.join(root, 'dist'), emptyOutDir: true, target: 'chrome79' },
});
