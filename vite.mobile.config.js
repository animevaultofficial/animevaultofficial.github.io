import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Android uses the dedicated mobile shell so the APK gets the mobile UI,
// navigation and mobile-specific styling instead of the desktop web shell.
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
      input: path.resolve(__dirname, 'src/mobile/index.html'),
    },
  },
});
