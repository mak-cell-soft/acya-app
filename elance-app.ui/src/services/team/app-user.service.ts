import api from '@/lib/axios';

export const appUserService = {
  getAll: async () => {
    const response = await api.get('/AppUser');
    return response.data;
  },

  create: async (model: any) => {
    const response = await api.post('/Account/register', model);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/AppUser/id?id=${id}`);
    return response.data;
  },

  getDetails: async (id: number) => {
    const response = await api.get(`/AppUser/detail?_id=${id}`);
    return response.data;
  },

  getSite: async (id: number) => {
    const response = await api.get(`/AppUser/getsite/${id}`);
    return response.data;
  },

  getStringSite: async (id: number) => {
    const response = await api.get(`/AppUser/getstringsite/${id}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/AppUser/${id}`, model);
    return response.data;
  }
};
