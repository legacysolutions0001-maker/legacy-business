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
    console.error('Failed to save settings:', e);
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

function waitForPort(port, timeout = 30000) {
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

  // Load Firebase service account from bundled resource file (not committed to git)
  const saPath = path.join(RESOURCES, 'firebase-service-account.json');
  let firebaseSaJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!firebaseSaJson && fs.existsSync(saPath)) {
    try { firebaseSaJson = fs.readFileSync(saPath, 'utf8').trim(); } catch {}
  }

  const env = {
    ...process.env,
    PORT: String(apiPort),
    NODE_ENV: 'production',
    DATABASE_URL: settings.databaseUrl || process.env.DATABASE_URL || '',
    SESSION_SECRET: settings.sessionSecret || process.env.SESSION_SECRET || 'legacy_owner_secret_2025',
    FIREBASE_SERVICE_ACCOUNT_JSON: firebaseSaJson,
    FIREBASE_PROJECT_ID: 'legacy-business-erp',
    FIREBASE_STORAGE_BUCKET: 'legacy-business-erp.firebasestorage.app',
    BACKUP_DIR: settings.backupFolder || BACKUP_DIR_DEFAULT,
    MIGRATIONS_DIR: MIGRATIONS,
  };

  const nodeExe = process.execPath;
  apiProcess = spawn(nodeExe, ['--enable-source-maps', API_DIST], {
    env,
    cwd: path.dirname(API_DIST),
    windowsHide: true,
  });

  apiProcess.stdout?.on('data', (d) => console.log('[API]', d.toString().trim()));
  apiProcess.stderr?.on('data', (d) => console.error('[API ERR]', d.toString().trim()));
  apiProcess.on('exit', (code) => {
    console.log(`API process exited with code ${code}`);
  });

  await waitForPort(apiPort, 30000);
  console.log(`✓ API Server running on port ${apiPort}`);
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
      console.log(`✓ Frontend served on port ${frontendPort}`);
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

ipcMain.handle('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show();
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) { app.quit(); return; }

  app.on('second-instance', () => { showApp(); });

  nativeTheme.themeSource = settings.theme || 'dark';

  createSplash();

  try {
    await Promise.all([startBackend(), startFrontend()]);
    createTray();
    createMainWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start Legacy Business Owner:\n\n${err.message}\n\nPlease check your database connection and try again.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit();
});

app.on('activate', () => { if (!mainWindow) createMainWindow(); });

app.on('before-quit', () => {
  app.isQuitting = true;
  if (apiProcess) { apiProcess.kill(); apiProcess = null; }
  if (frontendServer) { frontendServer.close(); frontendServer = null; }
});
