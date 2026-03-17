import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListSuppliersComponent } from './list-suppliers/list-suppliers.component';
import { AddProviderComponent } from './add-provider/add-provider.component';
import { roleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: ListSuppliersComponent
  },
  {
    path: 'add',
    component: AddProviderComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProvidersRoutingModule { }
