import { AfterViewInit, Component, inject, Input, OnInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthenticationService } from '../../services/components/authentication.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getRoleTranslation } from '../../shared/validators/translateRole';
import { AppuserService } from '../../services/components/appuser.service';
import { NotificationService } from '../../services/components/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { TransferConfirmationComponent } from '../../components/stock/transfer-confirmation/transfer-confirmation.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, AfterViewInit {

  dialog = inject(MatDialog);
  notificationService = inject(NotificationService);

  SalesSite: string = '';
  nameOfConnectedUser: string = '';
  connectionCheckInterval: any;

  ngOnInit(): void {
    this.getConnectedUserSalesSite();
    this.getConnectedUserName();
    // Initialize connection but don't trigger retry immediately
    if (!this.notificationService.isConnected()) {
      this.notificationService.startConnection();
    }

    // Wait 2 seconds before fetching missed to ensure auth is settled
    setTimeout(() => this.fetchMissedNotifications(), 2000);
  }

  fetchMissedNotifications() {
    this.notificationService.getMissedNotifications().subscribe({
      next: (count) => {
        if (count && count.length > 0) {
          this.toastr.info(`${count.length} notification(s) manquée(s) récupérée(s)`);
        }
        // Also ensure retry handlers are registered in case backend pushes retries
        this.notificationService.retryRegisterHandlers();
      },
      error: (err) => {
        console.error('Failed to fetch missed notifications:', err);
      }
    });
  }

  getConnectedUserName() {
    if (this.isLoggedIn()) {
      this.nameOfConnectedUser = this.authService.getUserDetail()?.fullname || 'Utilisateur';
    }
  }

  ngAfterViewInit(): void {
    this.notificationService.startDebugMonitor();
  }

  @Input() sidenav!: MatSidenav;
  authService = inject(AuthenticationService);
  appuserService = inject(AppuserService);
  router = inject(Router);
  toastr = inject(ToastrService);

  isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  checkConnection() {
    if (!this.notificationService.isConnected()) {
      console.log('Attempting to reconnect SignalR...');
      this.notificationService.startConnection();
    }
  }

  logout() {
    this.authService.logout();
    this.notificationService.clearNotifications();
    this.toastr.info("Au revoir et à la prochaine :)");
    this.router.navigate(['/login']);
  }

  openProfile() {
    // Your profile logic here
    console.log('Profile clicked');
  }

  getRoleTranslated(role: any): string {
    return getRoleTranslation(role);
  }

  getConnectedUserSalesSite() {
    let _id = 0;
    if (this.isLoggedIn()) {
      _id = Number(this.authService.getUserDetail()?.id);
      console.log('Id Utilisateur a Voir : ', _id);
      this.appuserService.getConnectedUserSalesSiteAsString(_id).subscribe({
        next: (response: string) => {
          console.log('The Sales Site as a String :', response);
          // Assuming response is a string containing the sales site address
          this.SalesSite = response;
        },
        error: (err) => {
          console.error('Failed to fetch sales site:', err);
          this.SalesSite = 'Non-connu'; // Fallback or default value
        }
      });
    }
  }


  //#region Open Modal Notification details
  openTransferConfirmation(notif: any) {
    console.log('Details of notifications are here', notif);
    const dialogRef = this.dialog.open(TransferConfirmationComponent, {
      maxWidth: '700px',  // Adjust width as needed
      data: {
        id: notif.id,
        transferRef: notif.transferRef,
        originSite: notif.originSite,
        itemsCount: notif.itemsCount,
        date: notif.date || new Date(),
        confirmed: false,
        docSortie: notif.exitDocNumber,
        docReception: notif.receiptDocNumber
      }
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result === true || result === false) {
          // Whether confirmed or rejected, the notification is processed and should be removed
          this.notificationService.dismissNotification(notif.id);
          this.toastr.success('Notification mise à jour');
        }
      },
      error: (err) => {
        console.error('Dialog error:', err);
      }
    });
  }
  //#endregion

}
