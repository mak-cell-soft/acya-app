import { Component, inject, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
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

  onDownload(doc: Document) {
    console.log('Download:', doc);
    // Implement download logic
  }

  onPrint(doc: Document) {
    console.log('Print:', doc);

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      this.toastr.error('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups.');
      return;
    }

    // Generate the print HTML
    const printContent = this.generatePrintHTML(doc);

    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Optionally close after printing
        // printWindow.close();
      }, 500);
    };
  }

  /**
   * Generate complete HTML for print window including the delivery note template
   */
  private generatePrintHTML(doc: Document): string {
    const companyInfo = {
      name: 'COMPTOIR TUNISIEN DE BATIMENT',
      nameFr: 'S.A. au Capital de 14.625.000 DT',
      arabicName: 'المصرف التونسي للبناء',
      arabicCapital: 'شركة خفية الإسم رأس مالها 14.625.000',
      address: 'Siège Social: Rte de Tunis km 0.5 - 3002 Sfax',
      contact: 'Tél.: 74 235 225 - Fax.: 74 235 363\nTél.: 74 487 555 - Fax.: 74 487 544',
      ccb: 'CCB: BT SFAX 05 700 0000 19 3020 45 391',
      email: 'E-mail: commercial@cotub.com.tn',
      registration: 'Z.I CHARGUIA | 2035 Tunis',
      phone: 'Tél: 71 807 655-Fax :71 794 974',
      location: 'TUNIS\nBORJ TOUIL',
      footer: 'Ce bon de livraison doit être signé pour réalisation ou la marchandise livrée est de de la société ne peut garantir la décoloration de la marchandise et de l\'aspect extérieur.',
      agencyInfo: 'Agence: Charguia | Tunis - Tél : 71 807 655/ Borj Touil Ariana - Tél : 71 780 903 R.C. : B 177791996 Code en Douane :220.111.8 TVA :0023755 C/A/M000'
    };

    const clientName = doc.counterpart?.name || `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`.trim();
    const clientAddress = doc.counterpart?.address || '';
    const tvaCode = doc.counterpart?.taxregistrationnumber || '';
    const gouvernorate = doc.counterpart?.gouvernorate || '';
    const accountNumber = doc.counterpart?.id?.toString() || '';
    const formattedDate = this.formatDateForPrint(doc.creationdate);
    const amountInWords = this.numberToFrenchWords(doc.total_net_ttc);
    const tvaBreakdown = this.getTvaBreakdownForPrint(doc);

    // Generate merchandise rows
    let merchandiseRows = '';
    doc.merchandises?.forEach(merch => {
      merchandiseRows += `
        <tr class="item-row">
          <td class="col-code">${merch.article?.reference || ''}</td>
          <td class="col-designation">${merch.article?.description || ''}</td>
          <td class="col-unit">${merch.article?.unit || 'PCS'}</td>
          <td class="col-qty">${this.formatNumberForPrint(merch.quantity)}</td>
          <td class="col-price">${this.formatNumberForPrint(merch.unit_price_ht)}</td>
          <td class="col-tva">${merch.article?.tva?.value || 0}</td>
          <td class="col-rm">${this.formatNumberForPrint(merch.discount_percentage)}</td>
          <td class="col-total">${this.formatNumberForPrint(merch.cost_net_ht)}</td>
        </tr>
      `;
    });

    // Add empty rows for spacing
    for (let i = 0; i < 8; i++) {
      merchandiseRows += '<tr class="empty-row"><td colspan="8">&nbsp;</td></tr>';
    }

    // Generate TVA breakdown rows
    let tvaRows = '';
    tvaBreakdown.forEach(tva => {
      tvaRows += `
        <tr>
          <td>TVA</td>
          <td>${this.formatNumberForPrint(tva.base)}</td>
          <td>${tva.percentage}</td>
          <td>${this.formatNumberForPrint(tva.value)}</td>
        </tr>
      `;
    });
    if (tvaBreakdown.length === 0) {
      tvaRows = '<tr><td colspan="4">&nbsp;</td></tr>';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bon de Livraison - ${doc.docnumber}</title>
        <style>${this.getPrintStyles()}</style>
      </head>
      <body>
        <div class="delivery-note-container">
          <!-- Header Section -->
          <div class="header">
            <div class="company-info">
              <h2 class="company-name">${companyInfo.name}</h2>
              <p class="company-details">${companyInfo.nameFr}</p>
              <p class="company-details">${companyInfo.address}</p>
              <p class="company-details" style="white-space: pre-line;">${companyInfo.contact}</p>
              <p class="company-details">${companyInfo.ccb}</p>
              <p class="company-details">${companyInfo.email}</p>
              <p class="company-details">${companyInfo.registration}</p>
              <p class="company-details">${companyInfo.phone}</p>
            </div>
            <div class="center-section">
              <div class="logo">
                <h1 class="logo-text">COTUB</h1>
              </div>
              <div class="location">
                <p style="white-space: pre-line;">${companyInfo.location}</p>
              </div>
            </div>
            <div class="arabic-info">
              <p class="arabic-text">${companyInfo.arabicName}</p>
              <p class="arabic-text">${companyInfo.arabicCapital}</p>
              <p class="arabic-details">مقرها الاجتماعي: طريق تونس كلم 0.5 صفاقس</p>
              <p class="arabic-details">تونس، المنطقة الصناعية الشرقية 2035</p>
              <h3 class="original-label">ORIGINAL CLIENT</h3>
            </div>
          </div>

          <!-- Document Title and Client Info -->
          <div class="document-header">
            <div class="document-title-section">
              <h2 class="document-title">BON DE LIVRAISON</h2>
              <h3 class="document-subtitle">CREDIT</h3>
            </div>
            <div class="client-info">
              <div class="info-row">
                <span class="label">Client:</span>
                <span class="value">${clientName}</span>
              </div>
              <div class="info-row">
                <span class="label">Adresse:</span>
                <span class="value">${clientAddress}</span>
              </div>
            </div>
          </div>

          <!-- Document Details -->
          <div class="document-details">
            <div class="detail-item">
              <span class="detail-label">DATE</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">N° BL</span>
              <span class="detail-value">${doc.docnumber}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">N° COMPTE</span>
              <span class="detail-value">${accountNumber}</span>
            </div>
          </div>

          <!-- Barcode -->
          <div class="barcode-section">
            <div class="barcode-text">${doc.docnumber}</div>
          </div>

          <!-- Region and TVA Code -->
          <div class="region-info">
            <div class="region-item">
              <span class="region-value">${gouvernorate}</span>
            </div>
            <div class="tva-item">
              <span class="tva-label">Code TVA:</span>
              <span class="tva-value">${tvaCode}</span>
            </div>
          </div>

          <!-- Items Table -->
          <div class="items-table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="col-code">CODE PRODUIT</th>
                  <th class="col-designation">DESIGNATIONS</th>
                  <th class="col-unit">U</th>
                  <th class="col-qty">QTE</th>
                  <th class="col-price">P.U.H.T</th>
                  <th class="col-tva">TVA</th>
                  <th class="col-rm">RM</th>
                  <th class="col-total">MONTANT HT</th>
                </tr>
              </thead>
              <tbody>
                ${merchandiseRows}
              </tbody>
            </table>
          </div>

          <!-- Footer Section -->
          <div class="footer-section">
            <div class="tax-tables">
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>Taxe</th>
                    <th>Base</th>
                    <th>%</th>
                    <th>Valeur</th>
                  </tr>
                </thead>
                <tbody>${tvaRows}</tbody>
              </table>
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>Taxe</th>
                    <th>Base</th>
                    <th>%</th>
                    <th>Valeur</th>
                  </tr>
                </thead>
                <tbody><tr><td colspan="4">&nbsp;</td></tr></tbody>
              </table>
            </div>
            <div class="amount-words">
              <span class="words-label">ARRETE LA PRESENTE A LA SOMME DE :</span>
              <p class="words-value">${amountInWords}</p>
            </div>
            <div class="totals-column">
              <div class="total-row">
                <span class="total-label">TOTAL H.T.V.A</span>
                <span class="total-value">${this.formatNumberForPrint(doc.total_ht_net_doc)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">TOTAL TVA</span>
                <span class="total-value">${this.formatNumberForPrint(doc.total_tva_doc)}</span>
              </div>
              <div class="total-row total-ttc">
                <span class="total-label">TOTAL TTC</span>
                <span class="total-value">${this.formatNumberForPrint(doc.total_net_ttc)}</span>
              </div>
            </div>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <span class="signature-label">SIGN. CLIENT</span>
              <div class="signature-area"></div>
            </div>
            <div class="signature-box">
              <span class="signature-label">N° CAMION</span>
              <div class="signature-area"></div>
            </div>
            <div class="signature-box">
              <span class="signature-label">NOM CHAUFFEUR</span>
              <div class="signature-area"></div>
              <span class="cin-label">C.I.N :</span>
            </div>
            <div class="signature-box">
              <span class="signature-label">CONTROL BL</span>
              <div class="signature-area"></div>
            </div>
            <div class="signature-box">
              <span class="signature-label">CONTROL SORTIE</span>
              <div class="signature-area"></div>
            </div>
          </div>

          <!-- Footer Legal Text -->
          <div class="footer-legal">
            <p class="legal-text">${companyInfo.footer}</p>
            <p class="agency-info">${companyInfo.agencyInfo}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private formatDateForPrint(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  private formatNumberForPrint(value: number | undefined): string {
    if (value === undefined || value === null) return '0,000';
    return value.toFixed(3).replace('.', ',');
  }

  private getTvaBreakdownForPrint(doc: Document): Array<{ base: number; percentage: number; value: number }> {
    const breakdown: { [key: number]: { base: number; value: number } } = {};

    doc.merchandises?.forEach(merch => {
      const tvaRate = merch.article?.tva?.value || 0;
      const base = merch.cost_net_ht || 0;
      const tvaValue = merch.tva_value || 0;

      if (!breakdown[Number(tvaRate)]) {
        breakdown[Number(tvaRate)] = { base: 0, value: 0 };
      }

      breakdown[Number(tvaRate)].base += base;
      breakdown[Number(tvaRate)].value += tvaValue;
    });

    return Object.keys(breakdown).map(rate => {
      const numRate = Number(rate);
      return {
        base: breakdown[numRate].base,
        percentage: numRate,
        value: breakdown[numRate].value
      };
    });
  }

  private numberToFrenchWords(amount: number): string {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    const dinars = Math.floor(amount);
    const millimes = Math.round((amount - dinars) * 1000);

    let result = '';

    if (dinars === 0) {
      result = 'ZERO DINAR';
    } else {
      const thousands = Math.floor(dinars / 1000);
      const remainder = dinars % 1000;

      if (thousands > 0) {
        if (thousands === 1) {
          result += 'MILLE ';
        } else {
          result += this.convertHundreds(thousands, units, teens, tens) + ' MILLE ';
        }
      }

      if (remainder > 0) {
        result += this.convertHundreds(remainder, units, teens, tens) + ' ';
      }

      result += dinars > 1 ? 'DINARS' : 'DINAR';
    }

    if (millimes > 0) {
      result += ' ' + this.convertHundreds(millimes, units, teens, tens) + ' MILLIMES';
    }

    return result.trim();
  }

  private convertHundreds(num: number, units: string[], teens: string[], tens: string[]): string {
    let result = '';
    const hundredsDigit = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundredsDigit > 0) {
      if (hundredsDigit === 1) {
        result += 'CENT ';
      } else {
        result += units[hundredsDigit] + ' CENT ';
      }
    }

    if (remainder >= 10 && remainder < 20) {
      result += teens[remainder - 10];
    } else {
      const tensDigit = Math.floor(remainder / 10);
      const unitsDigit = remainder % 10;

      if (tensDigit > 0) {
        result += tens[tensDigit];
        if (unitsDigit > 0) {
          result += ' ' + units[unitsDigit];
        }
      } else if (unitsDigit > 0) {
        result += units[unitsDigit];
      }
    }

    return result.trim();
  }

  private getPrintStyles(): string {
    return `
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
