import axios from 'axios';

/**
 * Single Axios instance shared across all API modules.
 *
 * Interceptors:
 *  - Request  → attach Authorization header if token exists in memory
 *  - Response → normalize 401 errors (redirect to /login)
 */
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // send HttpOnly cookies on cross-origin requests
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

// ── Request interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    // If you switch to localStorage/Bearer tokens, inject them here:
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      // Session expired — redirect to login, but only when we're not already
      // on a public/auth page. Without this guard, getMe() firing on /login
      // returns 401 → redirect → /login → getMe() → 401 → ∞ loop.
      const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];
      const onAuthPage = AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));
      if (!onAuthPage) {
        window.location.href = '/login';
      }
    }

    // Bubble a clean error message from the API body when available.
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
