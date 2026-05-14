import axios from 'axios';

const PROTECTED_PATHS = [
  '/admin',
  '/dashboard',
  '/invoices',
  '/clients',
  '/business',
  '/bank-accounts',
  '/password',
];

function isProtectedPath(pathname) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      isProtectedPath(window.location.pathname)
    ) {
      window.location.href = '/login';
    }

    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
