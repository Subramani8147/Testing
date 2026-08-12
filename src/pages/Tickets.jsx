import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ImportExcelModal from '../components/ImportExcelModal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BLANK = { title: '', description: '', priority: 'Medium', category: 'General', requester: '' };
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function Tickets() {
  const { user } = useAuth();
  const { push } = useToast();
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [detail, setDetail] = useState(null); // full ticket w/ comments
  const [comment, setComment] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    window.api.ticketsList({ status, priority, search }).then(setTickets);
  }, [status, priority, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (t) => {
    const full = await window.api.ticketsGet(t.id);
    setDetail(full);
  };

  const createTicket = async () => {
    if (!form.title.trim()) { push('Title is required.', 'error'); return; }
    const res = await window.api.ticketsCreate({ actor: user, ...form });
    if (res.success) {
      push(`Ticket ${res.ticketNumber} created.`);
      setCreating(false);
      setForm(BLANK);
      load();
    } else push(res.error || 'Failed to create ticket.', 'error');
  };

  const updateDetailField = async (field, value) => {
    setDetail((d) => ({ ...d, [field]: value }));
    await window.api.ticketsUpdate({ actor: user, id: detail.id, [toCamel(field)]: value });
    load();
  };

  const toCamel = (f) => f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const addComment = async () => {
    if (!comment.trim()) return;
    await window.api.ticketsAddComment({ actor: user, ticketId: detail.id, body: comment });
    setComment('');
    const full = await window.api.ticketsGet(detail.id);
    setDetail(full);
  };

  const confirmDelete = async () => {
    await window.api.ticketsDelete({ actor: user, id: toDelete.id });
    push('Ticket deleted.');
    setToDelete(null);
    setDetail(null);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-box" style={{ maxWidth: 280 }}>
          <span>⌕</span>
          <input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select-inline">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="select-inline">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn" onClick={() => setImporting(true)}>Import from Excel</button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Ticket</button>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state"><div className="icon">◈</div>No tickets match these filters.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ticket</th><th>Title</th><th>Priority</th><th>Status</th><th>Requester</th><th>Updated</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => openDetail(t)}>
                  <td className="mono">{t.ticket_number}</td>
                  <td>{t.title}</td>
                  <td><StatusPill value={t.priority} /></td>
                  <td><StatusPill value={t.status} /></td>
                  <td className="text-muted">{t.requester || '—'}</td>
                  <td className="text-muted">{new Date(t.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal
          title="New Ticket"
          onClose={() => setCreating(false)}
          footer={<><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={createTicket}>Create ticket</button></>}
        >
          <div className="field">
            <label>Title</label>
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Requester</label>
            <input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          title={`${detail.ticket_number} · ${detail.title}`}
          onClose={() => setDetail(null)}
          width={640}
          footer={<button className="btn btn-danger" onClick={() => setToDelete(detail)}>Delete ticket</button>}
        >
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <select value={detail.status} onChange={(e) => updateDetailField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={detail.priority} onChange={(e) => updateDetailField('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={4} value={detail.description || ''} onChange={(e) => setDetail({ ...detail, description: e.target.value })} onBlur={(e) => updateDetailField('description', e.target.value)} />
          </div>
          <div className="field">
            <label>Comments</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {detail.comments?.length ? detail.comments.map((c) => (
                <div key={c.id} className="card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.author}</div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>{c.body}</div>
                  <div className="text-faint" style={{ fontSize: 10.5, marginTop: 4 }}>{new Date(c.created_at).toLocaleString()}</div>
                </div>
              )) : <div className="text-faint" style={{ fontSize: 12.5 }}>No comments yet.</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1, background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)' }} placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} />
              <button className="btn btn-sm" onClick={addComment}>Add</button>
            </div>
          </div>
        </Modal>
      )}

      {importing && (
        <ImportExcelModal targetType="tickets" label="Tickets" onClose={() => setImporting(false)} onDone={load} />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete ticket"
          message={`Delete ticket ${toDelete.ticket_number}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
