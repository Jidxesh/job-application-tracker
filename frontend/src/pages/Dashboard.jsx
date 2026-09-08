import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';

const STATUSES = ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function Badge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{label(status)}</span>;
}

export default function Dashboard() {
  const { email, logout } = useAuth();
  const [apps, setApps] = useState([]);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      client.get('/api/applications', { params: filter ? { status: filter } : {} }),
      client.get('/api/applications/summary'),
    ])
      .then(([list, sum]) => {
        if (!active) return;
        setApps(list.data);
        setSummary(sum.data);
        setError(null);
      })
      .catch((err) => active && setError(err.response?.data?.error ?? 'Could not load applications'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filter]);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Applications</h1>
        <span className="topbar-meta">
          {email} · <button className="btn-link" onClick={logout}>Sign out</button>
        </span>
      </div>

      <div className="summary">
        {STATUSES.map((s) => (
          <div className="stat" key={s}>
            <div className="stat-value">{summary[s] ?? 0}</div>
            <div className="stat-label">{label(s)}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <Link to="/new"><button className="btn-primary">Add application</button></Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="empty">No applications yet. Add your first one.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Role</th><th>Applied</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="cell-primary"><Link to={`/applications/${a.id}`}>{a.company}</Link></td>
                  <td>{a.roleTitle}</td>
                  <td className="cell-muted">{a.appliedOn ?? '—'}</td>
                  <td><Badge status={a.currentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
