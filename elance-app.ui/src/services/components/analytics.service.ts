import api from '@/lib/axios';
import { DashboardKpiDto, MonthlyRevenueDto } from '@/types/analytics';

export const analyticsService = {
  getDashboardKpis: async (enterpriseId?: string): Promise<DashboardKpiDto> => {
    const response = await api.get('/Analytics/dashboard', {
      params: { enterpriseId }
    });
    return response.data;
  },

  getMonthlyRevenue: async (months: number = 6): Promise<MonthlyRevenueDto[]> => {
    const response = await api.get('/Analytics/monthly-revenue', {
      params: { months }
    });
    return response.data;
  }
};
