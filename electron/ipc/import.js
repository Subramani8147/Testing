const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const db = require('../db');
const logger = require('../logger');

const ALLOWED_EXT = new Set(['.xlsx', '.xls', '.csv']);
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB — plenty for row-based imports

/**
 * Column specs per importable module. `key` is the normalized header we
 * match against (case/space/punctuation-insensitive — see normalizeHeader),
 * `field` is the destination DB column, `required` rows without it are
 * rejected, everything else is optional and defaults sensibly.
 */
const SPECS = {
  assets: {
    table: 'assets',
    idPrefix: 'AST',
    columns: [
      { key: 'assettag', field: 'asset_tag', header: 'Asset Tag', required: true },
      { key: 'name', field: 'name', header: 'Name', required: true },
      { key: 'type', field: 'type', header: 'Type', default: 'Other' },
      { key: 'status', field: 'status', header: 'Status', default: 'Active', enum: ['Active', 'In Repair', 'Retired', 'Storage'] },
      { key: 'location', field: 'location', header: 'Location', default: '' },
      { key: 'assignedto', field: 'assigned_to', header: 'Assigned To', default: '' },
      { key: 'purchasedate', field: 'purchase_date', header: 'Purchase Date', default: null, isDate: true },
      { key: 'warrantyexpiry', field: 'warranty_expiry', header: 'Warranty Expiry', default: null, isDate: true },
      { key: 'notes', field: 'notes', header: 'Notes', default: '' }
    ],
    uniqueField: 'asset_tag',
    uniqueHeader: 'Asset Tag'
  },
  tickets: {
    table: 'tickets',
    idPrefix: 'TCK',
    columns: [
      { key: 'title', field: 'title', header: 'Title', required: true },
      { key: 'description', field: 'description', header: 'Description', default: '' },
      { key: 'status', field: 'status', header: 'Status', default: 'Open', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] },
      { key: 'priority', field: 'priority', header: 'Priority', default: 'Medium', enum: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'category', field: 'category', header: 'Category', default: 'General' },
      { key: 'requester', field: 'requester', header: 'Requester', default: '' }
    ]
  },
  servers: {
    table: 'server_inventory',
    idPrefix: 'SRV',
    columns: [
      { key: 'esxihostname', field: 'hostname', header: 'ESXi HostName', required: true },
      { key: 'dcname', field: 'dc_name', header: 'DC Name', default: '' },
      { key: 'dc', field: 'dc_number', header: 'DC #', default: '' },
      { key: 'serialnumber', field: 'serial_number', header: 'Serial Number', default: '' },
      { key: 'hostip', field: 'host_ip', header: 'Host IP', default: '' },
      { key: 'sva', field: 'sva', header: 'SVA', default: '' },
      { key: 'svaip', field: 'sva_ip', header: 'SVA IP', default: '' },
      { key: 'model', field: 'model', header: 'Model', default: '' },
      { key: 'address', field: 'address', header: 'Address', default: '' },
      { key: 'sitemanager', field: 'site_manager', header: 'Site Manager', default: '' },
      { key: 'alternatecontact', field: 'alternate_contact', header: 'Alternate contact', default: '' },
      { key: 'phone', field: 'phone', header: 'Phone#', default: '' }
    ],
    uniqueField: 'hostname',
    uniqueHeader: 'ESXi HostName'
  }
};

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function excelDateToIso(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed.toISOString().slice(0, 10);
}

function readWorkbookRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function mapRow(rawRow, spec) {
  const normalizedRow = {};
  for (const [k, v] of Object.entries(rawRow)) normalizedRow[normalizeHeader(k)] = v;

  const mapped = {};
  const missing = [];
  for (const col of spec.columns) {
    let value = normalizedRow[col.key];
    if (value === undefined || value === '') {
      if (col.required) { missing.push(col.header); continue; }
      value = col.default;
    }
    if (col.isDate) value = excelDateToIso(value);
    if (col.enum && value && !col.enum.includes(String(value).trim())) {
      // Fall back to default rather than rejecting the whole row over a typo'd status/priority.
      value = col.default;
    }
    mapped[col.field] = typeof value === 'string' ? value.trim() : value;
  }
  return { mapped, missing };
}

function register(getPaths) {
  ipcMain.handle('import:browseFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Excel or CSV file to import',
      properties: ['openFile'],
      filters: [{ name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('import:preview', async (evt, { targetType, filePath }) => {
    const spec = SPECS[targetType];
    if (!spec) throw new Error(`Unknown import target "${targetType}".`);
    const ext = path.extname(filePath).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) throw new Error(`File type "${ext}" is not supported. Use .xlsx, .xls, or .csv.`);
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_BYTES) throw new Error('File exceeds the 25MB limit.');

    const rows = readWorkbookRows(filePath);
    const preview = rows.slice(0, 10).map((r) => mapRow(r, spec).mapped);
    const requiredHeaders = spec.columns.filter((c) => c.required).map((c) => c.header);

    return {
      totalRows: rows.length,
      preview,
      requiredHeaders,
      allHeaders: spec.columns.map((c) => c.header)
    };
  });

  ipcMain.handle('import:run', async (evt, { actor, targetType, filePath }) => {
    const spec = SPECS[targetType];
    if (!spec) throw new Error(`Unknown import target "${targetType}".`);
    const rows = readWorkbookRows(filePath);
    const database = db.getDb();

    let created = 0;
    const errors = [];
    let nextTicketSeq = targetType === 'tickets'
      ? database.prepare('SELECT COUNT(*) AS c FROM tickets').get().c
      : null;

    const insertOne = database.transaction((rawRow, rowNumber) => {
      const { mapped, missing } = mapRow(rawRow, spec);
      if (missing.length) {
        errors.push({ row: rowNumber, reason: `Missing required column(s): ${missing.join(', ')}` });
        return;
      }
      const id = db.genId(spec.idPrefix);
      const now = new Date().toISOString();

      if (targetType === 'assets') {
        database.prepare(
          `INSERT INTO assets (id, asset_tag, name, type, status, location, assigned_to, purchase_date, warranty_expiry, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(id, mapped.asset_tag, mapped.name, mapped.type, mapped.status, mapped.location, mapped.assigned_to, mapped.purchase_date, mapped.warranty_expiry, mapped.notes, now, now);
      } else if (targetType === 'tickets') {
        nextTicketSeq += 1;
        const ticketNumber = `INC-${new Date().getFullYear()}-${String(nextTicketSeq).padStart(5, '0')}`;
        database.prepare(
          `INSERT INTO tickets (id, ticket_number, title, description, status, priority, category, requester, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).run(id, ticketNumber, mapped.title, mapped.description, mapped.status, mapped.priority, mapped.category, mapped.requester, now, now);
      } else if (targetType === 'servers') {
        database.prepare(
          `INSERT INTO server_inventory (id, hostname, dc_name, dc_number, serial_number, host_ip, sva, sva_ip, model, address, site_manager, alternate_contact, phone, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(id, mapped.hostname, mapped.dc_name, mapped.dc_number, mapped.serial_number, mapped.host_ip, mapped.sva, mapped.sva_ip, mapped.model, mapped.address, mapped.site_manager, mapped.alternate_contact, mapped.phone, now, now);
      }
      created += 1;
    });

    rows.forEach((row, i) => {
      try {
        insertOne(row, i + 2); // +2: header row is line 1, data starts at line 2
      } catch (err) {
        const isUnique = err.message && err.message.includes('UNIQUE');
        errors.push({ row: i + 2, reason: isUnique ? `Duplicate ${spec.uniqueHeader || 'value'}` : err.message });
      }
    });

    db.audit(actor?.id, actor?.username, `${targetType.toUpperCase()}_BULK_IMPORT`, {
      file: path.basename(filePath), totalRows: rows.length, created, errorCount: errors.length
    });
    logger.info('IMPORT', `Bulk import into ${targetType}`, { created, errorCount: errors.length, file: path.basename(filePath) });

    return { totalRows: rows.length, created, errors };
  });

  ipcMain.handle('import:downloadTemplate', async (evt, { targetType }) => {
    const spec = SPECS[targetType];
    if (!spec) throw new Error(`Unknown import target "${targetType}".`);
    const result = await dialog.showSaveDialog({
      title: 'Save import template',
      defaultPath: `${targetType}-import-template.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const headers = spec.columns.map((c) => c.header);
    const exampleRow = spec.columns.map((c) => (c.enum ? c.enum[0] : c.required ? `Example ${c.header}` : ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, result.filePath);

    return { canceled: false, path: result.filePath };
  });
}

module.exports = { register, SPECS };
