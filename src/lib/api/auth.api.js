import axiosInstance from './axiosInstance';

const AUTH = '/auth';

/**
 * Authentication API module
 * Backend base: POST /auth/login, POST /auth/register, etc.
 */
const authApi = {
  /**
   * @param {{ email: string, password: string }} credentials
   */
  login: (credentials) => axiosInstance.post(`${AUTH}/login`, credentials),

  /**
   * @param {{ firstName: string, lastName: string, email: string, password: string }} payload
   */
  register: (payload) => axiosInstance.post(`${AUTH}/register`, payload),

  /** Clears session / invalidates refresh token server-side */
  logout: () => axiosInstance.post(`${AUTH}/logout`),

  /** Returns the currently authenticated user */
  getMe: () => axiosInstance.get(`${AUTH}/me`),

  /**
   * @param {{ email: string }} payload
   */
  forgotPassword: (payload) => axiosInstance.post(`${AUTH}/forgot-password`, payload),

  /**
   * @param {{ token: string, password: string }} payload
   */
  resetPassword: (payload) => axiosInstance.post(`${AUTH}/reset-password`, payload),

  /** Exchange refresh token for a new access token */
  refreshToken: () => axiosInstance.post(`${AUTH}/refresh`),
};

export default authApi;
