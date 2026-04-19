import axiosInstance from './axiosInstance';

// Base path: /api/v1/client (baseURL already includes /api/v1 via NEXT_PUBLIC_API_URL)
const CLIENT = '/client';

/**
 * @typedef {Object} ClientPayload
 * @property {string}  name                  — required on create
 * @property {string}  [email]
 * @property {string}  [phone]               — mobile number
 * @property {string}  [telphone]            — telephone number
 * @property {string}  [address]
 * @property {string}  [registrationNumber]  — company registration number
 * @property {string}  [vatNumber]
 * @property {string}  [fax]
 * @property {boolean} [vatApplicable]       — whether VAT applies to this client
 * @property {number}  [vatRate]             — VAT percentage, e.g. 15
 */

const clientApi = {
  /**
   * GET /api/v1/client/getAll — auth required
   */
  getAllClients: () => axiosInstance.get(`${CLIENT}/getAll`),

  /**
   * @param {string} id — MongoDB _id of the client
   * GET /api/v1/client/get/:id — auth required
   */
  getClientById: (id) => axiosInstance.get(`${CLIENT}/get/${id}`),

  /**
   * @param {ClientPayload} payload
   * POST /api/v1/client/add — auth required
   */
  addClient: (payload) => axiosInstance.post(`${CLIENT}/add`, payload),

  /**
   * @param {string} id — MongoDB _id of the client
   * @param {Partial<ClientPayload>} payload — all fields optional
   * PUT /api/v1/client/update/:id — auth required
   */
  updateClient: (id, payload) => axiosInstance.put(`${CLIENT}/update/${id}`, payload),

  /**
   * @param {string} id — MongoDB _id of the client
   * DELETE /api/v1/client/delete/:id — auth required
   */
  deleteClient: (id) => axiosInstance.delete(`${CLIENT}/delete/${id}`),
};

export default clientApi;
