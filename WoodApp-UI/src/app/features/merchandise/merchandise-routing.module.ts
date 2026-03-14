import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddDocumentComponent } from './provider/add-document/add-document.component';
import { ListDocumentsComponent } from './provider/list-documents/list-documents.component';
import { ListInvoicesComponent } from './provider/list-invoices/list-invoices.component';
import { CustomerAddDocumentComponent } from './customer/add-document/customer-add-document.component';
import { ListCustomerDocumentsComponent } from './customer/list-customer-documents/list-customer-documents.component';
import { ListCustomerInvoicesComponent } from './customer/list-customer-invoices/list-customer-invoices.component';
import { AddInvoiceComponent } from './customer/add-invoice/add-invoice.component';
import { AddSupplierOrderComponent } from './provider/supplier-order/add-supplier-order/add-supplier-order.component';
import { ListSupplierOrderComponent } from './provider/supplier-order/list-supplier-order/list-supplier-order.component';

import { roleGuard } from '../../guards/role.guard';
import { CanDeactivateGuard } from '../../guards/can-deactivate.guard';

const routes: Routes = [
  {
    path: 'reception',
    component: AddDocumentComponent,
    canDeactivate: [CanDeactivateGuard]
  },
  {
    path: 'reception/list',
    component: ListDocumentsComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  },
  {
    path: 'sinvoices',
    component: ListInvoicesComponent,
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
