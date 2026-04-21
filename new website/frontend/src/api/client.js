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

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;