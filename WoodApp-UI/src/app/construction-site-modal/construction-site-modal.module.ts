import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';

import { ConstructionSiteModalRoutingModule } from './construction-site-modal-routing.module';
import { ConstructionSiteManagementComponent } from './construction-site-management.component';
import { SitesSidebarComponent } from './components/sites-sidebar/sites-sidebar.component';
import { SiteDetailComponent } from './components/site-detail/site-detail.component';
import { GeneralTabComponent } from './components/tabs/general/general-tab.component';
import { EquipeTabComponent } from './components/tabs/equipe/equipe-tab.component';
import { ProductionTabComponent } from './components/tabs/production/production-tab.component';
import { MateriauxTabComponent } from './components/tabs/materiaux/materiaux-tab.component';
import { MagasinTabComponent } from './components/tabs/magasin/magasin-tab.component';
import { SuiviTabComponent } from './components/tabs/suivi/suivi-tab.component';

@NgModule({
  declarations: [
    ConstructionSiteManagementComponent,
    SitesSidebarComponent,
    SiteDetailComponent,
    GeneralTabComponent,
    EquipeTabComponent,
    ProductionTabComponent,
    MateriauxTabComponent,
    MagasinTabComponent,
    SuiviTabComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConstructionSiteModalRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule
  ]
})
export class ConstructionSiteModalModule { }
