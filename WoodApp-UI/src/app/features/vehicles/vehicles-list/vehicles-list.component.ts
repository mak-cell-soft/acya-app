import { Component, OnInit, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Vehicle } from '../../../models/components/vehicle';
import { VehicleService } from '../../../services/components/vehicle.service';
import { VehicleDialogComponent } from '../vehicle-dialog/vehicle-dialog.component';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDeleteModalComponent } from '../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-vehicles-list',
  templateUrl: './vehicles-list.component.html',
  styleUrls: ['./vehicles-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class VehiclesListComponent implements OnInit {
  displayedColumns: string[] = ['brand', 'serialnumber', 'mileage', 'insurancedate', 'technicalvisitdate', 'drainingdate', 'actions'];
  dataSource = new MatTableDataSource<Vehicle>([]);
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private vehicleService: VehicleService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.vehicleService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cdr.markForCheck();
        this.toastr.error('Erreur lors du chargement des véhicules');
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openVehicleDialog(vehicle?: Vehicle): void {
    const dialogRef = this.dialog.open(VehicleDialogComponent, {
      width: '1000px',
      maxWidth: '100vw',
      data: vehicle || null,
      panelClass: 'premium-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVehicles();
      }
    });
  }

  deleteVehicle(vehicle: Vehicle): void {
    const item = { id: vehicle.id, name: `${vehicle.brand} (${vehicle.serialnumber})` };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.vehicleService.delete(vehicle.id).subscribe({
          next: () => {
            this.toastr.success('Véhicule supprimé avec succès');
            this.loadVehicles();
          },
          error: (err) => {
            this.toastr.error('Erreur lors de la suppression');
            console.error(err);
          }
        });
      }
    });
  }

  isExpiringSoon(date: any): boolean {
    if (!date) return false;
    const today = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30; // Within 30 days
  }

  isExpired(date: any): boolean {
    if (!date) return false;
    const today = new Date();
    const expiry = new Date(date);
    return expiry < today;
  }
}
