import api from '@/lib/axios';

export const inventoryService = {
  getAll: async () => {
    const response = await api.get('/Inventory');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/Inventory/${id}`);
    return response.data;
  },

  add: async (model: any) => {
    const response = await api.post('/Inventory', model);
    return response.data;
  },

  update: async (id: number, model: any) => {
    const response = await api.put(`/Inventory/${id}`, model);
    return response.data;
  },

  validate: async (id: number) => {
    const response = await api.put(`/Inventory/${id}/validate`, {});
    return response.data;
  }
};
