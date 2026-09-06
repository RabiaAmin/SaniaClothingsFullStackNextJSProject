import axiosInstance from './axiosInstance';

const payrollApi = {
  getPayroll: (params) => axiosInstance.get('/payroll/range', { params }),
  getPayrollPdfData: (params) => axiosInstance.get('/payroll/pdf', { params }),
  getMonthlyPayroll: (params) => axiosInstance.get('/payroll/monthly', { params }),
};

export default payrollApi;
