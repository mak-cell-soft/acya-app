import api from '@/lib/axios';

export const personService = {
  add: async (model: any) => {
    const response = await api.post('/Person/Add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Person');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/Person/${id}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Person/${id}`, model);
    return response.data;
  },

  deleteSoft: async (id: number) => {
    const response = await api.delete(`/Person/DeleteSoft/${id}`);
    return response.data;
  }
};
