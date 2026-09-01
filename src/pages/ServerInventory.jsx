import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ImportExcelModal from '../components/ImportExcelModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BLANK = {
  hostname: '', dcName: '', dcNumber: '', serialNumber: '', hostIp: '', sva: '', svaIp: '',
  model: '', address: '', siteManager: '', alternateContact: '', phone: ''
};

export default function ServerInventory() {
  const { user } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [toDelete, setToDelete] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    window.api.serversList({ search }).then(setRows);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ id: null }); setForm(BLANK); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      hostname: row.hostname, dcName: row.dc_name || '', dcNumber: row.dc_number || '',
      serialNumber: row.serial_number || '', hostIp: row.host_ip || '', sva: row.sva || '', svaIp: row.sva_ip || '',
      model: row.model || '', address: row.address || '', siteManager: row.site_manager || '',
      alternateContact: row.alternate_contact || '', phone: row.phone || ''
    });
  };

  const save = async () => {
    if (!form.hostname.trim()) { push('ESXi Hostname is required.', 'error'); return; }
    const res = editing.id
      ? await window.api.serversUpdate({ actor: user, id: editing.id, ...form })
      : await window.api.serversCreate({ actor: user, ...form });
    if (res.success) { push(editing.id ? 'Server updated.' : 'Server added.'); setEditing(null); load(); }
    else push(res.error || 'Save failed.', 'error');
  };

  const confirmDelete = async () => {
    await window.api.serversDelete({ actor: user, id: toDelete.id });
    push('Server removed.');
    setToDelete(null);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box" style={{ maxWidth: 320 }}>
          <span>⌕</span>
          <input placeholder="Search hostname, IP, DC, serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => setImporting(true)}>Import from Excel</button>
        <button className="btn btn-primary" onClick={openNew}>+ New Server</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state"><div className="icon">▧</div>No servers tracked yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ESXi Hostname</th><th>DC Name</th><th>DC #</th><th>Host IP</th><th>Serial Number</th><th>Model</th><th>Site Manager</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => openEdit(r)}>
                  <td className="mono">{r.hostname}</td>
                  <td className="text-muted">{r.dc_name || '—'}</td>
                  <td className="text-muted">{r.dc_number || '—'}</td>
                  <td className="mono text-muted">{r.host_ip || '—'}</td>
                  <td className="mono text-muted">{r.serial_number || '—'}</td>
                  <td className="text-muted">{r.model || '—'}</td>
                  <td className="text-muted">{r.site_manager || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Server' : 'New Server'}
          onClose={() => setEditing(null)}
          width={620}
          footer={<>
            {editing.id && <button className="btn btn-danger" onClick={() => setToDelete(editing)} style={{ marginRight: 'auto' }}>Delete</button>}
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </>}
        >
          <div className="field-row">
            <div className="field"><label>ESXi Hostname</label><input autoFocus value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></div>
            <div className="field"><label>Host IP</label><input value={form.hostIp} onChange={(e) => setForm({ ...form, hostIp: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>DC Name</label><input value={form.dcName} onChange={(e) => setForm({ ...form, dcName: e.target.value })} /></div>
            <div className="field"><label>DC #</label><input value={form.dcNumber} onChange={(e) => setForm({ ...form, dcNumber: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Serial Number</label><input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
            <div className="field"><label>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>SVA</label><input value={form.sva} onChange={(e) => setForm({ ...form, sva: e.target.value })} /></div>
            <div className="field"><label>SVA IP</label><input value={form.svaIp} onChange={(e) => setForm({ ...form, svaIp: e.target.value })} /></div>
          </div>
          <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="field-row">
            <div className="field"><label>Site Manager</label><input value={form.siteManager} onChange={(e) => setForm({ ...form, siteManager: e.target.value })} /></div>
            <div className="field"><label>Alternate contact</label><input value={form.alternateContact} onChange={(e) => setForm({ ...form, alternateContact: e.target.value })} /></div>
          </div>
          <div className="field"><label>Phone#</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </Modal>
      )}

      {importing && (
        <ImportExcelModal targetType="servers" label="Server Inventory" onClose={() => setImporting(false)} onDone={load} />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete server"
          message={`Remove "${toDelete.hostname}" from the inventory? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
