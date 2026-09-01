const logger = require('./logger');
const store = require('./settings-store');

function initAutoUpdater(mainWindow) {
  const enabled = store.get('autoUpdate.enabled', false);
  if (!enabled) {
    logger.info('UPDATER', 'Auto-update disabled (default). Skipping initialization.');
    return;
  }
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = {
      info: logger.info.bind(logger, 'UPDATER'),
      warn: logger.warn.bind(logger, 'UPDATER'),
      error: logger.error.bind(logger, 'UPDATER')
    };
    autoUpdater.on('update-available', (info) => {
      logger.info('UPDATER', 'Update available', { version: info.version });
      mainWindow?.webContents.send('updater:event', { type: 'available', info });
    });
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('UPDATER', 'Update downloaded', { version: info.version });
      mainWindow?.webContents.send('updater:event', { type: 'downloaded', info });
    });
    autoUpdater.on('error', (err) => {
      logger.error('UPDATER', 'Auto-update error', { error: err.message });
    });
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    logger.error('UPDATER', 'Failed to initialize electron-updater', { error: err.message });
  }
}

module.exports = { initAutoUpdater };
