import api from '@/lib/axios';

export const appUserService = {
  getAll: async () => {
    const response = await api.get('/AppUser');
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/AppUser/${id}`, model);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/AppUser/DeleteSoft/${id}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/AppUser/${id}`);
    return response.data;
  },

  getSalesSite: async (id: number) => {
    const response = await api.get(`/AppUser/getsite/${id}`);
    return response.data;
  },

  getConnectedUserSalesSiteAsString: async (id: number) => {
    const response = await api.get(`/AppUser/getstringsite/${id}`, {
      responseType: 'text'
    });
    return response.data;
  }
};
