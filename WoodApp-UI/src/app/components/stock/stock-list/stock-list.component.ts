import { Component, inject, OnInit, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { Stock } from '../../../models/components/stock';
import { MatTableDataSource } from '@angular/material/table';
import { StockService } from '../../../services/components/stock.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';

interface CategoryGroup {
  categoryName: string;
  totalQuantity: number;
  unit: string;
  dataSource: MatTableDataSource<Stock>;
  id: string;
}

@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css'
})
export class StockListComponent implements OnInit, AfterViewInit {

  stockService = inject(StockService);
  authService = inject(AuthenticationService);
  router = inject(Router);

  categoryGroups: CategoryGroup[] = [];
  displayedStockColumns: string[] = ['articleReference', 'articleDescription', 'packageReference', 'merchandiseDescription', 'updateDate', 'site', 'quantity', 'updatedBy'];

  @ViewChildren(MatPaginator) paginators!: QueryList<MatPaginator>;
  @ViewChildren(MatSort) sorts!: QueryList<MatSort>;

  loading: boolean = false; // Track loading state

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAll();
    }
  }

  ngAfterViewInit() {
    this.paginators.changes.subscribe(() => {
      this.assignPaginatorsAndSorts();
    });
    this.sorts.changes.subscribe(() => {
      this.assignPaginatorsAndSorts();
    })
  }

  assignPaginatorsAndSorts() {
    this.categoryGroups.forEach((group, index) => {
      const paginator = this.paginators.toArray()[index];
      const sort = this.sorts.toArray()[index];
      if (paginator) {
        group.dataSource.paginator = paginator;
      }
      if (sort) {
        group.dataSource.sort = sort;
      }
    });
  }

  applyCategoryFilter(group: CategoryGroup, event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    group.dataSource.filter = filterValue.trim().toLowerCase();

    if (group.dataSource.paginator) {
      group.dataSource.paginator.firstPage();
    }
  }

  scrollToCategory(groupId: string) {
    const element = document.getElementById(groupId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  //#region Load Data
  getAll() {
    this.loading = true;
    this.stockService.getAll().subscribe({
      next: (response) => {
        console.log('Successfully fetched Stocks', response);

        const groups: { [key: string]: Stock[] } = {};

        response.forEach(stock => {
          // Updated access path based on model inspection
          const category = stock.merchandise?.article?.category?.description || 'Non classé';
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push(stock);
        });

        // Convert to array and sort if needed
        this.categoryGroups = Object.keys(groups).sort().map((category, index) => {
          const stocks = groups[category];
          const dataSource = new MatTableDataSource(stocks);

          // Custom sorting for nested properties if needed, but default might work for simple columns
          // Standard filter predicate to search in all columns
          dataSource.filterPredicate = (data: Stock, filter: string) => {
            const searchStr = (
              (data.merchandise?.article?.reference || '') +
              (data.merchandise?.article?.description || '') +
              (data.merchandise?.description || '') +
              (data.merchandise?.packagereference || '')
            ).toLowerCase();
            return searchStr.indexOf(filter) != -1;
          };

          const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

          // Get unit from the first item in the group, defaulting to empty string if not found
          const unit = stocks.length > 0 ? (stocks[0].merchandise?.article?.unit || '') : '';

          return {
            categoryName: category,
            totalQuantity: totalQuantity,
            unit: unit,
            dataSource: dataSource,
            id: 'category-' + index
          };
        });

        // Trigger generic change detection logic if necessary, 
        // but ViewChildren changes subscription should handle assignments.
        // We force an update in case view is already rendered (rare with async data but safer)
        setTimeout(() => this.assignPaginatorsAndSorts(), 100);

        this.loading = false;
      },
      error: (err) => {
        console.error("Error fetching stocks", err);
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

