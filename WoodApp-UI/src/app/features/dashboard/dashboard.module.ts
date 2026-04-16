import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';

import { DashboardShellComponent } from './dashboard-shell/dashboard-shell.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { AccountingBalanceDashboardComponent } from './accounting-balance-dashboard/accounting-balance-dashboard.component';
import { ConfigurationComponent } from './configuration/configuration.component';

// Modals
import { AddBankModalComponent } from './modals/add-bank-modal/add-bank-modal.component';
import { AddSalesSiteModalComponent } from './modals/add-sales-site-modal/add-sales-site-modal.component';
import { AddCategoriesModalComponent } from './modals/add-categories-modal/add-categories-modal.component';
import { AddSubCategoriesModalComponent } from './modals/add-sub-categories-modal/add-sub-categories-modal.component';
import { AddAppVariableModalComponent } from './modals/add-app-variable-modal/add-app-variable-modal.component';
import { PermissionsModalComponent } from './modals/permissions-modal/permissions-modal.component';
import { AddEmployeesModalComponent } from './modals/add-employees-modal/add-employees-modal.component';
import { GenerateInvoiceModalComponent } from './modals/invoice/generate-invoice-modal/generate-invoice-modal.component';
import { LeaveManagementModalComponent } from './modals/leave-management-modal/leave-management-modal.component';
import { PayslipModalComponent } from './modals/payslip-modal/payslip-modal.component';
import { AdvanceManagementModalComponent } from './modals/advance-management-modal/advance-management-modal.component';
import { ProfileModalComponent } from './modals/profile-modal/profile-modal.component';
import { ListHoldingTaxesModalComponent } from './modals/holding-tax/list-holding-taxes-modal/list-holding-taxes-modal.component';


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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BaseChartDirective } from 'ng2-charts';

@NgModule({
  declarations: [
    DashboardShellComponent,
    HeaderComponent,
    FooterComponent,
    DashboardOverviewComponent,
    AccountingBalanceDashboardComponent,
    ConfigurationComponent,
    AddBankModalComponent,
    AddSalesSiteModalComponent,
    AddCategoriesModalComponent,
    AddSubCategoriesModalComponent,
    AddAppVariableModalComponent,
    PermissionsModalComponent,
    AddEmployeesModalComponent,
    GenerateInvoiceModalComponent,
    LeaveManagementModalComponent,
    PayslipModalComponent,
    AdvanceManagementModalComponent,
    ProfileModalComponent,
    ListHoldingTaxesModalComponent

  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
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
    MatSidenavModule,
    MatDividerModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    BaseChartDirective
  ]
})
export class DashboardModule { }
