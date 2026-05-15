import api from '@/lib/axios';

export const appVariableService = {
  addAppVariable: async (model: any) => {
    const response = await api.post('/AppVariable/Add', model);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/AppVariable/${id}`, model);
    return response.data;
  },

  getAll: async (nature: string) => {
    const response = await api.get(`/AppVariable/getall/${nature}`);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/AppVariable/${id}`);
    return response.data;
  }
};
