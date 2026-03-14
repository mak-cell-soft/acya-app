import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListProviderComponent } from './list-provider/list-provider.component';
import { AddProviderComponent } from './add-provider/add-provider.component';
import { roleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: ListProviderComponent
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
