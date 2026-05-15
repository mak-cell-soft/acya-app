import api from '@/lib/axios';

export const adminDashService = {
  getCustomerBalances: async () => {
    const response = await api.get('/AdminDash/customer-balances');
    return response.data;
  },

  getSupplierBalances: async () => {
    const response = await api.get('/AdminDash/supplier-balances');
    return response.data;
  },

  refreshBalances: async () => {
    const response = await api.post('/AdminDash/refresh-balances', {});
    return response.data;
  },

  exportReport: async (type: string, format: string, filters: any) => {
    const params: any = { format };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.salesSiteId) params.salesSiteId = filters.salesSiteId;

    const response = await api.get(`/Reports/${type}/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  getRecentAuditLogs: async (count: number = 50, userName?: string, date?: string) => {
    const params: any = { count };
    if (userName) params.userName = userName;
    if (date) params.date = date;
    const response = await api.get('/Audit/recent', { params });
    return response.data;
  }
};
