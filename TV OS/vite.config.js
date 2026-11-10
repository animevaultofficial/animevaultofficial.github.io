import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  envDir: path.resolve(root, '..'),
  base: './',
  publicDir: path.resolve(root, '../public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(root, '../src'),
    },
  },
  build: { outDir: path.join(root, 'dist'), emptyOutDir: true, target: 'chrome79' },
});
