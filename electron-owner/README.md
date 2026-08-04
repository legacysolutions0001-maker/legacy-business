# Legacy Business Owner — Electron App

> Owner Management & Licensing Control Application
> Publisher: Legacy Solutions | Version: 1.0.0

This is the desktop wrapper for the **Legacy Business Owner** application.
It opens directly to the Super Admin login (`/super/login`) and provides
full access to company management, license generation, and subscription control.

## Build

See `../BUILD-WINDOWS.md` for the complete Windows build guide.

Quick build:
```bash
cd ..                         # repo root
pnpm run build:artifacts      # build frontend + API
cd electron-owner
npm install
npm run build:win             # produces ../dist-electron-owner/
```

## App ID

`com.legacysolutions.owner`

## Icons

- `icons/icon.ico` — Windows multi-resolution icon
- `icons/icon.png` — Linux/macOS icon (512×512)

## Support

Email: legacysolutions0001@gmail.com
Phone: +91 7452888421
