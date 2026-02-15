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
          <style>${this.getPrintStyles()}</style>
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



  private getPrintStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
      /* Print Styles for COTUB Delivery Note */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
      }

      .delivery-note-container {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 10mm;
        background: #e8f5e9 !important;
        font-size: 9pt;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .header {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 10mm;
        margin-bottom: 8mm;
        padding-bottom: 5mm;
        border-bottom: 1px solid #000;
      }

      .company-info { text-align: left; }
      .company-name {
        font-size: 11pt;
        font-weight: bold;
        margin: 0 0 2mm 0;
      }
      .company-details {
        font-size: 7pt;
        margin: 1mm 0;
        line-height: 1.3;
      }

      .center-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5mm;
      }

      .logo {
        width: 60mm;
        height: 20mm;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #000;
      }

      .logo-text {
        font-size: 32pt;
        font-weight: bold;
        margin: 0;
        letter-spacing: 3px;
      }

      .location {
        text-align: center;
        font-weight: bold;
        font-size: 10pt;
        border: 1px solid #000;
        padding: 3mm 8mm;
      }

      .arabic-info {
        text-align: right;
        direction: rtl;
      }

      .arabic-text {
        font-size: 10pt;
        font-weight: bold;
        margin: 1mm 0;
      }

      .arabic-details {
        font-size: 7pt;
        margin: 1mm 0;
      }

      .original-label {
        font-size: 12pt;
        font-weight: bold;
        margin-top: 5mm;
        border: 2px solid #000;
        padding: 2mm 5mm;
        display: inline-block;
      }

      .document-header {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10mm;
        margin-bottom: 3mm;
      }

      .document-title-section {
        text-align: center;
        border: 2px solid #000;
        padding: 3mm;
      }

      .document-title {
        font-size: 14pt;
        font-weight: bold;
        margin: 0;
      }

      .document-subtitle {
        font-size: 12pt;
        font-weight: bold;
        margin: 2mm 0 0 0;
      }

      .client-info {
        border: 1px solid #000;
        padding: 3mm;
      }

      .info-row {
        display: flex;
        gap: 5mm;
        margin-bottom: 2mm;
      }

      .info-row .label {
        font-weight: bold;
        min-width: 20mm;
      }

      .document-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3mm;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        padding: 2mm 0;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        border-right: 1px solid #000;
        padding: 1mm 2mm;
      }

      .detail-item:last-child { border-right: none; }

      .detail-label {
        font-size: 8pt;
        font-weight: bold;
        margin-bottom: 1mm;
      }

      .barcode-section {
        text-align: center;
        margin: 3mm 0;
        height: 15mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .barcode-text {
        font-family: 'Courier New', monospace;
        font-size: 14pt;
        font-weight: bold;
        letter-spacing: 2px;
      }

      .region-info {
        display: flex;
        justify-content: flex-end;
        gap: 20mm;
        margin-bottom: 3mm;
      }

      .tva-label { font-weight: bold; font-size: 8pt; }

      .items-table-container { margin-bottom: 3mm; }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
      }

      .items-table th {
        border: 1px solid #000;
        padding: 2mm;
        font-size: 7pt;
        font-weight: bold;
        text-align: center;
      }

      .items-table td {
        border: 1px solid #000;
        padding: 1.5mm;
        font-size: 8pt;
        text-align: center;
      }

      .col-code { width: 25mm; }
      .col-designation { width: auto; text-align: left !important; }
      .col-unit { width: 10mm; }
      .col-qty { width: 15mm; }
      .col-price { width: 18mm; }
      .col-tva { width: 10mm; }
      .col-rm { width: 10mm; }
      .col-total { width: 22mm; }

      .empty-row td {
        height: 8mm;
        border-top: none;
        border-bottom: none;
      }

      .empty-row:last-child td { border-bottom: 1px solid #000; }

      .footer-section {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 5mm;
        margin-bottom: 3mm;
      }

      .tax-tables {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3mm;
      }

      .tax-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
      }

      .tax-table th, .tax-table td {
        border: 1px solid #000;
        padding: 1.5mm;
        font-size: 8pt;
        text-align: center;
      }

      .tax-table th {
        font-size: 7pt;
        font-weight: bold;
      }

      .amount-words {
        grid-column: 1 / 2;
        border: 1px solid #000;
        padding: 3mm;
        margin-top: 2mm;
      }

      .words-label {
        font-size: 7pt;
        font-weight: bold;
        display: block;
        margin-bottom: 2mm;
      }

      .words-value {
        font-size: 9pt;
        font-weight: bold;
        min-height: 10mm;
      }

      .totals-column {
        grid-column: 2 / 3;
        grid-row: 1 / 3;
        display: flex;
        flex-direction: column;
        gap: 2mm;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 2mm 3mm;
        border: 1px solid #000;
      }

      .total-label { font-weight: bold; font-size: 8pt; }
      .total-value { font-size: 9pt; font-weight: bold; }
      .total-ttc { font-size: 10pt; padding: 3mm; }

      .signature-section {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0;
        border: 1px solid #000;
        margin-bottom: 3mm;
      }

      .signature-box {
        border-right: 1px solid #000;
        padding: 2mm;
        min-height: 20mm;
        display: flex;
        flex-direction: column;
      }

      .signature-box:last-child { border-right: none; }

      .signature-label {
        font-size: 7pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2mm;
      }

      .signature-area {
        flex: 1;
        min-height: 15mm;
      }

      .cin-label {
        font-size: 7pt;
        margin-top: auto;
      }

      .footer-legal { margin-top: 3mm; }

      .legal-text {
        font-size: 6pt;
        margin: 1mm 0;
        line-height: 1.2;
      }

      .agency-info {
        font-size: 6pt;
        margin: 1mm 0;
        text-align: center;
        font-weight: bold;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        body { margin: 0; padding: 0; }

        .delivery-note-container {
          background: #e8f5e9 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
  }

  //#endregion
}
