import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListInventoryComponent } from './list-inventory/list-inventory.component';
import { AddInventoryComponent } from './add-inventory/add-inventory.component';

const routes: Routes = [
  { path: 'list', component: ListInventoryComponent },
  { path: 'add', component: AddInventoryComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule { }
