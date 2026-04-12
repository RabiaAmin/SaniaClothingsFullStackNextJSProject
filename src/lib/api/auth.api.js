import axiosInstance from './axiosInstance';

const AUTH = '/auth';

const authApi = {
  /** @param {{ email: string, password: string }} credentials */
  login: (credentials) => axiosInstance.post(`${AUTH}/login`, credentials),

  /** @param {{ firstName: string, lastName: string, email: string, password: string }} payload */
  register: (payload) => axiosInstance.post(`${AUTH}/register`, payload),

  logout: () => axiosInstance.post(`${AUTH}/logout`),

  getMe: () => axiosInstance.get(`${AUTH}/me`),

  /** @param {{ email: string }} payload */
  forgotPassword: (payload) => axiosInstance.post(`${AUTH}/forgot-password`, payload),

  /** @param {{ token: string, password: string }} payload */
  resetPassword: (payload) => axiosInstance.post(`${AUTH}/reset-password`, payload),

  /** @param {{ currentPassword: string, newPassword: string }} payload */
  changePassword: (payload) => axiosInstance.post(`${AUTH}/change-password`, payload),

  refreshToken: () => axiosInstance.post(`${AUTH}/refresh`),
};

export default authApi;
