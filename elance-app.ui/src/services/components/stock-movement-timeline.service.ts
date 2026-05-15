import api from '@/lib/axios';

export const stockMovementTimelineService = {
  getTimeline: async (merchandiseId: number, salesSiteId: number, from?: Date, to?: Date) => {
    const response = await api.get('/StockMovement/timeline', {
      params: {
        merchandiseId,
        salesSiteId,
        from: from?.toISOString(),
        to: to?.toISOString()
      }
    });
    return response.data;
  },

  getTimelineByPackage: async (packageNumber: string, salesSiteId: number, from?: Date, to?: Date) => {
    const response = await api.get('/StockMovement/timeline/by-package', {
      params: {
        packageNumber,
        salesSiteId,
        from: from?.toISOString(),
        to: to?.toISOString()
      }
    });
    return response.data;
  },

  getSummary: async (merchandiseId: number, salesSiteId: number) => {
    const response = await api.get('/StockMovement/summary', {
      params: { merchandiseId, salesSiteId }
    });
    return response.data;
  },

  reconcile: async (merchandiseId: number, salesSiteId: number) => {
    const response = await api.get('/StockMovement/reconcile', {
      params: { merchandiseId, salesSiteId }
    });
    return response.data;
  },

  getSites: async () => {
    const response = await api.get('/StockMovement/sites');
    return response.data;
  }
};
