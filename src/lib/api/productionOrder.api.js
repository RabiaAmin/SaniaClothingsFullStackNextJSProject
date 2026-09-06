import axiosInstance from './axiosInstance';

const PRODUCTION_ORDERS = '/production-orders';

const productionOrderApi = {
  getProductionOrders: (params) => axiosInstance.get(PRODUCTION_ORDERS, { params }),
  getAssignableWorkers: () => axiosInstance.get(`${PRODUCTION_ORDERS}/eligible-workers`),
  getProductionOrder: (id) => axiosInstance.get(`${PRODUCTION_ORDERS}/${id}`),
  createProductionOrder: (payload) => axiosInstance.post(PRODUCTION_ORDERS, payload),
  updateProductionOrder: (id, payload) => axiosInstance.put(`${PRODUCTION_ORDERS}/${id}`, payload),
  updateStatus: (id, status) =>
    axiosInstance.patch(`${PRODUCTION_ORDERS}/${id}/status`, { status }),
  deleteProductionOrder: (id) => axiosInstance.delete(`${PRODUCTION_ORDERS}/${id}`),
};

export default productionOrderApi;
