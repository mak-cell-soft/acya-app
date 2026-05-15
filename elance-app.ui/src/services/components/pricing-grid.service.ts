import api from '@/lib/axios';

export const pricingGridService = {
  getForCounterPart: async (counterPartId: number) => {
    const response = await api.get(`/PricingGrid/${counterPartId}`);
    return response.data;
  },

  getLookup: async (counterPartId: number) => {
    const response = await api.get(`/PricingGrid/${counterPartId}/lookup`);
    return response.data;
  },

  create: async (grid: any) => {
    const response = await api.post('/PricingGrid', grid);
    return response.data;
  },

  update: async (id: number, grid: any) => {
    const response = await api.put(`/PricingGrid/${id}`, grid);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/PricingGrid/${id}`);
    return response.data;
  }
};
