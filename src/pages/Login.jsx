import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) setError(result.error || 'Login failed.');
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand-mark">
          <span className="dot" />
          <h1>IT Operations Knowledge Portal</h1>
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Username</label>
            <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--accent-red)', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="sub">Works fully offline · data stored locally on this PC</div>
      </div>
    </div>
  );
}
