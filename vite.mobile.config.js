import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Android uses the dedicated mobile shell so the APK gets the mobile UI,
// navigation and mobile-specific styling instead of the desktop web shell.
// Naming the Rollup input "index" makes Vite emit dist-mobile/index.html,
// which is required by Capacitor's webDir.
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
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/mobile/index.html'),
      },
    },
  },
});
