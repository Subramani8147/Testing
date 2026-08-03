import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BLANK = { title: '', category: 'General', tags: '', content: '' };

export default function SOPs() {
  const { user } = useAuth();
  const { push } = useToast();
  const [sops, setSops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // sop object or null
  const [form, setForm] = useState(BLANK);
  const [dragActive, setDragActive] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => {
    window.api.sopsList({ search, category }).then(setSops);
    window.api.sopsCategories().then(setCategories);
  }, [search, category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = window.api.onShortcut('shortcut:save', () => {
      if (editing) saveForm();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, form]);

  const openNew = () => { setEditing({ id: null }); setForm(BLANK); };
  const openEdit = (sop) => { setEditing(sop); setForm({ title: sop.title, category: sop.category, tags: sop.tags, content: sop.content }); };
  const close = () => setEditing(null);

  const saveForm = async () => {
    if (!form.title.trim()) { push('Title is required.', 'error'); return; }
    let res;
    if (editing.id) {
      res = await window.api.sopsUpdate({ actor: user, id: editing.id, ...form });
    } else {
      res = await window.api.sopsCreate({ actor: user, ...form });
    }
    if (res.success) {
      push(editing.id ? 'SOP updated.' : 'SOP created.');
      close();
      load();
    } else {
      push(res.error || 'Save failed.', 'error');
    }
  };

  const confirmDelete = async () => {
    const res = await window.api.sopsDelete({ actor: user, id: toDelete.id });
    if (res.success) { push('SOP deleted.'); load(); }
    setToDelete(null);
  };

  const onDrop = async (e, sopId) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const filePath = window.api.getPathForFile(file);
    const res = await window.api.sopsAttachDropped({ actor: user, id: sopId, filePath });
    if (res.success) { push('Attachment added.'); load(); if (editing) setEditing({ ...editing, attachment_name: res.attachmentName }); }
    else push(res.error || 'Attachment rejected.', 'error');
  };

  const attachViaDialog = async (sopId) => {
    const res = await window.api.sopsAttachDialog({ actor: user, id: sopId });
    if (res.canceled) return;
    if (res.success) { push('Attachment added.'); load(); }
    else push(res.error || 'Attachment rejected.', 'error');
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box" style={{ maxWidth: 320 }}>
          <span>⌕</span>
          <input placeholder="Search SOPs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '8px 10px', fontSize: 13 }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNew}>+ New SOP</button>
      </div>

      {sops.length === 0 ? (
        <div className="empty-state">
          <div className="icon">▤</div>
          No SOPs found. Create the first one to build your knowledge base.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Tags</th><th>Attachment</th><th>Updated</th><th></th></tr>
            </thead>
            <tbody>
              {sops.map((s) => (
                <tr key={s.id} onClick={() => openEdit(s)}>
                  <td>{s.title}</td>
                  <td><span className="pill gray"><span className="dot" />{s.category}</span></td>
                  <td className="text-muted">{s.tags || '—'}</td>
                  <td>
                    {s.attachment_name ? (
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); window.api.sopsOpenAttachment(s.attachment_path); }}>
                        📎 {s.attachment_name}
                      </button>
                    ) : <span className="text-faint">—</span>}
                  </td>
                  <td className="text-muted">{new Date(s.updated_at).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setToDelete(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit SOP' : 'New SOP'}
          onClose={close}
          width={640}
          footer={<><button className="btn" onClick={close}>Cancel</button><button className="btn btn-primary" onClick={saveForm}>Save (Ctrl+S)</button></>}
        >
          <div className="field-row">
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="sop-categories" />
              <datalist id="sop-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="field">
            <label>Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div className="field">
            <label>Procedure content</label>
            <textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          {editing.id && (
            <div className="field">
              <label>Attachment</label>
              <div
                className={`dropzone${dragActive ? ' active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => onDrop(e, editing.id)}
              >
                {editing.attachment_name ? `Attached: ${editing.attachment_name}` : 'Drag & drop a file here, or'}{' '}
                <button className="btn btn-sm" onClick={() => attachViaDialog(editing.id)}>Browse…</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete SOP"
          message={`Delete "${toDelete.title}"? This also removes its attached file. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
