const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = null;
    this.retentionDays = 90;
    this.isDev = process.env.NODE_ENV === 'development';
  }

  init(logsDir, retentionDays = 90) {
    this.logsDir = logsDir;
    this.retentionDays = retentionDays;
    fs.mkdirSync(this.logsDir, { recursive: true });
    this.cleanupOldLogs();
    this.info('SYSTEM', 'Logger initialized', { logsDir, retentionDays });
  }

  _fileForToday() {
    const d = new Date().toISOString().slice(0, 10);
    return path.join(this.logsDir, `app-${d}.log`);
  }

  _write(level, category, message, meta) {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, category, message, ...(meta ? { meta } : {}) });
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.log(`[${level}] [${category}] ${message}`, meta || '');
    }
    if (!this.logsDir) return;
    try {
      fs.appendFileSync(this._fileForToday(), line + '\n', 'utf8');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write log file:', err.message);
    }
  }

  info(category, message, meta) { this._write('INFO', category, message, meta); }
  warn(category, message, meta) { this._write('WARN', category, message, meta); }
  error(category, message, meta) { this._write('ERROR', category, message, meta); }

  cleanupOldLogs() {
    if (!this.logsDir) return;
    try {
      const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(this.logsDir).filter((f) => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(f));
      for (const f of files) {
        const full = path.join(this.logsDir, f);
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
      }
    } catch (err) {
      this._write('ERROR', 'SYSTEM', 'Log cleanup failed', { error: err.message });
    }
  }

  setRetentionDays(days) {
    this.retentionDays = days;
    this.cleanupOldLogs();
  }
}

module.exports = new Logger();
