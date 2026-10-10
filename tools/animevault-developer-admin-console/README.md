# AnimeVault Terminal

AnimeVault Terminal is a standalone interactive developer console for the AnimeVault project. It runs as a command shell inside Windows Terminal or PowerShell and uses slash commands such as `/help`, `/status`, and `/dev start`.

**Installation does not clone or download the AnimeVault website repository.** You can install and open the console first, then link a local checkout when you need project-specific actions.

## Install

Requirements: Windows 10/11 and Node.js 22.12 or newer. Git is needed for Git commands.

Open PowerShell or Windows Terminal and run:

```powershell
irm https://raw.githubusercontent.com/animevaultofficial/animevaultofficial.github.io/main/tools/animevault-developer-admin-console/install.ps1 | iex
```

Open a **new** terminal window and run:

```powershell
animevault
```

Then type `/help`. If Node.js is not installed, install Node.js 22.12+ and rerun the installer. The installer validates the downloaded console before replacing the installed copy, creates the `animevault` command in `%USERPROFILE%\bin`, and adds that folder to the user PATH without requiring administrator privileges.

## Slash commands

| Command | Action |
|---|---|
| `/help` | Show command reference |
| `/status` | Show project, Node.js, Git and build status |
| `/doctor` | Diagnose the local toolchain and project setup |
| `/project link` | Link a local AnimeVault checkout |
| `/project show` | Show the linked project folder |
| `/project clear` | Clear the saved project link |
| `/dev start` / `/dev stop` | Start or stop the managed Vite development server |
| `/preview` / `/preview stop` | Run or stop the production build preview |
| `/build` | Run the production build |
| `/test` | Run the configured unit tests |
| `/logs` | Show recent logs from managed servers |
| `/api check` | Probe the live site, local server, AniList and AllAnime |
| `/env` / `/env setup` | Check environment configuration or create `.env.local` from the template |
| `/deps` / `/deps install` | Inspect or install project dependencies |
| `/git status`, `/git diff`, `/git log`, `/git branch`, `/git remotes` | Inspect repository state |
| `/git pull` | Pull `origin/main` after confirmation |
| `/release check` | Check local release readiness |
| `/deploy status` | Inspect deployment configuration without deploying |
| `/search <text>` | Search project source files |
| `/open <path>` | Open a file or folder inside the linked project |
| `/backup` | Create a compressed source backup excluding generated folders and `.env.local` |
| `/ports` | Check common local development ports |
| `/tasks` | Show managed servers and the last command |
| `/config show` | Show non-secret console configuration |
| `/site` / `/site local` | Open production or local site |
| `/update` | Show the standalone update command |
| `/clear`, `/history`, `/about`, `/exit` | Console utilities |

Commands are case-insensitive. Press **Tab** for command suggestions. Use the up/down arrows to navigate command history.

## Architecture and behavior

- The console is installed in `%LOCALAPPDATA%\Programs\AnimeVaultDeveloperAdminConsole`.
- The launcher is `%USERPROFILE%\bin\animevault.cmd`.
- The linked project folder is saved in the current user's application configuration.
- The console does not silently clone the project.
- Server logs are captured in the current session; `/logs` shows recent output.
- `/backup` requires the `tar` utility to be available.
- `/api check` is a reachability check, not an end-to-end guarantee for login, OTP, playback or third-party providers.

## Safety

- The console never prints values from `.env.local`.
- It warns about secret-like `VITE_*` keys because Vite exposes these values to frontend code.
- `/git pull` and dependency installation ask for confirmation.
- `/release check` and `/deploy status` only inspect local state; they do not publish, commit or deploy.
- `/open` restricts paths to the linked project folder.
- Review all environment placeholders yourself. Never commit `.env.local` or put private database credentials in `VITE_*` variables.

## Uninstall

Delete:

- `%LOCALAPPDATA%\Programs\AnimeVaultDeveloperAdminConsole`
- `%USERPROFILE%\bin\animevault.cmd`

Remove `%USERPROFILE%\bin` from the user PATH only if no other commands use that folder.
