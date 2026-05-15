import api from '@/lib/axios';

export const advanceService = {
  getAll: async () => {
    const response = await api.get('/Advance');
    return response.data;
  },

  getByEmployee: async (employeeId: number) => {
    const response = await api.get(`/Advance/Employee/${employeeId}`);
    return response.data;
  },

  add: async (advance: any) => {
    const response = await api.post('/Advance', advance);
    return response.data;
  },

  update: async (id: number, advance: any) => {
    const response = await api.put(`/Advance/${id}`, advance);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Advance/${id}`);
    return response.data;
  }
};
