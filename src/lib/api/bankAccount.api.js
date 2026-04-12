import axiosInstance from './axiosInstance';

const BANK_ACCOUNTS = '/bank-accounts';

/**
 * Bank Account API module
 *
 * @typedef {Object} BankAccountPayload
 * @property {string}  businessId
 * @property {string}  bankName
 * @property {string}  accountName
 * @property {string}  accountNumber
 * @property {string}  [routingNumber]
 * @property {string}  [iban]
 * @property {string}  [swiftCode]
 * @property {string}  [currency]    – ISO 4217
 */
const bankAccountApi = {
  /** List bank accounts. Optionally filter by businessId */
  getBankAccounts: (params) => axiosInstance.get(BANK_ACCOUNTS, { params }),

  /** @param {string} id */
  getBankAccountById: (id) => axiosInstance.get(`${BANK_ACCOUNTS}/${id}`),

  /** @param {BankAccountPayload} payload */
  createBankAccount: (payload) => axiosInstance.post(BANK_ACCOUNTS, payload),

  /**
   * @param {string} id
   * @param {Partial<BankAccountPayload>} payload
   */
  updateBankAccount: (id, payload) => axiosInstance.put(`${BANK_ACCOUNTS}/${id}`, payload),

  /** @param {string} id */
  deleteBankAccount: (id) => axiosInstance.delete(`${BANK_ACCOUNTS}/${id}`),

  /**
   * Set a bank account as the default for a business.
   * @param {string} id
   */
  setDefault: (id) => axiosInstance.patch(`${BANK_ACCOUNTS}/${id}/set-default`),
};

export default bankAccountApi;
