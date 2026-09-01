const Store = require('electron-store');

const store = new Store({
  name: 'config.enc',
  encryptionKey: 'itops-portal-local-config-v1',
  defaults: {
    paths: {
      base: null,
      database: null,
      sops: null,
      backups: null,
      uploads: null,
      exportFolder: null,
      importFolder: null
    },
    theme: 'dark',
    backup: {
      schedule: 'daily',
      hour: 2,
      keepCount: 30
    },
    logRetentionDays: 90,
    defaultAccountUsername: 'admin',
    autoUpdate: {
      enabled: false
    },
    tray: {
      minimizeToTray: true
    },
    firstRunComplete: false
  }
});

module.exports = store;
