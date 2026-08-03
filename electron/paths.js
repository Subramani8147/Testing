const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

/**
 * Central place that resolves every on-disk location the app uses.
 * Production (Windows, installed): C:\ProgramData\IT Operations Portal\...
 * Dev / non-Windows fallback: <userData>\IT Operations Portal\...
 * All locations are overridable from Settings (persisted via electron-store)
 * -- see settings-store.js. This module only computes the DEFAULTS and
 * guarantees the folder tree exists.
 */

function getDefaultBaseDir() {
  if (process.platform === 'win32') {
    // Machine-wide ProgramData location, matches the spec exactly.
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'IT Operations Portal');
  }
  // macOS/Linux dev fallback so the app is runnable for development/testing.
  return path.join(app.getPath('userData'), 'IT Operations Portal');
}

function buildTree(baseDir) {
  return {
    base: baseDir,
    database: path.join(baseDir, 'Database'),
    databaseFile: path.join(baseDir, 'Database', 'knowledge.db'),
    uploads: path.join(baseDir, 'Uploads'),
    sops: path.join(baseDir, 'SOPs'),
    backups: path.join(baseDir, 'Backups'),
    logs: path.join(baseDir, 'Logs'),
    temp: path.join(baseDir, 'Temp'),
    configFile: path.join(baseDir, 'config.enc.json')
  };
}

function ensureTree(tree) {
  const dirs = [tree.base, tree.database, tree.uploads, tree.sops, tree.backups, tree.logs, tree.temp];
  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // Surface but do not crash the app on a single folder failure
      // (e.g. permissions) -- main.js decides how to react.
      throw new Error(`Failed to create required folder "${dir}": ${err.message}`);
    }
  }
  return tree;
}

/**
 * Resolves the active paths tree. If a custom base/database/sops/backups
 * location was saved in Settings, those override the ProgramData default
 * on a per-folder basis.
 */
function resolvePaths(overrides = {}) {
  const baseDir = overrides.base || getDefaultBaseDir();
  const tree = buildTree(baseDir);
  if (overrides.database) {
    tree.database = overrides.database;
    tree.databaseFile = path.join(overrides.database, 'knowledge.db');
  }
  if (overrides.sops) tree.sops = overrides.sops;
  if (overrides.backups) tree.backups = overrides.backups;
  if (overrides.uploads) tree.uploads = overrides.uploads;
  return ensureTree(tree);
}

module.exports = { getDefaultBaseDir, buildTree, ensureTree, resolvePaths };
