import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function TopBar({ title }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const off1 = window.api.onShortcut('shortcut:find', () => searchRef.current?.focus());
    const off2 = window.api.onShortcut('shortcut:backupNow', async () => {
      const res = await window.api.backupNow({ actor: user });
      push(res.success ? `Backup saved: ${res.filename}` : `Backup failed: ${res.error}`, res.success ? 'success' : 'error');
    });
    return () => { off1(); off2(); };
  }, [user, push]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="topbar">
      <h1>{title}</h1>
      <form className="search-box" onSubmit={onSearchSubmit}>
        <span>⌕</span>
        <input
          ref={searchRef}
          placeholder="Search SOPs, tickets, assets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="kbd">Ctrl+F</span>
      </form>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" title="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="avatar" onClick={() => setMenuOpen((o) => !o)} title={user?.full_name}>
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </button>
          {menuOpen && (
            <div
              className="card"
              style={{ position: 'absolute', right: 0, top: 38, width: 200, padding: 10, zIndex: 50 }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.full_name}</div>
              <div className="text-faint" style={{ fontSize: 11.5, marginBottom: 10 }}>{user?.role}</div>
              <button className="btn btn-sm" style={{ width: '100%' }} onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
