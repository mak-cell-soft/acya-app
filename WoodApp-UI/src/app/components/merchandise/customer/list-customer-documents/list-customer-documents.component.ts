import { Component, inject, OnInit, ViewChild, AfterViewInit, TemplateRef, ElementRef } from '@angular/core';
import { PaymentModalComponent } from '../../../../dashboard/modals/payment-modal/payment-modal.component';
import { DocumentConversionModalComponent } from './document-conversion-modal/document-conversion-modal.component';
import { DocumentDetailModalComponent } from './document-detail-modal/document-detail-modal.component';
import { Months_FR } from '../../../../shared/constants/list_of_constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MAT_HEADER_CELL_DOC_NUMBER, MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE, MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC, MAT_HEADER_CELL_DOC_TOTALNETHT, MAT_HEADER_CELL_DOC_TOTALNETTTC, MAT_HEADER_CELL_DOC_TOTALTVADOC, MAT_HEADER_CELL_DOC_UPDATEDDATE, NUMBER_OF_ROWS } from '../../../../shared/constants/components/reception';
import { SelectionModel } from '@angular/cdk/collections';
import { BillingStatus, DocStatus, DocStatus_FR, Document, DocumentTypes, PaymentInstrument, typeDocsToFilter } from '../../../../models/components/document';
import { Router } from '@angular/router';
import { format, getDaysInMonth, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentService } from '../../../../services/components/document.service';
import { PaymentService } from '../../../../services/components/payment.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { Payment } from '../../../../models/components/payment';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { getSharedPrintStyles } from '../../../../utils/print-styles.util';




@Component({
  selector: 'app-list-customer-documents',
  templateUrl: './list-customer-documents.component.html',
  styleUrl: './list-customer-documents.component.css'
})
export class ListCustomerDocumentsComponent implements OnInit, AfterViewInit {

  router = inject(Router);
  docService = inject(DocumentService);
  paymentService = inject(PaymentService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  toastr = inject(ToastrService);

  months = Months_FR;
  selectedMonth: string = '';
  searchKeyword: string = '';

  currentYear: number = 0;
  previousYear: number = 0;
  nextYear: number = 0;

  currentDate: Date = new Date();
  monthHeaderText: string = '';
  dateRangeText: string = '';

  daysInMonth: number[] = [];
  selectedDay: number = 1;

  //#region Labels
  mat_header_cell_doc_number: string = MAT_HEADER_CELL_DOC_NUMBER;
  mat_header_cell_doc_supplierReference: string = MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE;

  mat_header_cell_doc_TotalHTNet: string = MAT_HEADER_CELL_DOC_TOTALNETHT;
  mat_header_cell_doc_TotalDiscountDoc: string = MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC;
  mat_header_cell_doc_TotalTVADoc: string = MAT_HEADER_CELL_DOC_TOTALTVADOC;
  mat_header_cell_doc_TotalNetTTC: string = MAT_HEADER_CELL_DOC_TOTALNETTTC;
  mat_header_cell_doc_UpdatedDate: string = MAT_HEADER_CELL_DOC_UPDATEDDATE;
  Number_of_Rows: string = NUMBER_OF_ROWS;
  typefiltered: typeDocsToFilter = new typeDocsToFilter();
  //#endregion Labels

  allCustomerDeliveryNotes: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  displayedDeliveryNotesColumns: string[] = ['select', 'reference', 'date', 'counterPart', 'amount', 'status', 'isInvoiced', 'sellSite', 'action'];

  selection = new SelectionModel<any>(true, []); // true = allow multiple selections

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('printTemplate', { read: ElementRef }) printTemplate!: ElementRef;

  selectedDocumentForPrint: Document | null = null;

  ngAfterViewInit() {
    this.allCustomerDeliveryNotes.paginator = this.paginator;
  }

  ngOnInit() {
    // Set up years
    this.currentYear = new Date().getFullYear();
    this.previousYear = this.currentYear - 1;
    this.nextYear = this.currentYear + 1;

    // Get current month (1-12)
    const currentMonthIndex = new Date().getMonth() + 1;
    // Get French month name from the Months_FR object
    this.selectedMonth = this.months[currentMonthIndex as keyof typeof Months_FR];

    // Initialize selected day to current day
    this.selectedDay = new Date().getDate();

    console.log('Selected Month on Init:', this.selectedMonth);

    this.updateMonthHeader();
    this.updateDaysInMonth();

    // Filter by current day initially
    this.typefiltered = {
      typeDoc: DocumentTypes.customerDeliveryNote,
      month: currentMonthIndex,
      year: this.currentYear,
      day: this.selectedDay
    };
    this.filterByDay(this.selectedDay);
  }

  onExport() {
  }

  applyFilter(event: Event) {
  }

  onAddNewDocument() {
    this.router.navigateByUrl('home/customerdelivery/add')
  }

  //#region Head:months and Year
  getMonths(): string[] {
    return Object.values(this.months);
  }

  selectMonth(month: string) {
    this.selectedMonth = month;
    console.log('Month selected:', month);

    const monthIndex = this.getMonthKey(month);
    this.currentDate = new Date(this.currentYear, monthIndex, 1);

    this.updateMonthHeader();
    this.updateDaysInMonth();

    // Reset to day 1 when selecting a new month
    this.selectedDay = 1;
    this.filterByDay(this.selectedDay);
  }

  getMonthKey(monthName: string): number {
    return Number(
      Object.keys(this.months).find(key =>
        this.months[key as unknown as keyof typeof Months_FR] === monthName
      ) || 1
    ) - 1; // Month index is 0-11
  }

  getMonthValues(): string[] {
    return Object.values(this.months);
  }

  navigateYear(direction: 'prev' | 'next') {
    if (direction === 'prev') {
      this.currentYear--;
      this.previousYear--;
      this.nextYear--;
    } else {
      this.currentYear++;
      this.previousYear++;
      this.nextYear++;
    }
    this.currentDate.setFullYear(this.currentYear);
    this.updateMonthHeader();
    this.updateDaysInMonth();

    // Refresh data with current selection
    this.filterByDay(this.selectedDay);

    console.log('Current Year:', this.currentYear);
  }

  updateMonthHeader() {
    this.monthHeaderText = `Mois : ${format(this.currentDate, 'MMMM yyyy', { locale: fr })}`;
    this.dateRangeText = `${format(startOfMonth(this.currentDate), 'dd/MM')}-${format(endOfMonth(this.currentDate), 'dd/MM')}`;
    this.currentYear = this.currentDate.getFullYear();
  }

  updateDaysInMonth() {
    const daysCount = getDaysInMonth(this.currentDate);
    this.daysInMonth = Array.from({ length: daysCount }, (_, i) => i + 1);

    // If selected day is out of range for new month (e.g. 31st in Feb), reset to last day
    if (this.selectedDay > daysCount) {
      this.selectedDay = daysCount;
    }
  }

  selectDay(day: number) {
    this.selectedDay = day;
    this.filterByDay(day);
  }

  filterByDay(day: number) {
    this.typefiltered = {
      typeDoc: DocumentTypes.customerDeliveryNote,
      month: this.currentDate.getMonth() + 1,
      year: this.currentYear,
      day: day
    };
    this.getAllCustomerDeliveryNotesDocumentsFiltered(this.typefiltered);
  }

  navigateMonth(direction: 'prev' | 'next') {
    const change = direction === 'prev' ? -1 : 1;
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + change,
      1
    );
    this.currentYear = this.currentDate.getFullYear();
    this.previousYear = this.currentYear - 1;
    this.nextYear = this.currentYear + 1;
    this.updateMonthHeader();

    // Update selected month name
    const monthIndex = this.currentDate.getMonth() + 1;
    this.selectedMonth = this.months[monthIndex as keyof typeof Months_FR];

    this.updateDaysInMonth();

    // Reset to day 1
    this.selectedDay = 1;
    this.filterByDay(this.selectedDay);
  }
  //#endregion

  onDetail(doc: Document) {
    const dialogRef = this.dialog.open(DocumentDetailModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: doc
    });

    dialogRef.afterClosed().subscribe(result => {
      // Handle any actions after modal closes if needed
      console.log('Detail modal closed');
    });
  }

  onModify(note: any) {
    console.log('Modify:', note);
  }

  // Check if all rows are selected
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.allCustomerDeliveryNotes.data.length;
    return numSelected === numRows;
  }

  // Toggle select all rows
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear(); // Deselect all
    } else {
      this.allCustomerDeliveryNotes.data.forEach(row => this.selection.select(row)); // Select all
    }
  }

  // Check if some (but not all) rows are selected
  isSomeSelected(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  // Toggle selection for a single row
  toggleSelection(row: any): void {
    this.selection.toggle(row);
  }

  //#region Load Data

  /**
   * Get All Customer Delivery Notes by Filtered By Day, Month, Year and Type
   * Updated to get documents by type: customerDeliveryNote and month and Year
   */
  getAllCustomerDeliveryNotesDocumentsFiltered(_typefiltered: typeDocsToFilter) {
    this.allCustomerDeliveryNotes.data = [];
    this.docService.GetByTypeDocsFiltered(_typefiltered).subscribe({
      next: (response: Document[]) => {
        // Handle the data here
        // console.log('Data received:', response);
        // You can assign the data to a property in your component if needed
        // Sort the documents by docnumber in descending order
        const sortedDocuments = response.sort((a, b) => b.docnumber.localeCompare(a.docnumber));

        // Assign the sorted data to the property in your component
        this.allCustomerDeliveryNotes.data = sortedDocuments;
        console.log('this.allDocuments.data : ', this.allCustomerDeliveryNotes.data)
        //this.allDocuments.data = response; // Assuming you have a property named 'documents' in your component
      },
      error: (error) => {
        console.log(error)
      }
    });
  }


  /**
   * Get All Customer Delivery Notes
   * Updated to get documents by type: customerDeliveryNote and month and Year
   */
  getAllCustomerDeliveryNotesDocuments() {
    this.allCustomerDeliveryNotes.data = [];
    this.docService.GetByType(DocumentTypes.customerDeliveryNote).subscribe({
      next: (response: Document[]) => {
        // Handle the data here
        // console.log('Data received:', response);
        // You can assign the data to a property in your component if needed
        // Sort the documents by docnumber in descending order
        const sortedDocuments = response.sort((a, b) => b.docnumber.localeCompare(a.docnumber));

        // Assign the sorted data to the property in your component
        this.allCustomerDeliveryNotes.data = sortedDocuments;
        console.log('this.allDocuments.data : ', this.allCustomerDeliveryNotes.data)
        //this.allDocuments.data = response; // Assuming you have a property named 'documents' in your component
      },
      error: (error) => {
        console.log(error)
      }
    });
  }
  //#endregion
  //#region table effects
  DocStatus = DocStatus;
  getStatusInfo(status: DocStatus): { text: string, color: string } {
    switch (status) {
      case DocStatus.Delivered:
        return { text: DocStatus_FR.Delivered, color: '#4CAF50' }; // Green
      case DocStatus.Abandoned:
        return { text: DocStatus_FR.Abandoned, color: '#F44336' }; // Red
      case DocStatus.Created:
        return { text: DocStatus_FR.Created, color: '#2196F3' }; // Blue
      case DocStatus.Deleted:
        return { text: DocStatus_FR.Deleted, color: '#9E9E9E' }; // Grey
      case DocStatus.NotDelivered:
        return { text: DocStatus_FR.NotDelivered, color: '#FF9800' }; // Orange
      case DocStatus.NotConfirmed:
        return { text: DocStatus_FR.NotConfirmed, color: '#FFC107' }; // Amber
      case DocStatus.Confirmed:
        return { text: DocStatus_FR.Confirmed, color: '#4CAF50' }; // Green
      default:
        return { text: 'Inconnu', color: '#9E9E9E' };
    }
  }

  BillingStatus = BillingStatus;
  getBillingStatusInfo(status: BillingStatus): { text: string, color: string } {
    switch (status) {
      case BillingStatus.NotBilled:
        return { text: 'Non Payé', color: '#FF5722' }; // Deep Orange
      case BillingStatus.Billed:
        return { text: 'Payé', color: '#4CAF50' }; // Green
      case BillingStatus.PartiallyBilled:
        return { text: 'Partiellement Payé', color: '#FFC107' }; // Amber
      default:
        return { text: 'Non Payé', color: '#FF5722' };
    }
  }

  //#region Payment Modal
  // Payment Modal
  openPaymentModal(doc: Document) {
    const modalData = {
      documentId: doc.id,
      documentNumber: doc.docnumber,
      totalAmount: doc.total_net_ttc,
      remainingAmount: doc.total_net_ttc, // Needs actual remaining amount logic if available, using total for now as discussed
      // Retrieve counterpart fullname as owner
      ownerFullName: doc.counterpart?.name || doc.counterpart?.firstname + ' ' + doc.counterpart?.lastname || '',
      // Retrieve counterpart name/ID as porter
      porterName: doc.counterpart?.name || doc.counterpart?.firstname + ' ' + doc.counterpart?.lastname || '',
      porterId: doc.counterpart?.id || 0,
      // Additional document context
      billingStatus: doc.billingstatus,
      documentType: doc.type
    };

    const dialogRef = this.dialog.open(PaymentModalComponent, {
      width: '600px',
      disableClose: true,
      data: modalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.onPaymentSubmit(result, doc);
      }
    });
  }

  onPaymentSubmit(paymentResult: any, doc: Document) {
    console.log('Payment Submitted:', paymentResult);

    const payment = new Payment();
    payment.documentid = doc.id;
    payment.customerid = doc.counterpart.id;
    payment.paymentdate = paymentResult.date;
    payment.amount = paymentResult.amount;
    payment.paymentmethod = paymentResult.method;

    // Handle details
    if (paymentResult.details) {
      if (paymentResult.method === 'ESPECE') {
        payment.notes = paymentResult.details.notes || '';
      } else if (paymentResult.method === 'VIREMENT' || paymentResult.method === 'CARTE') {
        payment.reference = paymentResult.details.reference || '';
        payment.notes = paymentResult.details.notes || '';
      } else {
        // Store cheque/traite details in reference or notes (as JSON or formatted string)
        // Assuming reference column for number, and notes for JSON
        payment.reference = paymentResult.details.number || '';
        payment.notes = JSON.stringify(paymentResult.details);
      }
    }

    // Context fields
    payment.createdat = new Date();
    payment.createdby = this.authService.getUserDetail()?.fullname || ''; // Optional: if needed
    payment.updatedat = new Date();
    payment.updatedbyid = Number(this.authService.getUserDetail()?.id) || 0;

    this.paymentService.Add(payment).subscribe({
      next: (res) => {
        console.log('Payment saved successfully', res);
        // Refresh list or show success
        this.toggleSelection(doc); // Deselect if needed
        // Ideally reload the doc to update status
        // Filter by current day initially
        //this.filterByDay(this.selectedDay);
        doc.total_net_ttc -= payment.amount; // Optimistic update or refresh
        this.toastr.success('Payment effectué avec succès');
        this.getAllCustomerDeliveryNotesDocumentsFiltered(this.typefiltered);
      },
      error: (err) => {
        console.error('Error saving payment', err);
        this.toastr.error('Erreur lors de l\'enregistrement du paiement');
      }
    });

  }

  closePaymentModal() {
    this.dialog.closeAll();
    this.getAllCustomerDeliveryNotesDocumentsFiltered(this.typefiltered);
    // this.selectedDocument = null; // Property removed as not needed
  }
  //#endregion

  // Action Menu Methods
  onConvert(doc: Document) {
    if (doc.isinvoiced) {
      this.toastr.warning('Ce document est déjà facturé.');
      return;
    }

    const dialogRef = this.dialog.open(DocumentConversionModalComponent, {
      width: '600px',
      disableClose: true,
      data: { documents: [doc] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Refresh list if conversion was successful
        this.getAllCustomerDeliveryNotesDocumentsFiltered(this.typefiltered);
      }
    });
  }

  // Batch conversion
  makeInvoiceDocuments(): void {
    const selectedRows = this.selection.selected;

    // Check if at least one row is selected
    if (selectedRows.length === 0) {
      this.toastr.warning('Aucun document n\'a été sélectionné.');
      return;
    }

    // Check if any selected document is already invoiced
    if (selectedRows.some(row => row.isinvoiced === true)) {
      this.toastr.warning('Vous ne pouvez pas créer une facture pour un document déjà facturé.');
      return;
    }

    // If all checks pass, proceed with batch conversion
    const dialogRef = this.dialog.open(DocumentConversionModalComponent, {
      width: '600px',
      disableClose: true,
      data: { documents: selectedRows }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Refresh list and clear selection
        this.selection.clear();
        this.getAllCustomerDeliveryNotesDocumentsFiltered(this.typefiltered);
      }
    });
  }



  onPrint(doc: Document) {
    console.log('Print:', doc);

    // Set the document for the hidden print template
    this.selectedDocumentForPrint = doc;

    // Small delay to ensure Angular updates the input and renders the template
    setTimeout(() => {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        this.toastr.error('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups.');
        return;
      }

      // Get the rendered HTML from our hidden component
      const printContent = this.printTemplate.nativeElement.innerHTML;

      // Write content to the new window wrapping it in HTML structure with styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bon de Livraison - ${doc.docnumber}</title>
          <style>${getSharedPrintStyles()}</style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }, 100);
  }




  //#endregion
}
