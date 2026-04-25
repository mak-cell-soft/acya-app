import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_HEADER_CELL_DOC_IS_INVOICED, MAT_HEADER_CELL_DOC_NUMBER, MAT_HEADER_CELL_DOC_SUPPLIER, MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE, MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC, MAT_HEADER_CELL_DOC_TOTALNETHT, MAT_HEADER_CELL_DOC_TOTALNETTTC, MAT_HEADER_CELL_DOC_TOTALTVADOC, MAT_HEADER_CELL_DOC_TYPE, MAT_HEADER_CELL_DOC_UPDATEDBY, MAT_HEADER_CELL_DOC_UPDATEDDATE, NUMBER_OF_ROWS } from '../../../../shared/constants/components/reception';
import { DocTypes_FR, Document, DocumentTypes } from '../../../../models/components/document';
import { DocumentService } from '../../../../services/components/document.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { DocumentsRelationship } from '../../../../models/components/documentsrelationship';
import { getStatusInfo, getBillingStatusInfo, isSameDay } from '../../../../utils/document-utils';
import { WithholdingTaxModalComponent } from '../../../../shared/components/modals/withholding-tax-modal/withholding-tax-modal.component';
import { HoldingTaxService } from '../../../../services/components/holding-tax.service';
import { ListHoldingTaxesModalComponent } from '../../../dashboard/modals/holding-tax/list-holding-taxes-modal/list-holding-taxes-modal.component';
import { AddCreditNoteDialogComponent } from '../add-credit-note-dialog/add-credit-note-dialog.component';


@Component({
  selector: 'app-list-supplier-invoices',
  templateUrl: './list-supplier-invoices.component.html',
  styleUrl: './list-supplier-invoices.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListSupplierInvoicesComponent implements AfterViewInit, OnInit {

  docService = inject(DocumentService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  authService = inject(AuthenticationService);
  router = inject(Router);


  loading: boolean = false; // Track loading state
  errorMessage: string = '';
  selectedDocument!: Document | null;
  invoiceSettings: boolean = false;

  // Filters
  filterSupplier: string = '';
  filterDate: Date | null = null;
  filterStartDate: Date | undefined = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  filterEndDate: Date | undefined = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  allInvoices: MatTableDataSource<DocumentsRelationship> = new MatTableDataSource<DocumentsRelationship>();
  displayedInvoicessColumns: string[] = ['number', 'LastModified', 'counterpart', 'supplierreference', 'amount', 'payment', 'status', 'site', 'action'];
  columnsToDisplayWithExpand = [...this.displayedInvoicessColumns, 'expand'];

  expandedElement: DocumentsRelationship | null = null;

  // Summary
  totalHt: number = 0;
  totalTva: number = 0;
  totalTtc: number = 0;
  totalNetPayable: number = 0;
  totalCreditNotes: number = 0;
  totalRemaining: number = 0;
  invoiceCount: number = 0;

  @ViewChild(MatPaginator) PaginationInvoices!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  //#region Labels
  mat_header_cell_doc_number: string = MAT_HEADER_CELL_DOC_NUMBER;
  mat_header_cell_doc_type: string = MAT_HEADER_CELL_DOC_TYPE;
  mat_header_cell_doc_supplier: string = MAT_HEADER_CELL_DOC_SUPPLIER;
  mat_header_cell_doc_supplierReference: string = MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE;

  mat_header_cell_doc_TotalHTNet: string = MAT_HEADER_CELL_DOC_TOTALNETHT;
  mat_header_cell_doc_TotalDiscountDoc: string = MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC;
  mat_header_cell_doc_TotalTVADoc: string = MAT_HEADER_CELL_DOC_TOTALTVADOC;
  mat_header_cell_doc_TotalNetTTC: string = MAT_HEADER_CELL_DOC_TOTALNETTTC;
  mat_header_cell_doc_UpdatedDate: string = MAT_HEADER_CELL_DOC_UPDATEDDATE;
  mat_header_cell_doc_UpdatedBy: string = MAT_HEADER_CELL_DOC_UPDATEDBY;
  mat_header_cell_doc_IsInvoiced: string = MAT_HEADER_CELL_DOC_IS_INVOICED;
  Number_of_Rows: string = NUMBER_OF_ROWS;
  //#endregion

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.fetchInvoices();
    }
  }

  ngAfterViewInit() {
    this.allInvoices.paginator = this.PaginationInvoices;
    this.allInvoices.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allInvoices.filter = filterValue.trim().toLowerCase();

    if (this.PaginationInvoices) {
      this.PaginationInvoices.firstPage();
    }
  }

  clearErrorMessage(): void {
    this.errorMessage = '';
  }

  getDocumentTypeDescription(type: DocumentTypes): string {
    return DocTypes_FR[DocumentTypes[type] as keyof typeof DocTypes_FR];
  }

  cancelEditDocument(element: Document) {
    element.editing = false;
    this.selectedDocument = null;
  }

  editDocument(doc: Document | null) {
    if (doc) {
      doc.editing = true;
    }
  }

  // getAllDocumentsByType() {
  //   this.allInvoices.data = [];
  //   this.docService.GetByType(DocumentTypes.supplierInvoice).subscribe({
  //     next: (response: Document[]) => {
  //       // Handle the data here
  //       // console.log('Data received:', response);
  //       // You can assign the data to a property in your component if needed
  //       // Sort the documents by docnumber in descending order
  //       const sortedDocuments = response.sort((a, b) => b.docnumber.localeCompare(a.docnumber));

  //       // Assign the sorted data to the property in your component
  //       this.allInvoices.data = sortedDocuments;
  //       console.log('this.allInvoices.data : ', this.allInvoices.data)
  //       //this.allDocuments.data = response; // Assuming you have a property named 'documents' in your component
  //     },
  //     error: (error) => {
  //       console.log(error)
  //     }
  //   });
  // }

  fetchInvoices() {
    this.loading = true;
    this.docService.GetParentsWithChildren().subscribe({
      next: (response: DocumentsRelationship[]) => {
        let filteredData = response;

        // Ensure we are only dealing with provider invoices (parentDocument.type === DocumentTypes.supplierInvoice)
        filteredData = filteredData.filter(d => d.parentDocument?.type === DocumentTypes.supplierInvoice);

        if (this.filterDate && !this.filterStartDate && !this.filterEndDate) {
          filteredData = filteredData.filter(d => d.parentDocument && isSameDay(d.parentDocument.updatedate, this.filterDate!));
        }

        if (this.filterStartDate && this.filterEndDate) {
          filteredData = filteredData.filter(d => {
            if (!d.parentDocument) return false;
            const docDate = new Date(d.parentDocument.updatedate);
            return docDate >= this.filterStartDate! && docDate <= this.filterEndDate!;
          });
        }

        if (this.filterSupplier) {
          const search = this.filterSupplier.toLowerCase();
          filteredData = filteredData.filter(d =>
            (d.parentDocument?.counterpart?.name?.toLowerCase() || '').includes(search) ||
            (d.parentDocument?.counterpart?.firstname?.toLowerCase() || '').includes(search) ||
            (d.parentDocument?.counterpart?.lastname?.toLowerCase() || '').includes(search)
          );
        }

        // Sort descending by document number
        filteredData.sort((a, b) => {
          const docNumberA = a.parentDocument?.docnumber ?? '';
          const docNumberB = b.parentDocument?.docnumber ?? '';
          return docNumberB.localeCompare(docNumberA);
        });

        this.allInvoices.data = filteredData;
        this.updateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Erreur lors du chargement des factures');
        this.loading = false;
      }
    });
  }

  navigateToPayments() {
    this.router.navigate(['home/merchandise/supplier-invoices/payments'], {
      queryParams: { supplierId: this.filterSupplier || null }
    });
  }

  onFilterChange() {
    this.fetchInvoices();
  }

  /** Reset all filters back to the current-month default */
  clearFilters(): void {
    this.filterSupplier = '';
    this.filterDate = null;
    this.filterStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.filterEndDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    this.fetchInvoices();
  }

  onSingleDateSelected(date: Date | null) {
    if (date) {
      // Clear range when a specific date is chosen
      this.filterStartDate = undefined;
      this.filterEndDate = undefined;
    }
    this.filterDate = date;
    this.onFilterChange();
  }

  onRangeDateSelected() {
    if (this.filterStartDate || this.filterEndDate) {
      // Clear single date when range is active
      this.filterDate = null;
    }
    this.onFilterChange();
  }

  updateSummary() {
    this.invoiceCount = this.allInvoices.data.length;
    this.totalHt = this.allInvoices.data.reduce((acc, curr) => acc + (curr.parentDocument?.total_ht_net_doc || 0), 0);
    this.totalTva = this.allInvoices.data.reduce((acc, curr) => acc + (curr.parentDocument?.total_tva_doc || 0), 0);
    this.totalTtc = this.totalHt + this.totalTva;
    
    // Theoretical net (TTC - RS)
    this.totalNetPayable = this.allInvoices.data.reduce((acc, curr) => {
      const doc = curr.parentDocument;
      if (!doc) return acc;
      return acc + (doc.total_net_payable ?? doc.total_net_ttc ?? 0);
    }, 0);

    // Sum of all credit notes linked to these invoices
    this.totalCreditNotes = this.allInvoices.data.reduce((acc, curr) => {
        return acc + (curr.parentDocument?.total_credit_notes || 0);
    }, 0);

    // Actual remaining balance (NetPayable - Paid - CreditNotes)
    this.totalRemaining = this.allInvoices.data.reduce((acc, curr) => {
        return acc + (curr.parentDocument?.remaining_balance || 0);
    }, 0);
  }

  deleteDocument(element: Document | null) {
    if (!element) return;
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.docService.Delete(element.id).subscribe({
          next: () => {
            this.allInvoices.data = this.allInvoices.data.filter(p => p.parentDocumentId !== element.id);
            this.updateSummary();
            this.toastr.success('Facture supprimée avec succès');
          },
          error: () => this.toastr.error('Erreur lors de la suppression de la facture')
        });
      }
    });
  }

  getReceipts(element: DocumentsRelationship) {
    return element.childDocuments?.filter(d => d.type === 2) || []; // supplierReceipt
  }

  getCreditNotes(element: DocumentsRelationship) {
    return element.childDocuments?.filter(d => d.type === 8) || []; // supplierInvoiceReturn
  }

  // Helpers for Status
  getStatusInfo = getStatusInfo;
  getBillingStatusInfo = getBillingStatusInfo;

  getPaymentStatusClass(doc: Document | null): string {
      if (!doc) return 'badge-unpaid';
      const total = doc.total_net_payable ?? doc.total_net_ttc ?? 0;
      const paid = doc.total_paid ?? 0;
      const remaining = doc.remaining_balance ?? (total - paid);

      if (paid >= total && total > 0) return 'badge-paid';
      if (paid > 0 && remaining > 0) return 'badge-partial';
      return 'badge-unpaid';
  }

  getPaymentStatusText(doc: Document | null): string {
      if (!doc) return 'Non payé';
      const total = doc.total_net_payable ?? doc.total_net_ttc ?? 0;
      const paid = doc.total_paid ?? 0;
      const remaining = doc.remaining_balance ?? (total - paid);

      if (paid >= total && total > 0) return 'Payé';
      if (paid > 0 && remaining > 0) return 'Partiel';
      return 'Non payé';
  }

  toggleExpand(element: DocumentsRelationship) {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  onExport() {
    // Implement export if needed
  }

  onAddNew() {
    // Implement navigation to add invoice
  }

  holdingTaxService = inject(HoldingTaxService);

  openHoldingTaxModal(doc: Document | null) {
    if (!doc) return;
    const dialogRef = this.dialog.open(WithholdingTaxModalComponent, {
      width: '600px',
      data: { document: doc }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        doc.holdingtax = result;
        // The summary update in list-supplier-invoices uses doc.total_net_payable
        doc.total_net_payable = result.newamountdocvalue;
        this.updateSummary();

        // Save to backend
        this.holdingTaxService.applyToDocument(doc.id, result).subscribe({
          next: () => this.toastr.success('Retenue à la source mise à jour'),
          error: (err) => {
            if (err.error && err.error.message === 'Retenue existe déjà') {
              this.toastr.warning('Retenue existe déjà', 'RS');
            } else {
              this.toastr.error('Erreur lors de la mise à jour de la RS');
            }
          }
        });
      }
    });
  }

  openListHoldingTaxesModal() {
    this.dialog.open(ListHoldingTaxesModalComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '95vh',
    });
  }

  createCreditNote(doc: Document | null) {
    const dialogRef = this.dialog.open(AddCreditNoteDialogComponent, {
      width: '800px',
      data: { type: 'supplier', invoice: doc }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchInvoices();
      }
    });
  }

}
