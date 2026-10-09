# AnimeVault Developer Admin Console

Windows command-line control center for the `animevaultofficial/animevaultofficial.github.io` repository.

## Requirements

- Windows 10/11
- Node.js 22.12+ (recommended)
- Git
- Repository dependencies installed for tests/builds

## Install the `animevault` command

Run these commands from the repository root in PowerShell:

```powershell
git pull origin main
powershell -ExecutionPolicy Bypass -File .\tools\animevault-developer-admin-console\install.ps1
```

Open a **new** Windows Terminal window and run:

```powershell
animevault
```

The installer creates `%USERPROFILE%\bin\animevault.cmd` and adds that folder to the current user's PATH. It does not require administrator privileges. The command is tied to the repository location at install time; rerun the installer if you move the repository.

## Features

- Launch local Vite development server and open the site
- Run existing Vitest tests and production build
- Probe AniList and AllAnime and check local API routes
- Check `.env.local` without printing secret values
- Create `.env.local` from the existing `.env.example`
- Install dependencies, inspect Git status/log, pull `main`
- Open the production website

## Environment safety

Choose **E** inside the console to create `.env.local` from `.env.example`. Review all placeholder values before using the app. Do not commit `.env.local`. Any `VITE_*` variable is exposed to frontend code, so never place private secrets or database credentials in those variables.

The API lab performs reachability checks, not full end-to-end proof of login, OTP, playback, or third-party service reliability.
