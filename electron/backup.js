const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const logger = require('./logger');
const db = require('./db');

const ALLOWED_EXTENSIONS = new Set(['.db']);
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

async function runBackup({ databaseFile, backupsDir, triggerType = 'scheduled', keepCount = 30 }) {
  const stamp = new Date().toISOString().slice(0, 10);
  let filename = `knowledge_${stamp}.db`;
  let target = path.join(backupsDir, filename);
  if (fs.existsSync(target) && triggerType === 'manual') {
    const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    filename = `knowledge_${stamp}_${time}.db`;
    target = path.join(backupsDir, filename);
  }

  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    const live = db.getDb();
    await live.backup(target);
    const size = fs.statSync(target).size;

    db.getDb()
      .prepare(`INSERT INTO backup_log (id, filename, size_bytes, status, trigger_type, created_at) VALUES (?,?,?,?,?,?)`)
      .run(db.genId('BKP'), filename, size, 'Success', triggerType, new Date().toISOString());

    logger.info('BACKUP', 'Backup completed', { filename, size, triggerType });
    pruneOldBackups(backupsDir, keepCount);
    return { success: true, filename, path: target, size };
  } catch (err) {
    logger.error('BACKUP', 'Backup failed', { error: err.message });
    try {
      db.getDb()
        .prepare(`INSERT INTO backup_log (id, filename, size_bytes, status, trigger_type, created_at) VALUES (?,?,?,?,?,?)`)
        .run(db.genId('BKP'), filename, 0, 'Failed', triggerType, new Date().toISOString());
    } catch {
      /* ignore secondary failure */
    }
    return { success: false, error: err.message };
  }
}

function pruneOldBackups(backupsDir, keepCount) {
  try {
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => ({ f, mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const toDelete = files.slice(keepCount);
    for (const { f } of toDelete) {
      fs.unlinkSync(path.join(backupsDir, f));
      logger.info('BACKUP', 'Pruned old backup', { file: f });
    }
  } catch (err) {
    logger.warn('BACKUP', 'Backup pruning failed', { error: err.message });
  }
}

function listBackups(backupsDir) {
  if (!fs.existsSync(backupsDir)) return [];
  return fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupsDir, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function restoreBackup({ backupFile, databaseFile }) {
  const ext = path.extname(backupFile).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Invalid backup file type. Only .db files are accepted.');
  }
  const stat = fs.statSync(backupFile);
  if (stat.size > MAX_UPLOAD_BYTES) {
    throw new Error('Backup file exceeds the maximum allowed size.');
  }
  const test = new Database(backupFile, { readonly: true });
  test.pragma('quick_check');
  test.close();

  db.closeDb();
  const safetyCopy = `${databaseFile}.pre-restore-${Date.now()}.bak`;
  fs.copyFileSync(databaseFile, safetyCopy);
  fs.copyFileSync(backupFile, databaseFile);
  logger.warn('BACKUP', 'Database restored from backup', { backupFile, safetyCopy });
  return { success: true, safetyCopy };
}

module.exports = { runBackup, listBackups, restoreBackup, pruneOldBackups };
