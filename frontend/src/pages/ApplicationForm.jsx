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
      .catch(() => setError('Could not load that application'));
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

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <Link to="/">← Back</Link>
      <h1>{editing ? 'Edit application' : 'New application'}</h1>

      <form onSubmit={submit}>
        <Field label="Company *"><input value={form.company} onChange={set('company')} required style={input} /></Field>
        <Field label="Role *"><input value={form.roleTitle} onChange={set('roleTitle')} required style={input} /></Field>
        <Field label="Location"><input value={form.location} onChange={set('location')} style={input} /></Field>
        <Field label="Source"><input value={form.source} onChange={set('source')} placeholder="LinkedIn, referral, careers page…" style={input} /></Field>
        <Field label="Applied on"><input type="date" value={form.appliedOn} onChange={set('appliedOn')} style={input} /></Field>
        <Field label="Notes"><textarea value={form.notes} onChange={set('notes')} rows={4} style={input} /></Field>

        <button type="submit" disabled={busy} style={{ padding: '10px 20px' }}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const input = { width: '100%', padding: 10, boxSizing: 'border-box', font: 'inherit' };
