import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { ArticleService } from '../../../services/components/article.service';
import { PurchasePriceHistory } from '../../../models/components/purchase-price-history';
import { SalesPriceHistory } from '../../../models/components/sales-price-history';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-article-history',
  templateUrl: './article-history.component.html',
  styleUrls: ['./article-history.component.scss']
})
export class ArticleHistoryComponent implements OnInit {
  @Input() articleId!: number;
  articleReference: string = '';
  
  purchaseHistory: PurchasePriceHistory[] = [];
  salesHistory: SalesPriceHistory[] = [];
  catalogHistory: any[] = [];
  
  purchaseColumns = ['transactiondate', 'docnumber', 'supplier', 'pricevalue'];
  salesColumns = ['transactiondate', 'docnumber', 'customer', 'pricevalue'];
  catalogColumns = ['creationdate', 'pricevalue'];

  loading = false;

  constructor(
    private articleService: ArticleService,
    @Optional() private dialogRef: MatDialogRef<ArticleHistoryComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) { 
    if (data) {
      this.articleId = data.articleId;
      this.articleReference = data.articleReference;
    }
  }

  ngOnInit(): void {
    if (this.articleId) {
      this.loadHistory();
    }
  }

  loadHistory() {
    this.loading = true;
    
    // Load purchase history
    this.articleService.GetPurchaseHistory(this.articleId).subscribe(data => {
      this.purchaseHistory = data;
    });

    // Load sales history
    this.articleService.GetSalesHistory(this.articleId).subscribe(data => {
      this.salesHistory = data;
    });

    // Load catalog history
    this.articleService.GetCatalogHistory(this.articleId).subscribe(data => {
      this.catalogHistory = data;
      this.loading = false;
    });
  }
}
