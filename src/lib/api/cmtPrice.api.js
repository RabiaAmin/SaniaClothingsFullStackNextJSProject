import axiosInstance from './axiosInstance';

const CMT_PRICES = '/cmt-prices';

const cmtPriceApi = {
  getCmtPrices: () => axiosInstance.get(CMT_PRICES),
  lookupPrice: (itemCode, usage) =>
    axiosInstance.get(`${CMT_PRICES}/lookup/${encodeURIComponent(itemCode)}`, {
      params: { usage },
    }),
  createCmtPrice: (payload) => axiosInstance.post(CMT_PRICES, payload),
  updateCmtPrice: (id, payload) => axiosInstance.put(`${CMT_PRICES}/${id}`, payload),
  deleteCmtPrice: (id) => axiosInstance.delete(`${CMT_PRICES}/${id}`),
};

export default cmtPriceApi;
