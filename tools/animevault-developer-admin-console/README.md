# AnimeVault Developer Admin Console

A standalone Windows console for managing and diagnosing the AnimeVault project. **You do not need to clone or download the AnimeVault repository to install or open the console.**

## One-command installation

Open PowerShell or Windows Terminal and run:

```powershell
irm https://raw.githubusercontent.com/animevaultofficial/animevaultofficial.github.io/main/tools/animevault-developer-admin-console/install.ps1 | iex
```

Then open a **new** terminal window and run:

```powershell
animevault
```

The installer downloads the console program into `%LOCALAPPDATA%\Programs\AnimeVaultDeveloperAdminConsole`, installs the `animevault` command into `%USERPROFILE%\bin`, and adds that folder to your user PATH. It does not require administrator privileges or a local repository checkout.

## Requirements

- Windows 10/11
- Node.js 22.12+ (recommended; Node.js must be available as `node`)
- Git for repository operations

## Project files are optional at installation

The console opens independently. Choose **[P] Link / change local AnimeVault project folder** when you have a local checkout. The selected path is saved in your user profile, so you only need to link it once.

Repository-specific actions such as running tests, building the site, launching Vite, editing local environment setup, or using Git require the project files. Installing the console does not silently clone the repository.

## Features

- Launch the local Vite development server and open the site
- Run existing unit tests and the production build
- Probe AniList and AllAnime and check local API routes
- Check `.env.local` without printing secret values
- Create `.env.local` from `.env.example`
- Install dependencies, inspect Git status/log, and pull `main`
- Open the production website
- Remember the linked project folder between launches

## Update or uninstall

Run the one-command installation again to replace the installed console with the latest version.

To uninstall, delete:
- `%LOCALAPPDATA%\Programs\AnimeVaultDeveloperAdminConsole`
- `%USERPROFILE%\bin\animevault.cmd`

You can remove `%USERPROFILE%\bin` from your user PATH if no other commands use it.

## Environment safety

The console does not print environment variable values. Review all placeholders before using `.env.local`. Do not commit `.env.local`. Any `VITE_*` variable is exposed to frontend code, so never put private secrets or database credentials in those variables.

The API lab performs reachability checks, not full end-to-end proof of login, OTP, playback, or third-party service reliability.
