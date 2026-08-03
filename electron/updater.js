const logger = require('./logger');
const store = require('./settings-store');

/**
 * Auto-update is DISABLED BY DEFAULT per the product requirement.
 * To enable it later:
 *   1. Configure a publish target in package.json's "build.publish"
 *      (e.g. GitHub Releases, S3, or a generic feed URL).
 *   2. Flip settings:setAutoUpdate(true) from the Settings page --
 *      this only sets the persisted flag; it does not by itself
 *      start checking, see initAutoUpdater() below.
 *   3. Call initAutoUpdater(mainWindow) after app 'ready' (already
 *      wired in main.js, gated on the enabled flag).
 */
function initAutoUpdater(mainWindow) {
  const enabled = store.get('autoUpdate.enabled', false);
  if (!enabled) {
    logger.info('UPDATER', 'Auto-update disabled (default). Skipping initialization.');
    return;
  }
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = { info: logger.info.bind(logger, 'UPDATER'), warn: logger.warn.bind(logger, 'UPDATER'), error: logger.error.bind(logger, 'UPDATER') };
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
