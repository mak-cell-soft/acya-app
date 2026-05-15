import api from '@/lib/axios';

export const transporterService = {
  add: async (model: any) => {
    const response = await api.post('/Transporter/Add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Transporter');
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Transporter/${id}`);
    return response.data;
  }
};
