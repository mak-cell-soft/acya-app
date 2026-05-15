import api from '@/lib/axios';

export const customerService = {
  addProvider: async (model: any) => {
    const response = await api.post('/Provider/Add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Provider');
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Provider/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Provider/DeleteSoft/${id}`);
    return response.data;
  }
};
