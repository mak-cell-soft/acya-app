import api from '@/lib/axios';

export enum NotificationType {
  Info = 0,
  Warning = 1,
  Alert = 2,
  Success = 3,
  Email = 4
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface TransferNotification {
  id: number;
  transferRef: string;
  originSite: number;
  date: Date;
  itemsCount: number;
  exitDocNumber: string;
  receiptDocNumber: string;
  destinationSiteId: number;
}

export const notificationService = {
  retryFailedNotifications: async () => {
    const response = await api.post('/notifications/retry-failed', {}, {
      responseType: 'text'
    });
    return response.data;
  },

  getMissedNotifications: async (userId: string) => {
    const response = await api.get(`/stock/notifications/missed`, {
      params: { userId }
    });
    return response.data;
  },

  fetchUnreads: async () => {
    const response = await api.get('/notifications/unreads');
    return response.data;
  },

  fetchHistory: async (limit = 50) => {
    try {
      const response = await api.get('/notifications/history', { params: { limit } });
      return response.data;
    } catch {
      const fallback = await api.get('/notifications/unreads');
      return fallback.data;
    }
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`, {});
    return response.data;
  },

  dismissNotification: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  fetchStockAlerts: async (siteId?: number) => {
    const response = await api.get('/stock/alerts', {
      params: { siteId }
    });
    return response.data;
  }
};
