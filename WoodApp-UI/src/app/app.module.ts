import { LOCALE_ID, NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import localeFr from '@angular/common/locales/fr'; // Import French locale data
import { DecimalPipe, registerLocaleData } from '@angular/common';

registerLocaleData(localeFr);

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ToastrModule } from 'ngx-toastr';

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { SignInComponent } from './authentication/sign-in.component';
import { HeaderComponent } from './dashboard/header/header.component';
import { FooterComponent } from './dashboard/footer/footer.component';
import { HomeComponent } from './dashboard/home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddArticleComponent } from './components/articles/add-article/add-article.component';
import { ListArticleComponent } from './components/articles/list-article/list-article.component';
import { ConfigurationComponent } from './dashboard/configuration/configuration.component';
import { AddBankModalComponent } from './dashboard/modals/add-bank-modal/add-bank-modal.component';
import { AddSalesSiteModalComponent } from './dashboard/modals/add-sales-site-modal/add-sales-site-modal.component';
import { AddCategoriesModalComponent } from './dashboard/modals/add-categories-modal/add-categories-modal.component';
import { AddSubCategoriesModalComponent } from './dashboard/modals/add-sub-categories-modal/add-sub-categories-modal.component';
import { AppVariableModalComponent } from './dashboard/modals/add-app-variable-modal/app-variable-modal.component';
import { HomeDashboardComponent } from './dashboard/home-dashboard/home-dashboard.component';

import { EffectsModule } from '@ngrx/effects';
import { appVariableReducer } from './store/reducers/appvariable.reducer';
import { AppVariableEffects } from './store/effects/appvariable.effects';
import { bankReducer } from './store/reducers/bank.reducer';
import { BankEffects } from './store/effects/bank.effects';
import { AddProviderComponent } from './components/providers/add-provider/add-provider.component';
import { ListProviderComponent } from './components/providers/list-provider/list-provider.component';
import { PermissionsModalComponent } from './dashboard/modals/permissions-modal/permissions-modal.component';
import { MatBadgeModule } from '@angular/material/badge';
import { AddEmployeesModalComponent } from './dashboard/modals/add-employees-modal/add-employees-modal.component';
import { DocumentDetailModalComponent } from './components/merchandise/customer/list-customer-documents/document-detail-modal/document-detail-modal.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { WebAppComponent } from './auth-web-app/web-app.component';
import { tokenInterceptor } from './interceptor/token.interceptor';
import { EnterpriseComponent } from './enterprise/enterprise.component';
import { AddDocumentComponent } from './components/merchandise/provider/add-document/add-document.component';
import { ListDocumentsComponent } from './components/merchandise/provider/list-documents/list-documents.component';
import { AddCustomerComponent } from './components/customers/add-customer/add-customer.component';
import { ListCustomersComponent } from './components/customers/list-customers/list-customers.component';
import { CustomerAddDocumentComponent } from './components/merchandise/customer/add-document/customer-add-document.component';
import { AddTransporterModalComponent } from './dashboard/modals/add-transporter-modal/add-transporter-modal.component';
import { ConfirmDeleteModalComponent } from './dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { AddLengthsModalComponent } from './dashboard/modals/add-lengths-modal/add-lengths-modal.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenerateInvoiceModalComponent } from './dashboard/modals/invoice/generate-invoice-modal/generate-invoice-modal.component';
import { ListInvoicesComponent } from './components/merchandise/provider/list-invoices/list-invoices.component';
import { ListCustomerDocumentsComponent } from './components/merchandise/customer/list-customer-documents/list-customer-documents.component';
import { SalesSiteModalComponent } from './dashboard/modals/sales-site-modal/sales-site-modal.component';
import { StockListComponent } from './components/stock/stock-list/stock-list.component';
import { StockInventoryComponent } from './components/stock/stock-inventory/stock-inventory.component';
import { StockMouvementComponent } from './components/stock/stock-mouvement/stock-mouvement.component';
import { TransfertStockComponent } from './components/stock/stock-transfer/transfert-stock.component';
import { StockTransferListComponent } from './components/stock/stock-transfer-list/stock-transfer-list.component';
import { TransferDetailsDialogComponent } from './components/stock/transfer-details-dialog/transfer-details-dialog.component';
import { TransferConfirmationComponent } from './components/stock/transfer-confirmation/transfer-confirmation.component';
import { PaymentModalComponent } from './dashboard/modals/payment-modal/payment-modal.component';
import { ChequePaymentFormComponent } from './dashboard/modals/payment-modal/payment-forms/cheque-payment-form/cheque-payment-form.component';
import { TraitePaymentFormComponent } from './dashboard/modals/payment-modal/payment-forms/traite-payment-form/traite-payment-form.component';
import { DocumentConversionModalComponent } from './components/merchandise/customer/list-customer-documents/document-conversion-modal/document-conversion-modal.component';
import { ListCustomerInvoicesComponent } from './components/merchandise/customer/list-customer-invoices/list-customer-invoices.component';
import { AddInvoiceComponent } from './components/merchandise/customer/add-invoice/add-invoice.component';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DeliveryNotePrintComponent } from './models/print-templates/delivery-note-print/delivery-note-print.component';
import { TransferConfirmCodeDialogComponent } from './components/stock/transfer-confirm-code-dialog/transfer-confirm-code-dialog.component';
import { CustomerBatchConversionModalComponent } from './components/merchandise/customer/list-customer-documents/customer-batch-conversion-modal/customer-batch-conversion-modal.component';
import { CustomerDetailsModalComponent } from './components/customers/customer-details-modal/customer-details-modal.component';
import { CustomerEditModalComponent } from './components/customers/customer-edit-modal/customer-edit-modal.component';
import { CustomerAccountModalComponent } from './components/customers/customer-account-modal/customer-account-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    SignInComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    AddArticleComponent,
    ListArticleComponent,
    ConfigurationComponent,
    AddBankModalComponent,
    AddSalesSiteModalComponent,
    AddCategoriesModalComponent,
    AddSubCategoriesModalComponent,
    AppVariableModalComponent,
    HomeDashboardComponent,
    AddProviderComponent,
    ListProviderComponent,
    PermissionsModalComponent,
    AddEmployeesModalComponent,
    WebAppComponent,
    EnterpriseComponent,
    AddDocumentComponent,
    CustomerAddDocumentComponent,
    ListDocumentsComponent,
    AddCustomerComponent,
    ListCustomersComponent,
    AddTransporterModalComponent,
    ConfirmDeleteModalComponent,
    AddLengthsModalComponent,
    GenerateInvoiceModalComponent,
    ListInvoicesComponent,
    ListCustomerDocumentsComponent,
    SalesSiteModalComponent,
    StockListComponent,
    StockInventoryComponent,
    StockMouvementComponent,
    TransfertStockComponent,
    StockTransferListComponent,
    TransferDetailsDialogComponent,
    TransferConfirmationComponent,
    TransferConfirmCodeDialogComponent,
    PaymentModalComponent,
    ChequePaymentFormComponent,
    TraitePaymentFormComponent,
    DocumentDetailModalComponent,
    DocumentConversionModalComponent,
    ListCustomerInvoicesComponent,
    AddInvoiceComponent,
    DeliveryNotePrintComponent,
    CustomerBatchConversionModalComponent,
    CustomerDetailsModalComponent,
    CustomerEditModalComponent,
    CustomerAccountModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTableModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCardModule,
    MatButtonToggleModule,
    MatSidenavModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatRadioModule,
    FormsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      closeButton: true,
      timeOut: 3000
    }),
    AppRoutingModule,
    StoreModule.forRoot({ appVariableState: appVariableReducer }),
    StoreModule.forFeature('banks', bankReducer),
    EffectsModule.forRoot([AppVariableEffects, BankEffects]),
    BaseChartDirective
  ],
  providers: [
    provideClientHydration(),
    DecimalPipe,
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr' }, // Set French as the locale
    provideHttpClient(...[withFetch(), withInterceptors([tokenInterceptor])]),
    provideCharts(withDefaultRegisterables())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
