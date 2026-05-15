import api from '@/lib/axios';

export const analyticsService = {
  getDashboardKpis: async (enterpriseId?: string) => {
    const response = await api.get('/Analytics/dashboard', {
      params: { enterpriseId }
    });
    return response.data;
  }
};
