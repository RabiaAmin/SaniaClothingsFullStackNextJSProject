import axiosInstance from './axiosInstance';

const PRODUCTION_ENTRIES = '/production-entries';

const productionEntryApi = {
  getProductionEntries: (params) => axiosInstance.get(PRODUCTION_ENTRIES, { params }),
  getProductionEntry: (id) => axiosInstance.get(`${PRODUCTION_ENTRIES}/${id}`),
  createProductionEntry: (payload) => axiosInstance.post(PRODUCTION_ENTRIES, payload),
  updateProductionEntry: (id, payload) => axiosInstance.put(`${PRODUCTION_ENTRIES}/${id}`, payload),
  approveProductionEntry: (id, reviewNotes) =>
    axiosInstance.patch(`${PRODUCTION_ENTRIES}/${id}/approve`, { reviewNotes }),
  rejectProductionEntry: (id, reviewNotes) =>
    axiosInstance.patch(`${PRODUCTION_ENTRIES}/${id}/reject`, { reviewNotes }),
};

export default productionEntryApi;
