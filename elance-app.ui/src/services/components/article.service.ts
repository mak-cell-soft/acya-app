import api from '@/lib/axios';

export const articleService = {
  addArticle: async (model: any) => {
    const response = await api.post('/Article/Add', model);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Article');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/Article/${id}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Article/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Article/DeleteSoft/${id}`);
    return response.data;
  },

  getLastPurchasePrice: async (id: number) => {
    const response = await api.get(`/Article/LastPurchasePrice/${id}`);
    return response.data;
  },

  getPurchaseHistory: async (id: number) => {
    const response = await api.get(`/Article/${id}/purchase-history`);
    return response.data;
  },

  getSalesHistory: async (id: number) => {
    const response = await api.get(`/Article/${id}/sales-history`);
    return response.data;
  },

  getCatalogHistory: async (id: number) => {
    const response = await api.get(`/Article/${id}/catalog-history`);
    return response.data;
  }
};
