import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StockListComponent } from './stock-list/stock-list.component';
import { StockMovementTimelineComponent } from './stock-movement-timeline/stock-movement-timeline.component';
import { StockTransferFormComponent } from './stock-transfer-form/stock-transfer-form.component';
import { StockTransferListComponent } from './stock-transfer-list/stock-transfer-list.component';

const routes: Routes = [
  { path: '', component: StockListComponent },
  { path: 'mouvement', component: StockMovementTimelineComponent },
  { path: 'transferinfo/add', component: StockTransferFormComponent },
  { path: 'transferinfo', component: StockTransferListComponent },
  { path: 'exit', component: StockTransferFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockRoutingModule { }
