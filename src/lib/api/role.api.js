import axiosInstance from './axiosInstance';

const roleApi = {
  getRoles: () => axiosInstance.get('/roles'),
  getRoleUsers: (id) => axiosInstance.get(`/roles/${id}/users`),
  getPermissions: () => axiosInstance.get('/roles/permissions'),
  createRole: (payload) => axiosInstance.post('/roles', payload),
  updateRole: (id, payload) => axiosInstance.put(`/roles/${id}`, payload),
  deleteRole: (id) => axiosInstance.delete(`/roles/${id}`),
};

export default roleApi;
