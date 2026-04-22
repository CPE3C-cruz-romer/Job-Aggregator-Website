import axios from 'axios';

const DEFAULT_API_URL = 'https://job-aggregator-website.onrender.com/api/';

const rawBaseUrl =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  DEFAULT_API_URL;

const ensureApiPath = (url) => {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_API_URL.replace(/\/+$/, '');
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
};

const normalizedBaseUrl = ensureApiPath(rawBaseUrl);

const getAccessToken = () => (
  localStorage.getItem('accessToken')
  || localStorage.getItem('token')
  || localStorage.getItem('access')
);
const getRefreshToken = () => (
  localStorage.getItem('refreshToken')
  || localStorage.getItem('refresh')
);

const REFRESH_ENDPOINTS = [
  `${normalizedBaseUrl}/auth/token/refresh/`,
  `${normalizedBaseUrl}/token/refresh/`,
];

const api = axios.create({
  baseURL: normalizedBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests = [];

const clearAuthStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('access');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  localStorage.removeItem('isEmployer');
  localStorage.removeItem('onboardingCompleted');
  window.dispatchEvent(new Event('auth:expired'));
};

const flushQueue = (error, token = null) => {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingRequests = [];
};

const tryRefreshAccessToken = async (refreshToken) => {
  let lastError;
  for (const endpoint of REFRESH_ENDPOINTS) {
    try {
      const { data } = await axios.post(endpoint, { refresh: refreshToken });
      if (data?.access) return data.access;
      lastError = new Error('No access token returned from refresh endpoint.');
    } catch (err) {
      lastError = err;
      if (err?.response?.status !== 404) break;
    }
  }
  throw lastError || new Error('Unable to refresh access token.');
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = String(originalRequest?.url || '').toLowerCase();
    const isAuthRequest = (
      requestUrl.includes('/auth/login/')
      || requestUrl.includes('/auth/employer/login/')
      || requestUrl.includes('/auth/google/')
      || requestUrl.includes('/auth/register/')
      || requestUrl.includes('/auth/employer/register/')
      || requestUrl.includes('/auth/token/refresh/')
      || requestUrl.includes('/token/refresh/')
    );

    if (!originalRequest || status !== 401 || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthStorage();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await tryRefreshAccessToken(refreshToken);
      localStorage.setItem('accessToken', newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      flushQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      clearAuthStorage();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
