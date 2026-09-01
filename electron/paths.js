const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function getDefaultBaseDir() {
  if (process.platform === 'win32') {
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'IT Operations Portal');
  }
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
      throw new Error(`Failed to create required folder "${dir}": ${err.message}`);
    }
  }
  return tree;
}

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
