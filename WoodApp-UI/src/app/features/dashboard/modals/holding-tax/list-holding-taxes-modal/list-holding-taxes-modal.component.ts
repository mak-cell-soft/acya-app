import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HoldingTaxService } from '../../../../../services/components/holding-tax.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-list-holding-taxes-modal',
  templateUrl: './list-holding-taxes-modal.component.html',
  styleUrl: './list-holding-taxes-modal.component.scss'
})
export class ListHoldingTaxesModalComponent implements OnInit {
  
  private holdingTaxService = inject(HoldingTaxService);
  private toastr = inject(ToastrService);
  public dialogRef = inject(MatDialogRef<ListHoldingTaxesModalComponent>);

  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  displayedColumns: string[] = ['docNumber', 'counterPartName', 'reference', 'taxPercentage', 'taxValue', 'status', 'date'];
  loading: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.fetchHoldingTaxes();
  }

  fetchHoldingTaxes() {
    this.loading = true;
    this.holdingTaxService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching holding taxes', err);
        this.toastr.error('Erreur lors de la récupération des retenues à la source');
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
