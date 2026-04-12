import axiosInstance from './axiosInstance';

const CLIENTS = '/clients';

/**
 * Client API module
 *
 * @typedef {Object} ClientPayload
 * @property {string}  name
 * @property {string}  email
 * @property {string}  [phone]
 * @property {string}  [address]
 * @property {string}  [vatNumber]
 */
const clientApi = {
  /** List clients. Optional query params: search, page, limit */
  getClients: (params) => axiosInstance.get(CLIENTS, { params }),

  /** @param {string} id */
  getClientById: (id) => axiosInstance.get(`${CLIENTS}/${id}`),

  /** @param {ClientPayload} payload */
  createClient: (payload) => axiosInstance.post(CLIENTS, payload),

  /**
   * @param {string} id
   * @param {Partial<ClientPayload>} payload
   */
  updateClient: (id, payload) => axiosInstance.put(`${CLIENTS}/${id}`, payload),

  /** @param {string} id */
  deleteClient: (id) => axiosInstance.delete(`${CLIENTS}/${id}`),

  /** Invoices for a specific client */
  getClientInvoices: (id, params) =>
    axiosInstance.get(`${CLIENTS}/${id}/invoices`, { params }),
};

export default clientApi;
