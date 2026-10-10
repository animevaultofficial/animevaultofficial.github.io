# AnimeVault Studio — Phase 1

AnimeVault Studio is a general-purpose Windows desktop IDE foundation with AnimeVault developer tools planned as a first-class integration. It is separate from the AnimeVault streaming app and does not change its existing Electron entry point or build configuration.

## Phase 1 features

- Electron desktop shell with context isolation, sandboxing, and Node integration disabled in the renderer.
- React-based IDE interface with a dark charcoal/pink visual system.
- Monaco Editor with syntax highlighting, minimap, bracket guides, and editor tabs.
- Open any local project folder; browse nested files and filter the file list.
- Open and edit text files, then save with the Save button or Ctrl+S.
- Folder browsing skips dependency/build output folders and symbolic links.
- File reads and saves are restricted to the selected workspace. Phase 1 supports existing text files up to 2 MB; creating/renaming/deleting files and terminal execution are intentionally not included yet.

## Requirements

- Windows 10/11
- Node.js 22.12 or newer
- npm

## Run in development

From this folder:

```powershell
npm install
npm run electron:dev
```

To build the renderer:

```powershell
npm run build
```

To create a Windows installer:

```powershell
npm run dist:win
```

The installer output is written to `release/`. This build has not yet been run in a Windows environment; use the build command and inspect any native packaging errors before publishing a release.

## Roadmap

1. Workspace + Monaco editing (current phase)
2. Integrated terminal and AnimeVault Terminal slash-command integration
3. Git panel, diagnostics, and local preview
4. Optional AI coding assistant after the core experience is stable

## Security notes

- Electron's renderer uses `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Only narrow, explicit workspace APIs are exposed from the preload script.
- The app does not run shell commands or load remote project code in Phase 1.
- Review Electron's current security guidance before expanding IPC capabilities.
