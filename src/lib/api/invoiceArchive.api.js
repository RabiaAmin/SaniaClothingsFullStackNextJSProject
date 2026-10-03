import axiosInstance from './axiosInstance';

const BASE = '/invoice-archives';

const invoiceArchiveApi = {
  getDriveStatus: () => axiosInstance.get(`${BASE}/google/status`),
  connectDrive: () => axiosInstance.post(`${BASE}/google/connect`),
  disconnectDrive: () => axiosInstance.delete(`${BASE}/google/connection`),
  getEligible: (params) => axiosInstance.get(`${BASE}/eligible`, { params }),
  createArchive: (idempotencyKey) =>
    axiosInstance.post(
      `${BASE}`,
      { idempotencyKey },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    ),
  getJobs: (params) => axiosInstance.get(BASE, { params }),
  getJob: (id) => axiosInstance.get(`${BASE}/${id}`),
  confirmDeletion: (id, archiveId) =>
    axiosInstance.post(`${BASE}/${id}/confirm-deletion`, { archiveId, confirmation: 'DELETE' }),
};

export default invoiceArchiveApi;
