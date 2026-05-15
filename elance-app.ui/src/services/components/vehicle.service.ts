import api from '@/lib/axios';

export const vehicleService = {
  getAll: async (isowned?: boolean) => {
    const response = await api.get('/Vehicle', {
      params: { isowned }
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/Vehicle/${id}`);
    return response.data;
  },

  add: async (vehicle: any) => {
    const response = await api.post('/Vehicle/Add', vehicle);
    return response.data;
  },

  update: async (vehicle: any) => {
    const response = await api.put('/Vehicle/Update', vehicle);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Vehicle/${id}`);
    return response.data;
  }
};
