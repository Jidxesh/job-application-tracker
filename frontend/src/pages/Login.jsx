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
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>{isRegister ? 'Create account' : 'Sign in'}</h1>

      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 10 }}>
          {busy ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <p>
        <button onClick={() => { setIsRegister(!isRegister); setError(null); }}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
          {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>
      </p>
    </div>
  );
}
