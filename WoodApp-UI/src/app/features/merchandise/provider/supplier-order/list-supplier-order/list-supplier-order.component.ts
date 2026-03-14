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

@Component({
  selector: 'app-list-supplier-order',
  templateUrl: './list-supplier-order.component.html',
  styleUrl: './list-supplier-order.component.css'
})
export class ListSupplierOrderComponent implements OnInit {

  docService = inject(DocumentService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  counterpartService = inject(CounterpartService);

  documents = new MatTableDataSource<Document>([]);
  displayedColumns: string[] = ['number', 'date', 'supplier', 'total', 'status', 'action'];

  allSuppliers: CounterPart[] = [];
  selectedSupplier: number | null = null;
  selectedStatus: number | null = null;

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
    this.docService.GetByType(DocumentTypes.supplierOrder).subscribe({
      next: (res: Document[]) => {
        this.documents.data = res.sort((a, b) => b.docnumber.localeCompare(a.docnumber));
        this.documents.paginator = this.paginator;
        this.documents.sort = this.sort;
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

  sendEmail(element: Document) {
    this.toastr.info('Email simulation');
  }
}
