import axios from 'axios';

const DEFAULT_API_URL = "https://job-aggregator-website.onrender.com/api/";

const rawBaseUrl =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    DEFAULT_API_URL;

const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

const api = axios.create({
    baseURL: normalizedBaseUrl,
});

let refreshPromise = null;

const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

const clearAuthState = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isEmployer');
  window.dispatchEvent(new Event('auth:changed'));
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/token/refresh/')) {
      clearAuthState();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthState();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/token/refresh/', { refresh: refreshToken });
      }

      const { data } = await refreshPromise;
      setAccessToken(data.access);
      refreshPromise = null;
      window.dispatchEvent(new Event('auth:changed'));

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${data.access}`;

      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      clearAuthState();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
