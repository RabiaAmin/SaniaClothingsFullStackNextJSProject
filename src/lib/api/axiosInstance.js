import axios from 'axios';
import { isProtectedPath } from '@/lib/auth/access';

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
    const code = error.response?.data?.code;

    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      isProtectedPath(window.location.pathname)
    ) {
      window.location.href = '/login';
    }

    if (
      status === 403 &&
      code === 'PASSWORD_CHANGE_REQUIRED' &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/change-password'
    ) {
      window.location.href = '/change-password';
    }

    const message = error.response?.data?.message ?? error.message;
    const apiError = new Error(message);
    apiError.status = status;
    apiError.code = code;
    return Promise.reject(apiError);
  }
);

export default axiosInstance;
