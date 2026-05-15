import api from '@/lib/axios';

export const salesSitesService = {
  add: async (model: any) => {
    const response = await api.post('/SalesSites/add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/SalesSites');
    return response.data;
  }
};
