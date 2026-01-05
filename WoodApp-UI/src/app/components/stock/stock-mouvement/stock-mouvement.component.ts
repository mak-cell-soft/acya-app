import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { Stock } from '../../../models/components/stock';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Article } from '../../../models/components/article';
import { Site } from '../../../models/components/sites';
import { ArticleService } from '../../../services/components/article.service';
import { SalessitesService } from '../../../services/components/salessites.service';

@Component({
  selector: 'app-stock-mouvement',
  templateUrl: './stock-mouvement.component.html',
  styleUrl: './stock-mouvement.component.css'
})
export class StockMouvementComponent implements OnInit {
  fb = inject(FormBuilder);
  articleService = inject(ArticleService);
  siteService = inject(SalessitesService)
  loading: boolean = false;
  allStocks: MatTableDataSource<Stock> = new MatTableDataSource<Stock>();

  filterForm!: FormGroup;
  allArticles: Article[] = [];
  allSites: Site[] = [];

  @ViewChild(MatPaginator) PaginationStock!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.createForm();
    this.getAllArticles();
    this.getAllSites();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allStocks.filter = filterValue.trim().toLowerCase();

    if (this.PaginationStock) {
      this.PaginationStock.firstPage();
    }
  }

  createForm() {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    this.filterForm = this.fb.group({
      BeginDate: [oneMonthAgo],
      EndDate: [today],
      selectedArticle: [null],
      selectedSite: [null]
    });
  }

  resetFilters() {
    this.filterForm.reset();
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    this.filterForm.patchValue({
      BeginDate: oneMonthAgo,
      EndDate: today
    });
    // You might want to reload data here
  }

  applyFilters() {
    if (this.filterForm.valid) {
      this.loading = true;
      const filters = this.filterForm.value;
      // Call your service to get filtered data here
      // After data is loaded:
      this.loading = false;
    }
  }

  onArticleChange(article: Article): void {
    // Implement your logic when article changes
    console.log('Selected article:', article);
  }

  onSiteChange(siteId: number): void {
    // Implement your logic when site changes
    console.log('Selected site ID:', siteId);
  }

  //#region Load Data
  getAllArticles() {
    // Implement your article loading logic
    this.articleService.GetAll().subscribe(articles => this.allArticles = articles);
  }

  getAllSites() {
    // Implement your site loading logic
    this.siteService.GetAll().subscribe(sites => this.allSites = sites);
  }
  //#endregion
}
