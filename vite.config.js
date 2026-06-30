import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Detect whether this is an Electron build. We check three signals so the
  // base path is always relative for packaged apps even if the user forgets
  // to set ELECTRON=1:
  //   1. process.env.ELECTRON === '1' (set by the electron:build scripts)
  //   2. the build mode is 'production' AND the active vite mode is electron
  //   3. we are building (not serving) for an electron-builder target
  const isWebOSBuild = !!process.env.WEBOS || mode === 'webos' || process.env.npm_lifecycle_event === 'webos:package';

  const isElectronBuild =
    !!process.env.ELECTRON ||
    process.env.npm_lifecycle_event?.startsWith('electron') ||
    (command === 'build' && (mode === 'electron' || !!process.env.npm_package_dependencies_electron));

  // GitHub Pages is served at the root of the user page
  // (https://animevaultofficial.github.io/), so the bundle's asset URLs
  // must be relative to "/". Override with VITE_BASE / GH_PAGES_BASE if you
  // ever need to host the bundle under a sub-path again.
  const ghPagesBase = process.env.VITE_BASE || process.env.GH_PAGES_BASE || '/';

  // CRITICAL: Electron loads index.html from inside the asar archive via the
  // file:// protocol. Absolute paths like "/assets/index.js" do not resolve
  // there, leaving the app stuck on a blank page. We therefore always use
  // RELATIVE paths ("../" for any future sub-path hosting) for Electron.
  const base = command === 'serve'
    ? '/' // dev server
    : (isElectronBuild || isWebOSBuild)
      ? './' // packaged apps load local files and need relative assets
      : ghPagesBase; // GitHub Pages absolute base

  if (command === 'build') {
    console.log(`[Vite] Build base path: "${base}" (electron: ${isElectronBuild}, webos: ${isWebOSBuild})`);
  }

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '/api'),
        },
      },
    },
    build: {
        outDir: isWebOSBuild ? 'dist-webos' : 'dist',
        rollupOptions: {
            // Only externalize bcryptjs for Electron builds (since it's Node-only there)
            external: isElectronBuild ? ['bcryptjs'] : [],
        },
    },
  };
});
