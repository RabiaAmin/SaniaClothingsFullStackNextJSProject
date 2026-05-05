import axiosInstance from './axiosInstance';

const PRODUCT = '/product';

/**
 * @typedef {Object} ProductPayload
 * @property {string}   name         — required
 * @property {string}   description  — required
 * @property {string}   [category]
 * @property {string[]} [images]     — array of image URLs
 * @property {number}   [stock]
 * @property {boolean}  [isActive]
 */

const productApi = {
  /** GET /api/v1/product/getAll — public; pass { active: true } for public showcase */
  getProducts: (params) => axiosInstance.get(`${PRODUCT}/getAll`, { params }),

  /** GET /api/v1/product/get/:id — public */
  getProductById: (id) => axiosInstance.get(`${PRODUCT}/get/${id}`),

  /** POST /api/v1/product/create — auth required */
  createProduct: (payload) => axiosInstance.post(`${PRODUCT}/create`, payload),

  /** PUT /api/v1/product/update/:id — auth required */
  updateProduct: (id, payload) => axiosInstance.put(`${PRODUCT}/update/${id}`, payload),

  /** DELETE /api/v1/product/delete/:id — auth required */
  deleteProduct: (id) => axiosInstance.delete(`${PRODUCT}/delete/${id}`),
};

export default productApi;
