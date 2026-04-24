import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddSupplierReceiptComponent } from './provider/add-supplier-receipt/add-supplier-receipt.component';
import { ListSupplierReceiptsComponent } from './provider/list-supplier-receipts/list-supplier-receipts.component';
import { ListSupplierInvoicesComponent } from './provider/list-supplier-invoices/list-supplier-invoices.component';
import { CustomerAddDocumentComponent } from './customer/add-document/customer-add-document.component';
import { ListCustomerDocumentsComponent } from './customer/list-customer-documents/list-customer-documents.component';
import { ListCustomerInvoicesComponent } from './customer/list-customer-invoices/list-customer-invoices.component';
import { AddInvoiceComponent } from './customer/add-invoice/add-invoice.component';
import { AddSupplierOrderComponent } from './provider/supplier-order/add-supplier-order/add-supplier-order.component';
import { ListSupplierOrderComponent } from './provider/supplier-order/list-supplier-order/list-supplier-order.component';
import { EditSupplierReceiptComponent } from './provider/edit-supplier-receipt/edit-supplier-receipt.component';
import { EditCustomerDocumentComponent } from './customer/edit-document/edit-customer-document.component';

// ── Customer Quote (Devis) components ──────────────────────────────────────
import { ListCustomerQuotesComponent } from './customer/customer-quote/list-customer-quotes/list-customer-quotes.component';
import { AddCustomerQuoteComponent } from './customer/customer-quote/add-customer-quote/add-customer-quote.component';

// ── Customer Order (Bon de Commande) components ────────────────────────────
import { ListCustomerOrdersComponent } from './customer/customer-order/list-customer-orders/list-customer-orders.component';
import { AddCustomerOrderComponent } from './customer/customer-order/add-customer-order/add-customer-order.component';

import { roleGuard } from '../../guards/role.guard';
import { CanDeactivateGuard } from '../../guards/can-deactivate.guard';
import { SupplierPaymentsComponent } from './provider/supplier-payments/supplier-payments.component';
import { ListSupplierCreditNotesComponent } from './provider/list-supplier-credit-notes/list-supplier-credit-notes.component';

const routes: Routes = [
  {
    path: 'supplier-invoices/payments',
    component: SupplierPaymentsComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'reception',
    component: AddSupplierReceiptComponent,
    canDeactivate: [CanDeactivateGuard]
  },
  {
    path: 'reception/list',
    component: ListSupplierReceiptsComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'reception/edit/:id',
    component: EditSupplierReceiptComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'sinvoices',
    component: ListSupplierInvoicesComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'scredit-notes',
    component: ListSupplierCreditNotesComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'customerdelivery',
    component: ListCustomerDocumentsComponent
  },
  {
    path: 'customerdelivery/edit/:id',
    component: EditCustomerDocumentComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'customerinvoices',
    component: ListCustomerInvoicesComponent
  },
  {
    path: 'customerinvoices/add',
    component: AddInvoiceComponent
  },
  {
    path: 'customerdelivery/add',
    component: CustomerAddDocumentComponent
  },
  {
    path: 'supplierorder/add',
    component: AddSupplierOrderComponent
  },
  {
    path: 'supplierorder/list',
    component: ListSupplierOrderComponent
  },

  // ── Customer Quote (Devis) routes ──────────────────────────────────────
  // Matches menu routerLink="merchandise/devis"
  {
    path: 'devis',
    redirectTo: 'devis/list',
    pathMatch: 'full'
  },
  {
    path: 'devis/list',
    component: ListCustomerQuotesComponent
  },
  {
    path: 'devis/add',
    component: AddCustomerQuoteComponent
  },

  // ── Customer Order (Bon de Commande) routes ────────────────────────────
  // Matches menu routerLink="merchandise/bc"
  {
    path: 'bc',
    redirectTo: 'bc/list',
    pathMatch: 'full'
  },
  {
    path: 'bc/list',
    component: ListCustomerOrdersComponent
  },
  {
    path: 'bc/add',
    component: AddCustomerOrderComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MerchandiseRoutingModule { }
