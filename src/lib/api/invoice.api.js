import axiosInstance from './axiosInstance';

const INVOICES = '/invoices';

/**
 * Invoice API module
 *
 * @typedef {Object} InvoicePayload
 * @property {string}   clientId
 * @property {string}   businessId
 * @property {string}   dueDate       – ISO 8601
 * @property {Array}    lineItems
 * @property {string}   [notes]
 * @property {string}   [status]      – draft | sent | paid | overdue
 */
const invoiceApi = {
  /** List invoices. Optional query params: status, clientId, page, limit */
  getInvoices: (params) => axiosInstance.get(INVOICES, { params }),

  /** @param {string} id */
  getInvoiceById: (id) => axiosInstance.get(`${INVOICES}/${id}`),

  /** @param {InvoicePayload} payload */
  createInvoice: (payload) => axiosInstance.post(INVOICES, payload),

  /**
   * @param {string} id
   * @param {Partial<InvoicePayload>} payload
   */
  updateInvoice: (id, payload) => axiosInstance.put(`${INVOICES}/${id}`, payload),

  /** @param {string} id */
  deleteInvoice: (id) => axiosInstance.delete(`${INVOICES}/${id}`),

  /**
   * Mark an invoice as sent.
   * @param {string} id
   */
  sendInvoice: (id) => axiosInstance.post(`${INVOICES}/${id}/send`),

  /**
   * Mark an invoice as paid.
   * @param {string} id
   */
  markAsPaid: (id) => axiosInstance.patch(`${INVOICES}/${id}/mark-paid`),

  /**
   * Download invoice as PDF blob.
   * @param {string} id
   */
  downloadPdf: (id) =>
    axiosInstance.get(`${INVOICES}/${id}/pdf`, { responseType: 'blob' }),
};

export default invoiceApi;
