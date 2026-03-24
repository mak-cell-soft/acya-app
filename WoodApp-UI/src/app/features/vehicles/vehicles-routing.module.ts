import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VehiclesListComponent } from './vehicles-list/vehicles-list.component';

const routes: Routes = [
  { path: '', component: VehiclesListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VehiclesRoutingModule { }
