import api from '@/lib/axios';
import { useAuthStore } from '@/store/use-auth-store';
import { PagedStockTransfersResponse, StockTransferSearchParams } from '@/types/stock';

export const stockService = {
  getAll: async () => {
    const response = await api.get('/Stock');
    return response.data;
  },

  getBySite: async (model: any) => {
    const response = await api.post('/Stock/GetBySite', model);
    return response.data;
  },

  getStockById: async (id: number) => {
    const response = await api.get(`/Stock/${id}`);
    return response.data;
  },

  createTransaction: async (model: any) => {
    const response = await api.post('/Stock/transactions', model);
    return response.data;
  },

  updateStock: async (id: number, model: any) => {
    const response = await api.put(`/Stock/${id}`, model);
    return response.data;
  },

  transferStock: async (model: any) => {
    const response = await api.post('/Stock/process-transfer', model);
    return response.data;
  },

  getStockTransfers: async (siteId?: string) => {
    const finalSiteId = siteId || useAuthStore.getState().user?.defaultSiteId;
    const response = await api.get('/Stock/transfers/infos', {
      params: { siteId: finalSiteId }
    });
    return response.data;
  },

  searchStockTransfers: async (params: StockTransferSearchParams = {}): Promise<PagedStockTransfersResponse> => {
    const user = useAuthStore.getState().user;
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === '10' || user?.role === '20';
    const queryParams: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };

    if (params.siteId !== undefined && params.siteId !== '') {
      queryParams.siteId = params.siteId;
    } else if (!isAdmin && user?.defaultSiteId) {
      queryParams.siteId = user.defaultSiteId;
    }

    if (params.reference && params.reference.trim()) {
      queryParams.reference = params.reference.trim();
    }
    if (params.status !== undefined && params.status !== '') {
      queryParams.status = params.status;
    }
    if (params.fromDate) {
      queryParams.fromDate = params.fromDate;
    }
    if (params.toDate) {
      queryParams.toDate = params.toDate;
    }
    if (params.olderPendingOnly) {
      queryParams.olderPendingOnly = true;
      queryParams.olderThanDays = params.olderThanDays ?? 30;
    }

    const response = await api.get<PagedStockTransfersResponse>('/Stock/transfers/search', {
      params: queryParams,
    });
    return response.data;
  },

  getStockTransferById: async (id: number) => {
    const response = await api.get(`/Stock/transfers/${id}`);
    return response.data;
  },

  getStockTransferDetails: async (originDoc?: string, receiptDoc?: string) => {
    const response = await api.get('/Stock/transfers/details', {
      params: { originDoc, receiptDoc }
    });
    return response.data;
  },

  confirmTransfer: async (transferId: number, confirmationCode: string, comment: string) => {
    const userId = useAuthStore.getState().user?.id;
    const response = await api.post(`/Stock/confirm-transfer/${transferId}`, {
      confirmedByUserId: userId,
      confirmationCode,
      comment
    });
    return response.data;
  },

  rejectTransfer: async (transferId: number, comment: string) => {
    const userId = useAuthStore.getState().user?.id;
    const response = await api.post(`/Stock/reject-transfer/${transferId}`, {
      rejectedByUserId: userId,
      comment
    });
    return response.data;
  },

  updateTransfer: async (transferId: number, model: any) => {
    const userId = useAuthStore.getState().user?.id;
    const response = await api.put(`/Stock/transfers/${transferId}`, {
      ...model,
      updatedByUserId: userId
    });
    return response.data;
  },

  resendTransfer: async (transferId: number, model: any) => {
    const userId = useAuthStore.getState().user?.id;
    const response = await api.post(`/Stock/transfers/${transferId}/resend`, {
      ...model,
      updatedByUserId: userId
    });
    return response.data;
  },

  getWoodStockWithLengthDetails: async (woodParams: any) => {
    const response = await api.post('/Stock/wood/details', woodParams);
    return response.data;
  },

  updateMinimumStock: async (stockId: number, minimumStock: number) => {
    const response = await api.put(`/Stock/${stockId}/minimum`, minimumStock);
    return response.data;
  },

  getStockAlerts: async (siteId?: number) => {
    const response = await api.get('/Stock/alerts', {
      params: { siteId }
    });
    return response.data;
  },

  getStockDashboardStats: async (siteId?: number) => {
    const response = await api.get('/Stock/dashboard-stats', {
      params: { siteId }
    });
    return response.data;
  },

  getValuation: async (year?: number) => {
    const response = await api.get('/Stock/valuation', {
      params: { year }
    });
    return response.data;
  }
};
