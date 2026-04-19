import axiosInstance from './axiosInstance';

// Base path: /api/v1/user (baseURL already includes /api/v1 via NEXT_PUBLIC_API_URL)
const AUTH = '/user';

const authApi = {
  /**
   * @param {{ email: string, password: string }} credentials
   * POST /api/v1/user/login — no auth required
   */
  login: (credentials) => axiosInstance.post(`${AUTH}/login`, credentials),

  /**
   * @param {FormData} formData — fields: username, email, phone, password, aboutMe?, avatar(File)
   * POST /api/v1/user/register — no auth required, multipart/form-data
   */
  register: (formData) =>
    axiosInstance.post(`${AUTH}/register`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * GET /api/v1/user/logout — no auth required
   * Expires the token cookie; frontend should redirect to /login.
   */
  logout: () => axiosInstance.get(`${AUTH}/logout`),

  /**
   * GET /api/v1/user/getUser — auth required
   * Returns the currently authenticated user.
   */
  getMe: () => axiosInstance.get(`${AUTH}/getUser`),

  /**
   * @param {FormData} formData — fields: username?, email?, phone?, aboutMe?, avatar?(File)
   * PUT /api/v1/user/update/profile — auth required, multipart/form-data
   */
  updateProfile: (formData) =>
    axiosInstance.put(`${AUTH}/update/profile`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} payload
   * PUT /api/v1/user/update/pawssord — auth required
   * NOTE: "pawssord" is intentional — matches the backend route typo exactly.
   */
  changePassword: (payload) => axiosInstance.put(`${AUTH}/update/pawssord`, payload),

  /**
   * @param {{ email: string }} payload
   * POST /api/v1/user/password/forgot — no auth required
   */
  forgotPassword: (payload) => axiosInstance.post(`${AUTH}/password/forgot`, payload),

  /**
   * @param {string} token — reset token from the email link
   * @param {{ password: string, confirmPassword: string }} payload
   * PUT /api/v1/user/password/reset/:token — no auth required
   * Sets token cookie automatically; user is auto-logged-in after reset.
   */
  resetPassword: (token, payload) => axiosInstance.put(`${AUTH}/password/reset/${token}`, payload),
};

export default authApi;
