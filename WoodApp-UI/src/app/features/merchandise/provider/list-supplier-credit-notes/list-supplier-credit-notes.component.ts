import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Document, DocumentTypes } from '../../../../models/components/document';
import { DocumentService } from '../../../../services/components/document.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { getStatusInfo, getBillingStatusInfo, isSameDay } from '../../../../utils/document-utils';
import { AddCreditNoteDialogComponent } from '../add-credit-note-dialog/add-credit-note-dialog.component';

@Component({
  selector: 'app-list-supplier-credit-notes',
  templateUrl: './list-supplier-credit-notes.component.html',
  styleUrl: './list-supplier-credit-notes.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListSupplierCreditNotesComponent implements OnInit, AfterViewInit {
  private docService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private authService = inject(AuthenticationService);
  private router = inject(Router);

  loading: boolean = false;
  errorMessage: string = '';
  
  // Filters
  filterSupplier: string = '';
  filterDate: Date | null = null;
  filterStartDate: Date | undefined = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  filterEndDate: Date | undefined = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  dataSource: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  displayedColumns: string[] = ['number', 'date', 'counterpart', 'amount', 'type', 'status', 'action'];
  
  // Summary
  totalHt: number = 0;
  totalTva: number = 0;
  totalTtc: number = 0;
  creditNoteCount: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.fetchCreditNotes();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  fetchCreditNotes() {
    this.loading = true;
    this.docService.GetByType(DocumentTypes.supplierInvoiceReturn).subscribe({
      next: (response: Document[]) => {
        let filteredData = response;

        if (this.filterDate) {
          filteredData = filteredData.filter(d => isSameDay(d.updatedate, this.filterDate!));
        } else if (this.filterStartDate && this.filterEndDate) {
          filteredData = filteredData.filter(d => {
            const docDate = new Date(d.updatedate);
            return docDate >= this.filterStartDate! && docDate <= this.filterEndDate!;
          });
        }

        if (this.filterSupplier) {
          const search = this.filterSupplier.toLowerCase();
          filteredData = filteredData.filter(d =>
            (d.counterpart?.name?.toLowerCase() || '').includes(search) ||
            (d.counterpart?.firstname?.toLowerCase() || '').includes(search) ||
            (d.counterpart?.lastname?.toLowerCase() || '').includes(search)
          );
        }

        // Sort descending by document number
        filteredData.sort((a, b) => (b.docnumber || '').localeCompare(a.docnumber || ''));

        this.dataSource.data = filteredData;
        this.updateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Erreur lors du chargement des avoirs');
        this.loading = false;
      }
    });
  }

  updateSummary() {
    this.creditNoteCount = this.dataSource.data.length;
    this.totalHt = this.dataSource.data.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
    this.totalTva = this.dataSource.data.reduce((acc, curr) => acc + (curr.total_tva_doc || 0), 0);
    this.totalTtc = this.totalHt + this.totalTva;
  }

  onFilterChange() {
    this.fetchCreditNotes();
  }

  clearFilters(): void {
    this.filterSupplier = '';
    this.filterDate = null;
    this.filterStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.filterEndDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    this.fetchCreditNotes();
  }

  openAddCreditNoteDialog() {
    const dialogRef = this.dialog.open(AddCreditNoteDialogComponent, {
      width: '800px',
      data: { type: 'supplier' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchCreditNotes();
      }
    });
  }

  deleteDocument(doc: Document) {
    const item = { id: doc.id, name: doc.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.docService.Delete(doc.id).subscribe({
          next: () => {
            this.toastr.success('Avoir supprimé avec succès');
            this.fetchCreditNotes();
          },
          error: () => this.toastr.error('Erreur lors de la suppression')
        });
      }
    });
  }

  getStatusInfo = getStatusInfo;
  getBillingStatusInfo = getBillingStatusInfo;

  onExport() {
    // Logic for exporting to Excel/PDF
  }
}
