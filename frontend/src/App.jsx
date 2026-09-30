import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationDetail from './pages/ApplicationDetail';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import AppShell from './components/AppShell';

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />;
}

function Home() {
  const { token } = useAuth();
  return token ? <AppShell><Dashboard /></AppShell> : <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/new" element={<RequireAuth><ApplicationForm /></RequireAuth>} />
          <Route path="/applications/:id" element={<RequireAuth><ApplicationDetail /></RequireAuth>} />
          <Route path="/resume" element={<RequireAuth><ResumeAnalyzer /></RequireAuth>} />
          <Route path="/applications/:id/edit" element={<RequireAuth><ApplicationForm /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
