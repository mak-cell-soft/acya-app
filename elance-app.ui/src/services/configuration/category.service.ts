import api from '@/lib/axios';

export const categoryService = {
  add: async (model: any) => {
    const response = await api.post('/Category/Add', model);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Category/${id}`, model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Category');
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Category/${id}`);
    return response.data;
  }
};
