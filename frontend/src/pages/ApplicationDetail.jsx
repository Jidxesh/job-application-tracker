import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Badge } from './Dashboard';

const STATUSES = ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const DOT = {
  APPLIED: 'var(--applied)', ONLINE_ASSESSMENT: 'var(--assessment)',
  INTERVIEW: 'var(--interview)', OFFER: 'var(--offer)',
  REJECTED: 'var(--rejected)', WITHDRAWN: 'var(--withdrawn)',
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const [a, t] = await Promise.all([
        client.get(`/api/applications/${id}`),
        client.get(`/api/applications/${id}/timeline`),
      ]);
      setApp(a.data);
      setTimeline(t.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not load');
    }
  };

  useEffect(() => { load(); }, [id]);

  const move = async (e) => {
    e.preventDefault();
    try {
      await client.post(`/api/applications/${id}/status`, { status: target, note: note || null });
      setTarget(''); setNote('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not change status');
    }
  };

  const remove = async () => {
    if (!confirm('Delete this application?')) return;
    await client.delete(`/api/applications/${id}`);
    navigate('/');
  };

  if (!app) return <div className="page">{error ? <p className="error">{error}</p> : 'Loading…'}</div>;

  const meta = [app.location, app.source, app.appliedOn].filter(Boolean).join(' · ');

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <Link to="/" className="back">← All applications</Link>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
              {app.company}
            </h1>
            <div style={{ color: 'var(--text-muted)' }}>{app.roleTitle}</div>
            {meta && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>{meta}</div>}
          </div>
          <Badge status={app.currentStatus} />
        </div>

        {app.notes && (
          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: 14, marginBottom: 0 }}>
            {app.notes}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Link to={`/applications/${id}/edit`}><button>Edit</button></Link>
          <button className="btn-danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <div className="section-title">Move to a new status</div>
      <form onSubmit={move} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={target} onChange={(e) => setTarget(e.target.value)} required style={{ width: 190 }}>
          <option value="">Choose…</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)}
               placeholder="Note (optional)" style={{ flex: 1, minWidth: 180 }} />
        <button type="submit" className="btn-primary">Move</button>
      </form>

      {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

      <div className="section-title">History</div>
      <ol className="timeline">
        {timeline.map((e) => (
          <li key={e.id}>
            <span className="timeline-dot" style={{ background: DOT[e.status] }} />
            <div className="timeline-head">
              <strong style={{ fontSize: 14 }}>{label(e.status)}</strong>
              <span className="timeline-date">
                {new Date(e.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {e.note && <div className="timeline-note">{e.note}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
