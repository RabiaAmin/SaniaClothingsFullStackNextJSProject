import axiosInstance from './axiosInstance';

// Base path: /api/v1/business (baseURL already includes /api/v1 via NEXT_PUBLIC_API_URL)
// The system supports ONE business record only — create once, update as needed.
const BUSINESS = '/business';

/**
 * @typedef {Object} BusinessPayload
 * @property {string}  name          — required on create
 * @property {string}  [email]
 * @property {string}  [phone]
 * @property {string}  [telPhone]
 * @property {string}  [address]
 * @property {string}  [vatNumber]
 * @property {string}  [ckNumber]
 * @property {string}  [fax]
 */

const businessApi = {
  /**
   * GET /api/v1/business/get — auth required
   * Returns the single business record.
   */
  getBusiness: () => axiosInstance.get(`${BUSINESS}/get`),

  /**
   * @param {BusinessPayload} payload
   * POST /api/v1/business/create — auth required
   */
  createBusiness: (payload) => axiosInstance.post(`${BUSINESS}/create`, payload),

  /**
   * @param {Partial<BusinessPayload>} payload — all fields optional
   * PUT /api/v1/business/update — auth required
   * Updates the single existing business record.
   */
  updateBusiness: (payload) => axiosInstance.put(`${BUSINESS}/update`, payload),
};

export default businessApi;
