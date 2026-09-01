const { ipcMain } = require('electron');
const db = require('../db');
const logger = require('../logger');

function register() {
  ipcMain.handle('servers:list', (evt, { search, dcName } = {}) => {
    let query = 'SELECT * FROM server_inventory WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (hostname LIKE ? OR host_ip LIKE ? OR serial_number LIKE ? OR dc_name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (dcName) { query += ' AND dc_name = ?'; params.push(dcName); }
    query += ' ORDER BY updated_at DESC';
    return db.getDb().prepare(query).all(...params);
  });

  ipcMain.handle('servers:get', (evt, id) => db.getDb().prepare('SELECT * FROM server_inventory WHERE id = ?').get(id));

  ipcMain.handle('servers:create', (evt, { actor, hostname, dcName, dcNumber, serialNumber, hostIp, sva, svaIp, model, address, siteManager, alternateContact, phone }) => {
    if (!hostname || !hostname.trim()) return { success: false, error: 'ESXi Hostname is required.' };
    const id = db.genId('SRV');
    const now = new Date().toISOString();
    try {
      db.getDb()
        .prepare(
          `INSERT INTO server_inventory (id, hostname, dc_name, dc_number, serial_number, host_ip, sva, sva_ip, model, address, site_manager, alternate_contact, phone, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .run(id, hostname.trim(), dcName || '', dcNumber || '', serialNumber || '', hostIp || '', sva || '', svaIp || '', model || '', address || '', siteManager || '', alternateContact || '', phone || '', now, now);
      db.audit(actor?.id, actor?.username, 'SERVER_CREATE', { id, hostname });
      logger.info('SERVERS', 'Server created', { hostname });
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message.includes('UNIQUE') ? 'A server with this hostname already exists.' : err.message };
    }
  });

  ipcMain.handle('servers:update', (evt, { actor, id, ...fields }) => {
    const sets = [];
    const params = [];
    const map = {
      hostname: 'hostname', dcName: 'dc_name', dcNumber: 'dc_number', serialNumber: 'serial_number',
      hostIp: 'host_ip', sva: 'sva', svaIp: 'sva_ip', model: 'model', address: 'address',
      siteManager: 'site_manager', alternateContact: 'alternate_contact', phone: 'phone'
    };
    for (const [camel, col] of Object.entries(map)) {
      if (fields[camel] !== undefined) { sets.push(`${col} = ?`); params.push(fields[camel]); }
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    try {
      db.getDb().prepare(`UPDATE server_inventory SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      db.audit(actor?.id, actor?.username, 'SERVER_UPDATE', { id, fields });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message.includes('UNIQUE') ? 'A server with this hostname already exists.' : err.message };
    }
  });

  ipcMain.handle('servers:delete', (evt, { actor, id }) => {
    db.getDb().prepare('DELETE FROM server_inventory WHERE id = ?').run(id);
    db.audit(actor?.id, actor?.username, 'SERVER_DELETE', { id });
    logger.info('SERVERS', 'Server deleted', { id });
    return { success: true };
  });
}

module.exports = { register };
