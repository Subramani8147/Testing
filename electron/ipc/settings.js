const { ipcMain, dialog, app } = require('electron');
const store = require('../settings-store');
const logger = require('../logger');

function register({ getPaths, restartApp }) {
  ipcMain.handle('settings:get', () => ({
    ...store.store,
    resolvedPaths: getPaths()
  }));

  ipcMain.handle('settings:setTheme', (evt, theme) => {
    store.set('theme', theme);
    return { success: true };
  });

  ipcMain.handle('settings:setBackupSchedule', (evt, { schedule, hour, keepCount }) => {
    store.set('backup', { schedule, hour, keepCount });
    logger.info('SETTINGS', 'Backup schedule updated', { schedule, hour, keepCount });
    return { success: true };
  });

  ipcMain.handle('settings:setLogRetention', (evt, days) => {
    store.set('logRetentionDays', days);
    require('../logger').setRetentionDays(days);
    return { success: true };
  });

  ipcMain.handle('settings:setTrayBehavior', (evt, minimizeToTray) => {
    store.set('tray.minimizeToTray', minimizeToTray);
    return { success: true };
  });

  ipcMain.handle('settings:setAutoUpdate', (evt, enabled) => {
    store.set('autoUpdate.enabled', enabled);
    logger.info('SETTINGS', 'Auto-update flag changed', { enabled });
    return { success: true };
  });

  ipcMain.handle('settings:browseFolder', async (evt, { title }) => {
    const result = await dialog.showOpenDialog({ title: title || 'Select folder', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('settings:setPath', async (evt, { key, value }) => {
    const allowed = new Set(['database', 'sops', 'backups', 'uploads', 'exportFolder', 'importFolder']);
    if (!allowed.has(key)) return { success: false, error: 'Unknown path key.' };
    store.set(`paths.${key}`, value);
    logger.info('SETTINGS', 'Path updated', { key, value });
    return { success: true, requiresRestart: ['database', 'sops', 'backups', 'uploads'].includes(key) };
  });

  ipcMain.handle('settings:restartApp', () => {
    restartApp();
  });

  ipcMain.handle('settings:setDefaultAccount', (evt, username) => {
    store.set('defaultAccountUsername', username);
    return { success: true };
  });

  ipcMain.handle('settings:appInfo', () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron
  }));
}

module.exports = { register };
