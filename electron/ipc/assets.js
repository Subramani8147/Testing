const { ipcMain } = require('electron');
const db = require('../db');
const logger = require('../logger');

function register() {
  ipcMain.handle('assets:list', (evt, { search, status, type } = {}) => {
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR asset_tag LIKE ? OR assigned_to LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY updated_at DESC';
    return db.getDb().prepare(query).all(...params);
  });

  ipcMain.handle('assets:get', (evt, id) => db.getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id));

  ipcMain.handle('assets:create', (evt, { actor, assetTag, name, type, status, location, assignedTo, purchaseDate, warrantyExpiry, notes }) => {
    if (!assetTag || !name) return { success: false, error: 'Asset tag and name are required.' };
    const id = db.genId('AST');
    const now = new Date().toISOString();
    try {
      db.getDb()
        .prepare(
          `INSERT INTO assets (id, asset_tag, name, type, status, location, assigned_to, purchase_date, warranty_expiry, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(id, assetTag.trim(), name.trim(), type || 'Other', status || 'Active', location || '', assignedTo || '', purchaseDate || null, warrantyExpiry || null, notes || '', now, now);
      db.audit(actor?.id, actor?.username, 'ASSET_CREATE', { id, assetTag });
      logger.info('ASSETS', 'Asset created', { assetTag, type });
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message.includes('UNIQUE') ? 'Asset tag already exists.' : err.message };
    }
  });

  ipcMain.handle('assets:update', (evt, { actor, id, ...fields }) => {
    const sets = [];
    const params = [];
    const map = {
      assetTag: 'asset_tag',
      name: 'name',
      type: 'type',
      status: 'status',
      location: 'location',
      assignedTo: 'assigned_to',
      purchaseDate: 'purchase_date',
      warrantyExpiry: 'warranty_expiry',
      notes: 'notes'
    };
    for (const [camel, col] of Object.entries(map)) {
      if (fields[camel] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(fields[camel]);
      }
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.getDb().prepare(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    db.audit(actor?.id, actor?.username, 'ASSET_UPDATE', { id, fields });
    return { success: true };
  });

  ipcMain.handle('assets:delete', (evt, { actor, id }) => {
    db.getDb().prepare('DELETE FROM assets WHERE id = ?').run(id);
    db.audit(actor?.id, actor?.username, 'ASSET_DELETE', { id });
    logger.info('ASSETS', 'Asset deleted', { id });
    return { success: true };
  });
}

module.exports = { register };
