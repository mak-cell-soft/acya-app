import api from '@/lib/axios';

export const counterpartService = {
  getSupplierDashboard: async (id: number) => {
    const response = await api.get(`/CounterPart/${id}/supplier-dashboard`);
    return response.data;
  },

  add: async (model: any) => {
    const response = await api.post('/CounterPart/Add', model);
    return response.data;
  },

  getAll: async (type: string) => {
    const response = await api.get(`/CounterPart/GetAll/${type}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/CounterPart/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/CounterPart/DeleteSoft/${id}`);
    return response.data;
  }
};
