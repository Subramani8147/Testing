const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../logger');

const ALLOWED_UPLOAD_EXT = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.xlsx', '.csv', '.zip']);
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function register({ getPaths }) {
  ipcMain.handle('files:uploadDialog', async (evt, { actor } = {}) => {
    const result = await dialog.showOpenDialog({ title: 'Upload file(s)', properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return { canceled: true, files: [] };
    const paths = getPaths();
    const saved = [];
    for (const src of result.filePaths) {
      try {
        const ext = path.extname(src).toLowerCase();
        if (!ALLOWED_UPLOAD_EXT.has(ext)) throw new Error(`File type "${ext}" is not allowed.`);
        const stat = fs.statSync(src);
        if (stat.size > MAX_UPLOAD_BYTES) throw new Error('File exceeds 100MB limit.');
        const dest = path.join(paths.uploads, `${Date.now()}_${path.basename(src)}`);
        fs.copyFileSync(src, dest);
        saved.push({ name: path.basename(src), path: dest, size: stat.size });
        logger.info('UPLOADS', 'File uploaded', { name: path.basename(src), size: stat.size });
        db.audit(actor?.id, actor?.username, 'FILE_UPLOAD', { name: path.basename(src) });
      } catch (err) {
        logger.warn('UPLOADS', 'Upload rejected', { file: src, error: err.message });
        saved.push({ name: path.basename(src), error: err.message });
      }
    }
    return { canceled: false, files: saved };
  });

  ipcMain.handle('files:uploadDropped', (evt, { actor, filePaths }) => {
    const paths = getPaths();
    const saved = [];
    for (const src of filePaths) {
      try {
        const ext = path.extname(src).toLowerCase();
        if (!ALLOWED_UPLOAD_EXT.has(ext)) throw new Error(`File type "${ext}" is not allowed.`);
        const stat = fs.statSync(src);
        if (stat.size > MAX_UPLOAD_BYTES) throw new Error('File exceeds 100MB limit.');
        const dest = path.join(paths.uploads, `${Date.now()}_${path.basename(src)}`);
        fs.copyFileSync(src, dest);
        saved.push({ name: path.basename(src), path: dest, size: stat.size });
        db.audit(actor?.id, actor?.username, 'FILE_UPLOAD', { name: path.basename(src) });
      } catch (err) {
        saved.push({ name: path.basename(src), error: err.message });
      }
    }
    return { files: saved };
  });

  ipcMain.handle('files:openInFolder', (evt, filePath) => {
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
  });

  ipcMain.handle('files:exportCsv', async (evt, { defaultName, csvContent }) => {
    const paths = getPaths();
    const result = await dialog.showSaveDialog({
      title: 'Export CSV',
      defaultPath: path.join(paths.base && fs.existsSync(paths.base) ? paths.base : paths.uploads, defaultName),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, csvContent, 'utf8');
    logger.info('EXPORT', 'CSV exported', { file: result.filePath });
    return { canceled: false, path: result.filePath };
  });
}

module.exports = { register };
