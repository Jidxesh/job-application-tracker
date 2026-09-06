import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';

const STATUSES = ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];

const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function Dashboard() {
  const { email, logout } = useAuth();
  const [apps, setApps] = useState([]);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, sumRes] = await Promise.all([
        client.get('/api/applications', { params: filter ? { status: filter } : {} }),
        client.get('/api/applications/summary'),
      ]);
      setApps(listRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>Applications</h1>
        <span style={{ fontSize: 14, opacity: 0.7 }}>
          {email} · <button onClick={logout} style={linkBtn}>Sign out</button>
        </span>
      </header>

      <div style={{ display: 'flex', gap: 16, margin: '24px 0', flexWrap: 'wrap' }}>
        {STATUSES.map((s) => (
          <div key={s} style={{ fontSize: 13 }}>
            <strong style={{ fontSize: 20, display: 'block' }}>{summary[s] ?? 0}</strong>
            <span style={{ opacity: 0.7 }}>{label(s)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <Link to="/new"><button style={{ padding: '8px 16px' }}>Add application</button></Link>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && apps.length === 0 && (
        <p style={{ opacity: 0.7 }}>No applications yet. Add your first one.</p>
      )}

      {!loading && apps.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
              <th style={th}>Company</th>
              <th style={th}>Role</th>
              <th style={th}>Applied</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={td}><Link to={`/applications/${a.id}`}>{a.company}</Link></td>
                <td style={td}>{a.roleTitle}</td>
                <td style={td}>{a.appliedOn ?? '—'}</td>
                <td style={td}>{label(a.currentStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '8px 4px', fontWeight: 600, fontSize: 13, opacity: 0.7 };
const td = { padding: '10px 4px' };
const linkBtn = { background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' };
