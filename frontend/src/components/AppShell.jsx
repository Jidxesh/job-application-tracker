import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AppShell({ children }) {
  const { email, logout } = useAuth();
  const initial = (email ?? '?').charAt(0).toUpperCase();

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">JT</span>
            <span className="brand-name">Job Tracker</span>
          </Link>
          <div className="nav-links">
            <NavLink to="/" end className="nav-link">Applications</NavLink>
            <NavLink to="/resume" className="nav-link">Resume analyzer</NavLink>
          </div>
          <div className="nav-user">
            <span className="nav-email">{email}</span>
            <span className="avatar" aria-hidden="true">{initial}</span>
            <button className="btn-link" onClick={logout}>Sign out</button>
          </div>
        </div>
      </nav>
      <main className="fade-in">{children}</main>
    </>
  );
}
