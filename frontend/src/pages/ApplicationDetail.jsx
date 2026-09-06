import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';

const STATUSES = ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [a, t] = await Promise.all([
        client.get(`/api/applications/${id}`),
        client.get(`/api/applications/${id}/timeline`),
      ]);
      setApp(a.data);
      setTimeline(t.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not load');
    }
  };

  useEffect(() => { load(); }, [id]);

  const move = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await client.post(`/api/applications/${id}/status`, { status: target, note: note || null });
      setTarget('');
      setNote('');
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

  if (!app) return <div style={{ padding: 40 }}>{error ?? 'Loading…'}</div>;

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <Link to="/">← Back</Link>

      <h1 style={{ marginBottom: 4 }}>{app.company}</h1>
      <p style={{ margin: 0, opacity: 0.8 }}>{app.roleTitle}</p>
      <p style={{ opacity: 0.6, fontSize: 14 }}>
        {[app.location, app.source, app.appliedOn].filter(Boolean).join(' · ')}
      </p>
      <p><strong>{label(app.currentStatus)}</strong></p>

      {app.notes && <p style={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>{app.notes}</p>}

      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
        <Link to={`/applications/${id}/edit`}><button>Edit</button></Link>
        <button onClick={remove}>Delete</button>
      </div>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Move to a new status</h2>
      <form onSubmit={move} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={target} onChange={(e) => setTarget(e.target.value)} required style={{ padding: 8 }}>
          <option value="">Choose…</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" style={{ padding: 8, flex: 1, minWidth: 180 }} />
        <button type="submit" style={{ padding: '8px 16px' }}>Move</button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <h2 style={{ fontSize: 18, marginTop: 32 }}>History</h2>
      <ol style={{ listStyle: 'none', padding: 0, borderLeft: '2px solid #444', marginLeft: 6 }}>
        {timeline.map((e) => (
          <li key={e.id} style={{ padding: '8px 0 8px 16px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: -7, top: 14, width: 10, height: 10, borderRadius: '50%', background: '#888' }} />
            <strong>{label(e.status)}</strong>
            <span style={{ opacity: 0.6, fontSize: 13, marginLeft: 8 }}>
              {new Date(e.occurredAt).toLocaleDateString()}
            </span>
            {e.note && <div style={{ opacity: 0.75, fontSize: 14 }}>{e.note}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
