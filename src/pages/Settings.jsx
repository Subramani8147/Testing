import React, { useEffect, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function PathRow({ label, value, onBrowse, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input readOnly value={value || ''} style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={onBrowse}>Browse…</button>
      </div>
      {hint && <div className="text-faint" style={{ fontSize: 11 }}>{hint}</div>}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [appInfo, setAppInfo] = useState(null);

  const load = () => {
    window.api.settingsGet().then(setSettings);
    window.api.backupList().then(setBackups);
    window.api.appInfo().then(setAppInfo);
  };
  useEffect(load, []);

  if (user?.role !== 'admin') {
    return <div className="empty-state"><div className="icon">⚙</div>Only administrators can change settings.</div>;
  }
  if (!settings) return <div className="text-muted">Loading…</div>;

  const browsePath = async (key, title) => {
    const res = await window.api.settingsBrowseFolder({ title });
    if (res.canceled) return;
    const r = await window.api.settingsSetPath({ key, value: res.path });
    push(r.requiresRestart ? 'Location updated. Restart the app to apply this change.' : 'Updated.');
    load();
  };

  const backupNow = async () => {
    const res = await window.api.backupNow({ actor: user });
    push(res.success ? `Backup saved: ${res.filename}` : `Backup failed: ${res.error}`, res.success ? 'success' : 'error');
    load();
  };

  const browseRestore = async () => {
    const res = await window.api.backupBrowseRestoreFile();
    if (res.canceled) return;
    setRestoreTarget(res.path);
  };

  const doRestore = async () => {
    const res = await window.api.backupRestore({ actor: user, backupFile: restoreTarget });
    setRestoreTarget(null);
    if (res.success) push('Restore complete. The app is restarting…');
    else push(res.error || 'Restore failed.', 'error');
  };

  const updateBackupSchedule = async (patch) => {
    const merged = { ...settings.backup, ...patch };
    await window.api.settingsSetBackupSchedule(merged);
    setSettings({ ...settings, backup: merged });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <div className="card">
        <div className="card-title">Appearance</div>
        <div className="field">
          <label>Theme</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Storage locations</div>
        <PathRow label="Database folder" value={settings.resolvedPaths.database} onBrowse={() => browsePath('database', 'Select database folder')} hint="Restart required after changing." />
        <PathRow label="SOP storage folder" value={settings.resolvedPaths.sops} onBrowse={() => browsePath('sops', 'Select SOP storage folder')} />
        <PathRow label="Backup folder" value={settings.resolvedPaths.backups} onBrowse={() => browsePath('backups', 'Select backup folder')} />
        <PathRow label="Uploads folder" value={settings.resolvedPaths.uploads} onBrowse={() => browsePath('uploads', 'Select uploads folder')} />
        <PathRow label="Default export folder" value={settings.paths.exportFolder} onBrowse={() => browsePath('exportFolder', 'Select export folder')} />
        <PathRow label="Default import folder" value={settings.paths.importFolder} onBrowse={() => browsePath('importFolder', 'Select import folder')} />
      </div>

      <div className="card">
        <div className="card-title">Backups</div>
        <div className="field-row">
          <div className="field">
            <label>Schedule</label>
            <select value={settings.backup.schedule} onChange={(e) => updateBackupSchedule({ schedule: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mondays)</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
          <div className="field">
            <label>Hour of day (24h, local time)</label>
            <input type="number" min={0} max={23} value={settings.backup.hour} onChange={(e) => updateBackupSchedule({ hour: Number(e.target.value) })} />
          </div>
        </div>
        <div className="field">
          <label>Backups to keep</label>
          <input type="number" min={1} max={365} value={settings.backup.keepCount} onChange={(e) => updateBackupSchedule({ keepCount: Number(e.target.value) })} />
        </div>
        <div className="toolbar" style={{ marginTop: 6 }}>
          <button className="btn btn-primary" onClick={backupNow}>Backup now</button>
          <button className="btn" onClick={browseRestore}>Restore backup…</button>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>File</th><th>Size</th><th>Created</th></tr></thead>
            <tbody>
              {backups.length === 0 ? (
                <tr><td colSpan={3} className="text-faint" style={{ textAlign: 'center', padding: 20 }}>No backups yet.</td></tr>
              ) : backups.map((b) => (
                <tr key={b.filename}>
                  <td className="mono">{b.filename}</td>
                  <td className="text-muted">{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="text-muted">{new Date(b.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Logging</div>
        <div className="field">
          <label>Log retention (days)</label>
          <input type="number" min={7} max={730} value={settings.logRetentionDays} onChange={(e) => window.api.settingsSetLogRetention(Number(e.target.value)).then(load)} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Windows integration</div>
        <div className="field">
          <label>
            <input type="checkbox" checked={settings.tray.minimizeToTray} onChange={(e) => window.api.settingsSetTrayBehavior(e.target.checked).then(load)} style={{ marginRight: 8 }} />
            Minimize to system tray instead of closing
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Updates</div>
        <div className="field">
          <label>
            <input type="checkbox" checked={settings.autoUpdate.enabled} onChange={(e) => window.api.settingsSetAutoUpdate(e.target.checked).then(load)} style={{ marginRight: 8 }} />
            Enable automatic updates (disabled by default; requires a configured update feed)
          </label>
        </div>
      </div>

      {appInfo && (
        <div className="card">
          <div className="card-title">About</div>
          <div className="text-muted" style={{ fontSize: 12.5 }}>
            Version {appInfo.version} · Electron {appInfo.electron} · {appInfo.platform}/{appInfo.arch}
          </div>
        </div>
      )}

      {restoreTarget && (
        <ConfirmDialog
          title="Restore backup"
          message={`Restore from "${restoreTarget}"? This replaces the current database and cannot be undone (a safety copy of the current database is kept). The app will restart.`}
          confirmLabel="Restore"
          onConfirm={doRestore}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}
