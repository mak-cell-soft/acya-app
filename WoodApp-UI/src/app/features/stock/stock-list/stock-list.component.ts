import { Component, inject, OnInit, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { Stock } from '../../../models/components/stock';
import { MatTableDataSource } from '@angular/material/table';
import { StockService } from '../../../services/components/stock.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { StockTransferFormComponent } from '../stock-transfer-form/stock-transfer-form.component';
import { MinimumStockModalComponent } from '../modals/minimum-stock-modal/minimum-stock-modal.component';

interface UnitTotal {
  unit: string;
  totalQuantity: number;
}

interface CategoryGroup {
  categoryName: string;
  unitTotals: UnitTotal[];
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
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);

  categoryGroups: CategoryGroup[] = [];
  displayedStockColumns: string[] = ['articleReference', 'articleDescription', 'packageReference', 'merchandiseDescription', 'updateDate', 'site', 'quantity', 'minimumStock', 'updatedBy'];

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

          // Calculate totals by unit
          const unitTotalsMap: { [unit: string]: number } = {};
          stocks.forEach(stock => {
            const unit = stock.merchandise?.article?.unit || 'U';
            unitTotalsMap[unit] = (unitTotalsMap[unit] || 0) + stock.quantity;
          });

          const unitTotals: UnitTotal[] = Object.keys(unitTotalsMap).map(unit => ({
            unit: unit,
            totalQuantity: unitTotalsMap[unit]
          }));

          return {
            categoryName: category,
            unitTotals: unitTotals,
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
    const dialogRef = this.dialog.open(StockTransferFormComponent, {
      width: '1600px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'modern-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getAll(); // Refresh stock list if transfer was successful
      }
    });
  }

  onEditMinimumStock(element: Stock) {
    const dialogRef = this.dialog.open(MinimumStockModalComponent, {
      width: '450px',
      data: { stock: element },
      panelClass: 'modern-dialog'
    });

    dialogRef.afterClosed().subscribe(newMin => {
      if (newMin !== undefined && newMin !== null) {
        const value = parseFloat(newMin);
        
        this.stockService.updateMinimumStock(element.id, value).subscribe({
          next: () => {
            this.toastr.success('Seuil mis à jour avec succès');
            element.minimumstock = value; // Update local value
          },
          error: (err) => {
            this.toastr.error('Erreur lors de la mise à jour du seuil');
            console.error(err);
          }
        });
      }
    });
  }
}

