const { app, BrowserWindow, Menu, Tray, Notification, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { resolvePaths } = require('./paths');
const logger = require('./logger');
const db = require('./db');
const store = require('./settings-store');
const backupEngine = require('./backup');
const { initAutoUpdater } = require('./updater');

const usersIpc = require('./ipc/users');
const sopsIpc = require('./ipc/sops');
const ticketsIpc = require('./ipc/tickets');
const assetsIpc = require('./ipc/assets');
const settingsIpc = require('./ipc/settings');
const backupIpc = require('./ipc/backup-ipc');
const filesIpc = require('./ipc/files');
const importIpc = require('./ipc/import');
const serversIpc = require('./ipc/servers');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;
let currentPaths = null;
let backupTimer = null;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getPaths() {
  return currentPaths;
}

function initializePaths() {
  const overrides = {
    base: store.get('paths.base') || undefined,
    database: store.get('paths.database') || undefined,
    sops: store.get('paths.sops') || undefined,
    backups: store.get('paths.backups') || undefined,
    uploads: store.get('paths.uploads') || undefined
  };
  currentPaths = resolvePaths(overrides);
  return currentPaths;
}

function initializeDatabase() {
  const paths = getPaths();
  const isFirstRun = !fs.existsSync(paths.databaseFile);
  db.init(paths.databaseFile);
  if (isFirstRun) {
    logger.info('SYSTEM', 'First run detected - fresh database created', { databaseFile: paths.databaseFile });
    store.set('firstRunComplete', true);
  }
}

function scheduleBackups() {
  if (backupTimer) clearInterval(backupTimer);
  let lastRunDate = null;
  backupTimer = setInterval(async () => {
    const cfg = store.get('backup');
    if (!cfg || cfg.schedule === 'manual') return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (lastRunDate === today) return;
    const isWeeklyDue = cfg.schedule === 'weekly' ? now.getDay() === 1 : true;
    if (now.getHours() === (cfg.hour ?? 2) && isWeeklyDue) {
      lastRunDate = today;
      const paths = getPaths();
      const result = await backupEngine.runBackup({
        databaseFile: paths.databaseFile,
        backupsDir: paths.backups,
        triggerType: 'scheduled',
        keepCount: cfg.keepCount || 30
      });
      if (result.success) notify('Backup complete', `Database backed up to ${result.filename}`);
      else notify('Backup failed', result.error || 'Unknown error');
    }
  }, 60 * 1000);
}

function notify(title, body) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, icon: path.join(__dirname, '..', 'build', 'icon.png') }).show();
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip('IT Operations Knowledge Portal');
  const menu = Menu.buildFromTemplate([
    { label: 'Open Portal', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Backup Now', click: () => mainWindow?.webContents.send('shortcut:backupNow') },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('shortcut:save') },
        { label: 'Print', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.print() },
        { type: 'separator' },
        { label: 'Backup Now', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('shortcut:backupNow') },
        { type: 'separator' },
        { label: 'Exit', click: () => { isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => mainWindow?.webContents.send('shortcut:find') },
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Open Logs Folder', click: () => shell.openPath(getPaths().logs) },
        { label: 'Open Data Folder', click: () => shell.openPath(getPaths().base) },
        { type: 'separator' },
        { label: 'About', click: () => mainWindow?.webContents.send('shortcut:about') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    const minimizeToTray = store.get('tray.minimizeToTray', true);
    if (!isQuitting && minimizeToTray && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    logger.error('SYSTEM', 'Renderer failed to load', { code, desc });
  });
}

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(() => {
  try {
    initializePaths();
    logger.init(getPaths().logs, store.get('logRetentionDays', 90));
    logger.info('SYSTEM', 'Application starting', { version: app.getVersion(), platform: process.platform });
    initializeDatabase();
  } catch (err) {
    console.error('Fatal startup error:', err);
    app.quit();
    return;
  }

  usersIpc.register();
  sopsIpc.register(() => getPaths().sops);
  ticketsIpc.register();
  assetsIpc.register();
  settingsIpc.register({ getPaths, restartApp });
  backupIpc.register({ getPaths, restartApp });
  filesIpc.register({ getPaths });
  importIpc.register(() => getPaths());
  serversIpc.register();

  ipcMain.handle('system:paths', () => getPaths());
  ipcMain.handle('system:notify', (evt, { title, body }) => notify(title, body));
  ipcMain.handle('system:openExternal', (evt, url) => shell.openExternal(url));

  createWindow();
  createTray();
  buildMenu();
  scheduleBackups();
  initAutoUpdater(mainWindow);

  process.on('uncaughtException', (err) => {
    logger.error('SYSTEM', 'Uncaught exception', { error: err.message, stack: err.stack });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

function restartApp() {
  logger.info('SYSTEM', 'Restarting application');
  app.relaunch();
  isQuitting = true;
  app.quit();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    db.closeDb();
    app.quit();
  }
});

app.on('quit', () => {
  logger.info('SYSTEM', 'Application stopped');
  db.closeDb();
  if (backupTimer) clearInterval(backupTimer);
});
