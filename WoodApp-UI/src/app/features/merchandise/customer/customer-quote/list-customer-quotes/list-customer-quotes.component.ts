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
 * ListCustomerQuotesComponent — Displays all customer quotes (Devis)
 * with a horizontal lifecycle timeline: Quote → Commande → Livraison.
 * Uses the same design pattern as ListSupplierOrderComponent for consistency.
 */
@Component({
  selector: 'app-list-customer-quotes',
  templateUrl: './list-customer-quotes.component.html',
  styleUrl: './list-customer-quotes.component.css',
  // Angular Animation: smooth expand/collapse for the detail row
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('expanded <=> void', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
  ]
})
export class ListCustomerQuotesComponent implements OnInit {

  // Injected services
  docService = inject(DocumentService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  counterpartService = inject(CounterpartService);
  router = inject(Router);

  // Table data source
  documents = new MatTableDataSource<Document>([]);
  displayedColumns: string[] = ['number', 'date', 'customer', 'total', 'status', 'action', 'expand'];
  columnsToDisplayWithExpand = [...this.displayedColumns];
  expandedElement: Document | null = null;

  // Filter state
  allCustomers: CounterPart[] = [];
  selectedCustomer: number | null = null;
  selectedStatus: number | null = null;
  isLoading = false;

  // Expose DocStatus enum to the template for readable comparisons
  DocStatus = DocStatus;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Available statuses for a customer quote lifecycle
  statuses = [
    { value: DocStatus.Created,    label: 'Créé' },
    { value: DocStatus.Pending,    label: 'En attente' },
    { value: DocStatus.Sent,       label: 'Envoyé' },
    { value: DocStatus.Confirmed,  label: 'Confirmé' },
    { value: DocStatus.Abandoned,  label: 'Annulé' },
  ];

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadCustomers();
      this.loadQuotes();
    }
  }

  /** Load all customers for the filter dropdown */
  loadCustomers() {
    this.counterpartService.GetAll(CounterPartType_FR.customer).subscribe(
      res => this.allCustomers = res
    );
  }

  /** Fetch all customerQuote documents from the backend */
  loadQuotes() {
    this.isLoading = true;
    // NOTE: Backend DocumentController.GetByType filters by DocumentTypes enum value (11)
    this.docService.GetByType(DocumentTypes.customerQuote).subscribe({
      next: (res: Document[]) => {
        this.documents.data = res.sort((a, b) => b.docnumber.localeCompare(a.docnumber));
        this.documents.paginator = this.paginator;
        this.documents.sort = this.sort;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des devis');
      }
    });
  }

  /** Apply customer + status filters to the table */
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

  /** Map DocStatus to French label */
  getStatusLabel(status: number): string {
    return DocStatus_FR[DocStatus[status] as keyof typeof DocStatus_FR] || 'Inconnu';
  }

  /** Map DocStatus to a CSS badge class */
  getStatusClass(status: number): string {
    switch (status) {
      case DocStatus.Pending:   return 'badge-pending';
      case DocStatus.Sent:      return 'badge-sent';
      case DocStatus.Confirmed: return 'badge-confirmed';
      case DocStatus.Abandoned: return 'badge-cancelled';
      default:                  return 'badge-default';
    }
  }

  /** Open status change modal — same pattern as supplier orders */
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
            this.toastr.success('Statut du devis mis à jour');
            this.loadQuotes();
          },
          error: () => this.toastr.error('Erreur lors de la mise à jour du statut')
        });
      }
    });
  }

  /**
   * Navigate to add a new customer order (Bon de commande)
   * pre-linked to this quote via queryParam orderId.
   * NOTE: The add-order form will read ?fromQuoteId to pre-fill details.
   */
  convertToOrder(element: Document) {
    this.router.navigate(['/home/merchandise/bc/add'], {
      queryParams: { fromQuoteId: element.id }
    });
  }

  /** Navigate to add a new delivery note pre-linked to this quote */
  convertToDelivery(element: Document) {
    this.router.navigate(['/home/merchandise/customerdelivery/add'], {
      queryParams: { fromQuoteId: element.id }
    });
  }

  /** Soft-delete the quote with confirmation */
  deleteQuote(element: Document) {
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.docService.Delete(element.id).subscribe(() => {
          this.toastr.success('Devis supprimé');
          this.loadQuotes();
        });
      }
    });
  }

  printQuote(element: Document) {
    // TODO: implement print template for quotes
    window.print();
  }
}
