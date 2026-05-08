import axiosInstance from './axiosInstance';


const AUTH = '/user';

const authApi = {
  /**
   * @param {{ email: string, password: string }} credentials
  
   */
  login: (credentials) => axiosInstance.post(`${AUTH}/login`, credentials),

  /**
   * @param {FormData} formData — fields: username, email, phone, password, aboutMe?, avatar(File)
   * 
   */
  register: (formData) =>
    axiosInstance.post(`${AUTH}/register`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   *
   * Expires the token cookie; frontend should redirect to /login.
   */
  logout: () => axiosInstance.get(`${AUTH}/logout`),

  /**

   * Returns the currently authenticated user.
   */
  getMe: () => axiosInstance.get(`${AUTH}/getUser`),

  /**
   * @param {FormData} formData — fields: username?, email?, phone?, aboutMe?, avatar?(File)
   *— auth required, multipart/form-data
   */
  updateProfile: (formData) =>
    axiosInstance.put(`${AUTH}/update/profile`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} payload

   * NOTE: "pawssord" is intentional — matches the backend route typo exactly.
   */
  changePassword: (payload) => axiosInstance.put(`${AUTH}/update/pawssord`, payload),

  /**
   * @param {{ email: string }} payload
 
   */
  forgotPassword: (payload) => axiosInstance.post(`${AUTH}/password/forgot`, payload),

  /**
   * @param {string} token — reset token from the email link
   * @param {{ password: string, confirmPassword: string }} payload
   
   * Sets token cookie automatically; user is auto-logged-in after reset.
   */
  resetPassword: (token, payload) => axiosInstance.put(`${AUTH}/password/reset/${token}`, payload),
};

export default authApi;
