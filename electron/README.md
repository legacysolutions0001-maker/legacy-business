# Legacy Business ERP — Electron Desktop App

This directory contains the Electron wrapper for running Legacy Business ERP as a
native desktop application on Windows, Linux, and macOS.

## What it does

- Bundles the Express API backend and React frontend into a single desktop app
- Auto-starts the backend on launch (no terminal window)
- Serves the frontend locally and opens it in a chromium window
- Provides system tray integration with notifications
- Handles app lifecycle (single instance, minimize to tray, auto-restart)

## Quick Start

```bash
# From repo root — build everything first
PORT=8080 pnpm --filter @workspace/api-server run build
PORT=21973 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build

# Then run electron
cd electron
npm install
npm start
```

## Building Windows Installer

See [../docs/ELECTRON_BUILD.md](../docs/ELECTRON_BUILD.md) for full instructions.

**Quick version (on Windows):**
```bash
bash build-windows.sh
```

Output: `../dist-electron/Legacy Business Setup.exe`

## File Structure

```
electron/
├── main.js              ← Electron main process
├── preload.js           ← Secure IPC bridge
├── splash.html          ← Loading splash screen
├── package.json         ← Electron + builder config
├── build-windows.sh     ← Build script
├── icons/
│   ├── icon.ico         ← Windows icon (add this!)
│   ├── icon.png         ← Linux icon (add this!)
│   ├── icon.icns        ← macOS icon (add this!)
│   └── README.md        ← Icon creation guide
└── installer/
    ├── LICENSE.txt      ← EULA shown during install
    └── custom.nsi       ← NSIS script additions
```

## IPC API

The preload exposes `window.electronAPI` to the renderer:

```typescript
window.electronAPI.getSettings()                 // → app settings
window.electronAPI.saveSettings(settings)        // save settings
window.electronAPI.selectFolder({ title })       // native folder picker → path
window.electronAPI.getBackupList()               // list saved backup files
window.electronAPI.openBackupFolder()            // open backup folder in explorer
window.electronAPI.showNotification({ title, body })  // system notification
```
