const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const logger = require('./logger');

let db = null;
const SCHEMA_VERSION = 1;

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(plain, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch {
    return false;
  }
}

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function init(databaseFile) {
  db = new Database(databaseFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'technician',
      is_default INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      tags TEXT DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      attachment_path TEXT,
      attachment_name TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_tag TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Other',
      status TEXT NOT NULL DEFAULT 'Active',
      location TEXT,
      assigned_to TEXT,
      purchase_date TEXT,
      warranty_expiry TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT NOT NULL DEFAULT 'Medium',
      category TEXT DEFAULT 'General',
      requester TEXT,
      assigned_to TEXT,
      asset_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author TEXT,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS server_inventory (
      id TEXT PRIMARY KEY,
      hostname TEXT UNIQUE NOT NULL,
      dc_name TEXT,
      dc_number TEXT,
      serial_number TEXT,
      host_ip TEXT,
      sva TEXT,
      sva_ip TEXT,
      model TEXT,
      address TEXT,
      site_manager TEXT,
      alternate_contact TEXT,
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_log (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      size_bytes INTEGER,
      status TEXT NOT NULL,
      trigger_type TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_servers_dcname ON server_inventory(dc_name);
  `);

  const metaRow = db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('schema_version');
  if (!metaRow) {
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION));
  }

  seedDefaultAdmin();
  logger.info('DATABASE', 'Database initialized', { databaseFile });
  return db;
}

function seedDefaultAdmin() {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (existing.c > 0) return;
  const id = genId('USR');
  db.prepare(
    `INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at)
     VALUES (?, ?, ?, ?, 'admin', 1, 1, ?)`
  ).run(id, 'admin', hashPassword('ChangeMe123!'), 'Default Administrator', new Date().toISOString());
  logger.warn('SECURITY', 'Seeded default admin account (username: admin). Change the password on first login.');
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function audit(userId, username, action, details) {
  db.prepare(
    `INSERT INTO audit_log (id, user_id, username, action, details, created_at) VALUES (?,?,?,?,?,?)`
  ).run(genId('AUD'), userId || null, username || 'system', action, details ? JSON.stringify(details) : null, new Date().toISOString());
}

module.exports = { init, getDb, closeDb, genId, hashPassword, verifyPassword, audit };
