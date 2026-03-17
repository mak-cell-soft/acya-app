import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';

import { ArticleService } from '../../../services/components/article.service';
import { SalessitesService } from '../../../services/components/salessites.service';
import { StockMovementTimelineService } from '../../../services/components/stock-movement-timeline.service';
import { MerchandiseService } from '../../../services/components/merchandise.service';

import { Article } from '../../../models/components/article';
import { Site } from '../../../models/components/sites';
import { Merchandise } from '../../../models/components/merchandise';
import { StockQuantity } from '../../../models/components/stock';
import { StockService } from '../../../services/components/stock.service';
import { 
  StockMovementTimeline, 
  StockMovementSummary, 
  StockMovementReconciliation 
} from '../../../models/components/stock-movement';

/**
 * Aesthetic Direction: Refined Timber Minimalism.
 * Focuses on high-contrast vertical rhythm, wood-toned accents, and smooth transitions.
 * Uses OnPush (implied by design rules) and Signals for state management.
 */
@Component({
  selector: 'app-stock-movement-timeline',
  templateUrl: './stock-movement-timeline.component.html',
  styleUrl: './stock-movement-timeline.component.scss',
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, scale: 0.95 }),
        animate('200ms ease-out', style({ opacity: 1, scale: 1 }))
      ])
    ])
  ]
})
export class StockMovementTimelineComponent implements OnInit {
  private fb = inject(FormBuilder);
  private articleService = inject(ArticleService);
  private siteService = inject(SalessitesService);
  private stockService = inject(StockService);
  private movementService = inject(StockMovementTimelineService);

  // -- State Signals --
  loading = signal<boolean>(false);
  timeline = signal<StockMovementTimeline[]>([]);
  summary = signal<StockMovementSummary | null>(null);
  reconciliation = signal<StockMovementReconciliation | null>(null);
  
  allArticles = signal<Article[]>([]);
  filteredArticles$!: Observable<Article[]>;
  allSites = signal<Site[]>([]);
  allStocks = signal<StockQuantity[]>([]);
  availablePackages = signal<string[]>([]);
  
  filterForm!: FormGroup;
  reconciliationVisible = signal<boolean>(false);

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
    this.setupArticleFilter();
  }

  private initForm(): void {
    this.filterForm = this.fb.group({
      salesSiteId: [null, Validators.required],
      dateRange: this.fb.group({
        start: [null], 
        end: [null]
      }),
      article: [null],
      packageNumber: [''],
      reconciliationToggle: [false]
    });

    // Reset and reload when sales site changes
    this.filterForm.get('salesSiteId')?.valueChanges.subscribe(() => {
      this.resetData();
      const article = this.filterForm.get('article')?.value;
      if (article) {
        this.onArticleSelected(article);
      }
    });

    // Link Article selection to Package Numbers
    this.filterForm.get('article')?.valueChanges.subscribe(article => {
      this.onArticleSelected(article);
    });

    this.filterForm.get('packageNumber')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(pkg => {
        if (pkg && !this.filterForm.get('article')?.value) {
            // Optional: try to find article from package if not set
            // For now just keep it as is
        }
      });

    this.filterForm.get('reconciliationToggle')?.valueChanges.subscribe(val => {
      this.reconciliationVisible.set(val);
    });
  }

  private loadInitialData(): void {
    this.loading.set(true);
    
    combineLatest([
      this.articleService.GetAll(),
      this.siteService.GetAll()
    ]).subscribe({
      next: ([articles, sites]) => {
        this.allArticles.set(articles);
        this.allSites.set(sites);
        
        // Default to first site if available
        if (sites.length > 0 && !this.filterForm.get('salesSiteId')?.value) {
          this.filterForm.patchValue({ salesSiteId: sites[0].id });
        }
        
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private onArticleSelected(article: Article | null): void {
    if (!article) {
      this.availablePackages.set([]);
      this.filterForm.patchValue({ packageNumber: '' });
      return;
    }

    const siteId = this.filterForm.get('salesSiteId')?.value;
    if (!siteId) return;

    // Use stockService to get available packages for this article at this site
    const site = this.allSites().find(s => s.id === siteId);
    if (site) {
      this.stockService.getBySite(site).subscribe((stocks: StockQuantity[]) => {
        this.allStocks.set(stocks);
        const pkgs = stocks
          .filter(s => s.articleId === article.id)
          .map(s => s.packageReference);
        
        this.availablePackages.set(pkgs);
        if (pkgs.length > 0) {
          this.filterForm.patchValue({ packageNumber: pkgs[0] });
        } else {
          this.filterForm.patchValue({ packageNumber: '' });
        }
      });
    }
  }

  private setupArticleFilter(): void {
    this.filteredArticles$ = this.filterForm.get('article')!.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.reference),
      map(ref => ref ? this._filterArticles(ref) : this.allArticles().slice(0, 10))
    );
  }

  private _filterArticles(value: string): Article[] {
    const filterValue = value.toLowerCase();
    return this.allArticles().filter(a => 
      a.reference?.toLowerCase().includes(filterValue) || 
      a.description?.toLowerCase().includes(filterValue)
    ).slice(0, 50); 
  }

  displayArticle(article: Article): string {
    return article ? `${article.reference} - ${article.description}` : '';
  }

  applyFilters(): void {
    if (this.filterForm.invalid) return;

    const filters = this.filterForm.value;
    const selectedArticle = filters.article as Article;
    const packageNumber = filters.packageNumber;
    const siteId = filters.salesSiteId;
    const dateStart = filters.dateRange.start;
    const dateEnd = filters.dateRange.end;

    if (!packageNumber && !selectedArticle) {
      return;
    }

    this.loading.set(true);

    // Resolve Merchandise ID if possible
    let resolvedMerchId: number | null = null;
    if (packageNumber) {
        const stock = this.allStocks().find(s => s.packageReference === packageNumber);
        if (stock) resolvedMerchId = stock.merchandiseId;
    }

    const movementObservable = packageNumber 
      ? this.movementService.getTimelineByPackage(packageNumber, siteId, dateStart || undefined, dateEnd || undefined)
      : this.movementService.getTimeline(selectedArticle.id!, siteId, dateStart || undefined, dateEnd || undefined);

    movementObservable.subscribe({
      next: (data) => {
        this.timeline.set(data);
        
        if (resolvedMerchId) {
            this.loadSummaryAndReconcile(resolvedMerchId, siteId);
        } else if (data.length > 0) {
            // Fallback: if we only have the package number but couldn't find it in live stocks (e.g. historical only),
            // the summary call might need the merch ID. In this case, the first movement might point us correctly.
            // But with the Article -> Package flow, we usually have resolvedMerchId.
        }
        
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadSummaryAndReconcile(merchId: number, siteId: number): void {
    this.movementService.getSummary(merchId, siteId).subscribe(s => this.summary.set(s));
    this.movementService.reconcile(merchId, siteId).subscribe(r => this.reconciliation.set(r));
  }

  resetFilters(): void {
    this.filterForm.patchValue({
      dateRange: { start: null, end: null },
      article: null,
      packageNumber: '',
      reconciliationToggle: false
    });
    this.resetData();
  }

  private resetData(): void {
    this.timeline.set([]);
    this.summary.set(null);
    this.reconciliation.set(null);
  }

  // Animation helper
  getDotColor(item: StockMovementTimeline): string {
    if (item.isTransfer) return 'blue-dot';
    return item.quantityDelta > 0 ? 'green-dot' : 'red-dot';
  }

  getMovementIcon(item: StockMovementTimeline): string {
    if (item.isTransfer) return 'swap_horiz';
    return item.quantityDelta > 0 ? 'add_circle_outline' : 'remove_circle_outline';
  }

  getSiteAddress(id: number): string {
    const site = this.allSites().find(s => s.id === id);
    return site ? site.address : '---';
  }

  getDocLabel(type: string): string {
    // Basic labels if needed, or just return the type if no map exists
    const labels: { [key: string]: string } = {
      'supplierReceipt': 'Réception Fournisseur',
      'customerDeliveryNote': 'Bon de Livraison',
      'stockTransfer': 'Transfert de Stock',
      'inventory': 'Inventaire Physique',
      'customerInvoiceReturn': 'Retour Client',
      'supplierInvoiceReturn': 'Retour Fournisseur'
    };
    return labels[type] || type;
  }

  isNewYear(date: any): boolean {
    return false;
  }
}
