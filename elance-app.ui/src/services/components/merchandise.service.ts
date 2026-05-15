import api from '@/lib/axios';

export const merchandiseService = {
  getMerchandiseReferenceAsString: async (id: number) => {
    const response = await api.get(`/Merchandise/getref/${id}`, {
      responseType: 'text'
    });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Merchandise');
    return response.data;
  }
};
