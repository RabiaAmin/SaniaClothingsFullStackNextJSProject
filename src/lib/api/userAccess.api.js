import axiosInstance from './axiosInstance';

const userAccessApi = {
  getUsers: () => axiosInstance.get('/users'),
  createUser: (payload) => axiosInstance.post('/users', payload),
  updateAccess: (id, payload) => axiosInstance.put(`/users/${id}/access`, payload),
};

export default userAccessApi;
