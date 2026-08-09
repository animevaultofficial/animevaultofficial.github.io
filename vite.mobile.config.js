import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const mobileEntryPlugin = () => ({
  name: 'animevault-mobile-entry',
  enforce: 'pre',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace('./src/main.jsx', '/src/mobile/main.jsx');
    },
  },
});

export default defineConfig({
  plugins: [mobileEntryPlugin(), react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist-mobile',
    emptyOutDir: true,
  },
});
