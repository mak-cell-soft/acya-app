import api from '@/lib/axios';

export enum NotificationType {
  Info = 1,
  Success = 2,
  Warning = 3,
  Error = 4
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
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
