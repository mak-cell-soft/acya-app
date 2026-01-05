import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { Stock } from '../../../models/components/stock';
import { MatTableDataSource } from '@angular/material/table';
import { StockService } from '../../../services/components/stock.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css'
})
export class StockListComponent implements OnInit {

  stockService = inject(StockService);
  authService = inject(AuthenticationService);
  router = inject(Router);

  allStocks: MatTableDataSource<Stock> = new MatTableDataSource<Stock>();
  displayedStockColumns: string[] = ['articleReference', 'articleDescription', 'packageReference', 'merchandiseDescription', 'updateDate', 'site', 'quantity', 'updatedBy'];

  @ViewChild(MatPaginator) PaginationStock!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading: boolean = false; // Track loading state

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAll();
      this.allStocks.paginator = this.PaginationStock;
      this.allStocks.sort = this.sort;
    }

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allStocks.filter = filterValue.trim().toLowerCase();

    if (this.PaginationStock) {
      this.PaginationStock.firstPage();
    }
  }

  //#region Load Data
  getAll() {
    this.loading = true;
    this.stockService.getAll().subscribe({
      next: (response) => {
        console.log('Successfully fetched Stocks', response);
        this.allStocks.data = response;
        this.loading = false;
      }
    });
  }
  //#endregion

  onDisplayStockMouvement() {
    this.router.navigateByUrl('home/stock/mouvement');
  }
  onDisplayStockExit() {
    this.router.navigateByUrl('home/stock/transferinfo/add');
  }
}
