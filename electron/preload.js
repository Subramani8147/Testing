const { contextBridge, ipcRenderer, webUtils } = require('electron');

/**
 * The renderer NEVER talks to Node/Electron/SQLite directly. Every
 * operation goes through a named ipcMain.handle() in electron/ipc/*.js,
 * which validates input and enforces business rules server-side (in the
 * main process). This keeps the UI from being able to run arbitrary SQL
 * or file operations even if renderer code were compromised (e.g. via a
 * malicious pasted SOP body) -- see Security notes in docs/.
 */
const api = {
  // --- Auth / Users ---
  login: (username, password) => ipcRenderer.invoke('users:login', { username, password }),
  usersList: () => ipcRenderer.invoke('users:list'),
  usersCreate: (payload) => ipcRenderer.invoke('users:create', payload),
  usersUpdate: (payload) => ipcRenderer.invoke('users:update', payload),
  usersResetPassword: (payload) => ipcRenderer.invoke('users:resetPassword', payload),
  usersDelete: (payload) => ipcRenderer.invoke('users:delete', payload),

  // --- SOPs ---
  sopsList: (filter) => ipcRenderer.invoke('sops:list', filter),
  sopsGet: (id) => ipcRenderer.invoke('sops:get', id),
  sopsCategories: () => ipcRenderer.invoke('sops:categories'),
  sopsCreate: (payload) => ipcRenderer.invoke('sops:create', payload),
  sopsUpdate: (payload) => ipcRenderer.invoke('sops:update', payload),
  sopsDelete: (payload) => ipcRenderer.invoke('sops:delete', payload),
  sopsAttachDialog: (payload) => ipcRenderer.invoke('sops:attachDialog', payload),
  sopsAttachDropped: (payload) => ipcRenderer.invoke('sops:attachDropped', payload),
  sopsOpenAttachment: (filePath) => ipcRenderer.invoke('sops:openAttachment', filePath),

  // --- Tickets ---
  ticketsList: (filter) => ipcRenderer.invoke('tickets:list', filter),
  ticketsGet: (id) => ipcRenderer.invoke('tickets:get', id),
  ticketsCreate: (payload) => ipcRenderer.invoke('tickets:create', payload),
  ticketsUpdate: (payload) => ipcRenderer.invoke('tickets:update', payload),
  ticketsDelete: (payload) => ipcRenderer.invoke('tickets:delete', payload),
  ticketsAddComment: (payload) => ipcRenderer.invoke('tickets:addComment', payload),
  dashboardSummary: () => ipcRenderer.invoke('dashboard:summary'),

  // --- Assets ---
  assetsList: (filter) => ipcRenderer.invoke('assets:list', filter),
  assetsGet: (id) => ipcRenderer.invoke('assets:get', id),
  assetsCreate: (payload) => ipcRenderer.invoke('assets:create', payload),
  assetsUpdate: (payload) => ipcRenderer.invoke('assets:update', payload),
  assetsDelete: (payload) => ipcRenderer.invoke('assets:delete', payload),

  // --- Settings ---
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSetTheme: (theme) => ipcRenderer.invoke('settings:setTheme', theme),
  settingsSetBackupSchedule: (payload) => ipcRenderer.invoke('settings:setBackupSchedule', payload),
  settingsSetLogRetention: (days) => ipcRenderer.invoke('settings:setLogRetention', days),
  settingsSetTrayBehavior: (val) => ipcRenderer.invoke('settings:setTrayBehavior', val),
  settingsSetAutoUpdate: (val) => ipcRenderer.invoke('settings:setAutoUpdate', val),
  settingsBrowseFolder: (payload) => ipcRenderer.invoke('settings:browseFolder', payload),
  settingsSetPath: (payload) => ipcRenderer.invoke('settings:setPath', payload),
  settingsSetDefaultAccount: (username) => ipcRenderer.invoke('settings:setDefaultAccount', username),
  settingsRestartApp: () => ipcRenderer.invoke('settings:restartApp'),
  appInfo: () => ipcRenderer.invoke('settings:appInfo'),

  // --- Backup ---
  backupNow: (payload) => ipcRenderer.invoke('backup:now', payload),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupHistoryLog: () => ipcRenderer.invoke('backup:historyLog'),
  backupBrowseRestoreFile: () => ipcRenderer.invoke('backup:browseRestoreFile'),
  backupRestore: (payload) => ipcRenderer.invoke('backup:restore', payload),
  backupLoadSampleData: (payload) => ipcRenderer.invoke('backup:loadSampleData', payload),

  // --- Files ---
  filesUploadDialog: (payload) => ipcRenderer.invoke('files:uploadDialog', payload),
  filesUploadDropped: (payload) => ipcRenderer.invoke('files:uploadDropped', payload),
  filesOpenInFolder: (filePath) => ipcRenderer.invoke('files:openInFolder', filePath),
  filesExportCsv: (payload) => ipcRenderer.invoke('files:exportCsv', payload),
  // Resolves an absolute path from a File object dropped onto the window
  // (requires sandbox:false in main.js's webPreferences).
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // --- System ---
  systemPaths: () => ipcRenderer.invoke('system:paths'),
  systemNotify: (payload) => ipcRenderer.invoke('system:notify', payload),
  systemOpenExternal: (url) => ipcRenderer.invoke('system:openExternal', url),

  // --- Menu / tray driven shortcuts -> renderer listens for these ---
  onShortcut: (channel, callback) => {
    const validChannels = ['shortcut:save', 'shortcut:find', 'shortcut:backupNow', 'shortcut:about'];
    if (!validChannels.includes(channel)) return () => {};
    const listener = (_evt, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onUpdaterEvent: (callback) => {
    const listener = (_evt, payload) => callback(payload);
    ipcRenderer.on('updater:event', listener);
    return () => ipcRenderer.removeListener('updater:event', listener);
  }
};

contextBridge.exposeInMainWorld('api', api);
