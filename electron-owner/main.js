'use strict';

const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, Notification, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

// ─── Paths ──────────────────────────────────────────────────────────────────
const RESOURCES = process.resourcesPath || path.join(__dirname, '..');
const API_DIST   = path.join(RESOURCES, 'api-server', 'dist', 'index.mjs');
const FRONTEND   = path.join(RESOURCES, 'frontend');
const MIGRATIONS = path.join(RESOURCES, 'migrations');
const ICON_PATH  = path.join(__dirname, 'icons', 'icon.ico');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'legacy-owner-settings.json');
const BACKUP_DIR_DEFAULT = path.join(app.getPath('documents'), 'LegacyOwnerBackups');

// ─── Logging ─────────────────────────────────────────────────────────────────
const LOG_DIR      = path.join(app.getPath('userData'), 'logs');
const ELECTRON_LOG = path.join(LOG_DIR, 'electron-owner.log');
const BACKEND_LOG  = path.join(LOG_DIR, 'backend-owner.log');
const STARTUP_LOG  = path.join(LOG_DIR, 'startup-owner.log');
const CRASH_LOG    = path.join(LOG_DIR, 'crash-owner.log');

function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

function logElectron(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(ELECTRON_LOG, line); } catch {}
  try { fs.appendFileSync(STARTUP_LOG, line); } catch {}
}

function logBackend(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(BACKEND_LOG, line); } catch {}
}

function logCrash(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(CRASH_LOG, line); } catch {}
  try { fs.appendFileSync(ELECTRON_LOG, line); } catch {}
}

function readLastLines(filePath, maxLines = 60) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch {
    return '(no log output captured)';
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return {
    backupFolder: BACKUP_DIR_DEFAULT,
    theme: 'dark',
    firstLaunch: true,
  };
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    logElectron(`Failed to save settings: ${e.message}`);
  }
}

// ─── Port helpers ────────────────────────────────────────────────────────────
function findFreePort(start = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => findFreePort(start + 1).then(resolve, reject));
  });
}

function waitForPort(port, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const sock = net.connect({ port, host: '127.0.0.1' }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Port ${port} not ready within ${timeout}ms`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    }
    tryConnect();
  });
}

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let splashWindow = null;
let tray = null;
let apiProcess = null;
let frontendServer = null;
let apiPort = 8090;
let frontendPort = 21974;
let settings = loadSettings();

// ─── Splash Screen ───────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 320,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

// ─── Main Window ─────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: ICON_PATH,
    title: 'Legacy Business Owner',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Owner App always opens to Super Admin login
  const url = `http://127.0.0.1:${frontendPort}/super/login`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    if (settings.firstLaunch) {
      settings.firstLaunch = false;
      saveSettings(settings);
    }
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(fs.existsSync(ICON_PATH) ? ICON_PATH : path.join(__dirname, 'icons', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Legacy Business Owner', click: showApp },
    { type: 'separator' },
    { label: 'Restart Backend', click: restartBackend },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About Legacy Business Owner',
          message: 'Legacy Business Owner v1.0.0',
          detail: 'Owner Management & Licensing Control\n\nDeveloped by Legacy Solutions\nEmail: legacysolutions0001@gmail.com\n© 2025 Legacy Solutions. All Rights Reserved.',
          buttons: ['OK'],
        });
      },
    },
    { type: 'separator' },
    { label: 'Open Log Folder', click: () => shell.openPath(LOG_DIR) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip('Legacy Business Owner');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', showApp);
}

function showApp() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ─── Backend (Express API) ────────────────────────────────────────────────────
async function startBackend() {
  apiPort = await findFreePort(8090);

  // Load Firebase service account from bundled resource file
  const saPath = path.join(RESOURCES, 'firebase-service-account.json');
  let firebaseSaJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!firebaseSaJson && fs.existsSync(saPath)) {
    try { firebaseSaJson = fs.readFileSync(saPath, 'utf8').trim(); } catch (e) {
      logElectron(`Warning: could not read firebase-service-account.json: ${e.message}`);
    }
  }

  const databaseUrl =
    settings.databaseUrl ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/legacy_erp';

  const env = {
    ...process.env,
    // ── CRITICAL FIX ──────────────────────────────────────────────────────────
    // process.execPath in a packaged Electron app points to the Electron binary,
    // not to node.exe. Without ELECTRON_RUN_AS_NODE=1, spawning process.execPath
    // launches a SECOND Electron app instance, which immediately hits the single-
    // instance lock and exits with code 0. Setting this flag tells the Electron
    // binary to behave like plain Node.js and just run the script.
    ELECTRON_RUN_AS_NODE: '1',
    // ─────────────────────────────────────────────────────────────────────────
    PORT: String(apiPort),
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: settings.sessionSecret || process.env.SESSION_SECRET || 'legacy_owner_secret_2025',
    FIREBASE_SERVICE_ACCOUNT_JSON: firebaseSaJson,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'legacy-business-erp',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'legacy-business-erp.firebasestorage.app',
    SUPER_ADMIN_USERNAME: process.env.SUPER_ADMIN_USERNAME || 'bhullar01',
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || settings.superAdminPassword || 'Bhullar_01',
    BACKUP_DIR: settings.backupFolder || BACKUP_DIR_DEFAULT,
    MIGRATIONS_DIR: MIGRATIONS,
  };

  // Rotate backend log
  try {
    if (fs.existsSync(BACKEND_LOG)) fs.renameSync(BACKEND_LOG, BACKEND_LOG + '.prev');
  } catch {}
  try {
    if (fs.existsSync(STARTUP_LOG)) fs.renameSync(STARTUP_LOG, STARTUP_LOG + '.prev');
  } catch {}

  logElectron(`Starting API server — port ${apiPort}`);
  logElectron(`API_DIST: ${API_DIST}`);
  logElectron(`DATABASE_URL prefix: ${databaseUrl.replace(/:\/\/.*@/, '://<credentials>@')}`);
  logElectron(`Firebase SA JSON present: ${!!firebaseSaJson}`);
  logElectron(`ELECTRON_RUN_AS_NODE: ${env.ELECTRON_RUN_AS_NODE}`);
  logElectron(`process.execPath: ${process.execPath}`);

  if (!fs.existsSync(API_DIST)) {
    const err = new Error(`API server bundle not found at: ${API_DIST}`);
    logCrash(`FATAL: ${err.message}`);
    throw err;
  }

  // Spawn the API server using the Electron binary as Node.js (ELECTRON_RUN_AS_NODE=1)
  const nodeExe = process.execPath;
  logElectron(`Spawning: ${nodeExe} --enable-source-maps ${API_DIST}`);

  apiProcess = spawn(nodeExe, ['--enable-source-maps', API_DIST], {
    env,
    cwd: path.dirname(API_DIST),
    windowsHide: true,
  });

  apiProcess.stdout?.on('data', (d) => {
    const text = d.toString().trim();
    logBackend(`[stdout] ${text}`);
    logElectron(`[API] ${text}`);
  });

  apiProcess.stderr?.on('data', (d) => {
    const text = d.toString().trim();
    logBackend(`[stderr] ${text}`);
    logElectron(`[API ERR] ${text}`);
  });

  let exitCode = null;
  let exitSignal = null;
  apiProcess.on('exit', (code, signal) => {
    exitCode = code;
    exitSignal = signal;
    logElectron(`API process exited — code=${code}, signal=${signal}`);
    logBackend(`[exit] code=${code} signal=${signal}`);
    logCrash(`API server exited unexpectedly — code=${code} signal=${signal}`);
  });

  try {
    await waitForPort(apiPort, 45000);
    logElectron(`✓ API Server ready on port ${apiPort}`);
  } catch (waitErr) {
    await new Promise((r) => setTimeout(r, 1000));
    const backendOutput = readLastLines(BACKEND_LOG, 80);

    let friendlyMsg;
    if (backendOutput.includes('ECONNREFUSED') || backendOutput.includes('connect ECONNREFUSED')) {
      friendlyMsg = [
        'Failed to start Legacy Business Owner.',
        '',
        'PostgreSQL is not running.',
        '',
        'Steps to fix:',
        '  1. Press Win+R, type "services.msc", press Enter.',
        '     Find "postgresql-x64-*" and click Start.',
        '  2. Or open pgAdmin and start the server from there.',
        '  3. If PostgreSQL is not installed, download it from:',
        '     https://www.postgresql.org/download/windows/',
        '     During installation, set the postgres password to "postgres"',
        '     (or update the DB URL in the app settings later).',
        '',
        `Log files: ${LOG_DIR}`,
      ].join('\n');
    } else if (backendOutput.includes('password authentication failed') || backendOutput.includes('28P01') || backendOutput.includes('28000')) {
      friendlyMsg = [
        'Failed to start Legacy Business Owner.',
        '',
        'PostgreSQL authentication failed.',
        'The database username or password is incorrect.',
        '',
        'Default connection: postgresql://postgres:postgres@localhost:5432/legacy_erp',
        '',
        'To fix: update the database URL in the app settings',
        'to match your PostgreSQL username and password.',
        '',
        `Log files: ${LOG_DIR}`,
      ].join('\n');
    } else if (backendOutput.includes('does not exist') || backendOutput.includes('3D000')) {
      friendlyMsg = [
        'Failed to start Legacy Business Owner.',
        '',
        'The "legacy_erp" database does not exist.',
        '',
        'Please create it:',
        '  1. Open pgAdmin or psql.',
        '  2. Run: CREATE DATABASE legacy_erp;',
        '',
        `Log files: ${LOG_DIR}`,
      ].join('\n');
    } else {
      const shortLog = backendOutput.slice(-800);
      friendlyMsg = exitCode !== null
        ? `Failed to start Legacy Business Owner.\n\nAPI server exited (code ${exitCode}) before opening port ${apiPort}.\n\nLast output:\n${shortLog}\n\nLog files: ${LOG_DIR}`
        : `Failed to start Legacy Business Owner.\n\nAPI server did not start within 45 seconds.\n\nLast output:\n${shortLog}\n\nLog files: ${LOG_DIR}`;
    }

    logCrash(`STARTUP FAILURE:\n${friendlyMsg}`);
    throw new Error(friendlyMsg);
  }
}

// ─── Frontend (serve static) ──────────────────────────────────────────────────
async function startFrontend() {
  frontendPort = await findFreePort(21974);
  return new Promise((resolve, reject) => {
    frontendServer = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      let filePath = path.join(FRONTEND, urlPath === '/' ? 'index.html' : urlPath);
      // SPA fallback — any route without a file extension goes to index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(FRONTEND, 'index.html');
      }
      const ext = path.extname(filePath);
      const mime = {
        '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
        '.ttf': 'font/ttf',
      }[ext] || 'application/octet-stream';
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    frontendServer.listen(frontendPort, '127.0.0.1', () => {
      logElectron(`✓ Frontend served on port ${frontendPort}`);
      resolve();
    });
    frontendServer.on('error', reject);
  });
}

async function restartBackend() {
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
  await startBackend();
  if (mainWindow) mainWindow.webContents.reload();
  new Notification({ title: 'Legacy Business Owner', body: 'Backend restarted successfully.' }).show();
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => settings);

ipcMain.handle('save-settings', (_, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
  return { ok: true };
});

ipcMain.handle('select-folder', async (_, opts = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: opts.title || 'Select Folder',
    defaultPath: opts.defaultPath || app.getPath('documents'),
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-backup-list', () => {
  const dir = settings.backupFolder || BACKUP_DIR_DEFAULT;
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') || f.endsWith('.sql') || f.endsWith('.zip'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return { name: f, size: stat.size, date: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('open-backup-folder', () => {
  const dir = settings.backupFolder || BACKUP_DIR_DEFAULT;
  fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
});

ipcMain.handle('open-log-folder', () => {
  shell.openPath(LOG_DIR);
});

ipcMain.handle('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show();
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
// FIX: requestSingleInstanceLock MUST be called at the top level, before
// app.whenReady(). Calling it inside whenReady() is against Electron docs and
// can cause unpredictable lock behaviour on Windows.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // A real second instance — focus the existing window and exit this one.
  app.quit();
} else {
  app.on('second-instance', () => { showApp(); });

  app.whenReady().then(async () => {
    ensureLogDir();
    logElectron('=== Legacy Business Owner starting ===');
    logElectron(`Version: 1.0.0 | Electron: ${process.versions.electron} | Node: ${process.versions.node}`);
    logElectron(`Resources: ${RESOURCES}`);
    logElectron(`userData: ${app.getPath('userData')}`);
    logElectron(`Logs: ${LOG_DIR}`);
    logElectron(`API_DIST: ${API_DIST}`);
    logElectron(`FRONTEND: ${FRONTEND}`);
    logElectron(`API_DIST exists: ${fs.existsSync(API_DIST)}`);
    logElectron(`FRONTEND exists: ${fs.existsSync(FRONTEND)}`);

    nativeTheme.themeSource = settings.theme || 'dark';

    createSplash();

    try {
      logElectron('Starting backend and frontend servers...');
      await Promise.all([startBackend(), startFrontend()]);
      logElectron('Both servers ready — creating main window.');
      createTray();
      createMainWindow();
    } catch (err) {
      logCrash(`FATAL startup error: ${err.message}`);
      const shortMsg = err.message.length > 2000 ? err.message.substring(0, 2000) + '\n...(truncated, see log)' : err.message;
      dialog.showErrorBox(
        'Legacy Business Owner — Startup Error',
        `${shortMsg}\n\nLog files are at:\n${LOG_DIR}`
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') app.quit();
  });

  app.on('activate', () => { if (!mainWindow) createMainWindow(); });

  app.on('before-quit', () => {
    logElectron('App quitting.');
    app.isQuitting = true;
    if (apiProcess) { apiProcess.kill(); apiProcess = null; }
    if (frontendServer) { frontendServer.close(); frontendServer = null; }
  });
}
