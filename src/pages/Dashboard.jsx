import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPill from '../components/StatusPill.jsx';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { window.api.dashboardSummary().then(setSummary); }, []);

  if (!summary) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-value">{summary.openTickets}</div><div className="stat-label">Open tickets</div></div>
        <div className="stat-card red"><div className="stat-value">{summary.criticalTickets}</div><div className="stat-label">Critical, unresolved</div></div>
        <div className="stat-card teal"><div className="stat-value">{summary.resolvedThisWeek}</div><div className="stat-label">Resolved this week</div></div>
        <div className="stat-card blue"><div className="stat-value">{summary.totalSops}</div><div className="stat-label">SOPs in library</div></div>
        <div className="stat-card"><div className="stat-value">{summary.totalAssets}</div><div className="stat-label">Tracked assets</div></div>
        <div className="stat-card red"><div className="stat-value">{summary.assetsInRepair}</div><div className="stat-label">Assets in repair</div></div>
      </div>

      <div className="card">
        <div className="card-title">Recent tickets</div>
        {summary.recentTickets.length === 0 ? (
          <div className="empty-state"><div className="icon">◈</div>No tickets yet. Create one from the Tickets page.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ticket</th><th>Title</th><th>Priority</th><th>Status</th><th>Requester</th></tr></thead>
              <tbody>
                {summary.recentTickets.map((t) => (
                  <tr key={t.id} onClick={() => navigate('/tickets')}>
                    <td className="mono">{t.ticket_number}</td>
                    <td>{t.title}</td>
                    <td><StatusPill value={t.priority} /></td>
                    <td><StatusPill value={t.status} /></td>
                    <td className="text-muted">{t.requester || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
