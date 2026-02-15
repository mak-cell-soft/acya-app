import { BreakpointObserver } from '@angular/cdk/layout';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
import { delay, filter } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BUTTON_ADMINISTRATION, BUTTON_HOME, MENU_ACCOUNTING, MENU_ARTICLES, MENU_CLIENT, MENU_HELP, MENU_PROVIDER, MENU_PURCHASE, MENU_SELL, MENU_STOCK, MENU_SUB_BON_SORTIE, MENU_SUB_INVETORY, MENU_SUB_PURCHASE_BC, MENU_SUB_PURCHASE_BR, MENU_SUB_PURCHASE_FACT, MENU_SUB_SELL_BC, MENU_SUB_SELL_BL, MENU_SUB_SELL_DEVIS, MENU_SUB_SELL_FACT, MENU_SUB_STOCK_LIST, MENU_SUB_STOCK_MANAGE } from '../../shared/constants/components/home';

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit {


  //#region Labels Constants
  button_home: string = BUTTON_HOME;
  button_administration: string = BUTTON_ADMINISTRATION;

  // SELL MENU
  menu_sell: string = MENU_SELL;
  menu_sub_sell_devis: string = MENU_SUB_SELL_DEVIS;
  menu_sub_sell_bc: string = MENU_SUB_SELL_BC;
  menu_sub_sell_bl: string = MENU_SUB_SELL_BL;
  menu_sub_sell_fact: string = MENU_SUB_SELL_FACT;
  menu_sub_sell_bon_sortie: string = MENU_SUB_BON_SORTIE;

  // PURCHASE MENU
  menu_purchase: string = MENU_PURCHASE;
  menu_sub_purchase_bc: string = MENU_SUB_PURCHASE_BC;
  menu_sub_purchase_br: string = MENU_SUB_PURCHASE_BR;
  menu_sub_purchase_fact: string = MENU_SUB_PURCHASE_FACT;

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

  constructor(private observer: BreakpointObserver, private router: Router) { }

  ngAfterViewInit() {
    this.observer
      .observe(['(max-width: 800px)'])
      .pipe(delay(1), untilDestroyed(this))
      .subscribe((res) => {
        if (res.matches) {
          this.sidenav.mode = 'over';
          this.sidenav.close();
        } else {
          this.sidenav.mode = 'side';
          this.sidenav.open();
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
  toggleVenteMenu() {
    this.isVenteMenuOpen = !this.isVenteMenuOpen;
    if (this.isVenteMenuOpen) {
      this.closeOtherMenus('vente');
    }
  }

  toggleAchatMenu() {
    this.isPurchaseMenuOpen = !this.isPurchaseMenuOpen;
    if (this.isPurchaseMenuOpen) {
      this.closeOtherMenus('achat');
    }
  }

  toggleStockMenu() {
    this.isStockMenuOpen = !this.isStockMenuOpen;
    if (this.isStockMenuOpen) {
      this.closeOtherMenus('stock');
    }
  }

  private closeOtherMenus(currentMenu: string) {
    if (currentMenu !== 'vente') this.isVenteMenuOpen = false;
    if (currentMenu !== 'achat') this.isPurchaseMenuOpen = false;
    if (currentMenu !== 'stock') this.isStockMenuOpen = false;
  }
}
