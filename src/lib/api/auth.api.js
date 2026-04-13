import axiosInstance from './axiosInstance';

const AUTH = import.meta.env.VITE_BACKEND_URL_USER;

const authApi = {
  /** @param {{ email: string, password: string }} credentials */
  login: (credentials) => axiosInstance.post(`${AUTH}/login`, credentials),

  /** @param {{ firstName: string, lastName: string, email: string, password: string }} payload */
  register: (payload) => axiosInstance.post(`${AUTH}/register`, payload),

  logout: () => axiosInstance.post(`${AUTH}/logout`),

  getMe: () => axiosInstance.get(`${AUTH}/getUser`),

  /** @param {{ email: string }} payload */
  forgotPassword: (payload) => axiosInstance.post(`${AUTH}/password/forgot`, payload),

  /** @param {{ token: string, password: string }} payload */
  resetPassword: (payload) => axiosInstance.post(`${AUTH}/password/reset/${payload.token}`, payload),

  /** @param {{ currentPassword: string, newPassword: string }} payload */
  changePassword: (payload) => axiosInstance.post(`${AUTH}/update/pawssord`, payload),

  refreshToken: () => axiosInstance.post(`${AUTH}/refresh`),
};

export default authApi;
