import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardShellComponent } from './dashboard-shell/dashboard-shell.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { AccountingBalanceDashboardComponent } from './accounting-balance-dashboard/accounting-balance-dashboard.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { roleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardOverviewComponent },
      {
        path: 'admin-dashboard',
        component: AccountingBalanceDashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['Admin'] }
      },
      {
        path: 'config',
        component: ConfigurationComponent,
        canActivate: [roleGuard],
        data: { roles: ['Admin'] }
      },
      {
        path: 'articles',
        loadChildren: () => import('../articles/articles.module').then(m => m.ArticlesModule)
      },
      {
        path: 'customers',
        loadChildren: () => import('../customers/customers.module').then(m => m.CustomersModule)
      },
      {
        path: 'providers',
        loadChildren: () => import('../providers/providers.module').then(m => m.ProvidersModule)
      },
      {
        path: 'merchandise',
        loadChildren: () => import('../merchandise/merchandise.module').then(m => m.MerchandiseModule)
      },
      {
        path: 'stock',
        loadChildren: () => import('../stock/stock.module').then(m => m.StockModule)
      },
      {
        path: 'inventory',
        loadChildren: () => import('../inventory/inventory.module').then(m => m.InventoryModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
