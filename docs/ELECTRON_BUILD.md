# Building the Windows Desktop App — Legacy Business ERP

## Overview

The desktop version wraps the web application in Electron, providing:
- No browser needed — runs as a native desktop app
- Backend auto-starts in the background
- System tray icon
- Native notifications
- Professional Windows installer

---

## Prerequisites

### Required (on Windows build machine)

| Tool | Version | Download |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm` |
| Git | Any | https://git-scm.com |

### Optional (for code signing)

- Windows SDK (for signtool.exe)
- Code signing certificate (.pfx file)

---

## Step 1: Prepare Icons

Place icon files in `electron/icons/`:

```
electron/icons/
├── icon.ico    ← Windows (256×256 multi-size ICO)
├── icon.png    ← Linux (512×512 PNG)
└── icon.icns   ← macOS (512×512 ICNS)
```

See `electron/icons/README.md` for icon creation instructions.

---

## Step 2: Build on Windows

### Quick Build (recommended)

```bash
# From repo root, in Git Bash or PowerShell
bash electron/build-windows.sh
```

### Manual Step-by-Step

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Build the API server
set PORT=8080
set BASE_PATH=/
pnpm --filter @workspace/api-server run build

# 3. Build the frontend
set PORT=21973
set BASE_PATH=/
pnpm --filter @workspace/legacy-business run build

# 4. Install Electron dependencies
cd electron
npm install

# 5. Build installer
npx electron-builder --win --x64
```

---

## Step 3: Output Files

After a successful build, find outputs in `dist-electron/`:

```
dist-electron/
├── Legacy Business Setup.exe          ← Windows installer
├── Legacy Business Portable.exe       ← Portable (no install required)
├── win-unpacked/                      ← Unpackaged app (for testing)
└── latest.yml                        ← Auto-update metadata
```

---

## Step 4: Test the Installer

On a **clean Windows machine** (no Node.js or pnpm installed):

1. Copy `Legacy Business Setup.exe` to the test machine
2. Double-click to run
3. Follow the installer wizard
4. Launch the application
5. Complete the database setup wizard on first launch
6. Verify login works

---

## Build Options

### NSIS Installer (default)
```bash
npx electron-builder --win nsis
```
Produces: `Legacy Business Setup.exe`

### Portable (no installation)
```bash
npx electron-builder --win portable
```
Produces: `Legacy Business Portable.exe`

### Both targets
```bash
npx electron-builder --win
```
(default, produces both)

---

## Customizing the Installer

Edit `electron/package.json` → `build.nsis` section:

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Legacy Business ERP",
    "license": "installer/LICENSE.txt"
  }
}
```

For advanced NSIS customization, edit `electron/installer/custom.nsi`.

---

## Code Signing (Production)

Unsigned executables trigger Windows SmartScreen warnings. To sign:

```bash
# Set environment variables before building
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your-cert-password
npx electron-builder --win
```

Or add to `electron/package.json`:
```json
{
  "build": {
    "win": {
      "certificateFile": "cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

---

## Building on Linux (Cross-Compile)

> **Note:** Cross-compiling Windows executables from Linux requires Wine and additional tools. The output may differ from a native Windows build.

```bash
# Install Wine (Ubuntu/Debian)
sudo apt-get install wine64 mono-devel

# Build
npx electron-builder --win --x64 --linux-only=false
```

**Recommendation:** Build on a real Windows machine or GitHub Actions for production releases.

---

## GitHub Actions (CI/CD)

```yaml
# .github/workflows/build-electron.yml
name: Build Windows App
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm --filter @workspace/api-server run build
        env: { PORT: 8080, BASE_PATH: / }
      - run: pnpm --filter @workspace/legacy-business run build
        env: { PORT: 21973, BASE_PATH: / }
      - run: cd electron && npm install && npx electron-builder --win
      - uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: dist-electron/*.exe
```

---

## Troubleshooting

### "Cannot find module 'electron'"
```bash
cd electron && npm install
```

### "Icon file not found"
Add `electron/icons/icon.ico` — see icon requirements above.

### Build fails with "EPERM" on Windows
Run as Administrator or disable antivirus temporarily during build.

### "Invalid NSIS script"
Check `electron/installer/custom.nsi` for syntax errors.

### Frontend shows blank page
Ensure the frontend was built: `pnpm --filter @workspace/legacy-business run build`
Check that `artifacts/legacy-business/dist/public/index.html` exists.
