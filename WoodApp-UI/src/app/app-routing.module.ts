import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignInComponent } from './authentication/sign-in.component';
import { HomeComponent } from './dashboard/home/home.component';
import { AddArticleComponent } from './components/articles/add-article/add-article.component';
import { ListArticleComponent } from './components/articles/list-article/list-article.component';
import { ConfigurationComponent } from './dashboard/configuration/configuration.component';
import { HomeMenuComponent } from './dashboard/home-menu/home-menu.component';
import { ListProviderComponent } from './components/providers/list-provider/list-provider.component';
import { AddProviderComponent } from './components/providers/add-provider/add-provider.component';
import { WebAppComponent } from './auth-web-app/web-app.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { EnterpriseComponent } from './enterprise/enterprise.component';
import { AddDocumentComponent } from './components/merchandise/provider/add-document/add-document.component';
import { ListCustomersComponent } from './components/customers/list-customers/list-customers.component';
import { AddCustomerComponent } from './components/customers/add-customer/add-customer.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { ListDocumentsComponent } from './components/merchandise/provider/list-documents/list-documents.component';
import { ListInvoicesComponent } from './components/merchandise/provider/list-invoices/list-invoices.component';
import { CustomerAddDocumentComponent } from './components/merchandise/customer/add-document/customer-add-document.component';
import { ListCustomerDocumentsComponent } from './components/merchandise/customer/list-customer-documents/list-customer-documents.component';
import { StockListComponent } from './components/stock/stock-list/stock-list.component';
import { StockMouvementComponent } from './components/stock/stock-mouvement/stock-mouvement.component';
import { TransfertStockComponent } from './components/stock/stock-transfer/transfert-stock.component';
import { StockTransferListComponent } from './components/stock/stock-transfer-list/stock-transfer-list.component';
import { ListCustomerInvoicesComponent } from './components/merchandise/customer/list-customer-invoices/list-customer-invoices.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: WebAppComponent,
  },
  {
    path: 'register',
    component: EnterpriseComponent
  },
  {
    path: 'login',
    //pathMatch: 'full',
    component: SignInComponent,
  },
  {
    path: 'home',
    component: HomeComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
    children: [
      {
        path: 'articles',
        component: ListArticleComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin', 'User', 'InvoiceAgent'] // Allow access to this route for users with these roles
        }
      },
      {
        path: 'articles/add',
        component: AddArticleComponent,
        canActivate: [roleGuard], data: {
          roles: ['Admin',]
        }
      },
      {
        path: 'config',
        component: ConfigurationComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin'] // Allow access to this route for users with this role
        }
      },
      { path: 'dashboard', component: HomeMenuComponent },
      { path: 'providers', component: ListProviderComponent },
      {
        path: 'providers/add',
        component: AddProviderComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin']
        }
      },
      {
        path: 'reception',
        component: AddDocumentComponent,
        canDeactivate: [CanDeactivateGuard]
      },
      {
        path: 'reception/list',
        component: ListDocumentsComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin']
        }
      },
      {
        path: 'sinvoices',
        component: ListInvoicesComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin']
        }
      },
      { path: 'customerdelivery', component: ListCustomerDocumentsComponent },
      { path: 'customerinvoices', component: ListCustomerInvoicesComponent },
      { path: 'customerdelivery/add', component: CustomerAddDocumentComponent },
      { path: 'customers', component: ListCustomersComponent },
      {
        path: 'customers/add',
        component: AddCustomerComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['Admin']
        }
      },
      // full URL : home/stock
      { path: 'stock', component: StockListComponent },
      { path: 'stock/mouvement', component: StockMouvementComponent },
      { path: 'stock/transferinfo/add', component: TransfertStockComponent },
      { path: 'stock/transferinfo', component: StockTransferListComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
