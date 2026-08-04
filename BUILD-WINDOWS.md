# Windows Build Guide — Legacy Business ERP & Owner App
> Version 1.0.0 | Publisher: Legacy Solutions

This guide explains how to produce the two Windows installer EXE files:

| App | Output file |
|-----|------------|
| Legacy Business ERP | `dist-electron/Legacy Business ERP Setup.exe` |
| Legacy Business Owner | `dist-electron-owner/Legacy Business Owner Setup.exe` |

---

## Prerequisites

Install these on your Windows build machine:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS or 22 LTS | https://nodejs.org |
| pnpm | v9 or v10 | `npm install -g pnpm` |
| Git | any recent | https://git-scm.com |
| Git Bash | included with Git for Windows | — |

> **Use Git Bash for all commands below** (not PowerShell or CMD).

---

## Step 1 — Clone the repository

```bash
git clone https://ghp_YOUR_TOKEN@github.com/legacysolutions0001-maker/legacy-business.git
cd legacy-business
git checkout main
```

---

## Step 2 — Install dependencies

```bash
pnpm install
```

---

## Step 3 — Create the Firebase Service Account file

This file is **not committed to git** (it is in `.gitignore`).
You must create it manually before building.

1. Create a file named `firebase-service-account.json` in the **repo root** (same folder as `package.json`).
2. Paste the Firebase Service Account JSON into it (the same JSON you stored in the `FIREBASE_SERVICE_ACCOUNT_JSON` secret).

```
legacy-business/
├── firebase-service-account.json   ← CREATE THIS FILE
├── electron/
├── electron-owner/
├── artifacts/
└── ...
```

> ⚠️ Never commit this file. It is already listed in `.gitignore`.

---

## Step 4 — Build all artifacts (frontend + API)

```bash
pnpm run build:artifacts
```

This builds:
- `artifacts/legacy-business/dist/public/` — React frontend
- `artifacts/api-server/dist/` — Express API bundle
- `lib/db/migrations/` — Database migration files

---

## Step 5 — Build the ERP Windows Installer

```bash
cd electron
npm install
npm run build:win
cd ..
```

**Output:** `dist-electron/Legacy Business ERP Setup.exe`
**Also produces:** `dist-electron/Legacy Business ERP Portable.exe`

---

## Step 6 — Build the Owner App Windows Installer

```bash
cd electron-owner
npm install
npm run build:win
cd ..
```

**Output:** `dist-electron-owner/Legacy Business Owner Setup.exe`
**Also produces:** `dist-electron-owner/Legacy Business Owner Portable.exe`

---

## Output file locations

```
legacy-business/
├── dist-electron/
│   ├── Legacy Business ERP Setup.exe        ← Customer installer
│   └── Legacy Business ERP Portable.exe     ← Customer portable
└── dist-electron-owner/
    ├── Legacy Business Owner Setup.exe      ← Owner installer
    └── Legacy Business Owner Portable.exe  ← Owner portable
```

---

## Code Signing (Optional — reduces SmartScreen warnings)

Without a code-signing certificate, Windows SmartScreen will show a warning
the first time users run the installer. This is normal for unsigned apps.

To add a certificate later:

1. Purchase an EV or OV code-signing certificate from a trusted CA
   (e.g. Sectigo, DigiCert, SSL.com).
2. Add these to `electron/package.json` under `"win"`:
   ```json
   "certificateFile": "path/to/cert.pfx",
   "certificatePassword": "YOUR_CERT_PASSWORD"
   ```
3. Do the same in `electron-owner/package.json`.
4. Rebuild both installers.

> **Do NOT bypass SmartScreen for users.** The proper solution is a valid
> certificate. Until then, users can click "More info → Run anyway".

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `firebase-service-account.json not found` | Create the file in repo root (Step 3) |
| `Cannot find module '../dist/index.mjs'` | Run `pnpm run build:artifacts` first (Step 4) |
| `Port already in use` | Close any running instance of the app |
| `electron-builder: NSIS not found` | Run `npm install` inside `electron/` or `electron-owner/` |
| Windows SmartScreen warning | Expected for unsigned apps — click "More info → Run anyway" |

---

## Support

Email: legacysolutions0001@gmail.com
Phone: +91 7452888421
