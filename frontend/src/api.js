import axios from 'axios';

const AUTH_STORAGE_KEY = 'echobox-current-user';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  const requestUrl = error.config?.url || '';
  const isAuthRequest = requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/register');
  if (error.response?.status === 401 && !isAuthRequest) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (window.location.pathname !== '/auth') window.location.assign('/auth');
  }
  return Promise.reject(error);
});

export default api;
