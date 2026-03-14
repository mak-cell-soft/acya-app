import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListCustomersComponent } from './list-customers/list-customers.component';
import { AddCustomerComponent } from './add-customer/add-customer.component';
import { roleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: ListCustomersComponent
  },
  {
    path: 'add',
    component: AddCustomerComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomersRoutingModule { }
