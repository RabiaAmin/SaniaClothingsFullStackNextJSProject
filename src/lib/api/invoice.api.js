import axiosInstance from './axiosInstance';

// Base path: /api/v1/business/invoice (baseURL already includes /api/v1 via NEXT_PUBLIC_API_URL)
const INVOICE = '/business/invoice';

/**
 * @typedef {Object} InvoiceItem
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} amount
 */

/**
 * @typedef {Object} InvoicePayload
 * @property {string}        fromBusiness  — Business _id (required)
 * @property {string}        toClient      — Client _id (required)
 * @property {InvoiceItem[]} items         — line items array (required)
 * @property {number}        subTotal      — total before tax (required)
 * @property {number}        totalAmount   — final total including tax (required)
 * @property {string}        category      — invoice category (required)
 * @property {string}        [date]        — ISO date YYYY-MM-DD, defaults to now
 * @property {string}        [invNo]       — manual invoice number; auto-generated if omitted
 * @property {string}        [poNumber]    — purchase order number
 * @property {number}        [tax]         — tax amount
 * @property {string}        [status]      — "Pending" | "Sent" | "Paid" (default: "Pending")
 */

const invoiceApi = {
  /**
   * GET /api/v1/business/invoice/getAllOfThisMonth — auth required
   * Paginated. Defaults to previous calendar month when no date range provided.
   *
   * @param {{ page?: number, limit?: number, startDate?: string, endDate?: string, poNumber?: string, toClient?: string }} params
   */
  getAllInvoices: (params) => axiosInstance.get(`${INVOICE}/getAllOfThisMonth`, { params }),

  /**
   * @param {string} id — MongoDB _id of the invoice
   * GET /api/v1/business/invoice/get/:id — auth required
   * Returns fully populated fromBusiness and toClient, plus resolved bankAccount.
   */
  getInvoiceById: (id) => axiosInstance.get(`${INVOICE}/get/${id}`),

  /**
   * @param {InvoicePayload} payload
   * POST /api/v1/business/invoice/create — auth required
   */
  createInvoice: (payload) => axiosInstance.post(`${INVOICE}/create`, payload),

  /**
   * @param {string} id — MongoDB _id of the invoice
   * @param {Partial<InvoicePayload>} payload
   * PUT /api/v1/business/invoice/update/:id — auth required
   * Status transitions (Paid ↔ non-Paid) are handled automatically by the backend.
   */
  updateInvoice: (id, payload) => axiosInstance.put(`${INVOICE}/update/${id}`, payload),

  /**
   * @param {string} id — MongoDB _id of the invoice
   * DELETE /api/v1/business/invoice/delete/:id — auth required
   * Also deletes the associated BookTransaction if one exists.
   */
  deleteInvoice: (id) => axiosInstance.delete(`${INVOICE}/delete/${id}`),

  /**
   * @param {{ invoiceIds: string[] }} payload — array of invoice MongoDB _ids
   * PUT /api/v1/business/invoice/mark-as-paid — auth required
   * Bulk operation; safe to call multiple times on the same IDs.
   */
  markAsPaid: (payload) => axiosInstance.put(`${INVOICE}/mark-as-paid`, payload),

  /**
   * GET /api/v1/business/invoice/weekly-statements — auth required
   * Returns invoices with status "Sent", grouped by client name.
   *
   * @param {{ startDate: string, endDate: string }} params — both required (YYYY-MM-DD)
   */
  getWeeklyStatements: (params) => axiosInstance.get(`${INVOICE}/weekly-statements`, { params }),

  /**
   * GET /api/v1/business/invoice/getOrdersPerProduct — auth required
   * Returns Pending invoices aggregated by product, sorted by totalOrders descending.
   *
   * @param {{ startDate?: string, endDate?: string }} params
   */
  getOrdersPerProduct: (params) => axiosInstance.get(`${INVOICE}/getOrdersPerProduct`, { params }),
};

export default invoiceApi;
