import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SOPs from './pages/SOPs.jsx';
import Tickets from './pages/Tickets.jsx';
import Assets from './pages/Assets.jsx';
import ServerInventory from './pages/ServerInventory.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import SearchResults from './pages/SearchResults.jsx';

const TITLES = {
  '/': 'Dashboard',
  '/sops': 'SOPs & Knowledge Base',
  '/tickets': 'Tickets & Incidents',
  '/assets': 'Asset Inventory',
  '/servers': 'Server Inventory',
  '/users': 'User Accounts',
  '/settings': 'Settings',
  '/search': 'Search Results'
};

function Shell() {
  const path = window.location.hash.replace('#', '').split('?')[0] || '/';
  const title = TITLES[path] || 'IT Operations Knowledge Portal';
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <TopBar title={title} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sops" element={<SOPs />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/servers" element={<ServerInventory />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Gate() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return <Shell />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
