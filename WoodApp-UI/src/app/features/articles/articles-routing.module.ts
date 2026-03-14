import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddArticleComponent } from './add-article/add-article.component';
import { ListArticleComponent } from './list-article/list-article.component';
import { roleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: ListArticleComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['Admin', 'User', 'InvoiceAgent']
    }
  },
  {
    path: 'add',
    component: AddArticleComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['Admin']
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ArticlesRoutingModule { }
