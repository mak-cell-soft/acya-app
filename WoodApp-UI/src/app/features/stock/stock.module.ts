import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StockRoutingModule } from './stock-routing.module';

import { StockListComponent } from './stock-list/stock-list.component';
import { StockMouvementComponent } from './stock-mouvement/stock-mouvement.component';
import { TransfertStockComponent } from './stock-transfer/transfert-stock.component';
import { StockTransferListComponent } from './stock-transfer-list/stock-transfer-list.component';
import { StockInventoryComponent } from './stock-inventory/stock-inventory.component';
import { TransferDetailsDialogComponent } from './transfer-details-dialog/transfer-details-dialog.component';
import { TransferConfirmationComponent } from './transfer-confirmation/transfer-confirmation.component';
import { TransferConfirmCodeDialogComponent } from './transfer-confirm-code-dialog/transfer-confirm-code-dialog.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';

@NgModule({
  declarations: [
    StockListComponent,
    StockMouvementComponent,
    TransfertStockComponent,
    StockTransferListComponent,
    StockInventoryComponent,
    TransferDetailsDialogComponent,
    TransferConfirmationComponent,
    TransferConfirmCodeDialogComponent
  ],
  imports: [
    CommonModule,
    StockRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatDividerModule,
    MatRadioModule
  ]
})
export class StockModule { }
