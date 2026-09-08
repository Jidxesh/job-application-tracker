import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import client from '../api/client';

export default function ApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [form, setForm] = useState({
    company: '', roleTitle: '', location: '', source: '', appliedOn: '', notes: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    client.get(`/api/applications/${id}`)
      .then((res) => setForm({
        company: res.data.company ?? '',
        roleTitle: res.data.roleTitle ?? '',
        location: res.data.location ?? '',
        source: res.data.source ?? '',
        appliedOn: res.data.appliedOn ?? '',
        notes: res.data.notes ?? '',
      }))
      .catch(() => setError('Could not load that application'))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = { ...form, appliedOn: form.appliedOn || null };
    try {
      if (editing) {
        await client.put(`/api/applications/${id}`, payload);
        navigate(`/applications/${id}`);
      } else {
        const res = await client.post('/api/applications', payload);
        navigate(`/applications/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const back = editing ? `/applications/${id}` : '/';

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <Link to={back} className="back">← {editing ? 'Back to application' : 'All applications'}</Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        {editing ? 'Edit application' : 'New application'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 26px' }}>
        {editing
          ? 'Update the details. Status changes happen on the application page.'
          : 'It starts at Applied — you can move it along as things progress.'}
      </p>

      {loading ? (
        <div className="card"><div className="empty" style={{ padding: 24 }}>Loading…</div></div>
      ) : (
        <div className="card">
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Company *</label>
                <input value={form.company} onChange={set('company')} required autoFocus placeholder="Zomato" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Role *</label>
                <input value={form.roleTitle} onChange={set('roleTitle')} required placeholder="Backend Engineer" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Location</label>
                <input value={form.location} onChange={set('location')} placeholder="Gurgaon" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Applied on</label>
                <input type="date" value={form.appliedOn} onChange={set('appliedOn')} />
              </div>
            </div>

            <div className="field" style={{ marginTop: 18 }}>
              <label className="field-label">Where you found it</label>
              <input value={form.source} onChange={set('source')} placeholder="LinkedIn, referral, careers page" />
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={4}
                        placeholder="Referred by a senior, team works on payments…" />
            </div>

            {error && <p className="error" style={{ marginBottom: 18 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Link to={back}><button type="button">Cancel</button></Link>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Add application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
