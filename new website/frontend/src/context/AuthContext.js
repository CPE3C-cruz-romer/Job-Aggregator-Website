import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [isEmployer, setIsEmployer] = useState(() => localStorage.getItem('isEmployer') === '1');
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => localStorage.getItem('onboardingCompleted') === '1');
  const isAuthenticated = Boolean(user) && Boolean(localStorage.getItem('accessToken') || localStorage.getItem('token'));

  const syncAuth = (data) => {
    const accessToken = data?.access || data?.token || data?.access_token || '';
    const refreshToken = data?.refresh || data?.refresh_token || '';
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('refresh', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('isEmployer', data.is_employer ? '1' : '0');
    localStorage.setItem('onboardingCompleted', data.onboarding_completed ? '1' : '0');
    setUser(data.user);
    setIsEmployer(Boolean(data.is_employer));
    setOnboardingCompleted(Boolean(data.onboarding_completed));
  };

  const hydrateUserProfile = async () => {
    try {
      const { data } = await api.get('/user/profile/');
      localStorage.setItem('userProfile', JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  };

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    syncAuth(data);
    await hydrateUserProfile();
    return data;
  };

  const loginEmployer = async (username, password) => {
    const { data } = await api.post('/auth/employer/login/', { username, password });
    syncAuth(data);
    await hydrateUserProfile();
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google/', { credential });
    syncAuth(data);
    await hydrateUserProfile();
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    syncAuth(data);
    await hydrateUserProfile();
  };

  const registerEmployer = async (payload) => {
    const { data } = await api.post('/auth/employer/register/', payload);
    syncAuth(data);
    await hydrateUserProfile();
  };

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('access');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('isEmployer');
    localStorage.removeItem('onboardingCompleted');
    setUser(null);
    setIsEmployer(false);
    setOnboardingCompleted(false);
  };
  const logout = () => {
    clearAuth();
  };

  useEffect(() => {
    const onAuthExpired = () => clearAuth();
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isEmployer,
      onboardingCompleted,
      isAuthenticated,
      login,
      loginEmployer,
      loginWithGoogle,
      register,
      registerEmployer,
      logout,
      setOnboardingCompleted,
    }),
    [user, isEmployer, onboardingCompleted, isAuthenticated]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
