# Google AI Studio Prompt for AnimeVault

Use this prompt to generate or refactor the AnimeVault project in Google AI Studio. It includes app structure, auth flow, mobile build details, environment variables, page routes, and theme design.

---

## Project Summary

AnimeVault is a React + Vite anime streaming application with web and Capacitor mobile support. It uses Neon Auth and Neon DB, supports Cloudinary uploads, and has a direct database login/signup fallback on mobile. The app includes web pages, mobile pages, admin features, social features, and customizable theme styling.

---

## Required Files and Modules

- `src/App.jsx` — main app shell and routing
- `src/main.jsx` — React entry point with `HashRouter`, `QueryClientProvider`, `UserProvider`, and service worker registration
- `src/auth.js` — Neon Auth client with `Origin` fallback for Capacitor/mobile shells
- `src/api/UserContext.jsx` — auth context with web/neon auth and mobile DB fallback
- `src/api/db.js` — Neon DB wrapper and localStorage fallback for users, sessions, watch history, likes, reminders, settings, trending items
- `src/components/AuthModal.jsx` — login/signup modal with OTP and Google button
- `src/components/RequireAuth.jsx` and `src/components/RequireAdmin.jsx`
- `src/styles/designTokens.css` — theme tokens and global UI styles
- `src/mobile/pages/*` — mobile page components
- `vite.mobile.config.js` — mobile Vite build config
- `capacitor.config.json` — Capacitor mobile configuration
- `.env.example` — environment variable template

---

## Environment Variables

Use the following variables in `.env.local` or deployment secrets:

- `VITE_AUTH_PROXY_URL`
- `VITE_RENDER_AUTH_PROXY_URL`
- `VITE_NEON_AUTH_URL`
- `VITE_DATABASE_URL`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

---

## Auth Strategy

### Web
- Uses Neon Auth via `@neondatabase/auth`
- Supports email/password login/signup, OTP verification, and Google social login
- Uses optional auth proxy fallback via `proxyLogin`, `proxySignup`, and `proxyRestoreSession`
- Syncs Neon identity into local DB via `syncAuthSessionUser()`

### Mobile
- Detects Capacitor/native shell using `capacitor://`, `file://`, or `localhost` plus mobile user agent
- Bypasses Neon OAuth on mobile for direct DB auth
- Uses DB login/signup directly on mobile
- Uses Google login fallback by prompting for Google email and syncing to local DB
- Persists sessions with `user_sessions` and localStorage

---

## Database and LocalStorage

The app uses Neon Serverless DB when available, with localStorage fallback.

### Supported DB operations
- `userSignup`, `userLogin`
- `syncGoogleUserToDb`
- `createUserSession`, `restoreSession`, `deleteUserSession`
- Profile updates
- Watch history + continue watching
- Likes + favorites
- Reminders and notifications
- User settings
- Admin user listing/search
- Trending board and site settings
- Story and notes features
- Session/device management

### LocalStorage fallback
- Users cache
- Watch history
- Continue watching
- Likes
- Reminders
- Notifications
- Favorites
- Posts
- Friends and friend requests
- Media comments
- Settings

---

## Mobile Build Configuration

`vite.mobile.config.js` should include:
- `root: path.resolve(__dirname, 'src/mobile')`
- `base: './'`
- `outDir: path.resolve(__dirname, 'dist-mobile')`
- React plugin config
- alias `@` -> `src/mobile`

`capacitor.config.json` should include:
- `appId: com.animevault.app`
- `appName: AnimeVault`
- `webDir: dist-mobile`
- `bundledWebRuntime: false`
- `server.hostname: localhost`
- `server.androidScheme: https`

---

## Theme and UX

The app should use a polished dark theme with glassmorphism and brand accents:

- `--brand-primary`, `--brand-primary-light`, `--brand-primary-dark`
- `--bg`, `--surface`, `--surface2`, `--surface3`
- `--text`, `--text2`, `--text3`
- `--glass`, `--glass-border`
- `--red`, `--red2`, `--red-dim`, `--red-glow`
- buttons, cards, blur backgrounds, hover transitions
- responsive spacing and font scaling

---

## Pages and Routes

### Web pages
- Home
- Search
- Anime
- Anime details
- Manga home/details
- Dramas & Movies
- Movie Watch
- Schedule
- Collections
- Community
- Stats
- Notifications
- Settings
- Profile
- Download
- About
- Admin dashboard
- Forgot Password
- Set New Password
- Static pages: Contact, FAQ, Terms, Privacy, DMCA, Request Anime

### Mobile pages
- `HomePage.jsx`
- `ProfilePage.jsx`
- `SearchPage.jsx`
- `SettingsPage.jsx`
- `CollectionsPage.jsx`
- `NotificationsPage.jsx`
- `StatsPage.jsx`
- `UpdatesPage.jsx`
- `CommunityPage.jsx`
- `AnimeDetailsPage.jsx`
- `DramasMoviesPage.jsx`
- `DramaDetailPage.jsx`

---

## Prompt to Use in Google AI Studio

Use the following prompt exactly when asking Google AI Studio to produce or update this project:

```
I have an AnimeVault project: a React + Vite anime streaming app with web and Capacitor mobile targets. It should use Neon Auth and Neon DB for web auth and database storage, but on mobile it must bypass Neon OAuth and use direct DB login/signup + local session persistence.

The app should include:
- A main shell in `src/App.jsx` with navigation, mobile menu, announcements, maintenance mode, topbar search, and theme initialization.
- `src/main.jsx` rendering the app with `HashRouter`, `QueryClientProvider`, `UserProvider`, `ErrorBoundary`, spatial navigation initialization, and service worker registration.
- `src/auth.js` with Neon Auth client and a custom fetch wrapper that adds `Origin` fallback for Capacitor/native shells.
- `src/api/UserContext.jsx` providing auth methods, session restore, Google login fallback, and mobile-only DB auth.
- `src/api/db.js` providing Neon DB operations with localStorage fallback for users, auth sessions, watch history, likes, reminders, user settings, site settings, trending board, stories, notes, and social features.
- `src/components/AuthModal.jsx` with login, signup, OTP, and Google sign-in UI.
- Mobile pages in `src/mobile/pages/*`.
- `vite.mobile.config.js` and `capacitor.config.json` configured for a Capacitor webview build.
- `.env.example` listing `VITE_AUTH_PROXY_URL`, `VITE_RENDER_AUTH_PROXY_URL`, `VITE_NEON_AUTH_URL`, `VITE_DATABASE_URL`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.

Also include a polished dark theme in `src/styles/designTokens.css` using brand red accent styling, glass panels, and smooth transitions.

Make sure the web app uses Neon Auth for login/signup and Google social sign-in, while the mobile shell directly uses DB credentials and a Google email-sync fallback for login.
```

---

## Notes

- This prompt is intended for Google AI Studio or similar code-generation tools.
- It covers both app architecture and platform-specific behavior.
- If you want a shorter version for quick copy/paste, create a condensed version from this file.
