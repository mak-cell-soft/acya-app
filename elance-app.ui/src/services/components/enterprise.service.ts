import api from '@/lib/axios';

export const enterpriseService = {
  register: async (model: any) => {
    const response = await api.post('/Enterprise/register', model);
    return response.data;
  },

  getEnterpriseInfo: async (id: number) => {
    const response = await api.get(`/Enterprise/getbyid/${id}`);
    return response.data;
  },

  getEnterprise: async () => {
    // Usually the app handles one enterprise, we'll fetch ID 1 as default
    const response = await api.get('/Enterprise/getbyid/1');
    return response.data;
  },

  update: async (id: number, model: any) => {
    const response = await api.put(`/Enterprise/${id}`, model);
    return response.data;
  }
};
