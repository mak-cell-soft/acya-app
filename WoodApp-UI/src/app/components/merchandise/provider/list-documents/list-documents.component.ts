import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { DocumentService } from '../../../../services/components/document.service';
import { DocTypes_FR, Document, DocumentTypes } from '../../../../models/components/document';
import { MatTableDataSource } from '@angular/material/table';
import { ConfirmDeleteModalComponent } from '../../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { MAT_HEADER_CELL_DOC_IS_INVOICED, MAT_HEADER_CELL_DOC_NUMBER, MAT_HEADER_CELL_DOC_SUPPLIER, MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE, MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC, MAT_HEADER_CELL_DOC_TOTALNETHT, MAT_HEADER_CELL_DOC_TOTALNETTTC, MAT_HEADER_CELL_DOC_TOTALTVADOC, MAT_HEADER_CELL_DOC_TYPE, MAT_HEADER_CELL_DOC_UPDATEDBY, MAT_HEADER_CELL_DOC_UPDATEDDATE, NUMBER_OF_ROWS } from '../../../../shared/constants/components/reception';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPartType_FR, TrueFalseTranslate_FR } from '../../../../shared/constants/list_of_constants';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { GenerateInvoiceModalComponent } from '../../../../dashboard/modals/invoice/generate-invoice-modal/generate-invoice-modal.component';

@Component({
  selector: 'app-list-documents',
  templateUrl: './list-documents.component.html',
  styleUrl: './list-documents.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListDocumentsComponent implements OnInit, AfterViewInit {

  docService = inject(DocumentService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);
  counterpartService = inject(CounterpartService);
  fb = inject(FormBuilder);
  fb1 = inject(FormBuilder);

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


  documents: Document[] = [];
  selectedDocument!: Document | null;
  allSuppliers: CounterPart[] = [];
  errorMessage: string = '';

  loading: boolean = false; // Track loading state

  @ViewChild(MatPaginator) PaginationDocument!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  allDocuments: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  displayedDocumentsColumns: string[] = ['select', 'number', 'type', 'counterpart', 'supplierreference', 'TotalHTNet',
    'TotalDiscountDoc', 'TotalTVADoc', 'TotalNetTTC', 'LastModified', 'EditedBy', 'IsInvoiced', 'action'];
  columnsToDisplayWithExpand = [...this.displayedDocumentsColumns, 'expand'];
  filterForm!: FormGroup;

  /**
   * Filter Data Declaration
   */
  // Define dateRange object
  dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };
  selectedSupplier: CounterPart | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  isInvoiced: boolean | null = null; // true for "Facturé", false for "Non facturé"
  // Track selected rows
  selection = new SelectionModel<any>(true, []); // true = allow multiple selections


  expandedElement: Document | null = null;

  //#region Filter

  createForm() {
    // Get the first and last day of the current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.filterForm = this.fb.group({
      dateRange: this.fb.group({
        // start: [firstDayOfMonth], // Default to the first day of the current month
        // end: [lastDayOfMonth],    // Default to the last day of the current month
        start: [],
        end: [],
      }),
      selectedSupplier: [null],
      isInvoiced: [null],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAllDocumentsByType();
      this.getSuppliers();
      this.createForm();
    }
  }

  ngAfterViewInit() {
    this.allDocuments.paginator = this.PaginationDocument;
    this.allDocuments.sort = this.sort;
  }

  // Reset all filters
  resetFilters(): void {
    // Reset the form to its initial state (including the default date range)
    this.filterForm.reset({
      dateRange: {
        // start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of the current month
        // end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Last day of the current month
        start: '', // First day of the current month
        end: '', // Last day of the current month
      },
      /**
       * selected Supplier is not set to null, there is always a value
       * Need to be fixed
       */
      selectedSupplier: null,
      isInvoiced: null,

    });
    this.selection.clear(); // Deselect all
    // Reset the table to show all documents
    this.getAllDocumentsByType(); // Implement this method to fetch all documents
    this.getSuppliers();
  }

  // Apply filters
  applyFilters() {
    // Access the start and end dates from the dateRange object
    const startDate = this.dateRange.start;
    const endDate = this.dateRange.end;
    let filteredDocuments = this.allDocuments.data;

    // Filter by date range
    if (this.startDate && this.endDate) {
      filteredDocuments = filteredDocuments.filter(doc => {
        const docDate = new Date(doc.creationdate);
        return docDate >= this.startDate! && docDate <= this.endDate!;
      });
    }

    // Filter by supplier
    if (this.selectedSupplier) {
      console.log('Selected Supplier Id for Filter :', this.selectedSupplier.id)
      filteredDocuments = filteredDocuments.filter(doc => doc.counterpart.id === this.selectedSupplier!.id);
    }

    // Filter by invoiced status
    if (this.filterForm.get('isInvoiced')!.value !== null) {
      filteredDocuments = filteredDocuments.filter(doc => doc.isinvoiced === this.filterForm.get('isInvoiced')!.value);
    }

    // Update the table data source
    this.allDocuments.data = filteredDocuments;
  }

  //#endregion

  //#region Modal Invoice
  makeInvoiceDocuments(): void {
    const selectedRows = this.selection.selected;

    // Check if at least one row is selected
    if (selectedRows.length === 0) {
      this.errorMessage = 'Aucun document n\'a été sélectionné.';
      return;
    }

    // Check if more than one row is selected and if all counterpart IDs are the same
    if (selectedRows.length > 1) {
      const firstCounterpartId = selectedRows[0].counterpart.id;
      const allSameCounterpart = selectedRows.every(row => row.counterpart.id === firstCounterpartId);

      if (!allSameCounterpart) {
        this.errorMessage = 'Tous les documents doivent appartenir au même Fournisseur.';
        return;
      }

      // Check if there is one row with isinvoiced === true.
      if (selectedRows.some(row => row.isinvoiced === true)) {
        this.errorMessage = 'Vous ne pouvez pas créer une facture pour un document déjà facturé';
        return;
      }
    }



    // If all checks pass, proceed with the action (e.g., call a modal)
    this.errorMessage = ''; // Clear any previous error message
    this.callModal(selectedRows); // Replace this with your modal logic
  }

  // Example method to call a modal (replace with your actual modal logic)
  callModal(selectedDocs: Document[]): void {
    const dialogRef = this.dialog.open(GenerateInvoiceModalComponent, {
      width: '1000px',
      height: '1000px',
      maxWidth: '90vw',
      maxHeight: '85vh',
      data: {
        input: selectedDocs
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("Invoice Genration Object is ", result);

        // Create a new instance of `GenerateInvoice` and map values
        const newGenerateInvoice = ({
          docChildrenIds: result.docChildrenIds,
          docInvoice: result.docInvoice,
        });
        // Perform further actions with `newGenerateInvoice` if needed
      }
    });
  }

  clearErrorMessage(): void {
    this.errorMessage = '';
  }

  //#endregion

  getAllDocumentsByType() {
    this.allDocuments.data = [];
    this.docService.GetByType(DocumentTypes.supplierReceipt).subscribe({
      next: (response: Document[]) => {
        // Handle the data here
        // console.log('Data received:', response);
        // You can assign the data to a property in your component if needed
        // Sort the documents by docnumber in descending order
        const sortedDocuments = response.sort((a, b) => b.docnumber.localeCompare(a.docnumber));

        // Assign the sorted data to the property in your component
        this.allDocuments.data = sortedDocuments;
        console.log('this.allDocuments.data : ', this.allDocuments.data)
        //this.allDocuments.data = response; // Assuming you have a property named 'documents' in your component
      },
      error: (error) => {
        console.log(error)
      }
    });
  }

  getSuppliers(): void {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response: CounterPart[]) => {
        this.allSuppliers = response;

        // Set the first supplier after the data is fetched
        if (this.allSuppliers.length > 0) {
          const firstSupplier = this.allSuppliers[0];
          this.selectedSupplier = firstSupplier;
        }
      },
      error: (error) => {
        console.error('Error fetching providers', error);
        this.toastr.error('Erreur chargement Fournisseurs');
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allDocuments.filter = filterValue.trim().toLowerCase();

    if (this.PaginationDocument) {
      this.PaginationDocument.firstPage();
    }
  }

  cancelEditDocument(element: Document) {
    element.editing = false;
    this.selectedDocument = null;
  }

  editDocument(doc: Document) {
    doc.editing = true;
  }

  onSupplierChange(supplier: any): void {
    this.selectedSupplier = supplier;
    console.log('onSupplierChange Id is :', this.selectedSupplier!.id);
  }

  deleteDocument(element: Document) {
    const item = { id: element.id, name: element.docnumber };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Item deleted:', item);
        this.docService.Delete(element.id).subscribe({
          next: () => {
            this.allDocuments.data = this.allDocuments.data.filter(p => p.id !== element.id);
            this.toastr.success('Supplier deleted successfully');
          },
          error: () => this.toastr.error('Error deleting Supplier')
        });
      } else {
        this.toastr.info("Suppression anuulé");
        console.log('Deletion canceled');
      }
    });

  }

  getDocumentTypeDescription(type: DocumentTypes): string {
    return DocTypes_FR[DocumentTypes[type] as keyof typeof DocTypes_FR];
  }

  // Check if all rows are selected
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.allDocuments.data.length;
    return numSelected === numRows;
  }

  //#region Select Rows

  // Toggle select all rows
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear(); // Deselect all
    } else {
      this.allDocuments.data.forEach(row => this.selection.select(row)); // Select all
    }
  }

  // Toggle selection for a single row
  toggleSelection(row: any): void {
    this.selection.toggle(row);
  }

  // Check if some (but not all) rows are selected
  isSomeSelected(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  // Use the selected rows for further actions
  performActionOnSelectedRows(): void {
    const selectedRows = this.selection.selected;
    console.log('Selected Rows:', selectedRows);
    // Perform your desired action here
  }
  //#endregion

  // Method to translate true/false to Oui/Non
  translateTrueFalse(value: boolean): string {
    return TrueFalseTranslate_FR[value.toString() as keyof typeof TrueFalseTranslate_FR];
  }

}
