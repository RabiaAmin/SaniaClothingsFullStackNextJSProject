import axiosInstance from './axiosInstance';

const PRODUCT = '/product';

const productApi = {
  /** GET /api/v1/product/getAll — public; pass { active: true } for public showcase */
  getProducts: (params) => axiosInstance.get(`${PRODUCT}/getAll`, { params }),

  /** GET /api/v1/product/get/:id — public */
  getProductById: (id) => axiosInstance.get(`${PRODUCT}/get/${id}`),

  /** POST /api/v1/product/create — auth required; accepts FormData */
  createProduct: (formData) =>
    axiosInstance.post(`${PRODUCT}/create`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** PUT /api/v1/product/update/:id — auth required; accepts FormData */
  updateProduct: (id, formData) =>
    axiosInstance.put(`${PRODUCT}/update/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/v1/product/delete/:id — auth required */
  deleteProduct: (id) => axiosInstance.delete(`${PRODUCT}/delete/${id}`),
};

export default productApi;
