const { ipcMain } = require('electron');
const db = require('../db');
const logger = require('../logger');

function nextTicketNumber() {
  const row = db.getDb().prepare('SELECT COUNT(*) AS c FROM tickets').get();
  const seq = String(row.c + 1).padStart(5, '0');
  const year = new Date().getFullYear();
  return `INC-${year}-${seq}`;
}

function register() {
  ipcMain.handle('tickets:list', (evt, { status, priority, search, assignedTo } = {}) => {
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (assignedTo) {
      query += ' AND assigned_to = ?';
      params.push(assignedTo);
    }
    if (search) {
      query += ' AND (title LIKE ? OR ticket_number LIKE ? OR requester LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    query += ' ORDER BY CASE priority WHEN "Critical" THEN 0 WHEN "High" THEN 1 WHEN "Medium" THEN 2 ELSE 3 END, created_at DESC';
    return db.getDb().prepare(query).all(...params);
  });

  ipcMain.handle('tickets:get', (evt, id) => {
    const ticket = db.getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    if (!ticket) return null;
    const comments = db.getDb().prepare('SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at').all(id);
    return { ...ticket, comments };
  });

  ipcMain.handle('tickets:create', (evt, { actor, title, description, priority, category, requester, assignedTo, assetId }) => {
    if (!title || !title.trim()) return { success: false, error: 'Title is required.' };
    const id = db.genId('TCK');
    const now = new Date().toISOString();
    const ticketNumber = nextTicketNumber();
    db.getDb()
      .prepare(
        `INSERT INTO tickets (id, ticket_number, title, description, status, priority, category, requester, assigned_to, asset_id, created_at, updated_at)
         VALUES (?,?,?,?,'Open',?,?,?,?,?,?,?)`
      )
      .run(id, ticketNumber, title.trim(), description || '', priority || 'Medium', category || 'General', requester || '', assignedTo || null, assetId || null, now, now);
    db.audit(actor?.id, actor?.username, 'TICKET_CREATE', { id, ticketNumber });
    logger.info('TICKETS', 'Ticket created', { ticketNumber, priority });
    return { success: true, id, ticketNumber };
  });

  ipcMain.handle('tickets:update', (evt, { actor, id, ...fields }) => {
    const existing = db.getDb().prepare('SELECT status FROM tickets WHERE id = ?').get(id);
    if (!existing) return { success: false, error: 'Ticket not found.' };
    const resolvedAt =
      fields.status === 'Resolved' || fields.status === 'Closed'
        ? new Date().toISOString()
        : existing.status === 'Resolved' || existing.status === 'Closed'
        ? null
        : undefined;

    const sets = [];
    const params = [];
    for (const key of ['title', 'description', 'status', 'priority', 'category', 'requester', 'assigned_to', 'asset_id']) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (fields[camel] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(fields[camel]);
      }
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    if (resolvedAt !== undefined) {
      sets.push('resolved_at = ?');
      params.push(resolvedAt);
    }
    params.push(id);
    db.getDb().prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    db.audit(actor?.id, actor?.username, 'TICKET_UPDATE', { id, fields });
    return { success: true };
  });

  ipcMain.handle('tickets:delete', (evt, { actor, id }) => {
    db.getDb().prepare('DELETE FROM tickets WHERE id = ?').run(id);
    db.audit(actor?.id, actor?.username, 'TICKET_DELETE', { id });
    logger.info('TICKETS', 'Ticket deleted', { id });
    return { success: true };
  });

  ipcMain.handle('tickets:addComment', (evt, { actor, ticketId, body }) => {
    if (!body || !body.trim()) return { success: false, error: 'Comment cannot be empty.' };
    const id = db.genId('CMT');
    db.getDb()
      .prepare('INSERT INTO ticket_comments (id, ticket_id, author, body, created_at) VALUES (?,?,?,?,?)')
      .run(id, ticketId, actor?.username || 'system', body.trim(), new Date().toISOString());
    db.getDb().prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), ticketId);
    return { success: true, id };
  });

  ipcMain.handle('dashboard:summary', () => {
    const g = db.getDb();
    return {
      openTickets: g.prepare("SELECT COUNT(*) c FROM tickets WHERE status IN ('Open','In Progress')").get().c,
      criticalTickets: g.prepare("SELECT COUNT(*) c FROM tickets WHERE priority = 'Critical' AND status NOT IN ('Resolved','Closed')").get().c,
      resolvedThisWeek: g
        .prepare("SELECT COUNT(*) c FROM tickets WHERE resolved_at IS NOT NULL AND resolved_at >= datetime('now','-7 days')")
        .get().c,
      totalSops: g.prepare('SELECT COUNT(*) c FROM sops').get().c,
      totalAssets: g.prepare('SELECT COUNT(*) c FROM assets').get().c,
      assetsInRepair: g.prepare("SELECT COUNT(*) c FROM assets WHERE status = 'In Repair'").get().c,
      ticketsByStatus: g.prepare('SELECT status, COUNT(*) c FROM tickets GROUP BY status').all(),
      ticketsByPriority: g.prepare('SELECT priority, COUNT(*) c FROM tickets GROUP BY priority').all(),
      recentTickets: g.prepare('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 8').all()
    };
  });
}

module.exports = { register };
