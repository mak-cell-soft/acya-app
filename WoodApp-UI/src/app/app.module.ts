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


import { FormsModule, ReactiveFormsModule } from '@angular/forms';




import { EffectsModule } from '@ngrx/effects';
import { appVariableReducer } from './store/reducers/appvariable.reducer';
import { AppVariableEffects } from './store/effects/appvariable.effects';
import { bankReducer } from './store/reducers/bank.reducer';
import { BankEffects } from './store/effects/bank.effects';


import { MatBadgeModule } from '@angular/material/badge';


import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthLandingShellComponent } from './auth-landing-shell/auth-landing-shell.component';
import { tokenInterceptor } from './interceptor/token.interceptor';
import { EnterpriseRegistrationComponent } from './enterprise-registration/enterprise-registration.component';

import { AddTransporterModalComponent } from './shared/components/modals/add-transporter-modal/add-transporter-modal.component';
import { ConfirmDeleteModalComponent } from './shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { GenericConfirmationModalComponent } from './shared/components/modals/generic-confirmation-modal/generic-confirmation-modal.component';
import { AddLengthsModalComponent } from './shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { WithholdingTaxModalComponent } from './shared/components/modals/withholding-tax-modal/withholding-tax-modal.component';
import { MatTooltipModule } from '@angular/material/tooltip';


import { SalesSiteModalComponent } from './shared/components/modals/sales-site-modal/sales-site-modal.component';

import { PaymentModalComponent } from './shared/components/modals/payment-modal/payment-modal.component';
import { ChequePaymentFormComponent } from './shared/components/modals/payment-modal/payment-forms/cheque-payment-form/cheque-payment-form.component';
import { TraitePaymentFormComponent } from './shared/components/modals/payment-modal/payment-forms/traite-payment-form/traite-payment-form.component';

import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';






import { MatChipsModule } from '@angular/material/chips';
import { StatusOrderModalComponent } from './shared/components/modals/status-order-modal/status-order-modal.component';
import { TaxRegistrationModalComponent } from './shared/components/modals/tax-registration-modal/tax-registration-modal.component';


@NgModule({
  declarations: [
    AppComponent,



    AuthLandingShellComponent,
    EnterpriseRegistrationComponent,

    AddTransporterModalComponent,
    ConfirmDeleteModalComponent,
    GenericConfirmationModalComponent,
    AddLengthsModalComponent,

    SalesSiteModalComponent,


    PaymentModalComponent,
    ChequePaymentFormComponent,
    TraitePaymentFormComponent,
    StatusOrderModalComponent,
    WithholdingTaxModalComponent,
    TaxRegistrationModalComponent,






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
    MatChipsModule,
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
