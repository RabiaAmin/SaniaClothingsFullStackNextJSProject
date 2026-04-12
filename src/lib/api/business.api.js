import axiosInstance from './axiosInstance';

const BUSINESSES = '/businesses';

/**
 * Business Profile API module
 *
 * @typedef {Object} BusinessPayload
 * @property {string}  name
 * @property {string}  [email]
 * @property {string}  [phone]
 * @property {string}  [address]
 * @property {string}  [vatNumber]
 * @property {string}  [logoUrl]
 * @property {string}  [currency]   – ISO 4217, e.g. "USD"
 */
const businessApi = {
  /** List all business profiles belonging to the authenticated user */
  getBusinesses: (params) => axiosInstance.get(BUSINESSES, { params }),

  /** @param {string} id */
  getBusinessById: (id) => axiosInstance.get(`${BUSINESSES}/${id}`),

  /** @param {BusinessPayload} payload */
  createBusiness: (payload) => axiosInstance.post(BUSINESSES, payload),

  /**
   * @param {string} id
   * @param {Partial<BusinessPayload>} payload
   */
  updateBusiness: (id, payload) => axiosInstance.put(`${BUSINESSES}/${id}`, payload),

  /** @param {string} id */
  deleteBusiness: (id) => axiosInstance.delete(`${BUSINESSES}/${id}`),

  /**
   * Upload a business logo.
   * @param {string}   id
   * @param {FormData} formData  – field name: "logo"
   */
  uploadLogo: (id, formData) =>
    axiosInstance.post(`${BUSINESSES}/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default businessApi;
