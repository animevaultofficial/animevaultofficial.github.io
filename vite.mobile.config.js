// vite.mobile.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/mobile'),
  plugins: [react()],
  base: './', // ensure relative paths for Capacitor
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/mobile'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-mobile'), // separate output for mobile build
    emptyOutDir: true,
    rollupOptions: {
      // Exclude node built‑ins that cause issues in the mobile webview
      external: [],
    },
  },
});
/* Update package.json scripts */
// Add the following entry to "scripts" in package.json (do not duplicate existing keys):
// "android:build:mobile": "npm run generate-icons && cross-env ELECTRON=0 vite build --config vite.mobile.config.js && npm run android:sync && cd android && ./gradlew assembleRelease"
