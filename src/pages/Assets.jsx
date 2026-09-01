import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import ImportExcelModal from '../components/ImportExcelModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TYPES = ['Laptop', 'Desktop', 'Server', 'Network', 'Printer', 'Mobile', 'Other'];
const STATUSES = ['Active', 'In Repair', 'Retired', 'Storage'];
const BLANK = { assetTag: '', name: '', type: 'Laptop', status: 'Active', location: '', assignedTo: '', purchaseDate: '', warrantyExpiry: '', notes: '' };

export default function Assets() {
  const { user } = useAuth();
  const { push } = useToast();
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [toDelete, setToDelete] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    window.api.assetsList({ search, status }).then(setAssets);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing({ id: null }); setForm(BLANK); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      assetTag: a.asset_tag, name: a.name, type: a.type, status: a.status,
      location: a.location || '', assignedTo: a.assigned_to || '',
      purchaseDate: a.purchase_date || '', warrantyExpiry: a.warranty_expiry || '', notes: a.notes || ''
    });
  };

  const save = async () => {
    if (!form.assetTag.trim() || !form.name.trim()) { push('Asset tag and name are required.', 'error'); return; }
    const res = editing.id
      ? await window.api.assetsUpdate({ actor: user, id: editing.id, ...form })
      : await window.api.assetsCreate({ actor: user, ...form });
    if (res.success) { push(editing.id ? 'Asset updated.' : 'Asset added.'); setEditing(null); load(); }
    else push(res.error || 'Save failed.', 'error');
  };

  const confirmDelete = async () => {
    await window.api.assetsDelete({ actor: user, id: toDelete.id });
    push('Asset removed.');
    setToDelete(null);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box" style={{ maxWidth: 300 }}>
          <span>⌕</span>
          <input placeholder="Search assets, tags, owners..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select-inline">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn" onClick={() => setImporting(true)}>Import from Excel</button>
        <button className="btn btn-primary" onClick={openNew}>+ New Asset</button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state"><div className="icon">▦</div>No assets tracked yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tag</th><th>Name</th><th>Type</th><th>Status</th><th>Assigned to</th><th>Location</th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} onClick={() => openEdit(a)}>
                  <td className="mono">{a.asset_tag}</td>
                  <td>{a.name}</td>
                  <td className="text-muted">{a.type}</td>
                  <td><StatusPill value={a.status} /></td>
                  <td className="text-muted">{a.assigned_to || '—'}</td>
                  <td className="text-muted">{a.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Asset' : 'New Asset'}
          onClose={() => setEditing(null)}
          footer={<>
            {editing.id && <button className="btn btn-danger" onClick={() => setToDelete(editing)} style={{ marginRight: 'auto' }}>Delete</button>}
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </>}
        >
          <div className="field-row">
            <div className="field"><label>Asset tag</label><input autoFocus value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Assigned to</label><input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} /></div>
            <div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Purchase date</label><input type="date" value={form.purchaseDate || ''} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
            <div className="field"><label>Warranty expiry</label><input type="date" value={form.warrantyExpiry || ''} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} /></div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </Modal>
      )}

      {importing && (
        <ImportExcelModal targetType="assets" label="Assets" onClose={() => setImporting(false)} onDone={load} />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete asset"
          message={`Remove asset "${toDelete.name}" (${toDelete.asset_tag || toDelete.assetTag})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
