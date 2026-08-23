import axiosInstance from './axiosInstance';

const payrollApi = {
  getMonthlyPayroll: (params) => axiosInstance.get('/payroll/monthly', { params }),
};

export default payrollApi;
