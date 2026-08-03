const Store = require('electron-store');

/**
 * Persisted app configuration (paths, theme, backup schedule, retention...).
 * electron-store's `encryptionKey` obfuscates the JSON on disk (config.enc.json)
 * so it isn't plainly readable in a text editor. This is NOT a substitute for
 * OS-level access control -- it deters casual tampering/inspection, it does
 * not protect against a determined local attacker with admin rights.
 */
const store = new Store({
  name: 'config.enc',
  encryptionKey: 'itops-portal-local-config-v1',
  defaults: {
    paths: {
      base: null,       // null = use ProgramData default
      database: null,
      sops: null,
      backups: null,
      uploads: null,
      exportFolder: null,
      importFolder: null
    },
    theme: 'dark',
    backup: {
      schedule: 'daily', // daily | weekly | manual
      hour: 2,            // 2 AM local time
      keepCount: 30
    },
    logRetentionDays: 90,
    defaultAccountUsername: 'admin',
    autoUpdate: {
      enabled: false // kept OFF by default per requirement; UI can flip this later
    },
    tray: {
      minimizeToTray: true
    },
    firstRunComplete: false
  }
});

module.exports = store;
