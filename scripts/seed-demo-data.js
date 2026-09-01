const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const OUT_PATH = path.join(__dirname, '..', 'sample-data', 'knowledge.sample.db');
if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

const db = new Database(OUT_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'technician',
    is_default INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, last_login TEXT
  );
  CREATE TABLE sops (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General',
    tags TEXT DEFAULT '', content TEXT NOT NULL DEFAULT '', attachment_path TEXT, attachment_name TEXT,
    version INTEGER NOT NULL DEFAULT 1, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE assets (
    id TEXT PRIMARY KEY, asset_tag TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Other', status TEXT NOT NULL DEFAULT 'Active',
    location TEXT, assigned_to TEXT, purchase_date TEXT, warranty_expiry TEXT, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE tickets (
    id TEXT PRIMARY KEY, ticket_number TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
    description TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'Open', priority TEXT NOT NULL DEFAULT 'Medium',
    category TEXT DEFAULT 'General', requester TEXT, assigned_to TEXT, asset_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_at TEXT
  );
  CREATE TABLE ticket_comments (
    id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, author TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE backup_log (
    id TEXT PRIMARY KEY, filename TEXT NOT NULL, size_bytes INTEGER, status TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'scheduled', created_at TEXT NOT NULL
  );
  CREATE TABLE audit_log (
    id TEXT PRIMARY KEY, user_id TEXT, username TEXT, action TEXT NOT NULL, details TEXT, created_at TEXT NOT NULL
  );
`);

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
const now = () => new Date().toISOString();

db.prepare('INSERT INTO schema_meta VALUES (?,?)').run('schema_version', '1');

const admin = genId('USR');
db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at) VALUES (?,?,?,?,?,1,1,?)`)
  .run(admin, 'admin', hashPassword('ChangeMe123!'), 'Default Administrator', 'admin', now());

db.close();
console.log(`Sample database written to ${OUT_PATH}`);
