import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StatusPill from '../components/StatusPill.jsx';

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const q = new URLSearchParams(location.search).get('q') || '';
  const [sops, setSops] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [servers, setServers] = useState([]);

  useEffect(() => {
    if (!q) return;
    window.api.sopsList({ search: q }).then(setSops);
    window.api.ticketsList({ search: q }).then(setTickets);
    window.api.assetsList({ search: q }).then(setAssets);
    window.api.serversList({ search: q }).then(setServers);
  }, [q]);

  const total = sops.length + tickets.length + assets.length + servers.length;

  return (
    <div>
      <p className="text-muted">
        {total} result{total !== 1 ? 's' : ''} for <strong>"{q}"</strong>
      </p>

      {sops.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">SOPs</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {sops.map((s) => (
                  <tr key={s.id} onClick={() => navigate('/sops')}>
                    <td>{s.title}</td>
                    <td className="text-muted">{s.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Tickets</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => navigate('/tickets')}>
                    <td className="mono">{t.ticket_number}</td>
                    <td>{t.title}</td>
                    <td><StatusPill value={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {assets.length > 0 && (
        <div className="card">
          <div className="card-title">Assets</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} onClick={() => navigate('/assets')}>
                    <td className="mono">{a.asset_tag}</td>
                    <td>{a.name}</td>
                    <td><StatusPill value={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {servers.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Server Inventory</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} onClick={() => navigate('/servers')}>
                    <td className="mono">{s.hostname}</td>
                    <td className="text-muted">{s.dc_name || '—'}</td>
                    <td className="mono text-muted">{s.host_ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="empty-state">
          <div className="icon">⌕</div>
          Nothing matched "{q}". Try a different term.
        </div>
      )}
    </div>
  );
}
