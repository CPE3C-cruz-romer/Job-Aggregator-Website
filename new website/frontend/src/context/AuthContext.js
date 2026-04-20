import React, { createContext, useContext, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [isEmployer, setIsEmployer] = useState(() => localStorage.getItem('isEmployer') === '1');

  const syncAuth = (data) => {
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('isEmployer', data.is_employer ? '1' : '0');
    setUser(data.user);
    setIsEmployer(Boolean(data.is_employer));
  };

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    syncAuth(data);
    return data;
  };

  const loginEmployer = async (username, password) => {
    const { data } = await api.post('/auth/employer/login/', { username, password });
    syncAuth(data);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google/', { credential });
    syncAuth(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    syncAuth(data);
  };

  const registerEmployer = async (payload) => {
    const { data } = await api.post('/auth/employer/register/', payload);
    syncAuth(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setIsEmployer(false);
  };

  const value = useMemo(
    () => ({ user, isEmployer, login, loginEmployer, loginWithGoogle, register, registerEmployer, logout }),
    [user, isEmployer]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
