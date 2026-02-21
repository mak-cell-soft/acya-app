import { Component, inject, ViewChild } from '@angular/core';
import { StockTransferDetails, StockTransferInfo, TransferStatus, TransferStatus_FR } from '../../../models/components/stock_transfert';
import { MatTableDataSource } from '@angular/material/table';
import { ABORT_BUTTON, REGISTER_BUTTON, UPDATE_BUTTON } from '../../../shared/Text_Buttons';
import { GENERAL_INFORMATION_PROVIDER } from '../../../shared/constants/components/article';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder } from '@angular/forms';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { StockService } from '../../../services/components/stock.service';
import { TransferDetailsDialogComponent } from '../transfer-details-dialog/transfer-details-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-stock-transfer-list',
  templateUrl: './stock-transfer-list.component.html',
  styleUrl: './stock-transfer-list.component.css'
})
export class StockTransferListComponent {
  authService = inject(AuthenticationService);
  stockTransferService = inject(StockService);
  dialog = inject(MatDialog);
  //#region labels
  mat_header_cell_provider_prefix: string = 'Sté';
  mat_header_cell_provider_name: string = 'Nom';
  mat_header_cell_provider_description: string = 'Description';
  mat_header_cell_provider_matricule_fiscal: string = 'Matricule Fiscal';
  mat_header_cell_provider_phone_one: string = 'Téléphone 1';
  mat_header_cell_provider_phone_two: string = 'Téléphone 2'
  mat_header_cell_provider_category: string = 'Catégorie';
  mat_header_cell_provider_phone_email: string = 'Email';
  mat_header_cell_provider_responsable: string = 'Responsable';
  //#endregion

  //#region Update Provider
  //#region Labels and Informations
  general_information_provider: string = GENERAL_INFORMATION_PROVIDER;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  update_button: string = UPDATE_BUTTON;
  //#endregion


  selectedStockTransfer: StockTransferInfo | null = null;
  isSupplierToEdit: boolean = false;
  //#endregion

  loading: boolean = false; // Track loading state

  @ViewChild(MatPaginator) PaginationStockTransfer!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  allTransfersStock: MatTableDataSource<StockTransferInfo> = new MatTableDataSource<StockTransferInfo>();
  displayedStockTransferColumns: string[] = ['docSortie', 'docReception', 'origine', 'destination', 'transferDate', 'transporter', 'status', 'action'];


  constructor(
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadStockTransfers();
    }

  }

  ngAfterViewInit() {
    this.allTransfersStock.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allTransfersStock.filter = filterValue.trim().toLowerCase();

    if (this.PaginationStockTransfer) {
      this.PaginationStockTransfer.firstPage();
    }
  }

  loadStockTransfers(): void {
    this.loading = true;
    this.stockTransferService.getStockTransfers().subscribe({
      next: (transfers) => {
        // Sort by date descending (recent first)
        const sortedTransfers = transfers.sort((a, b) => {
          const dateA = new Date(a.transferDate).getTime();
          const dateB = new Date(b.transferDate).getTime();
          return dateB - dateA;
        });

        this.allTransfersStock.data = sortedTransfers;
        console.log("All Transfers (Sorted) : ", sortedTransfers);

        // Use a small timeout to ensure ViewChild references are ready if data loads extremely fast
        setTimeout(() => {
          this.allTransfersStock.paginator = this.PaginationStockTransfer;
          this.allTransfersStock.sort = this.sort;
        });

        this.loading = false;
      },
      error: (err) => {
        this.toastr.error('Erreur lors du chargement des transferts');
        this.loading = false;
      }
    });
  }

  viewDetails(transfer: StockTransferInfo): void {
    this.stockTransferService.getStockTransferDetails(transfer.docSortie, transfer.docReception)
      .subscribe({
        next: (details) => {
          console.log('Transfer Stock Details : ', details);
          this.openDetailsDialog(details);
        },
        error: (err) => {
          // Handle error (show snackbar or toast)
          console.error('Error loading transfer details', err);
        }
      });
  }

  openDetailsDialog(details: StockTransferDetails[]): void {
    this.dialog.open(TransferDetailsDialogComponent, {
      maxWidth: '700px',
      maxHeight: '90vh',
      data: details, // Assuming you want the first match
      panelClass: 'transfer-details-dialog'
    });
  }

  deleteTransfer(transfer: StockTransferInfo): void {

  }

  onPrint(transfer: StockTransferInfo): void {
    // Logic for printing to be implemented
  }

  //#region Effet Tableau
  TransferStatus = TransferStatus;
  getStatusInfo(status: TransferStatus): { text: string, color: string } {
    switch (status) {
      case TransferStatus.Confirmed:
        return { text: TransferStatus_FR.Confirmed, color: '#4CAF50' }; // Green
      case TransferStatus.Rejected:
        return { text: TransferStatus_FR.Rejected, color: '#F44336' }; // Red
      case TransferStatus.Pending:
        return { text: TransferStatus_FR.Pending, color: '#FF9800' }; // Orange
      default:
        return { text: 'Inconnu', color: '#9E9E9E' };
    }
  }
  //#endregion

}
