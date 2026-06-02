import api from '@/lib/axios';
import { DashboardKpiDto, MonthlyRevenueDto, TopSubCategoryDto, SubCategoryStockHealthDto } from '@/types/analytics';

export const analyticsService = {
  getDashboardKpis: async (enterpriseId?: string, month?: number, year?: number): Promise<DashboardKpiDto> => {
    const response = await api.get('/Analytics/dashboard', {
      params: { enterpriseId, month, year }
    });
    return response.data;
  },

  getMonthlyRevenue: async (months: number = 6): Promise<MonthlyRevenueDto[]> => {
    const response = await api.get('/Analytics/monthly-revenue', {
      params: { months }
    });
    return response.data;
  },

  getTopSubCategories: async (months: number = 6): Promise<TopSubCategoryDto[]> => {
    const response = await api.get('/Analytics/top-subcategories', {
      params: { months }
    });
    return response.data;
  },

  getStockHealthBySubCategory: async (siteId?: number): Promise<SubCategoryStockHealthDto[]> => {
    const response = await api.get('/Analytics/stock-health', {
      params: { siteId }
    });
    return response.data;
  }
};
