import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Android intentionally builds the same React entry used by the web app.
// The app's responsive CSS/mobile navigation then adapts the full feature set
// for phones, instead of shipping the reduced legacy src/mobile shell.
export default defineConfig({
  plugins: [react()],
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
