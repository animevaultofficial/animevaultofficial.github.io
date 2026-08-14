import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Build the dedicated mobile shell with src/mobile as the Vite root.
// This guarantees the HTML entry is emitted directly as dist-mobile/index.html,
// which is the directory Capacitor uses as its webDir.
export default defineConfig({
  root: path.resolve(__dirname, 'src/mobile'),
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-mobile'),
    emptyOutDir: true,
  },
});
