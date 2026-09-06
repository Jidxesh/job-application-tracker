import { createContext, useContext, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [email, setEmail] = useState(() => localStorage.getItem('email'));

  const save = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    setToken(data.token);
    setEmail(data.email);
  };

  const login = async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    save(res.data);
  };

  const register = async (email, password) => {
    const res = await client.post('/api/auth/register', { email, password });
    save(res.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
