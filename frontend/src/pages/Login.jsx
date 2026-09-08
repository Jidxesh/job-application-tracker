import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await (isRegister ? register(email, password) : login(email, password));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-narrow">
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
        {isRegister ? 'Create account' : 'Sign in'}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 28, fontSize: 14 }}>
        Track your job applications and their full history.
      </p>

      <div className="card">
        <form onSubmit={submit}>
          <div className="field">
            <label className="field-label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="you@example.com" required autoFocus />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {error && <p className="error" style={{ marginTop: 16, marginBottom: 0 }}>{error}</p>}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
        <button className="btn-link" onClick={() => { setIsRegister(!isRegister); setError(null); }}>
          {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>
      </p>
    </div>
  );
}
