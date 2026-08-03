/**
 * Regenerates sample-data/knowledge.sample.db with demo users, SOPs,
 * tickets and assets. Run with: npm run seed
 *
 * This is the Node/better-sqlite3 equivalent of the schema in electron/db.js
 * kept as a separate script (rather than importing electron/db.js) so it
 * can run under plain Node without an Electron app context.
 */
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
const tech = genId('USR');
const viewer = genId('USR');
db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at) VALUES (?,?,?,?,?,1,1,?)`)
  .run(admin, 'admin', hashPassword('ChangeMe123!'), 'Default Administrator', 'admin', now());
db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at) VALUES (?,?,?,?,?,0,1,?)`)
  .run(tech, 'jchen', hashPassword('Demo1234!'), 'Jamie Chen', 'technician', now());
db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, is_default, active, created_at) VALUES (?,?,?,?,?,0,1,?)`)
  .run(viewer, 'rsingh', hashPassword('Demo1234!'), 'Ravi Singh', 'viewer', now());

const sops = [
  ['Password Reset Procedure (Active Directory)', 'Account Management', 'AD, password, helpdesk',
    '1. Verify caller identity.\n2. Open AD Users and Computers.\n3. Reset password with temporary complex value.\n4. Require change at next logon.\n5. Log the reset.'],
  ['New Employee Onboarding Checklist', 'Onboarding', 'onboarding, accounts, hardware',
    '1. Create AD account and mailbox.\n2. Assign security groups.\n3. Provision laptop, tag asset.\n4. Install standard image.\n5. Schedule orientation.'],
  ['Server Patch Management Policy', 'Change Management', 'patching, servers, maintenance window',
    '1. Review vendor patch notes.\n2. Schedule maintenance window, notify stakeholders.\n3. Backup server before patching.\n4. Validate in staging.\n5. Apply to production, monitor.'],
  ['Printer Troubleshooting Guide', 'Hardware', 'printer, network, troubleshooting',
    '1. Confirm power and network link.\n2. Ping printer IP.\n3. Clear print spooler.\n4. Reinstall driver if needed.\n5. Escalate to vendor if hardware fault.'],
  ['VPN Access Request and Setup', 'Network', 'VPN, remote access, security',
    '1. Verify manager approval.\n2. Provision least-privilege VPN account.\n3. Send setup instructions.\n4. Confirm MFA enrollment.\n5. Test connection.'],
  ['Data Backup Verification Procedure', 'Backup & DR', 'backup, disaster recovery, verification',
    '1. Check nightly backup logs.\n2. Perform monthly test restore.\n3. Confirm checksum integrity.\n4. Log results.\n5. Escalate failures immediately.']
];
for (const [title, category, tags, content] of sops) {
  db.prepare(`INSERT INTO sops (id, title, category, tags, content, version, created_by, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?,?)`)
    .run(genId('SOP'), title, category, tags, content, admin, now(), now());
}

const assets = [
  ['AST-1001', 'Dell Latitude 5440 - Front Desk', 'Laptop', 'Active', 'HQ - 2nd Floor', 'Jamie Chen', '2024-03-10', '2027-03-10'],
  ['AST-1002', 'HP EliteDesk 800 - Accounting', 'Desktop', 'Active', 'HQ - Finance', 'Priya Nair', '2023-08-01', '2026-08-01'],
  ['AST-1003', 'Dell PowerEdge R740 - File Server', 'Server', 'Active', 'Server Room A', 'IT Operations', '2022-01-15', '2025-01-15'],
  ['AST-1004', 'Cisco Catalyst 9200 Switch', 'Network', 'Active', 'Server Room A', 'IT Operations', '2023-05-20', '2028-05-20'],
  ['AST-1005', 'HP LaserJet M501 - 3rd Floor', 'Printer', 'In Repair', 'HQ - 3rd Floor', 'Facilities', '2021-11-02', '2024-11-02'],
  ['AST-1006', 'Lenovo ThinkPad T14 - Loaner Pool', 'Laptop', 'Storage', 'IT Storage Room', '', '2023-01-05', '2026-01-05'],
  ['AST-1007', 'iPhone 13 - Sales Manager', 'Mobile', 'Active', 'Field', 'Diego Alvarez', '2023-09-12', '2025-09-12'],
  ['AST-1008', 'Dell Latitude 5420 - Retired Unit', 'Laptop', 'Retired', 'IT Storage Room', '', '2019-04-18', '2022-04-18']
];
const assetIds = {};
for (const [tag, name, type, status, loc, owner, pdate, wdate] of assets) {
  const id = genId('AST');
  assetIds[tag] = id;
  db.prepare(`INSERT INTO assets (id, asset_tag, name, type, status, location, assigned_to, purchase_date, warranty_expiry, notes, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, tag, name, type, status, loc, owner, pdate, wdate, '', now(), now());
}

const tickets = [
  ['Cannot print to 3rd floor printer', 'Paper jam error with no visible jam. Toner light blinking.', 'Resolved', 'Medium', 'Hardware', 'Priya Nair', tech, 'AST-1005'],
  ['New hire needs laptop and accounts set up', 'Starting Monday. Needs standard image and email access.', 'In Progress', 'High', 'Onboarding', 'HR Team', tech, null],
  ['VPN keeps disconnecting from home', 'Drops every 20 minutes while working remotely.', 'Open', 'Medium', 'Network', 'Diego Alvarez', null, null],
  ['File server running out of disk space', 'Alert triggered at 90% capacity on volume D:.', 'Open', 'Critical', 'Infrastructure', 'Monitoring System', tech, 'AST-1003'],
  ['Password reset for locked account', 'User locked out after failed login attempts.', 'Closed', 'Low', 'Account Management', 'Ravi Singh', tech, null],
  ['Switch port not passing traffic on port 14', 'Conference room device cannot reach network.', 'Open', 'High', 'Network', 'Facilities', null, 'AST-1004']
];
tickets.forEach(([title, desc, status, priority, category, requester, assigned, assetTag], i) => {
  const id = genId('TCK');
  const ticketNumber = `INC-2026-${String(i + 1).padStart(5, '0')}`;
  const resolvedAt = status === 'Resolved' || status === 'Closed' ? now() : null;
  db.prepare(`INSERT INTO tickets (id, ticket_number, title, description, status, priority, category, requester, assigned_to, asset_id, created_at, updated_at, resolved_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, ticketNumber, title, desc, status, priority, category, requester, assigned, assetTag ? assetIds[assetTag] : null, now(), now(), resolvedAt);
  if (resolvedAt) {
    db.prepare(`INSERT INTO ticket_comments (id, ticket_id, author, body, created_at) VALUES (?,?,?,?,?)`)
      .run(genId('CMT'), id, 'Jamie Chen', 'Resolved - see notes in asset record.', now());
  }
});

db.prepare(`INSERT INTO audit_log (id, user_id, username, action, details, created_at) VALUES (?,?,?,?,?,?)`)
  .run(genId('AUD'), admin, 'admin', 'SEED_DEMO_DATA', JSON.stringify({ note: 'Sample database generated' }), now());

db.close();
console.log(`Sample database written to ${OUT_PATH}`);
