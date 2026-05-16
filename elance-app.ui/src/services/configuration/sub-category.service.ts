import api from '@/lib/axios';

export const subCategoryService = {
  put: async (id: number, model: any) => {
    const response = await api.put(`/FirstChild/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/FirstChild/${id}`);
    return response.data;
  },

  add: async (model: any) => {
    const response = await api.post('/FirstChild', model);
    return response.data;
  }
};
