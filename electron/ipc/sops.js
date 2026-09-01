const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../logger');

const ALLOWED_EXT = new Set(['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.xlsx', '.csv']);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function validateFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`File type "${ext}" is not allowed.`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error('File exceeds the 50MB size limit.');
  }
  return { ext, size: stat.size };
}

function register(getSopsDir) {
  ipcMain.handle('sops:list', (evt, { search, category } = {}) => {
    let query = 'SELECT * FROM sops WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY updated_at DESC';
    return db.getDb().prepare(query).all(...params);
  });

  ipcMain.handle('sops:get', (evt, id) => db.getDb().prepare('SELECT * FROM sops WHERE id = ?').get(id));

  ipcMain.handle('sops:categories', () =>
    db.getDb().prepare('SELECT DISTINCT category FROM sops ORDER BY category').all().map((r) => r.category)
  );

  ipcMain.handle('sops:create', (evt, { actor, title, category, tags, content }) => {
    if (!title || !title.trim()) return { success: false, error: 'Title is required.' };
    const id = db.genId('SOP');
    const now = new Date().toISOString();
    db.getDb()
      .prepare(
        `INSERT INTO sops (id, title, category, tags, content, version, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,1,?,?,?)`
      )
      .run(id, title.trim(), category || 'General', tags || '', content || '', actor?.id, now, now);
    db.audit(actor?.id, actor?.username, 'SOP_CREATE', { id, title });
    logger.info('SOPS', 'SOP created', { id, title });
    return { success: true, id };
  });

  ipcMain.handle('sops:update', (evt, { actor, id, title, category, tags, content }) => {
    const existing = db.getDb().prepare('SELECT version FROM sops WHERE id = ?').get(id);
    if (!existing) return { success: false, error: 'SOP not found.' };
    db.getDb()
      .prepare(`UPDATE sops SET title=?, category=?, tags=?, content=?, version=?, updated_at=? WHERE id=?`)
      .run(title, category, tags, content, existing.version + 1, new Date().toISOString(), id);
    db.audit(actor?.id, actor?.username, 'SOP_UPDATE', { id, title });
    return { success: true };
  });

  ipcMain.handle('sops:delete', (evt, { actor, id }) => {
    const row = db.getDb().prepare('SELECT attachment_path FROM sops WHERE id = ?').get(id);
    db.getDb().prepare('DELETE FROM sops WHERE id = ?').run(id);
    if (row?.attachment_path && fs.existsSync(row.attachment_path)) {
      try {
        fs.unlinkSync(row.attachment_path);
      } catch (err) {
        logger.warn('SOPS', 'Failed to remove attachment file', { error: err.message });
      }
    }
    db.audit(actor?.id, actor?.username, 'SOP_DELETE', { id });
    logger.info('SOPS', 'SOP deleted', { id });
    return { success: true };
  });

  ipcMain.handle('sops:attachDialog', async (evt, { actor, id }) => {
    const result = await dialog.showOpenDialog({
      title: 'Attach document to SOP',
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'txt', 'md', 'xlsx', 'csv'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
    return attachFile(getSopsDir(), actor, id, result.filePaths[0]);
  });

  ipcMain.handle('sops:attachDropped', (evt, { actor, id, filePath }) => {
    return attachFile(getSopsDir(), actor, id, filePath);
  });

  function attachFile(sopsDir, actor, id, sourcePath) {
    try {
      const { ext, size } = validateFile(sourcePath);
      const destName = `${id}_${Date.now()}${ext}`;
      const destPath = path.join(sopsDir, destName);
      fs.copyFileSync(sourcePath, destPath);
      db.getDb()
        .prepare('UPDATE sops SET attachment_path = ?, attachment_name = ?, updated_at = ? WHERE id = ?')
        .run(destPath, path.basename(sourcePath), new Date().toISOString(), id);
      db.audit(actor?.id, actor?.username, 'SOP_ATTACH', { id, file: path.basename(sourcePath), size });
      logger.info('SOPS', 'Attachment added', { id, file: path.basename(sourcePath) });
      return { success: true, attachmentPath: destPath, attachmentName: path.basename(sourcePath) };
    } catch (err) {
      logger.error('SOPS', 'Attachment rejected', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  ipcMain.handle('sops:openAttachment', (evt, filePath) => {
    if (filePath && fs.existsSync(filePath)) shell.openPath(filePath);
  });
}

module.exports = { register, validateFile };
