import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { DocumentService } from '../../../../../services/components/document.service';
import { Document, DocumentTypes, DocStatus, DocStatus_FR } from '../../../../../models/components/document';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { Router } from '@angular/router';
import { CounterPart } from '../../../../../models/components/counterpart';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';
import { ConfirmDeleteModalComponent } from '../../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { StatusOrderModalComponent } from '../../../../../shared/components/modals/status-order-modal/status-order-modal.component';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * ListCustomerOrdersComponent — Displays all customer orders (Bon de commande).
 *
 * Timeline: Commande → Bon de Livraison → Facture
 * NOTE: customerOrder (type=4) does NOT affect stock inventory.
 *       Only the subsequent customerDeliveryNote will update stock.
 */
@Component({
  selector: 'app-list-customer-orders',
  templateUrl: './list-customer-orders.component.html',
  styleUrl: './list-customer-orders.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded',       style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('expanded <=> void',      animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
  ]
})
export class ListCustomerOrdersComponent implements OnInit {

  docService       = inject(DocumentService);
  authService      = inject(AuthenticationService);
  dialog           = inject(MatDialog);
  toastr           = inject(ToastrService);
  counterpartService = inject(CounterpartService);
  router           = inject(Router);

  documents = new MatTableDataSource<Document>([]);
  displayedColumns: string[] = ['number', 'date', 'customer', 'total', 'status', 'action', 'expand'];
  columnsToDisplayWithExpand = [...this.displayedColumns];
  expandedElement: Document | null = null;

  allCustomers: CounterPart[] = [];
  selectedCustomer: number | null = null;
  selectedStatus: number | null = null;
  isLoading = false;

  // Expose enum to template for readable comparisons
  DocStatus = DocStatus;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Customer order lifecycle statuses
  statuses = [
    { value: DocStatus.Created,           label: 'Créé' },
    { value: DocStatus.Pending,           label: 'En attente' },
    { value: DocStatus.Confirmed,         label: 'Confirmé' },
    { value: DocStatus.PartiallyDelivered, label: 'Partiellement livré' },
    { value: DocStatus.Delivered,         label: 'Livré' },
    { value: DocStatus.Abandoned,         label: 'Annulé' },
  ];

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadCustomers();
      this.loadOrders();
    }
  }

  loadCustomers() {
    this.counterpartService.GetAll(CounterPartType_FR.customer).subscribe(
      res => this.allCustomers = res
    );
  }

  /** Fetch customerOrder documents (type = 4) */
  loadOrders() {
    this.isLoading = true;
    // NOTE: customerOrder (type=4) is different from customerQuote (type=11)
    this.docService.GetByType(DocumentTypes.customerOrder).subscribe({
      next: (res: Document[]) => {
        this.documents.data = res.sort((a, b) => b.docnumber.localeCompare(a.docnumber));
        this.documents.paginator = this.paginator;
        this.documents.sort = this.sort;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des commandes');
      }
    });
  }

  applyFilters() {
    this.documents.filterPredicate = (data: Document, filter: string) => {
      const f = JSON.parse(filter);
      const customerMatch = f.customer ? data.counterpart?.id === f.customer : true;
      const statusMatch   = f.status   ? data.docstatus === f.status         : true;
      return customerMatch && statusMatch;
    };
    this.documents.filter = JSON.stringify({
      customer: this.selectedCustomer,
      status: this.selectedStatus
    });
  }

  getStatusLabel(status: number): string {
    return DocStatus_FR[DocStatus[status] as keyof typeof DocStatus_FR] || 'Inconnu';
  }

  getStatusClass(status: number): string {
    switch (status) {
      case DocStatus.Pending:            return 'badge-pending';
      case DocStatus.Confirmed:          return 'badge-confirmed';
      case DocStatus.PartiallyDelivered: return 'badge-partial';
      case DocStatus.Delivered:          return 'badge-delivered';
      case DocStatus.Abandoned:          return 'badge-cancelled';
      default:                           return 'badge-default';
    }
  }

  changeStatus(element: Document) {
    const dialogRef = this.dialog.open(StatusOrderModalComponent, {
      width: '500px',
      data: {
        currentStatus: element.docstatus,
        supplierReference: element.supplierReference,
        docNumber: element.docnumber
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.docService.UpdateStatus(element.id, result.status, result.supplierReference).subscribe({
          next: () => {
            this.toastr.success('Statut mis à jour');
            this.loadOrders();
          },
          error: () => this.toastr.error('Erreur lors de la mise à jour')
        });
      }
    });
  }

  /**
   * Convert this order to a customer delivery note.
   * Passes the order ID so the add-delivery form can pre-fill details.
   */
  convertToDelivery(element: Document) {
    this.router.navigate(['/home/merchandise/customerdelivery/add'], {
      queryParams: { fromOrderId: element.id }
    });
  }

  deleteOrder(element: Document) {
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px', data: { item }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.docService.Delete(element.id).subscribe(() => {
          this.toastr.success('Commande supprimée');
          this.loadOrders();
        });
      }
    });
  }

  printOrder(element: Document) {
    window.print();
  }
}
