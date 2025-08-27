// src/components/UpdateManagement.js
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function UpdateManagement() {
  const { token, role } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${token}` };

  const [clocks, setClocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/clocks`, { headers });
    if (r.ok) setClocks(await r.json());
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setChannel = async (id, channel) => {
    const r = await fetch(`/api/clocks/${id}/channel`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type':'application/json' },
      body: JSON.stringify({ channel })
    });
    if (r.ok) load(); else alert('Fehler beim Setzen des Channels.');
  };

  const bulkSet = async (channel) => {
    const r = await fetch(`/api/clocks/channel`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type':'application/json' },
      body: JSON.stringify({ channel }) // global
    });
    if (r.ok) load(); else alert('Fehler beim Bulk-Setzen.');
  };

  if (role !== 'admin') return <div>Nur für Admins.</div>;
  if (loading) return <div>Lade Uhren …</div>;

  return (
    <div>
      <h2>Update‑Management (global)</h2>

      <div style={{ display:'flex', gap:8, margin:'12px 0' }}>
        <button onClick={() => bulkSet('stable')}>Alle → stable</button>
        <button onClick={() => bulkSet('beta')}>Alle → beta</button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{textAlign:'left'}}>Clock ID</th>
            <th style={{textAlign:'left'}}>Company</th>
            <th>Status</th>
            <th>Version</th>
            <th>Channel</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {clocks.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.company_id}</td>
              <td>{c.online ? 'online' : 'offline'}</td>
              <td>{c.version || '–'}</td>
              <td>{c.channel || 'stable'}</td>
              <td>
                <button onClick={() => setChannel(c.id, c.channel === 'beta' ? 'stable' : 'beta')}>
                  {c.channel === 'beta' ? '→ stable' : '→ beta'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{marginTop:12, opacity:.8}}>
        Hinweis: Der tatsächliche Update‑Download passiert geräteseitig über <code>/api/clocks/:id/update</code>.
      </p>
    </div>
  );
}
