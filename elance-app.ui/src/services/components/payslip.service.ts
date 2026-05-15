import api from '@/lib/axios';

export const payslipService = {
  getAll: async () => {
    const response = await api.get('/Payslip');
    return response.data;
  },

  getByEmployee: async (employeeId: number) => {
    const response = await api.get(`/Payslip/Employee/${employeeId}`);
    return response.data;
  },

  generate: async (payslip: any) => {
    const response = await api.post('/Payslip', payslip);
    return response.data;
  },

  downloadPdf: async (id: number) => {
    const response = await api.get(`/Payslip/Download/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
