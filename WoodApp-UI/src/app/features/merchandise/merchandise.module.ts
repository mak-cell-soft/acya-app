import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

import { MerchandiseRoutingModule } from './merchandise-routing.module';

import { AddSupplierReceiptComponent } from './provider/add-supplier-receipt/add-supplier-receipt.component';
import { ListSupplierReceiptsComponent } from './provider/list-supplier-receipts/list-supplier-receipts.component';
import { ListSupplierInvoicesComponent } from './provider/list-supplier-invoices/list-supplier-invoices.component';
import { CustomerAddDocumentComponent } from './customer/add-document/customer-add-document.component';
import { ListCustomerDocumentsComponent } from './customer/list-customer-documents/list-customer-documents.component';
import { ListCustomerInvoicesComponent } from './customer/list-customer-invoices/list-customer-invoices.component';
import { AddInvoiceComponent } from './customer/add-invoice/add-invoice.component';
import { AddSupplierOrderComponent } from './provider/supplier-order/add-supplier-order/add-supplier-order.component';
import { ListSupplierOrderComponent } from './provider/supplier-order/list-supplier-order/list-supplier-order.component';

// Modals inside merchandise
import { DocumentDetailModalComponent } from './customer/list-customer-documents/document-detail-modal/document-detail-modal.component';
import { DocumentConversionModalComponent } from './customer/list-customer-documents/document-conversion-modal/document-conversion-modal.component';
import { CustomerBatchConversionModalComponent } from './customer/list-customer-documents/customer-batch-conversion-modal/customer-batch-conversion-modal.component';

// Print components used only in merchandise
import { DeliveryNotePrintComponent } from '../../models/print-templates/delivery-note-print/delivery-note-print.component';
import { SupplierOrderPrintComponent } from '../../models/print-templates/supplier-order-print/supplier-order-print.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';

@NgModule({
  declarations: [
    AddSupplierReceiptComponent,
    ListSupplierReceiptsComponent,
    ListSupplierInvoicesComponent,
    CustomerAddDocumentComponent,
    ListCustomerDocumentsComponent,
    ListCustomerInvoicesComponent,
    AddInvoiceComponent,
    AddSupplierOrderComponent,
    ListSupplierOrderComponent,
    DocumentDetailModalComponent,
    DocumentConversionModalComponent,
    CustomerBatchConversionModalComponent,
    DeliveryNotePrintComponent,
    SupplierOrderPrintComponent
  ],
  imports: [
    CommonModule,
    MerchandiseRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatDividerModule,
    MatRadioModule
  ],
  providers: [
    DecimalPipe
  ]
})
export class MerchandiseModule { }
