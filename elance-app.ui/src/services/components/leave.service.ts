import api from '@/lib/axios';

export const leaveService = {
  getAll: async () => {
    const response = await api.get('/Leave');
    return response.data;
  },

  getByEmployee: async (employeeId: number) => {
    const response = await api.get(`/Leave/Employee/${employeeId}`);
    return response.data;
  },

  add: async (leave: any) => {
    const response = await api.post('/Leave', leave);
    return response.data;
  },

  update: async (id: number, leave: any) => {
    const response = await api.put(`/Leave/${id}`, leave);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Leave/${id}`);
    return response.data;
  }
};
