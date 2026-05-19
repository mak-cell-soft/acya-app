import api from '@/lib/axios';

export const merchandiseService = {
  getMerchandiseReferenceAsString: async (id: number) => {
    const response = await api.get(`/Merchandise/getref/${id}`, {
      responseType: 'text'
    });
    // Sanitize the response to strip any double quotes
    return typeof response.data === 'string' 
      ? response.data.replace(/"/g, '').trim() 
      : response.data;
  },

  getAll: async () => {
    const response = await api.get('/Merchandise');
    return response.data;
  }
};
