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

import { roleGuard } from '../../guards/role.guard';
import { CanDeactivateGuard } from '../../guards/can-deactivate.guard';

const routes: Routes = [
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
    path: 'customerdelivery',
    component: ListCustomerDocumentsComponent
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
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MerchandiseRoutingModule { }
