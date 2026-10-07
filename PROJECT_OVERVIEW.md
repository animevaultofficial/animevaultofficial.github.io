# AnimeVault — Project Overview

## What AnimeVault is

AnimeVault is a multi-platform entertainment discovery and playback application. It brings anime, movies, television and drama, and manga into one interface, with tools for finding titles, following a watch schedule, tracking activity, and managing family profiles.

The project combines a React single-page application with a dedicated Android interface, an Electron desktop client, and an LG webOS packaging target. It uses external catalog and media services rather than maintaining its own complete catalog or video library. The availability of metadata, streams, and other provider features therefore depends on those services.

## What I built

I built AnimeVault as more than a catalog page: it is a shared entertainment hub with distinct browsing and playback experiences for different devices. The application includes:

- A web experience with routing for discovery, search, anime, manga, movies and TV, profiles, community, and account tools.
- Anime and live-action discovery backed by external catalog and metadata APIs.
- Dedicated title pages and players, plus a manga catalog and chapter-reading flow.
- Search, schedules, collections, notifications, watch history, likes, and continue-watching support.
- Sign-in and account features, including multiple household profiles and kids-profile content filtering.
- Platform-specific applications: Electron desktop, Capacitor Android, and LG webOS builds.
- Desktop integrations such as auto-updates, downloads, optional Discord Rich Presence, and scheduled-backup support.

## Main user features

### Discover and search

- Mixed home page featuring anime, movies, and TV.
- Separate anime and movies/TV browse pages, with genre controls and curated kids content.
- Cross-catalog search for anime and live-action media, with result filtering, sorting, and pagination.
- Anime schedule and upcoming-episode views.
- Manga discovery and search.

### Title, playback, and reading

- Anime detail pages with normalized metadata and available episode information.
- Anime and movie/TV watch routes with player integrations.
- Movie and TV detail pages, including season selection for series.
- Manga detail pages, chapter lists, and chapter reading.
- Playback integrations use third-party media services; AnimeVault itself is not a hosted video library.

### Accounts and personalization

- Authentication flows and account/profile screens.
- Household subprofiles, including kids and adult profile types.
- Profile-aware age filtering across browse, search, schedules, title pages, and playback checks.
- Watch history, continue-watching progress, likes, reminders, collections, and statistics.
- Community and social profile features, including posts, comments, and profile connections.
- Settings for appearance and other account preferences.

The app stores some state locally and can synchronize supported account data through its configured database and auth services. A signed-in account and the required service configuration are needed for account-dependent behavior.

### Desktop and device features

- **Web:** responsive React application deployed through GitHub Pages.
- **Desktop:** Electron wrapper for Windows, macOS, and Linux, with native downloads, update handling, notifications, optional Discord Rich Presence, and desktop storage/backup bridges.
- **Android:** a separately composed mobile interface under `src/mobile`, packaged through Capacitor rather than simply shrinking the desktop layout.
- **LG webOS:** a dedicated Vite build mode and packaging script for webOS application packages.
- **TV navigation:** spatial-navigation support and a TV mode for remote-friendly interaction.

## Technology

| Area | Technologies and services |
| --- | --- |
| UI | React 18, JSX, CSS, Lucide and React Icons |
| Build and development | Vite 5, `@vitejs/plugin-react`, Node.js |
| Routing | React Router with hash-based routing |
| Data fetching and cache | TanStack Query, browser fetch, Axios, GraphQL Request |
| Anime metadata | AniList, Ani.pm, with Kitsu/Jikan integrations in the API layer |
| Movies and TV metadata | TMDB |
| Manga sources | AniList, MangaDex, MangaKakalot integrations |
| Playback | Vidstack, HLS.js, and configured third-party playback sources |
| Account and persistence | Neon Auth, Neon serverless PostgreSQL, local storage |
| Desktop | Electron, Electron Builder, Electron Updater |
| Mobile | Capacitor and Android |
| Tests | Vitest and jsdom |
| Hosting and automation | GitHub Pages and GitHub Actions |

## Architecture at a glance

### Application entry points

- [`src/main.jsx`](./src/main.jsx) starts the web/desktop React application, applies shared providers, and mounts the hash router.
- [`src/App.jsx`](./src/App.jsx) defines the primary web routes, shared navigation, lazy-loaded pages, and the subaccount gate.
- [`src/mobile/main.jsx`](./src/mobile/main.jsx) starts the mobile application with its own providers and routing shell.
- [`src/mobile/AppMobile.jsx`](./src/mobile/AppMobile.jsx) provides the mobile-specific navigation and screen composition.
- [`electron/main.cjs`](./electron/main.cjs) owns the Electron main process and native desktop lifecycle.
- [`electron/preload.cjs`](./electron/preload.cjs) exposes a limited bridge of desktop capabilities to the renderer.

### Source organization

| Directory | Responsibility |
| --- | --- |
| [`src/pages/`](./src/pages/) | Web pages for browsing, details, playback, accounts, and community features |
| [`src/components/`](./src/components/) | Shared UI, player, profile, auth, and navigation components |
| [`src/hooks/`](./src/hooks/) | Reusable React behavior, including anime detail loading and reminder notifications |
| [`src/api/`](./src/api/) | Client integrations for catalogs, authentication, database, streaming, and schedules |
| [`src/utils/`](./src/utils/) | Shared helpers for storage, age ratings, appearance, routing support, and platform bridges |
| [`src/mobile/`](./src/mobile/) | Android-oriented app shell, pages, UI, and mobile API adapters |
| [`api/`](./api/) | API handlers used by the Vite development middleware and serverless/deployment setups |
| [`electron/`](./electron/) | Electron main process, preload bridge, and IPC modules |
| [`scripts/`](./scripts/) | Build, packaging, icon, signing, and verification scripts |
| [`.github/workflows/`](./.github/workflows/) | Deployment and automated build/release workflows |

### Data flow

The React pages call focused API modules in `src/api`. Those modules obtain catalog metadata and playback information from external services. Account and activity functions in `src/api/db.js` use Neon PostgreSQL when configured and include local-storage-backed behavior for supported data. Neon Auth owns password, Google, and email-OTP sign-in; successful legacy password logins are migrated to a Neon Auth identity while retaining the existing AnimeVault user ID and associated data. The app requires the matching Neon Auth methods to be enabled at the configured endpoint. The installed Neon Auth client does not expose native MFA methods, so the legacy 2FA switch is disabled until Neon MFA is configured and supported by the client.

The mobile application shares selected data and account modules with the main app, but has its own screen implementations and styling. The Electron renderer uses the same general React application and invokes native capabilities through the preload bridge and IPC handlers.

## Routes and page areas

The primary web app includes routes for:

- `/` — mixed discovery home
- `/search` — search across supported catalogs
- `/anime` and `/anime/:id` — anime discovery and title details
- `/anime/:id/watch` — anime playback
- `/manga` and `/manga/:id` — manga discovery and title/reader flow
- `/dramas-movies`, `/media/:type/:id`, and `/watch/:type/:id` — live-action browsing, title details, and playback
- `/schedule` — airing schedule
- `/collections`, `/stats`, and `/notifications` — signed-in personal features
- `/community` and `/profile/:userid/*` — community and profile pages
- `/settings`, `/download`, and `/admin/*` — account settings, downloads, and administration
- Static information and account recovery routes

The router uses hash URLs (for example, `/#/anime`) to work with static hosting and packaged application builds.

## Local development

### Requirements

- Node.js `>=22.12.0` (the minimum declared in `package.json`)
- npm
- Optional service credentials/configuration for features that depend on external APIs, authentication, database access, or uploads

### Start the web application

```bash
npm install
npm run dev
```

Vite starts the development server on port `5173`. The Vite configuration also wires selected local API middleware used during development.

### Test and build

```bash
npm test
npm run build
```

`npm test` runs the Vitest suite. `npm run build` creates the standard web build in `dist/`.

### Other build targets

```bash
npm run electron:dev
npm run electron:build
npm run webos:build
npm run webos:package
```

Electron packaging may require platform-specific setup and signing credentials, especially on Windows. The webOS packaging command also requires the webOS SDK packaging utility. Android uses the separate `vite.mobile.config.js` entry and Capacitor configuration; APK creation depends on the Android toolchain and project workflow.

## Configuration

The app reads optional build-time configuration through Vite environment variables. The names currently referenced in the source include:

- `VITE_NEON_AUTH_URL` — Neon Auth endpoint
- `VITE_DATABASE_URL` — Neon PostgreSQL connection configuration
- `VITE_AUTH_PROXY_URL` or `VITE_RENDER_AUTH_PROXY_URL` — optional auth proxy
- `VITE_HCAPTCHA_SITEKEY` — optional hCaptcha site key
- `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` — profile/story image uploads
- `VITE_MANGA_API_URL` and `VITE_MANGADEX_CORS_PROXY` — manga API/proxy configuration
- `VITE_CONSUMET_API_URL`, `VITE_API_CORS_PROXY`, `VITE_ANFIRE_EPISODE_API_URL`, and `VITE_ANFIRE_API_KEY` — optional streaming/API integrations
- `VITE_MEDIA_SOURCE_API` — mobile media-source API
- `VITE_BASE` or `GH_PAGES_BASE` — web deployment base path

Not every feature requires every variable. Use `.env.example` and the relevant API module as the source of truth when configuring a deployment. Any value exposed as a `VITE_` variable can be included in the client bundle; do not place server-only secrets in frontend variables.

## Deployment and releases

- The web deployment workflow builds the Vite application and publishes `dist/` to GitHub Pages.
- Desktop/Android build automation is defined in the GitHub Actions workflows and release documentation.
- Electron Builder creates desktop installers for supported operating systems; update metadata is used by the desktop updater.
- The webOS target builds into `dist-webos/` and packages an IPK through the webOS tooling.
- App version metadata is maintained in `package.json` and used by platform packaging.

See [`README_RELEASES.md`](./README_RELEASES.md) for the repository's release workflow notes.

## Project boundaries and expectations

- AnimeVault is an application and integration layer, not a first-party video hosting service.
- Catalog metadata, playback sources, and availability can change independently because they are supplied by external providers.
- Some account, upload, and playback features are conditional on environment configuration and provider availability.
- The web, desktop, mobile, and webOS targets share product concepts but do not all use identical page implementations.
- Kids-profile filters provide an application-level content gate based on known ratings and metadata; they are not a substitute for parental supervision or a provider-side guarantee.

## Useful files

- [`README.md`](./README.md) — existing project introduction and screenshots
- [`README_RELEASES.md`](./README_RELEASES.md) — automated installer/release overview
- [`package.json`](./package.json) — scripts, dependencies, engines, and desktop packaging configuration
- [`vite.config.js`](./vite.config.js) — main web build and development configuration
- [`vite.mobile.config.js`](./vite.mobile.config.js) — dedicated mobile build configuration
- [`capacitor.config.json`](./capacitor.config.json) — Capacitor app configuration
- [`src/utils/ageRating.js`](./src/utils/ageRating.js) — shared profile age-rating rules
- [`src/api/UserContext.jsx`](./src/api/UserContext.jsx) — shared account and user state
