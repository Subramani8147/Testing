const { ipcMain, dialog } = require('electron');
const backupEngine = require('../backup');
const store = require('../settings-store');
const logger = require('../logger');
const db = require('../db');

function register({ getPaths, restartApp }) {
  ipcMain.handle('backup:now', async (evt, { actor } = {}) => {
    const paths = getPaths();
    const result = await backupEngine.runBackup({
      databaseFile: paths.databaseFile,
      backupsDir: paths.backups,
      triggerType: 'manual',
      keepCount: store.get('backup.keepCount', 30)
    });
    if (result.success) db.audit(actor?.id, actor?.username, 'BACKUP_MANUAL', { filename: result.filename });
    return result;
  });

  ipcMain.handle('backup:list', () => {
    const paths = getPaths();
    return backupEngine.listBackups(paths.backups);
  });

  ipcMain.handle('backup:historyLog', () => {
    return db.getDb().prepare('SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 100').all();
  });

  ipcMain.handle('backup:browseRestoreFile', async () => {
    const paths = getPaths();
    const result = await dialog.showOpenDialog({
      title: 'Select backup file to restore',
      defaultPath: paths.backups,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('backup:restore', (evt, { actor, backupFile }) => {
    const paths = getPaths();
    try {
      const result = backupEngine.restoreBackup({ backupFile, databaseFile: paths.databaseFile });
      logger.warn('BACKUP', 'Restore executed, restarting app', { backupFile, actor: actor?.username });
      setTimeout(() => restartApp(), 500);
      return result;
    } catch (err) {
      logger.error('BACKUP', 'Restore failed', { error: err.message });
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };
