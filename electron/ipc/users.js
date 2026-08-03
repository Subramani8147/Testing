const { ipcMain } = require('electron');
const db = require('../db');
const logger = require('../logger');

function register() {
  ipcMain.handle('users:login', (evt, { username, password }) => {
    const row = db.getDb().prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!row || !db.verifyPassword(password, row.password_hash)) {
      logger.warn('AUTH', 'Failed login attempt', { username });
      return { success: false, error: 'Invalid username or password.' };
    }
    db.getDb().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    db.audit(row.id, row.username, 'LOGIN', {});
    logger.info('AUTH', 'User logged in', { username });
    const { password_hash, ...safe } = row;
    return { success: true, user: safe };
  });

  ipcMain.handle('users:list', () => {
    return db
      .getDb()
      .prepare('SELECT id, username, full_name, role, is_default, active, created_at, last_login FROM users ORDER BY created_at')
      .all();
  });

  ipcMain.handle('users:create', (evt, { actor, username, password, fullName, role }) => {
    if (!username || !password || password.length < 8) {
      return { success: false, error: 'Username and a password of at least 8 characters are required.' };
    }
    try {
      const id = db.genId('USR');
      db.getDb()
        .prepare(
          `INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at)
           VALUES (?,?,?,?,?,0,1,?)`
        )
        .run(id, username, db.hashPassword(password), fullName || username, role || 'technician', new Date().toISOString());
      db.audit(actor?.id, actor?.username, 'USER_CREATE', { username, role });
      logger.info('USERS', 'User created', { username, role });
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message.includes('UNIQUE') ? 'Username already exists.' : err.message };
    }
  });

  ipcMain.handle('users:update', (evt, { actor, id, fullName, role, active }) => {
    db.getDb()
      .prepare('UPDATE users SET full_name = ?, role = ?, active = ? WHERE id = ?')
      .run(fullName, role, active ? 1 : 0, id);
    db.audit(actor?.id, actor?.username, 'USER_UPDATE', { id, fullName, role, active });
    return { success: true };
  });

  ipcMain.handle('users:resetPassword', (evt, { actor, id, newPassword }) => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    db.getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(db.hashPassword(newPassword), id);
    db.audit(actor?.id, actor?.username, 'PASSWORD_RESET', { targetUserId: id });
    logger.info('AUTH', 'Password reset', { targetUserId: id });
    return { success: true };
  });

  ipcMain.handle('users:delete', (evt, { actor, id }) => {
    const target = db.getDb().prepare('SELECT is_default FROM users WHERE id = ?').get(id);
    if (target?.is_default) {
      return { success: false, error: 'The default administrator account cannot be deleted.' };
    }
    db.getDb().prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
    db.audit(actor?.id, actor?.username, 'USER_DEACTIVATE', { id });
    return { success: true };
  });
}

module.exports = { register };
