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
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const BACKUP_DIR_DEFAULT = path.join(app.getPath('documents'), 'LegacyBusinessBackups');

// ─── Logging ─────────────────────────────────────────────────────────────────
const LOG_DIR      = path.join(app.getPath('userData'), 'logs');
const ELECTRON_LOG = path.join(LOG_DIR, 'electron.log');
const BACKEND_LOG  = path.join(LOG_DIR, 'backend.log');
const STARTUP_LOG  = path.join(LOG_DIR, 'startup.log');
const CRASH_LOG    = path.join(LOG_DIR, 'crash.log');

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
    backupSchedule: 'daily',
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
let apiPort = 8080;
let frontendPort = 21973;
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
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    icon: ICON_PATH,
    title: 'Legacy Business ERP',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${frontendPort}/`);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
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
    { label: 'Open Legacy Business ERP', click: showApp },
    { type: 'separator' },
    { label: 'Restart Backend', click: restartBackend },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About Legacy Business ERP',
          message: 'Legacy Business ERP v1.0.0',
          detail: 'Complete Business Management Solution\n\nDeveloped by Legacy Solutions\nEmail: legacysolutions0001@gmail.com\n© 2025 Legacy Solutions. All Rights Reserved.',
          buttons: ['OK'],
        });
      },
    },
    { type: 'separator' },
    { label: 'Open Log Folder', click: () => shell.openPath(LOG_DIR) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip('Legacy Business ERP');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', showApp);
}

function showApp() {
  if (mainWindow) {
    // The window is hidden in the tray when the user closes it. Start
    // unauthenticated reopen flows at Home; the renderer's existing session
    // check redirects valid sessions to the appropriate dashboard.
    if (!mainWindow.isVisible()) {
      mainWindow.loadURL(`http://127.0.0.1:${frontendPort}/`);
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

// ─── PostgreSQL Auto-Detection and Setup ─────────────────────────────────────
// Attempts to find and start an existing PostgreSQL installation automatically.
// Returns the database URL to use.
async function ensurePostgres() {
  const { exec } = require('child_process');
  const net = require('net');

  // Helper: try to connect to postgres port
  function canConnectToPg(port = 5432) {
    return new Promise((resolve) => {
      const sock = net.connect({ port, host: '127.0.0.1' }, () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
      sock.setTimeout(2000, () => { sock.destroy(); resolve(false); });
    });
  }

  // Check if PostgreSQL is already accepting connections
  const isRunning = await canConnectToPg(5432);
  if (isRunning) {
    logElectron('✓ PostgreSQL is already running on port 5432');
    return settings.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legacy_erp';
  }

  logElectron('PostgreSQL not running — attempting to start service automatically...');

  // Windows: try to start postgresql service via sc / net start
  if (process.platform === 'win32') {
    // Find the service name by scanning common patterns
    const serviceNames = [
      'postgresql-x64-17', 'postgresql-x64-16', 'postgresql-x64-15',
      'postgresql-x64-14', 'postgresql-x64-13', 'postgresql-x64-12',
      'postgresql', 'PostgreSQL',
    ];

    for (const svc of serviceNames) {
      const started = await new Promise((resolve) => {
        exec(`net start "${svc}"`, (err, stdout, stderr) => {
          if (!err) {
            logElectron(`✓ Started PostgreSQL service: ${svc}`);
            resolve(true);
          } else if ((stdout + stderr).includes('already been started') || (stdout + stderr).includes('is already running')) {
            logElectron(`✓ PostgreSQL service already running: ${svc}`);
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
      if (started) {
        // Wait a moment for the service to fully start
        await new Promise(r => setTimeout(r, 3000));
        const nowRunning = await canConnectToPg(5432);
        if (nowRunning) {
          logElectron('✓ PostgreSQL is now running');
          return settings.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legacy_erp';
        }
      }
    }

    // PostgreSQL service not found — try pg_ctl from common install paths
    const pgCtlPaths = [
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_ctl.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_ctl.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_ctl.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_ctl.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_ctl.exe',
    ];

    for (const pgCtl of pgCtlPaths) {
      if (fs.existsSync(pgCtl)) {
        const dataDir = path.join(path.dirname(pgCtl), '..', 'data');
        logElectron(`Found pg_ctl at ${pgCtl} — attempting to start...`);
        const started = await new Promise((resolve) => {
          exec(`"${pgCtl}" start -D "${dataDir}"`, (err) => resolve(!err));
        });
        if (started) {
          await new Promise(r => setTimeout(r, 3000));
          const nowRunning = await canConnectToPg(5432);
          if (nowRunning) {
            logElectron('✓ PostgreSQL started via pg_ctl');
            return settings.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legacy_erp';
          }
        }
      }
    }

    // Not installed — show user-friendly dialog
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'PostgreSQL Required',
      message: 'PostgreSQL is not installed or not running.',
      detail: [
        'Legacy Business ERP requires PostgreSQL to store your data.',
        '',
        'Please install PostgreSQL:',
        '  1. Download from: https://www.postgresql.org/download/windows/',
        '  2. During installation, set password to "postgres"',
        '  3. Keep the default port 5432',
        '  4. Restart Legacy Business ERP after installation',
        '',
        'Or if already installed, start the PostgreSQL service:',
        '  Press Win+R → type "services.msc" → find PostgreSQL → click Start',
      ].join('\n'),
      buttons: ['Download PostgreSQL', 'Retry', 'Quit'],
      defaultId: 1,
    });

    if (result.response === 0) {
      const { shell } = require('electron');
      shell.openExternal('https://www.postgresql.org/download/windows/');
    }
    if (result.response === 2) {
      app.quit();
      return null;
    }
    // Retry — check again
    const nowRunning = await canConnectToPg(5432);
    if (nowRunning) {
      return settings.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legacy_erp';
    }
    throw new Error('PostgreSQL is not running. Please install and start PostgreSQL, then restart the application.');
  }

  // Non-Windows (Linux/macOS): try systemctl / brew services
  const linuxStarted = await new Promise((resolve) => {
    exec('systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null || brew services start postgresql 2>/dev/null', (err) => {
      resolve(!err);
    });
  });
  if (linuxStarted) {
    await new Promise(r => setTimeout(r, 2000));
  }
  return settings.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/legacy_erp';
}

// ─── Ensure Database and Tables Exist ────────────────────────────────────────
async function ensureDatabase(databaseUrl) {
  const { Client } = (() => { try { return require('pg'); } catch { return { Client: null }; } })();
  if (!Client) {
    logElectron('pg module not available — skipping database creation step');
    return;
  }

  // Parse the DB URL to get the base (postgres) connection
  let baseUrl = databaseUrl.replace(/\/legacy_erp(\?.*)?$/, '/postgres');
  const dbName = 'legacy_erp';

  logElectron(`Checking if database '${dbName}' exists...`);
  const client = new Client({ connectionString: baseUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (result.rowCount === 0) {
      logElectron(`Database '${dbName}' does not exist — creating...`);
      await client.query(`CREATE DATABASE legacy_erp`);
      logElectron(`✓ Database '${dbName}' created`);
    } else {
      logElectron(`✓ Database '${dbName}' already exists`);
    }
  } catch (e) {
    logElectron(`Database check/creation warning: ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

// ─── Backend (Express API) ────────────────────────────────────────────────────
async function startBackend() {
  apiPort = await findFreePort(8080);

  // Load Firebase service account from bundled resource file
  const saPath = path.join(RESOURCES, 'firebase-service-account.json');
  let firebaseSaJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!firebaseSaJson && fs.existsSync(saPath)) {
    try { firebaseSaJson = fs.readFileSync(saPath, 'utf8').trim(); } catch (e) {
      logElectron(`Warning: could not read firebase-service-account.json: ${e.message}`);
    }
  }

  // Auto-detect and start PostgreSQL if needed
  const databaseUrl = await ensurePostgres();
  if (!databaseUrl) return; // User chose to quit
  // Auto-create the legacy_erp database if it doesn't exist
  await ensureDatabase(databaseUrl);

  const env = {
    ...process.env,
    // ── CRITICAL FIX ──────────────────────────────────────────────────────────
    // process.execPath in a packaged Electron app points to the Electron binary,
    // not to node.exe. Without ELECTRON_RUN_AS_NODE=1, spawning process.execPath
    // launches a SECOND Electron app instance, which immediately hits the single-
    // instance lock and exits with code 0. Setting this flag tells the Electron
    // binary to behave like plain Node.js and just run the script.
    ELECTRON_RUN_AS_NODE: '1',
    ELECTRON_MODE: '1',
    // ─────────────────────────────────────────────────────────────────────────
    PORT: String(apiPort),
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: settings.sessionSecret || process.env.SESSION_SECRET || 'legacy_erp_secret_2025',
    FIREBASE_SERVICE_ACCOUNT_JSON: firebaseSaJson,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'legacy-business-erp',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'legacy-business-erp.firebasestorage.app',
    SUPER_ADMIN_USERNAME: process.env.SUPER_ADMIN_USERNAME || settings.superAdminUsername || 'bhullar_01',
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || settings.superAdminPassword || 'Bhullar_01',
    BACKUP_DIR: settings.backupFolder || BACKUP_DIR_DEFAULT,
    MIGRATIONS_DIR: MIGRATIONS,
  };

  // Rotate backend log: keep previous run as backend.log.prev
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

  // Track early exit — if the process dies before port is ready, surface the real error
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
    // Port never opened — surface the real error from logs
    await new Promise((r) => setTimeout(r, 1000));
    const backendOutput = readLastLines(BACKEND_LOG, 80);

    let friendlyMsg;
    if (backendOutput.includes('ECONNREFUSED') || backendOutput.includes('connect ECONNREFUSED')) {
      friendlyMsg = [
        'Failed to start Legacy Business ERP.',
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
        'Failed to start Legacy Business ERP.',
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
        'Failed to start Legacy Business ERP.',
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
        ? `Failed to start Legacy Business ERP.\n\nAPI server exited (code ${exitCode}) before opening port ${apiPort}.\n\nLast output:\n${shortLog}\n\nLog files: ${LOG_DIR}`
        : `Failed to start Legacy Business ERP.\n\nAPI server did not start within 45 seconds.\n\nLast output:\n${shortLog}\n\nLog files: ${LOG_DIR}`;
    }

    logCrash(`STARTUP FAILURE:\n${friendlyMsg}`);
    throw new Error(friendlyMsg);
  }
}

// ─── Frontend (serve static) ──────────────────────────────────────────────────
async function startFrontend() {
  frontendPort = await findFreePort(21973);
  return new Promise((resolve, reject) => {
    frontendServer = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];

      // ── Proxy /api/* to the Express backend ───────────────────────────────
      // CRITICAL: The frontend is served on a different port from the API.
      // Without this proxy, relative /api/* fetch calls from the React app
      // would hit the static server (and get SPA index.html back), so login
      // and every API call would silently fail.
      if (urlPath.startsWith('/api')) {
        const options = {
          hostname: '127.0.0.1',
          port: apiPort,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `127.0.0.1:${apiPort}` },
        };
        const proxy = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });
        proxy.on('error', (err) => {
          logElectron(`API proxy error: ${err.message}`);
          res.writeHead(502);
          res.end('Bad Gateway');
        });
        req.pipe(proxy, { end: true });
        return;
      }

      // ── Serve static frontend files ────────────────────────────────────────
      let filePath = path.join(FRONTEND, urlPath === '/' ? 'index.html' : urlPath);
      // SPA fallback — any path without a file extension returns index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(FRONTEND, 'index.html');
      }
      const ext = path.extname(filePath);
      const mime = {
        '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
        '.woff': 'font/woff', '.ttf': 'font/ttf',
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
  new Notification({ title: 'Legacy Business ERP', body: 'Backend restarted successfully.' }).show();
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
    properties: ['openDirectory', 'createDirectory'],
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
      .filter(f => f.endsWith('.json') || f.endsWith('.xlsx'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return { name: f, size: stat.size, date: stat.mtime.toISOString(), path: path.join(dir, f) };
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
    logElectron('=== Legacy Business ERP starting ===');
    logElectron(`Version: 1.0.0 | Electron: ${process.versions.electron} | Node: ${process.versions.node}`);
    logElectron(`Resources: ${RESOURCES}`);
    logElectron(`userData: ${app.getPath('userData')}`);
    logElectron(`Logs: ${LOG_DIR}`);
    logElectron(`API_DIST: ${API_DIST}`);
    logElectron(`FRONTEND: ${FRONTEND}`);
    logElectron(`API_DIST exists: ${fs.existsSync(API_DIST)}`);
    logElectron(`FRONTEND exists: ${fs.existsSync(FRONTEND)}`);

    nativeTheme.themeSource = settings.theme || 'dark';

    // ── First launch: ask where to store daily backups ──────────────────────
    if (settings.firstLaunch) {
      const backupResult = await dialog.showMessageBox({
        type: 'question',
        title: 'Legacy Business ERP — First Launch Setup',
        message: 'Where do you want to store daily backups?',
        detail: [
          'Legacy Business ERP creates automatic encrypted daily backups of all your data.',
          '',
          'Please choose a backup folder location.',
          'Recommended: Choose a separate drive or a folder that is regularly synced (e.g. OneDrive, Google Drive).',
          '',
          'Default: ' + BACKUP_DIR_DEFAULT,
        ].join('\n'),
        buttons: ['Choose Folder', 'Use Default Location'],
        defaultId: 1,
      });

      let backupFolder = BACKUP_DIR_DEFAULT;
      if (backupResult.response === 0) {
        // Show folder picker
        const folderResult = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Backup Folder',
          defaultPath: app.getPath('documents'),
          buttonLabel: 'Use This Folder for Backups',
        });
        if (!folderResult.canceled && folderResult.filePaths.length > 0) {
          backupFolder = folderResult.filePaths[0];
        }
      }

      settings.backupFolder = backupFolder;
      settings.firstLaunch = false;
      saveSettings(settings);
      logElectron(`✓ Backup folder set to: ${backupFolder}`);

      // Ensure the backup folder exists
      try { fs.mkdirSync(backupFolder, { recursive: true }); } catch {}
    }

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
        'Legacy Business ERP — Startup Error',
        `${shortMsg}\n\nLog files are at:\n${LOG_DIR}`
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    // Keep app alive in tray on Windows/Linux
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
