import axiosInstance from './axiosInstance';

// Base path: /api/v1/bankAccount (baseURL already includes /api/v1 via NEXT_PUBLIC_API_URL)
// The system supports TWO account types only: "VAT" and "NON_VAT" — one record per type.
const BANK_ACCOUNT = '/bankAccount';

/**
 * @typedef {Object} BankAccountPayload
 * @property {string} accountType         — "VAT" | "NON_VAT" (required on create; cannot change after)
 * @property {string} bankName            — required
 * @property {string} accountHolderName  — required
 * @property {string} accountNumber      — required
 * @property {string} [branchCode]       — branch / sort code
 */

const bankAccountApi = {
  /**
   * GET /api/v1/bankAccount/getAll — auth required
   * Returns both VAT and NON_VAT accounts.
   */
  getAllBankAccounts: async () => {
    const res = await axiosInstance.get(`${BANK_ACCOUNT}/getAll`);
    return { ...res, data: res.data.bankAccounts ?? [] };
  },

  /**
   * @param {string} id — MongoDB _id of the bank account
   * GET /api/v1/bankAccount/get/:id — auth required
   */
  getBankAccountById: (id) => axiosInstance.get(`${BANK_ACCOUNT}/get/${id}`),

  /**
   * @param {BankAccountPayload} payload
   * POST /api/v1/bankAccount/create — auth required
   */
  createBankAccount: (payload) => axiosInstance.post(`${BANK_ACCOUNT}/create`, payload),

  /**
   * @param {string} id — MongoDB _id of the bank account
   * @param {Omit<Partial<BankAccountPayload>, 'accountType'>} payload — accountType cannot be changed
   * PUT /api/v1/bankAccount/update/:id — auth required
   */
  updateBankAccount: (id, payload) => axiosInstance.put(`${BANK_ACCOUNT}/update/${id}`, payload),

  /**
   * @param {string} id — MongoDB _id of the bank account
   * DELETE /api/v1/bankAccount/delete/:id — auth required
   */
  deleteBankAccount: (id) => axiosInstance.delete(`${BANK_ACCOUNT}/delete/${id}`),
};

export default bankAccountApi;
