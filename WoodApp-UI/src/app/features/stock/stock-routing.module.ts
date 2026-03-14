import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StockListComponent } from './stock-list/stock-list.component';
import { StockMouvementComponent } from './stock-mouvement/stock-mouvement.component';
import { TransfertStockComponent } from './stock-transfer/transfert-stock.component';
import { StockTransferListComponent } from './stock-transfer-list/stock-transfer-list.component';

const routes: Routes = [
  { path: '', component: StockListComponent },
  { path: 'mouvement', component: StockMouvementComponent },
  { path: 'transferinfo/add', component: TransfertStockComponent },
  { path: 'transferinfo', component: StockTransferListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockRoutingModule { }
