import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';



import { WebAppComponent } from './auth-web-app/web-app.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { EnterpriseComponent } from './enterprise/enterprise.component';



import { CanDeactivateGuard } from './guards/can-deactivate.guard';






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
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [authGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
