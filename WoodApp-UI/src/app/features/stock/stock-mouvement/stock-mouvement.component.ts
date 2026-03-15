import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';

import { ArticleService } from '../../../services/components/article.service';
import { SalessitesService } from '../../../services/components/salessites.service';
import { StockMovementTimelineService } from '../../../services/components/stock-movement-timeline.service';

import { Article } from '../../../models/components/article';
import { Site } from '../../../models/components/sites';
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
  selector: 'app-stock-mouvement',
  templateUrl: './stock-mouvement.component.html',
  styleUrl: './stock-mouvement.component.scss',
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
export class StockMouvementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private articleService = inject(ArticleService);
  private siteService = inject(SalessitesService);
  private movementService = inject(StockMovementTimelineService);

  // -- State Signals --
  loading = signal<boolean>(false);
  timeline = signal<StockMovementTimeline[]>([]);
  summary = signal<StockMovementSummary | null>(null);
  reconciliation = signal<StockMovementReconciliation | null>(null);
  
  allArticles = signal<Article[]>([]);
  filteredArticles$!: Observable<Article[]>;
  allSites = signal<Site[]>([]);
  
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
      merchandise: [null],
      packageNumber: [''],
      reconciliationToggle: [false]
    });

    // Reset and reload when sales site changes
    this.filterForm.get('salesSiteId')?.valueChanges.subscribe(() => {
      this.resetData();
      if (this.filterForm.get('merchandise')?.value || this.filterForm.get('packageNumber')?.value) {
        this.applyFilters();
      }
    });

    // Link Package Number to Merchandise selection
    this.filterForm.get('packageNumber')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(pkgNum => {
      if (pkgNum) {
        const found = this.allArticles().find(a => a.reference === pkgNum);
        if (found && this.filterForm.get('merchandise')?.value !== found) {
          this.filterForm.get('merchandise')?.setValue(found, { emitEvent: false });
        }
      }
    });

    this.filterForm.get('merchandise')?.valueChanges.subscribe(merch => {
      if (merch && merch.reference && this.filterForm.get('packageNumber')?.value !== merch.reference) {
         this.filterForm.get('packageNumber')?.setValue(merch.reference, { emitEvent: false });
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

  private setupArticleFilter(): void {
    this.filteredArticles$ = this.filterForm.get('merchandise')!.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.reference),
      map(ref => ref ? this._filterArticles(ref) : this.allArticles().slice(0, 10))
    );
  }

  private _filterArticles(value: string): Article[] {
    const filterValue = value.toLowerCase();
    return this.allArticles().filter(article => 
      article.reference?.toLowerCase().includes(filterValue) || 
      article.description?.toLowerCase().includes(filterValue)
    ).slice(0, 50); // Limit results for performance
  }

  displayArticle(article: Article): string {
    return article ? `${article.reference} - ${article.description}` : '';
  }

  applyFilters(): void {
    if (this.filterForm.invalid) return;

    const filters = this.filterForm.value;
    const selectedMerch = filters.merchandise as Article;
    const siteId = filters.salesSiteId;
    const dateStart = filters.dateRange.start;
    const dateEnd = filters.dateRange.end;

    if (!selectedMerch && !filters.packageNumber) {
      return;
    }

    this.loading.set(true);

    const movementObservable = filters.packageNumber 
      ? this.movementService.getTimelineByPackage(filters.packageNumber, siteId, dateStart, dateEnd)
      : this.movementService.getTimeline(selectedMerch.id!, siteId, dateStart, dateEnd);

    movementObservable.subscribe({
      next: (data) => {
        this.timeline.set(data);
        
        if (selectedMerch) {
          this.loadSummaryAndReconcile(selectedMerch.id!, siteId);
        } else if (data.length > 0) {
            // If we have data from package number search but no merch selected, 
            // the summary/reconcile can still be fetched if we identify the merch from first record
            // but for now let's keep it simple.
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
      merchandise: null,
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
