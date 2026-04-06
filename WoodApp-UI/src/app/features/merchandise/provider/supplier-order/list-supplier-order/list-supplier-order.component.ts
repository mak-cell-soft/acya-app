import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { DocumentService } from '../../../../../services/components/document.service';
import { Document, DocumentTypes, DocStatus, DocStatus_FR } from '../../../../../models/components/document';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { CounterPart } from '../../../../../models/components/counterpart';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';
import { ConfirmDeleteModalComponent } from '../../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { StatusOrderModalComponent } from '../../../../../shared/components/modals/status-order-modal/status-order-modal.component';
import { Router } from '@angular/router';
import { MENU_PURCHASE } from '../../../../../shared/constants/components/home';

@Component({
  selector: 'app-list-supplier-order',
  templateUrl: './list-supplier-order.component.html',
  styleUrl: './list-supplier-order.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('expanded <=> void', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
  ],
})
export class ListSupplierOrderComponent implements OnInit {

  docService = inject(DocumentService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  counterpartService = inject(CounterpartService);
  router = inject(Router);

  documents = new MatTableDataSource<Document>([]);
  displayedColumns: string[] = ['number', 'date', 'supplier', 'total', 'status', 'action', 'expand'];
  columnsToDisplayWithExpand = [...this.displayedColumns];
  expandedElement: Document | null = null;

  menu_purchase: string = MENU_PURCHASE;

  allSuppliers: CounterPart[] = [];
  selectedSupplier: number | null = null;
  selectedStatus: number | null = null;
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  statuses = [
    { value: DocStatus.Pending, label: 'En attente' },
    { value: DocStatus.Sent, label: 'Envoyé' },
    { value: DocStatus.PartiallyDelivered, label: 'Partiellement livré' },
    { value: DocStatus.Delivered, label: 'Livré' }
  ];

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadSuppliers();
      this.loadOrders();
    }
  }

  loadSuppliers() {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe(res => this.allSuppliers = res);
  }

  loadOrders() {
    this.isLoading = true;
    this.docService.GetByType(DocumentTypes.supplierOrder).subscribe({
      next: (res: Document[]) => {
        this.documents.data = res.sort((a, b) => b.docnumber.localeCompare(a.docnumber));
        this.documents.paginator = this.paginator;
        this.documents.sort = this.sort;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.documents.filterPredicate = (data: Document, filter: string) => {
        const filterObj = JSON.parse(filter);
        const supplierMatch = filterObj.supplier ? data.counterpart.id === filterObj.supplier : true;
        const statusMatch = filterObj.status ? data.docstatus === filterObj.status : true;
        return supplierMatch && statusMatch;
    };
    
    this.documents.filter = JSON.stringify({
        supplier: this.selectedSupplier,
        status: this.selectedStatus
    });
  }

  getStatusLabel(status: number): string {
    return DocStatus_FR[DocStatus[status] as keyof typeof DocStatus_FR] || 'Inconnu';
  }

  getStatusClass(status: number): string {
    switch (status) {
      case DocStatus.Pending: return 'badge-pending';
      case DocStatus.Sent: return 'badge-sent';
      case DocStatus.PartiallyDelivered: return 'badge-partial';
      case DocStatus.Delivered: return 'badge-delivered';
      default: return 'badge-default';
    }
  }

  deleteOrder(element: Document) {
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
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

  sendEmail(element: Document) {
    this.toastr.info('Email simulation');
  }
}
