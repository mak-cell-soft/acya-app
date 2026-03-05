import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_HEADER_CELL_DOC_IS_INVOICED, MAT_HEADER_CELL_DOC_NUMBER, MAT_HEADER_CELL_DOC_SUPPLIER, MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE, MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC, MAT_HEADER_CELL_DOC_TOTALNETHT, MAT_HEADER_CELL_DOC_TOTALNETTTC, MAT_HEADER_CELL_DOC_TOTALTVADOC, MAT_HEADER_CELL_DOC_TYPE, MAT_HEADER_CELL_DOC_UPDATEDBY, MAT_HEADER_CELL_DOC_UPDATEDDATE, NUMBER_OF_ROWS } from '../../../../shared/constants/components/reception';
import { DocTypes_FR, Document, DocumentTypes } from '../../../../models/components/document';
import { DocumentService } from '../../../../services/components/document.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteModalComponent } from '../../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { DocumentsRelationship } from '../../../../models/components/documentsrelationship';
import { getStatusInfo, getBillingStatusInfo, isSameDay } from '../../../../utils/document-utils';

@Component({
  selector: 'app-list-invoices',
  templateUrl: './list-invoices.component.html',
  styleUrl: './list-invoices.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListInvoicesComponent implements AfterViewInit, OnInit {

  docService = inject(DocumentService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  authService = inject(AuthenticationService);


  loading: boolean = false; // Track loading state
  errorMessage: string = '';
  selectedDocument!: Document | null;
  invoiceSettings: boolean = false;

  // Filters
  filterSupplier: string = '';
  filterDate: Date | null = new Date(); // Default to today
  filterStartDate?: Date;
  filterEndDate?: Date;

  allInvoices: MatTableDataSource<DocumentsRelationship> = new MatTableDataSource<DocumentsRelationship>();
  displayedInvoicessColumns: string[] = ['number', 'LastModified', 'counterpart', 'supplierreference', 'amount', 'status', 'site', 'action'];
  columnsToDisplayWithExpand = [...this.displayedInvoicessColumns, 'expand'];

  expandedElement: Document | null = null;

  // Summary
  totalHt: number = 0;
  totalTva: number = 0;
  totalTtc: number = 0;
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

  editDocument(doc: Document) {
    doc.editing = true;
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

        // Ensure we are only dealing with provider invoices (ParentDocument.type === DocumentTypes.supplierInvoice)
        filteredData = filteredData.filter(d => d.ParentDocument?.type === DocumentTypes.supplierInvoice);

        // Filter by Date (Single Date)
        if (this.filterDate && !this.filterStartDate && !this.filterEndDate) {
          filteredData = filteredData.filter(d => d.ParentDocument && isSameDay(d.ParentDocument.updatedate, this.filterDate!));
        }

        // Filter by Date Range
        if (this.filterStartDate && this.filterEndDate) {
          filteredData = filteredData.filter(d => {
            if (!d.ParentDocument) return false;
            const docDate = new Date(d.ParentDocument.updatedate);
            return docDate >= this.filterStartDate! && docDate <= this.filterEndDate!;
          });
        }

        // Filter by Supplier (Counterpart)
        if (this.filterSupplier) {
          const search = this.filterSupplier.toLowerCase();
          filteredData = filteredData.filter(d =>
            d.ParentDocument?.counterpart?.name?.toLowerCase().includes(search) ||
            d.ParentDocument?.counterpart?.firstname?.toLowerCase().includes(search) ||
            d.ParentDocument?.counterpart?.lastname?.toLowerCase().includes(search)
          );
        }

        // Sort descending by document number
        filteredData.sort((a, b) => {
          const docNumberA = a.ParentDocument?.docnumber ?? '';
          const docNumberB = b.ParentDocument?.docnumber ?? '';
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

  onFilterChange() {
    this.fetchInvoices();
  }

  updateSummary() {
    this.invoiceCount = this.allInvoices.data.length;
    this.totalHt = this.allInvoices.data.reduce((acc, curr) => acc + (curr.ParentDocument?.total_ht_net_doc || 0), 0);
    this.totalTva = this.allInvoices.data.reduce((acc, curr) => acc + (curr.ParentDocument?.total_tva_doc || 0), 0);
    this.totalTtc = this.totalHt + this.totalTva;
  }

  deleteDocument(element: Document) {
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.docService.Delete(element.id).subscribe({
          next: () => {
            this.allInvoices.data = this.allInvoices.data.filter(p => p.ParentDocumentId !== element.id);
            this.updateSummary();
            this.toastr.success('Facture supprimée avec succès');
          },
          error: () => this.toastr.error('Erreur lors de la suppression de la facture')
        });
      }
    });
  }

  // Helpers for Status
  getStatusInfo = getStatusInfo;
  getBillingStatusInfo = getBillingStatusInfo;

  displaySettings() {
    this.invoiceSettings = !this.invoiceSettings;
  }

  onExport() {
    // Implement export if needed
  }

  onAddNew() {
    // Implement navigation to add invoice
  }

}
