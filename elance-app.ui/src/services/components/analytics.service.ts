import api from '@/lib/axios';
import {
  DashboardKpiDto,
  MonthlyRevenueDto,
  TopSubCategoryDto,
  SubCategoryStockHealthDto,
  UnsoldMerchandiseParams,
  UnsoldMerchandiseResponseDto,
} from '@/types/analytics';

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
  },

  getUnsoldMerchandise: async (params: UnsoldMerchandiseParams = {}): Promise<UnsoldMerchandiseResponseDto> => {
    const response = await api.get('/Analytics/unsold-merchandise', {
      params: {
        months: params.months ?? 6,
        siteId: params.siteId,
        categoryId: params.categoryId,
        subCategoryId: params.subCategoryId,
        onlyWithStock: params.onlyWithStock ?? true,
        excludeNewArticles: params.excludeNewArticles ?? true,
        gracePeriodDays: params.gracePeriodDays ?? 30,
        inactivityType: params.inactivityType,
        search: params.search || undefined,
        sortBy: params.sortBy ?? 'stockValue',
        sortDirection: params.sortDirection ?? 'desc',
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        exportAll: params.exportAll ?? false,
      }
    });
    return response.data;
  }
};
