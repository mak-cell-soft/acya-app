import api from '@/lib/axios';
import { useAuthStore } from '@/store/use-auth-store';

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
  }
};
