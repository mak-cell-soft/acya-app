import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingRoutingModule } from './accounting-routing.module';
import { AccountingComponent } from './accounting.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    AccountingComponent
  ],
  imports: [
    CommonModule,
    AccountingRoutingModule,
    MatIconModule
  ]
})
export class AccountingModule { }
