import api from '@/lib/axios';

export const bankService = {
  addBank: async (model: any) => {
    const response = await api.post('/Bank/Add', model);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Bank/${id}`, model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Bank');
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Bank/${id}`);
    return response.data;
  }
};
