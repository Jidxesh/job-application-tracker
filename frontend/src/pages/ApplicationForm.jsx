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
        company: res.data.company ?? '', roleTitle: res.data.roleTitle ?? '',
        location: res.data.location ?? '', source: res.data.source ?? '',
        appliedOn: res.data.appliedOn ?? '', notes: res.data.notes ?? '',
      }))
      .catch(() => setError('Could not load this application.'));
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
      setError(err.response?.data?.error ?? 'Could not save. Check the required fields.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="bar"><Link to="/" className="mark">Job Tracker</Link></div>

      <div className="shell" style={{ maxWidth: 520 }}>
        <Link to={editing ? `/applications/${id}` : '/'} className="back">Cancel</Link>
        <h1 className="detail-company" style={{ marginBottom: 26 }}>
          {editing ? 'Edit details' : 'New application'}
        </h1>

        <form onSubmit={submit}>
          <label className="field-label"><span>Company</span>
            <input value={form.company} onChange={set('company')} required /></label>
          <label className="field-label"><span>Role</span>
            <input value={form.roleTitle} onChange={set('roleTitle')} required /></label>
          <label className="field-label"><span>Location</span>
            <input value={form.location} onChange={set('location')} /></label>
          <label className="field-label"><span>Where you found it</span>
            <input value={form.source} onChange={set('source')} placeholder="LinkedIn, referral, careers page" /></label>
          <label className="field-label"><span>Date applied</span>
            <input type="date" value={form.appliedOn} onChange={set('appliedOn')} /></label>
          <label className="field-label"><span>Notes</span>
            <textarea value={form.notes} onChange={set('notes')} rows={4} /></label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add application'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
