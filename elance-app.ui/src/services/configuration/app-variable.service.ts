import api from '@/lib/axios';

export const appVariableService = {
  addAppVariable: async (model: any) => {
    const response = await api.post('/AppVariable/Add', model);
    return response.data;
  },

  upsertDailyCeiling: async (date: string, amount: string) => {
    const response = await api.post('/AppVariable/daily-ceiling', {
      name: date,
      value: amount,
      nature: 'DailyInvoiceCeiling',
      isactive: true
    });
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
  },

  getImpression: async () => {
    const response = await api.get('/AppVariable/impression');
    return response.data;
  },

  saveImpression: async (data: any) => {
    const response = await api.put('/AppVariable/impression', data);
    return response.data;
  }
};
