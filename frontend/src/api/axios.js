import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rr_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, try once to refresh the access token using the refresh token.
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('rr_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('rr_access_token');
        localStorage.removeItem('rr_refresh_token');
        localStorage.removeItem('rr_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/login/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('rr_access_token', data.access);
        // SIMPLE_JWT has ROTATE_REFRESH_TOKENS on -- the old refresh token is
        // blacklisted the instant this response comes back, so the new one
        // must be saved too or the *next* refresh will fail with a reused,
        // already-blacklisted token and force an early logout.
        if (data.refresh) {
          localStorage.setItem('rr_refresh_token', data.refresh);
        }
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('rr_access_token');
        localStorage.removeItem('rr_refresh_token');
        localStorage.removeItem('rr_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
