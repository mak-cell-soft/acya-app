import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingDashboardRoutingModule } from './accounting-dashboard-routing.module';
import { AccountingDashboardComponent } from './accounting-dashboard.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    AccountingDashboardComponent
  ],
  imports: [
    CommonModule,
    AccountingDashboardRoutingModule,
    MatIconModule
  ]
})
export class AccountingDashboardModule { }

