import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';



import { AuthLandingShellComponent } from './auth-landing-shell/auth-landing-shell.component';
import { authGuard } from './guards/auth.guard';
import { EnterpriseRegistrationComponent } from './enterprise-registration/enterprise-registration.component';


const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AuthLandingShellComponent,
  },
  {
    path: 'register',
    component: EnterpriseRegistrationComponent
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
