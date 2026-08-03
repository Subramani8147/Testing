import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ROLES = ['admin', 'technician', 'viewer'];
const BLANK = { username: '', password: '', fullName: '', role: 'technician' };

export default function Users() {
  const { user } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const load = useCallback(() => window.api.usersList().then(setUsers), []);
  useEffect(() => { load(); }, [load]);

  if (user?.role !== 'admin') {
    return <div className="empty-state"><div className="icon">◎</div>Only administrators can manage user accounts.</div>;
  }

  const createUser = async () => {
    const res = await window.api.usersCreate({ actor: user, ...form });
    if (res.success) { push('User created.'); setCreating(false); setForm(BLANK); load(); }
    else push(res.error || 'Failed to create user.', 'error');
  };

  const toggleActive = async (u) => {
    await window.api.usersUpdate({ actor: user, id: u.id, fullName: u.full_name, role: u.role, active: !u.active });
    load();
  };

  const doResetPassword = async () => {
    const res = await window.api.usersResetPassword({ actor: user, id: resetTarget.id, newPassword });
    if (res.success) { push('Password reset.'); setResetTarget(null); setNewPassword(''); }
    else push(res.error || 'Reset failed.', 'error');
  };

  const confirmDeactivate = async () => {
    const res = await window.api.usersDelete({ actor: user, id: deactivateTarget.id });
    if (res.success) { push('Account deactivated.'); load(); }
    else push(res.error || 'Failed.', 'error');
    setDeactivateTarget(null);
  };

  return (
    <div>
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New account</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{u.full_name}{u.is_default ? ' (default)' : ''}</div>
                  <div className="text-faint mono" style={{ fontSize: 11.5 }}>{u.username}</div>
                </td>
                <td className="text-muted">{u.role}</td>
                <td>
                  <span className={`pill ${u.active ? 'teal' : 'gray'}`}><span className="dot" />{u.active ? 'Active' : 'Deactivated'}</span>
                </td>
                <td className="text-muted">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setResetTarget(u)}>Reset password</button>
                  {!u.is_default && (
                    u.active
                      ? <button className="btn btn-ghost btn-sm" onClick={() => setDeactivateTarget(u)}>Deactivate</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal
          title="New user account"
          onClose={() => setCreating(false)}
          footer={<><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={createUser}>Create account</button></>}
        >
          <div className="field"><label>Full name</label><input autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="field"><label>Username</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="field"><label>Temporary password (min. 8 characters)</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {resetTarget && (
        <Modal
          title={`Reset password · ${resetTarget.username}`}
          onClose={() => setResetTarget(null)}
          footer={<><button className="btn" onClick={() => setResetTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={doResetPassword}>Reset password</button></>}
        >
          <div className="field"><label>New password (min. 8 characters)</label><input type="password" autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
        </Modal>
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Deactivate account"
          message={`Deactivate "${deactivateTarget.full_name}"? They will no longer be able to sign in. This can be reversed from this page.`}
          confirmLabel="Deactivate"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}
