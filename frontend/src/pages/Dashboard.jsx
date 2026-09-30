import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

const STATUSES = ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const COLOR = {
  APPLIED: 'var(--applied)', ONLINE_ASSESSMENT: 'var(--assessment)', INTERVIEW: 'var(--interview)',
  OFFER: 'var(--offer)', REJECTED: 'var(--rejected)', WITHDRAWN: 'var(--withdrawn)',
};

export function Badge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{label(status)}</span>;
}

// Stable hue per company so each one gets its own colored initial.
function CompanyMark({ name }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span className="company-mark"
          style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))` }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function Dashboard() {
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

  const total = STATUSES.reduce((n, s) => n + (summary[s] ?? 0), 0);
  const toggle = (s) => setFilter((f) => (f === s ? '' : s));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Your <span className="gradient-text">pipeline</span></h1>
        <p>{total === 0 ? 'Start tracking your first application.' : `${total} application${total === 1 ? '' : 's'} in flight. Click a card to filter.`}</p>
      </div>

      <div className="summary">
        <button className={`stat stat-total${filter === '' ? ' active' : ''}`} onClick={() => setFilter('')}>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total</div>
        </button>
        {STATUSES.map((s) => (
          <button key={s} className={`stat${filter === s ? ' active' : ''}`} style={{ '--c': COLOR[s] }} onClick={() => toggle(s)}>
            <div className="stat-value">{summary[s] ?? 0}</div>
            <div className="stat-label"><span className="stat-dot" />{label(s)}</div>
            <span className="stat-bar" style={{ width: total ? `${((summary[s] ?? 0) / total) * 100}%` : 0 }} />
          </button>
        ))}
      </div>

      <Link to="/resume" className="promo">
        <div>
          <strong>Is your resume ATS-ready?</strong><br />
          <span>Upload a PDF and get a keyword match score plus AI feedback in seconds.</span>
        </div>
        <span className="promo-arrow">→</span>
      </Link>

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <Link to="/new"><button className="btn-primary">+ Add application</button></Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🚀</div>
            {filter ? `Nothing in ${label(filter)} right now.` : 'No applications yet. Add your first one to get started.'}
            {!filter && <div style={{ marginTop: 16 }}><Link to="/new"><button className="btn-primary">+ Add application</button></Link></div>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th><th className="hide-sm">Role</th><th className="hide-sm">Applied</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="cell-primary">
                    <Link to={`/applications/${a.id}`}><CompanyMark name={a.company} />{a.company}</Link>
                  </td>
                  <td className="hide-sm">{a.roleTitle}</td>
                  <td className="cell-muted hide-sm">{a.appliedOn ?? '—'}</td>
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
