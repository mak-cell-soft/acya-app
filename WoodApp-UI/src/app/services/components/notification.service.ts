// notification.service.ts
import { Injectable, OnDestroy, OnInit } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable, Subject } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy, OnInit {
  private hubConnection!: signalR.HubConnection;
  private notifications: TransferNotification[] = [];
  private destroy$ = new Subject<void>();
  private isManualReconnect = false;

  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthenticationService,
    private http: HttpClient
  ) {
    this.initializeConnection();
  }

  ngOnInit(): void {
    //this.startDebugMonitor();
  }

  retryFailedNotifications(): Observable<any> {
    return this.http.post(
      `${environment.apiBaseUrl}/api/notifications/retry-failed`,
      {},
      {
        observe: 'response', // Get full response
        responseType: 'text' // Handle both JSON and text
      }
    ).pipe(
      map(response => {
        try {
          // Try to parse as JSON
          return JSON.parse(response.body || '');
        } catch {
          // Return as text if not JSON
          return response.body;
        }
      })
    );
  }


  retryFailedNotifications1(): Observable<string> {
    return this.http.post(
      `${environment.apiBaseUrl}/api/notifications/retry-failed`,
      {},
      { responseType: 'text' } // Explicitly expect text response
    );
  }

  getMissedNotifications(): Observable<TransferNotification[]> {
    const now = new Date();
    now.setDate(now.getDate() - 7); // Look back 7 days
    const since = now.toISOString();


    let user = this.authService.getUserDetail();
    return this.http.get<any[]>(`${environment.apiBaseUrl}/api/stock/notifications/missed?userId=${user!.id}`)
      .pipe(
        map(pendingItems => {
          return pendingItems.map(item => {
            try {
              // item.content is a JSON string containing the NotificationDto
              const content = JSON.parse(item.content);
              // NotificationDto has AdditionalData string/object
              let additionalData = content.AdditionalData;
              // Sometimes AdditionalData might be a JSON string itself depending on serialization depth
              if (typeof additionalData === 'string') {
                try { additionalData = JSON.parse(additionalData); } catch { }
              }

              return {
                id: content.TransferId, // Use TransferId as the ID for client logic
                transferRef: content.Reference,
                originSite: content.OriginSite, // This might be address string
                date: new Date(item.createdAt),
                itemsCount: content.ItemsCount,
                exitDocNumber: additionalData?.ExitDocNumber,
                receiptDocNumber: additionalData?.ReceiptDocNumber,
                destinationSiteId: Number(item.targetGroup) // targetGroup stores the Site ID
              } as TransferNotification;
            } catch (e) {
              console.error('Failed to parse missed notification', item, e);
              return null;
            }
          }).filter(n => n !== null) as TransferNotification[];
        }),
        map(notifications => {
          // Merge with existing
          notifications.forEach(n => {
            if (!this.notifications.some(existing => existing.id === n.id)) {
              this.notifications.push(n);
              this.showNotification(n);
            }
          });
          return this.notifications;
        })
      );
  }

  private initializeConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/api/notificationHub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Return 5000ms (5 seconds) if it's the first retry attempt,
          // otherwise return null to let the default retry policy handle it
          return retryContext.previousRetryCount === 0 ? 5000 : null;
        }
      })
      .build();

    this.registerHandlers();
    this.startConnection();
    this.logConnectionState();
  }

  startConnection(): Promise<void> {
    // Only start if disconnected or reconnecting
    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected ||
      this.hubConnection.state === signalR.HubConnectionState.Reconnecting) {
      return this.hubConnection.start()
        .then(() => {
          console.log('SignalR Connected - Current state:', this.hubConnection.state);
          const user = this.authService.getUserDetail();

          // Try ID first, then fallback to address/name
          const siteIdentifier = user?.defaultSiteId || user?.defaultSite;

          if (siteIdentifier) {
            console.log('Joining group with identifier:', siteIdentifier);
            this.joinGroup(siteIdentifier);
          } else {
            console.warn('No site identifier found for user, cannot join notification group');
          }
        })
        .catch(err => {
          console.error('Connection failed:', err);
          // Don't automatically retry here - let withAutomaticReconnect handle it
        });
    }
    return Promise.resolve();
  }

  public retryRegisterHandlers() {
    this.hubConnection.on('RetryReceiveNotification', (transfer: any) => {
      this.handleTransferNotification(transfer);
      console.log('this.handleTransferNotification(transfer)', transfer);
    });

    this.hubConnection.on('NotificationDeleted', (data: any) => {
      this.removeNotification(data.id);
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR Disconnected - Attempting to reconnect...');
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  private registerHandlers() {
    this.hubConnection.on('ReceiveTransferNotification', (transfer: any) => {
      this.handleTransferNotification(transfer);
    });

    this.hubConnection.on('NotificationDeleted', (data: any) => {
      this.removeNotification(data.id);
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR Disconnected - Attempting to reconnect...');
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  private joinGroup(siteAddress: string) {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinGroup', siteAddress)
        .then(() => console.log(`Joined group for site ${siteAddress}`))
        .catch(err => console.error('Error joining group:', err));
    } else {
      console.warn('Cannot join group - connection not established');
    }
  }

  private handleTransferNotification(transfer: any) {
    console.log('[SignalR] Raw notification:', transfer);

    // Target Check
    const user = this.authService.getUserDetail();
    // Only filter if we have a valid ID to check against. 
    // If the user is on an old token (no ID), trust the SignalR group routing (which we fixed on backend).
    if (user && user.defaultSiteId && transfer.destinationSiteId) {
      if (user.defaultSiteId != transfer.destinationSiteId.toString()) {
        console.log(`Notification ignored: Targeted to ${transfer.destinationSiteId} but user is at ${user.defaultSiteId}`);
        return;
      }
    }

    // Ensure required fields exist
    if (!transfer?.transferId || !transfer?.reference) {
      console.error('Invalid notification format:', transfer);
      return;
    }

    const notification: TransferNotification = {
      id: transfer.transferId,
      transferRef: transfer.reference,
      originSite: transfer.originSite,
      date: new Date(), // Or transfer.createdAt if available
      itemsCount: transfer.itemsCount || 0,
      exitDocNumber: transfer.exitDocNumber,
      receiptDocNumber: transfer.receiptDocNumber,
      destinationSiteId: transfer.destinationSiteId
    };

    // Update array immutably
    this.notifications = [
      ...this.notifications.filter(n => n.id !== notification.id),
      notification
    ];

    //console.log('[SignalR] Current notifications:', this.notifications);
    this.showNotification(notification);
  }

  private showNotification(notification: TransferNotification) {
    if (this.authService.isLoggedIn()) {
      this.snackBar.open( //`Nouveau(x) transfert(s) reçu(s) (${notification.transferRef})`,
        `Nouveau(x) transfert(s) reçu(s)`,
        'Voir',
        { duration: 5000 }
      ).onAction().subscribe(() => {
        // Handle notification click
      });
    }
  }

  private logConnectionState() {
    console.log('Current connection state:', this.hubConnection.state);
    this.hubConnection.onreconnecting(() => console.log('Connection reconnecting...'));
    this.hubConnection.onreconnected(() => console.log('Connection reestablished'));
    this.hubConnection.onclose(() => console.log('Connection closed'));
  }

  getPendingNotifications(): TransferNotification[] {
    return [...this.notifications];
  }

  dismissNotification(id: number) {
    // Optimistic update
    this.removeNotification(id);
    this.http.delete(`${environment.apiBaseUrl}/api/notifications/${id}`).subscribe({
      error: (err) => console.error('Failed to dismiss notification on server', err)
    });
  }

  removeNotification(id: number) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearNotifications() {
    this.notifications = [];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  // Add to NotificationService
  printNotificationState() {
    console.group('Current Notification State');
    console.log('Connection State:', this.hubConnection.state);
    console.log('Active Groups:', this.hubConnection.connectionId ?
      'Subscribed' : 'None');
    console.table(this.notifications);
    console.groupEnd();
  }

  // Call this periodically to monitor state
  startDebugMonitor() {
    setInterval(() => this.printNotificationState(), 10000);
  }
}

interface TransferNotification {
  id: number;
  transferRef: string;
  originSite: number;
  date: Date;
  itemsCount: number;
  exitDocNumber: string;
  receiptDocNumber: string;
  destinationSiteId: number;
}