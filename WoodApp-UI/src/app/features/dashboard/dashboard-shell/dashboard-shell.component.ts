import { BreakpointObserver } from '@angular/cdk/layout';
import { AfterViewInit, Component, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
import { delay, filter } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BUTTON_ADMINISTRATION, BUTTON_HOME, MENU_ACCOUNTING, MENU_ARTICLES, MENU_CLIENT, MENU_HELP, MENU_PROVIDER, MENU_PURCHASE, MENU_SELL, MENU_STOCK, MENU_SUB_BON_SORTIE, MENU_SUB_INVETORY, MENU_SUB_PURCHASE_AVOIR, MENU_SUB_PURCHASE_BC, MENU_SUB_PURCHASE_BR, MENU_SUB_PURCHASE_FACT, MENU_SUB_SELL_AVOIR, MENU_SUB_SELL_BC, MENU_SUB_SELL_BL, MENU_SUB_SELL_DEVIS, MENU_SUB_SELL_FACT, MENU_SUB_STOCK_LIST, MENU_SUB_STOCK_MANAGE } from '../../../shared/constants/components/home';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { MatDialog } from '@angular/material/dialog';
import { StockTransferFormComponent } from '../../stock/stock-transfer-form/stock-transfer-form.component';
import { EnterpriseService } from '../../../services/components/enterprise.service';
import { NotificationService } from '../../../services/components/notification.service';
import { AppNotification } from '../../../models/app-notification';

@UntilDestroy()
@Component({
  selector: 'app-dashboard-shell',
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss'
})
export class DashboardShellComponent implements AfterViewInit, OnInit {
  dialog = inject(MatDialog);


  //#region Labels Constants
  button_home: string = BUTTON_HOME;
  button_administration: string = BUTTON_ADMINISTRATION;

  // SELL MENU
  menu_sell: string = MENU_SELL;
  menu_sub_sell_devis: string = MENU_SUB_SELL_DEVIS;
  menu_sub_sell_bc: string = MENU_SUB_SELL_BC;
  menu_sub_sell_bl: string = MENU_SUB_SELL_BL;
  menu_sub_sell_fact: string = MENU_SUB_SELL_FACT;
  menu_sub_sell_avoir: string = MENU_SUB_SELL_AVOIR;
  menu_sub_sell_bon_sortie: string = MENU_SUB_BON_SORTIE;

  // PURCHASE MENU
  menu_purchase: string = MENU_PURCHASE;
  menu_sub_purchase_bc: string = MENU_SUB_PURCHASE_BC;
  menu_sub_purchase_br: string = MENU_SUB_PURCHASE_BR;
  menu_sub_purchase_fact: string = MENU_SUB_PURCHASE_FACT;
  menu_sub_purchase_avoir: string = MENU_SUB_PURCHASE_AVOIR;

  // CUSTOMER MENU
  menu_client: string = MENU_CLIENT;

  // PROVIDER MENU
  menu_provider: string = MENU_PROVIDER;

  // ARTICLES MENU
  menu_articles: string = MENU_ARTICLES;

  // STOCK MENU
  menu_stock: string = MENU_STOCK;
  menu_sub_stock_manage: string = MENU_SUB_STOCK_MANAGE;
  menu_sub_stock_list: string = MENU_SUB_STOCK_LIST;
  menu_sub_inventory: string = MENU_SUB_INVETORY;

  // ACCOUNTING MENU
  menu_accounting: string = MENU_ACCOUNTING;

  // HELP MENU
  menu_help: string = MENU_HELP;
  //#endregion

  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;

  isVenteMenuOpen = false;
  isStockMenuOpen = false;
  isPurchaseMenuOpen = false;
  isReceptionOpen = false;
  isCollapsed = false;

  defaultAvatarUrl = '/assets/enterprise-avatar.png';
  avatarUrl = this.defaultAvatarUrl;

  // NOTE: Enterprise info bound to the sidebar header — fetched once on init from the API
  enterpriseName: string = '';
  enterpriseDescription: string = '';
  
  // LIVE NOTIFICATIONS
  unreadCount$ = this.notificationService.unreadCount$;
  systemNotifications: AppNotification[] = [];

  // toggleVenteMenu() {
  //   this.isVenteMenuOpen = !this.isVenteMenuOpen;
  // }

  // toggleStockMenu() {
  //   this.isStockMenuOpen = !this.isStockMenuOpen;
  // }

  // toggleAchatMenu() {
  //   this.isPurchaseMenuOpen = !this.isPurchaseMenuOpen;
  // }

  // toggleReceptionMenu() {
  //   this.isReceptionOpen = !this.isReceptionOpen;
  // }

  constructor(
    private observer: BreakpointObserver,
    private router: Router,
    private authService: AuthenticationService,
    // NOTE: EnterpriseService is injected here to fetch live enterprise info from the API
    private enterpriseService: EnterpriseService,
    public notificationService: NotificationService
  ) { }

  get isAdmin(): boolean {
    return this.authService.getRole() === 'Admin';
  }

  // Called on component initialization.
  // Intent: Hydrate the avatar state from localStorage so the user sees their uploaded image across sessions.
  ngOnInit() {
    // Hydrate avatar from localStorage so users see their uploaded image across sessions
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      this.avatarUrl = savedAvatar;
    }

    // Fetch enterprise metadata (name + description) using the EnterpriseId embedded in the JWT
    const enterpriseIdStr = this.authService.getEnterpriseId();
    if (enterpriseIdStr) {
      const enterpriseId = parseInt(enterpriseIdStr, 10);
      if (!isNaN(enterpriseId)) {
        this.enterpriseService.getEnterpriseInfo(enterpriseId).subscribe({
          next: (enterprise) => {
            // Bind to template properties so the sidebar header shows real data
            this.enterpriseName = enterprise.name;
            this.enterpriseDescription = enterprise.description;
          },
          error: (err) => {
            // TODO: consider surfacing a subtle toast warning if this fails
            console.error('Impossible de charger les infos entreprise:', err);
          }
        });
      }
    }

    // Initialize notification polling/loading
    this.notificationService.fetchUnreads();
  }

  ngAfterViewInit() {
    this.observer
      .observe(['(max-width: 768px)', '(min-width: 769px) and (max-width: 1024px)', '(min-width: 1025px)'])
      .pipe(delay(1), untilDestroyed(this))
      .subscribe((res) => {
        if (res.breakpoints['(max-width: 768px)']) {
          // Mobile
          this.sidenav.mode = 'over';
          this.sidenav.close();
          this.isCollapsed = false;
        } else if (res.breakpoints['(min-width: 769px) and (max-width: 1024px)']) {
          // Tablet
          this.sidenav.mode = 'side';
          this.sidenav.open();
          this.isCollapsed = true;
        } else {
          // Desktop
          this.sidenav.mode = 'side';
          this.sidenav.open();
          this.isCollapsed = false;
        }
      });

    this.router.events
      .pipe(
        untilDestroyed(this),
        filter((e) => e instanceof NavigationEnd)
      )
      .subscribe(() => {
        if (this.sidenav.mode === 'over') {
          this.sidenav.close();
        }
      });
  }

  // Add these to your component class
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Global Keyboard Listener
   * Intent: Minimize (collapse) the sidebar on Escape instead of letting it 'disappear'.
   * This addresses the user's issue where an accidental Escape press made the shell menu vanish.
   */
  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKeydown(event: any) {
    if (this.sidenav && this.sidenav.opened && !this.isCollapsed) {
      this.isCollapsed = true;
      event.preventDefault();
    }
  }

  // Triggers when the user selects a file from the hidden file input.
  // Intent: Read the uploaded file into a base64 Data URL so we can display it immediately 
  // and persist it in localStorage for returning visits, without requiring a backend upload for now.
  onAvatarFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
        // Persist the base64 string directly; suitable for small avatar pictures.
        localStorage.setItem('userAvatar', this.avatarUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  // Restores the default beautiful timber aesthetic avatar.
  // Intent: Give the user an escape hatch if they don't like their uploaded image
  // and clean up our storage footprint.
  resetAvatar() {
    this.avatarUrl = this.defaultAvatarUrl;
    localStorage.removeItem('userAvatar');
  }

  toggleVenteMenu() {
    this.isVenteMenuOpen = !this.isVenteMenuOpen;
    if (this.isVenteMenuOpen) {
      this.isCollapsed = false; // Ensure sidebar is expanded to show submenu
      this.closeOtherMenus('vente');
    }
  }

  toggleAchatMenu() {
    this.isPurchaseMenuOpen = !this.isPurchaseMenuOpen;
    if (this.isPurchaseMenuOpen) {
      this.isCollapsed = false; // Ensure sidebar is expanded to show submenu
      this.closeOtherMenus('achat');
    }
  }

  toggleStockMenu() {
    this.isStockMenuOpen = !this.isStockMenuOpen;
    if (this.isStockMenuOpen) {
      this.isCollapsed = false; // Ensure sidebar is expanded to show submenu
      this.closeOtherMenus('stock');
    }
  }

  private closeOtherMenus(currentMenu: string) {
    if (currentMenu !== 'vente') this.isVenteMenuOpen = false;
    if (currentMenu !== 'achat') this.isPurchaseMenuOpen = false;
    if (currentMenu !== 'stock') this.isStockMenuOpen = false;
  }

  openAddTransferDialog(): void {
    this.dialog.open(StockTransferFormComponent, {
      width: '1600px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'modern-dialog'
    });
  }

  markAsRead(id: number) {
    this.notificationService.markAsRead(id);
  }

  get notifications(): AppNotification[] {
    return this.notificationService.getSystemNotifications();
  }
}
