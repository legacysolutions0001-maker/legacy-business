# Windows Build Guide — Legacy Business ERP & Owner App
> Version 1.0.0 | Publisher: Legacy Solutions  
> Support: legacysolutions0001@gmail.com | +91 7452888421

This guide produces two Windows installer EXE files:

| App | Installer | Portable |
|-----|-----------|---------|
| Legacy Business ERP | `dist-electron/Legacy Business ERP Setup.exe` | `dist-electron/Legacy Business ERP Portable.exe` |
| Legacy Business Owner | `dist-electron-owner/Legacy Business Owner Setup.exe` | `dist-electron-owner/Legacy Business Owner Portable.exe` |

---

## Prerequisites

Install on your Windows build machine (Git Bash):

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS or 22 LTS | https://nodejs.org |
| pnpm | v9 or v10 | `npm install -g pnpm` |
| Git | any recent | https://git-scm.com |

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/legacysolutions0001-maker/legacy-business.git
cd legacy-business
git checkout main
```

---

## Step 2 — Set environment variables (Git Bash)

Before building, export these in your Git Bash terminal (or add them to your Windows System Environment Variables):

```bash
# PostgreSQL connection (default works if you installed PG with password "postgres")
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/legacy_erp"

# Super admin credentials
export SUPER_ADMIN_USERNAME="your_super_admin_username"
export SUPER_ADMIN_PASSWORD="your_super_admin_password"

# Firebase (paste the full service account JSON on one line)
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"...",...}'
export FIREBASE_PROJECT_ID="your-firebase-project-id"
export FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"

# Session secret (keep this private and consistent across installs)
export SESSION_SECRET="your_session_secret_here"
```

> **Tip:** Save these in a file like `build-env.sh` (keep it out of git — add it to `.gitignore`) and run `source build-env.sh` before each build.

---

## Step 3 — Build Customer ERP

```bash
bash electron/build-windows.sh
```

This script automatically:
1. Checks prerequisites (Node.js, pnpm, icons)
2. Creates `firebase-service-account.json` from `$FIREBASE_SERVICE_ACCOUNT_JSON`
3. Installs all workspace dependencies (`pnpm install`)
4. Builds the Express API server → `artifacts/api-server/dist/`
5. Builds the React frontend → `artifacts/legacy-business/dist/public/`
6. Installs Electron dependencies
7. Packages the Windows installer and portable EXE

**Output:** `dist-electron/Legacy Business ERP Setup.exe`  
**Also:** `dist-electron/Legacy Business ERP Portable.exe`

---

## Step 4 — Build Owner App

```bash
bash electron-owner/build-windows.sh
```

**Output:** `dist-electron-owner/Legacy Business Owner Setup.exe`  
**Also:** `dist-electron-owner/Legacy Business Owner Portable.exe`

---

## Output file locations

```
legacy-business/
├── dist-electron/
│   ├── Legacy Business ERP Setup.exe          ← Customer installer
│   └── Legacy Business ERP Portable.exe       ← Customer portable
└── dist-electron-owner/
    ├── Legacy Business Owner Setup.exe        ← Owner installer
    └── Legacy Business Owner Portable.exe    ← Owner portable
```

---

## Manual build (step by step)

If the automated scripts fail, run each step manually in Git Bash:

```bash
# From repo root
pnpm install --frozen-lockfile

# Create firebase-service-account.json (if not already done)
printf '%s' "$FIREBASE_SERVICE_ACCOUNT_JSON" > firebase-service-account.json

# Build API server
PORT=8080 BASE_PATH=/ pnpm --filter @workspace/api-server run build

# Build frontend
PORT=21973 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build

# Build Customer ERP installer
cd electron
npm install
npx electron-builder --win --x64
cd ..

# Build Owner App installer
cd electron-owner
npm install
npx electron-builder --win --x64
cd ..
```

---

## PostgreSQL setup on a fresh Windows machine

The apps need PostgreSQL running locally. On a fresh install:

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, set the `postgres` user password (default in the app: `postgres`)
3. After installing, PostgreSQL starts automatically as a Windows service
4. The app will auto-create the `legacy_erp` database on first launch

---

## Windows SmartScreen warning

Unsigned EXE files show a SmartScreen warning on first run. Users click:
**"More info" → "Run anyway"**

This is normal for unsigned apps. To remove the warning, purchase a code-signing certificate and add it to `electron/package.json` and `electron-owner/package.json` under `"win"`:
```json
"certificateFile": "path/to/cert.pfx",
"certificatePassword": "YOUR_CERT_PASSWORD"
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `firebase-service-account.json not found` | Set `FIREBASE_SERVICE_ACCOUNT_JSON` env var or create the file manually |
| `API server bundle not found` | Run `pnpm --filter @workspace/api-server run build` first |
| `Frontend not found` | Run `PORT=21973 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build` first |
| PostgreSQL not running | Open services.msc → start `postgresql-x64-*` |
| Login not working | Check PostgreSQL is running and DATABASE_URL is correct |
| electron-builder NSIS error | Run `npm install` inside `electron/` or `electron-owner/` |
| SmartScreen blocks EXE | Click "More info" → "Run anyway" (expected for unsigned apps) |

---

## Support

Email: legacysolutions0001@gmail.com  
Phone: +91 7452888421
