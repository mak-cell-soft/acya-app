import api from '@/lib/axios';

export const accountService = {
  registerEmployee: async (model: any) => {
    const response = await api.post('/Account/register', model);
    return response.data;
  },

  getProfile: async (id: number) => {
    const response = await api.get(`/Account/profile/${id}`);
    return response.data;
  },

  updateProfile: async (model: any) => {
    const response = await api.put('/Account/update-profile', model);
    return response.data;
  },

  updatePassword: async (model: any) => {
    const response = await api.put('/Account/update-password', model);
    return response.data;
  }
};
