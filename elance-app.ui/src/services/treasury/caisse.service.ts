import api from '@/lib/axios';

export const caisseService = {
  getSiteBalance: async (siteId: number) => {
    const response = await api.get(`/Caisse/site/${siteId}`);
    return response.data;
  },

  getAllBalances: async () => {
    const response = await api.get('/Caisse/all');
    return response.data;
  },

  getCaissePrincipaleBalance: async () => {
    const response = await api.get('/Caisse/principale/balance');
    return response.data;
  },

  addMovement: async (movement: any) => {
    const response = await api.post('/Caisse/movement', movement);
    return response.data;
  },

  getMovements: async (siteId: number, count: number = 100, date?: Date) => {
    const params: any = { count };
    if (date) {
      params.date = date.toISOString().split('T')[0];
    }
    const response = await api.get(`/Caisse/movements/${siteId}`, { params });
    return response.data;
  },

  getApproLimit: async (siteId: number) => {
    const response = await api.get(`/Caisse/appro-limit/${siteId}`);
    return response.data;
  },

  deleteMovement: async (id: number) => {
    const response = await api.delete(`/Caisse/movement/${id}`);
    return response.data;
  }
};
