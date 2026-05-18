'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/store/use-auth-store';
import { notificationService, TransferNotification, AppNotification, NotificationType } from '@/services/components/notification.service';
import { toast } from 'sonner';

interface NotificationContextProps {
  notifications: TransferNotification[];
  systemNotifications: AppNotification[];
  stockAlerts: any[];
  unreadCount: number;
  isConnected: boolean;
  dismissNotification: (id: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  fetchMissedNotifications: () => Promise<void>;
  refreshAll: () => Promise<void>;
  openTransferConfirmDialog: (transfer: TransferNotification) => void;
  selectedTransferForConfirm: TransferNotification | null;
  setSelectedTransferForConfirm: (transfer: TransferNotification | null) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<AppNotification[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTransferForConfirm, setSelectedTransferForConfirm] = useState<TransferNotification | null>(null);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);

  // Read count computed dynamically
  const unreadCount = systemNotifications.filter(n => !n.isRead).length + notifications.length + stockAlerts.length;

  const openTransferConfirmDialog = (transfer: TransferNotification) => {
    setSelectedTransferForConfirm(transfer);
  };

  // Helper to fetch missed notifications
  const fetchMissedNotifications = async () => {
    if (!user?.id) return;
    try {
      const missed = await notificationService.getMissedNotifications(user.id);
      console.log('[SignalR] Missed Notifications Loaded:', missed);
      if (missed && missed.length > 0) {
        // Map raw data from missed content JSON if needed
        const mapped: TransferNotification[] = missed.map((item: any) => {
          try {
            const content = JSON.parse(item.content);
            let additionalData = content.AdditionalData;
            if (typeof additionalData === 'string') {
              try { additionalData = JSON.parse(additionalData); } catch {}
            }
            return {
              id: content.TransferId || item.id,
              transferRef: content.Reference || 'Transfert',
              originSite: content.OriginSite || 0,
              date: new Date(item.createdAt),
              itemsCount: content.ItemsCount || 0,
              exitDocNumber: additionalData?.ExitDocNumber || '',
              receiptDocNumber: additionalData?.ReceiptDocNumber || '',
              destinationSiteId: Number(item.targetGroup)
            };
          } catch (e) {
            console.error('[SignalR] Failed to parse missed item content:', item, e);
            return null;
          }
        }).filter((n: any) => n !== null) as TransferNotification[];

        setNotifications(prev => {
          // Merge unique only
          const merged = [...prev];
          mapped.forEach(item => {
            if (!merged.some(x => x.id === item.id)) {
              merged.push(item);
            }
          });
          return merged;
        });

        toast.info(`${mapped.length} notification(s) de transferts manquée(s) récupérée(s)`);
      }
    } catch (error) {
      console.error('[SignalR] Failed to fetch missed notifications:', error);
    }
  };

  // Fetch unreads and stock alerts
  const refreshAll = async () => {
    if (!isAuthenticated) return;
    try {
      const unreads = await notificationService.fetchUnreads();
      setSystemNotifications(unreads || []);

      const alerts = await notificationService.fetchStockAlerts(user?.defaultSiteId ? Number(user.defaultSiteId) : undefined);
      setStockAlerts(alerts || []);
    } catch (error) {
      console.error('[SignalR] Failed to refresh dynamic notifications data:', error);
    }
  };

  // Action methods
  const dismissNotification = async (id: number) => {
    try {
      await notificationService.dismissNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('[SignalR] Dismiss notification error:', error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setSystemNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('[SignalR] Mark notification as read error:', error);
    }
  };

  // SignalR Lifecycle Setup
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Cleanup existing connection if logged out
      if (hubConnectionRef.current) {
        console.log('[SignalR] Disconnecting hub...');
        hubConnectionRef.current.stop();
        hubConnectionRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:44306/api/';
    const hubUrl = apiUrl.endsWith('/')
      ? `${apiUrl}notificationHub`
      : `${apiUrl}/notificationHub`;

    console.log('[SignalR] Rebuilding connection to:', hubUrl);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          return retryContext.previousRetryCount === 0 ? 5000 : null;
        }
      })
      .build();

    // Register event listeners
    connection.on('ReceiveTransferNotification', (transfer: any) => {
      console.log('[SignalR] ReceiveTransferNotification:', transfer);
      
      // Target Check
      if (user?.defaultSiteId && transfer.destinationSiteId) {
        if (Number(user.defaultSiteId) !== Number(transfer.destinationSiteId)) {
          console.log(`[SignalR] Notification ignored: Targeted to site ${transfer.destinationSiteId} but current user is at site ${user.defaultSiteId}`);
          return;
        }
      }

      const mapped: TransferNotification = {
        id: transfer.transferId,
        transferRef: transfer.reference,
        originSite: transfer.originSite,
        date: new Date(),
        itemsCount: transfer.itemsCount || 0,
        exitDocNumber: transfer.exitDocNumber,
        receiptDocNumber: transfer.receiptDocNumber,
        destinationSiteId: transfer.destinationSiteId
      };

      setNotifications(prev => [
        ...prev.filter(n => n.id !== mapped.id),
        mapped
      ]);

      // Pop toast action
      toast.custom((t) => (
        <div className="flex w-full max-w-md items-center justify-between rounded-xl border border-forest-800/10 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:bg-zinc-950">
          <div className="flex-1">
            <h4 className="font-semibold text-forest-800 dark:text-forest-400">Nouveau transfert de stock</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Voucher : <span className="font-mono text-zinc-800 dark:text-zinc-300">{mapped.transferRef}</span> ({mapped.itemsCount} articles)</p>
          </div>
          <div className="ml-4 flex shrink-0 gap-2">
            <button
              onClick={() => {
                toast.dismiss(t);
                openTransferConfirmDialog(mapped);
              }}
              className="rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-forest-700 transition"
            >
              Voir
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      ), { duration: 8000 });
    });

    connection.on('ReceiveStockAlert', (alert: any) => {
      console.log('[SignalR] ReceiveStockAlert:', alert);
      const normalized = {
        articleReference: alert.articleReference || alert.ArticleReference,
        quantity: alert.quantity !== undefined ? alert.quantity : (alert.Quantity !== undefined ? alert.Quantity : alert.stockQuantity),
        minimumStock: alert.minimumStock || alert.MinimumStock,
        siteId: alert.siteId || alert.SiteId
      };

      setStockAlerts(prev => [
        ...prev.filter(a => a.articleReference !== normalized.articleReference),
        normalized
      ]);

      toast.warning(`Alerte stock bas : ${normalized.articleReference} (Stock actuel : ${normalized.quantity})`);
    });

    connection.on('ReceiveSystemNotification', (notif: any) => {
      console.log('[SignalR] ReceiveSystemNotification:', notif);
      const appNotif: AppNotification = {
        id: notif.id,
        title: notif.title || 'Notification Système',
        message: notif.message,
        type: notif.type || NotificationType.Info,
        createdAt: notif.createdAt || new Date().toISOString(),
        isRead: false
      };

      setSystemNotifications(prev => [appNotif, ...prev]);

      switch (appNotif.type) {
        case NotificationType.Success:
          toast.success(appNotif.message, { description: appNotif.title });
          break;
        case NotificationType.Warning:
          toast.warning(appNotif.message, { description: appNotif.title });
          break;
        case NotificationType.Error:
          toast.error(appNotif.message, { description: appNotif.title });
          break;
        default:
          toast.info(appNotif.message, { description: appNotif.title });
          break;
      }
    });

    connection.on('NotificationDeleted', (data: any) => {
      setNotifications(prev => prev.filter(n => n.id !== data.id));
    });

    connection.onclose(() => {
      console.log('[SignalR] Connection closed.');
      setIsConnected(false);
    });

    // Start Hub Connection
    const startHub = async () => {
      try {
        await connection.start();
        console.log('[SignalR] Connection Established successfully.');
        setIsConnected(true);
        hubConnectionRef.current = connection;

        // Join default site group room for notifications matching this user site
        const siteIdentifier = user?.defaultSiteId || user?.defaultSite;
        if (siteIdentifier) {
          console.log('[SignalR] Joining site notification group:', siteIdentifier);
          await connection.invoke('JoinGroup', siteIdentifier.toString());
        }
      } catch (err) {
        console.error('[SignalR] Connection error on startup:', err);
      }
    };

    startHub();

    // Trigger initial data recovery
    refreshAll();
    fetchMissedNotifications();

    return () => {
      if (connection) {
        connection.stop();
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token, user?.defaultSiteId]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      systemNotifications,
      stockAlerts,
      unreadCount,
      isConnected,
      dismissNotification,
      markAsRead,
      fetchMissedNotifications,
      refreshAll,
      openTransferConfirmDialog,
      selectedTransferForConfirm,
      setSelectedTransferForConfirm
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
