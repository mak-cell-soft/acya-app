import { AfterViewInit, Component, Inject, Input, OnInit, Optional, ViewChild } from '@angular/core';
import { ArticleService } from '../../../services/components/article.service';
import { PurchasePriceHistory } from '../../../models/components/purchase-price-history';
import { SalesPriceHistory } from '../../../models/components/sales-price-history';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-article-history',
  templateUrl: './article-history.component.html',
  styleUrls: ['./article-history.component.scss']
})
export class ArticleHistoryComponent implements OnInit, AfterViewInit {
  @Input() articleId!: number;
  articleReference: string = '';
  articleDescription: string = '';
  articleTvaValue: number = 0;
  articleHTValue: number = 0;

  purchaseHistory = new MatTableDataSource<PurchasePriceHistory>();
  salesHistory = new MatTableDataSource<SalesPriceHistory>();
  catalogHistory = new MatTableDataSource<any>();

  @ViewChild('purchasePaginator') purchasePaginator!: MatPaginator;
  @ViewChild('salesPaginator') salesPaginator!: MatPaginator;
  @ViewChild('catalogPaginator') catalogPaginator!: MatPaginator;
  
  purchaseColumns = ['transactiondate', 'docnumber', 'counterpartname', 'updatedby', 'pricevalueHT', 'pricevalue'];
  salesColumns = ['transactiondate', 'docnumber', 'updatedby', 'pricevalueHT', 'pricevalue'];
  catalogColumns = ['creationdate', 'updatedby', 'pricevalueHT', 'pricevalue'];

  loading = false;

  constructor(
    private articleService: ArticleService,
    @Optional() private dialogRef: MatDialogRef<ArticleHistoryComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    if (data) {
      this.articleId = data.articleId;
      this.articleReference = data.articleReference;
      this.articleDescription = data.articleDescription;
      // Convert TVA value (e.g., 19) to decimal factor (e.g., 0.19) for calculation
      this.articleTvaValue = data.articleTvaValue ? (parseFloat(data.articleTvaValue) / 100) : 0;
    }
  }

  ngOnInit(): void {
    if (this.articleId) {
      this.loadHistory();
    }
  }

  ngAfterViewInit() {
    this.linkPaginators();
  }

  private linkPaginators() {
    this.purchaseHistory.paginator = this.purchasePaginator;
    this.salesHistory.paginator = this.salesPaginator;
    this.catalogHistory.paginator = this.catalogPaginator;
  }

  loadHistory() {
    this.loading = true;
    
    // Load purchase history
    this.articleService.GetPurchaseHistory(this.articleId).subscribe(data => {
      this.purchaseHistory.data = data;
    });

    // Load sales history
    this.articleService.GetSalesHistory(this.articleId).subscribe(data => {
      this.salesHistory.data = data;
    });

    // Load catalog history
    this.articleService.GetCatalogHistory(this.articleId).subscribe(data => {
      this.catalogHistory.data = data;
      this.loading = false;
      // Re-link paginators just in case they were initialized late due to tabs
      setTimeout(() => this.linkPaginators());
    });
  }
}
