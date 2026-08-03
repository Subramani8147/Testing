import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▣', end: true },
  { to: '/sops', label: 'SOPs & Knowledge', icon: '▤' },
  { to: '/tickets', label: 'Tickets & Incidents', icon: '◈' },
  { to: '/assets', label: 'Assets', icon: '▦' }
];

const ADMIN_NAV = [
  { to: '/users', label: 'User Accounts', icon: '◎' },
  { to: '/settings', label: 'Settings', icon: '⚙' }
];

export default function Sidebar() {
  const { user } = useAuth();
  const [appInfo, setAppInfo] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    window.api.appInfo().then(setAppInfo);
    window.api.backupList().then((list) => setLastBackup(list?.[0] || null));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot" />
        <div className="sidebar-brand-text">
          IT Operations
          <small>Knowledge Portal</small>
        </div>
      </div>

      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}

      {user?.role === 'admin' && (
        <>
          <div className="nav-section-label">Administration</div>
          {ADMIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </>
      )}

      <div className="sidebar-footer">
        <div className="status-strip">
          <div className="row">
            <span className="led" />
            Database online
          </div>
          <div className="row">
            <span className={`led ${lastBackup ? '' : 'warn'}`} />
            {lastBackup ? `Last backup ${new Date(lastBackup.createdAt).toLocaleDateString()}` : 'No backups yet'}
          </div>
          {appInfo && <div className="row text-faint">v{appInfo.version} · offline</div>}
        </div>
      </div>
    </aside>
  );
}
