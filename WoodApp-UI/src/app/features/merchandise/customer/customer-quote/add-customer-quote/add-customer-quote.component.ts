import { Component, inject, model, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ArticleService } from '../../../../../services/components/article.service';
import { AppVariableService } from '../../../../../services/configuration/app-variable.service';
import { Merchand, Merchandise } from '../../../../../models/components/merchandise';
import { MatTableDataSource } from '@angular/material/table';
import { Article } from '../../../../../models/components/article';
import { BillingStatus, DocStatus, Document, DocumentTypes } from '../../../../../models/components/document';
import { AppVariable } from '../../../../../models/configuration/appvariable';
import { StockService } from '../../../../../services/components/stock.service';
import { StockQuantity, StockWithLengthDetails, TransactionType } from '../../../../../models/components/stock';
import { CounterPart } from '../../../../../models/components/counterpart';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';
import { MatSelect } from '@angular/material/select';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../../shared/Text_Buttons';
import { MatDialog } from '@angular/material/dialog';
import { AddLengthsModalComponent } from '../../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { AppuserService } from '../../../../../services/components/appuser.service';
import { Site } from '../../../../../models/components/sites';
import { DocumentService } from '../../../../../services/components/document.service';
import { ListOfLength } from '../../../../../models/components/listoflength';
import { ConfirmDeleteModalComponent } from '../../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { isQuantityValid } from '../../../../../shared/validators/naturalNumberValidator';

/**
 * AddCustomerQuoteComponent — Create a new customer quote (Devis).
 *
 * KEY DIFFERENCES from CustomerAddDocumentComponent:
 *  - Document type is `customerQuote` (enum = 11), not `customerDeliveryNote`
 *  - NO transporter required — quotes are pre-delivery commercial offers
 *  - Stock validation is SOFT only (informational warning, not a hard block)
 *  - After save, routes to the devis list instead of the delivery list
 *
 * NOTE: Backend will NOT update stock for customerQuote (enforced in DocumentController.cs)
 */
@Component({
  selector: 'app-add-customer-quote',
  templateUrl: './add-customer-quote.component.html',
  styleUrl: './add-customer-quote.component.css'
})
export class AddCustomerQuoteComponent {

  // ── Injected services ────────────────────────────────────────────────────
  toastr         = inject(ToastrService);
  router         = inject(Router);
  fb             = inject(FormBuilder);
  articleService = inject(ArticleService);
  appVarService  = inject(AppVariableService);
  stockService   = inject(StockService);
  counterPartService = inject(CounterpartService);
  dialog         = inject(MatDialog);
  authService    = inject(AuthenticationService);
  appUserService = inject(AppuserService);
  docService     = inject(DocumentService);
  route          = inject(ActivatedRoute);

  isQuantityValid = isQuantityValid;

  // ── State ────────────────────────────────────────────────────────────────
  selected     = model<Date | null>(null);
  form!: FormGroup;
  userconnected = this.authService.getUserDetail();

  allCustomers: CounterPart[] = [];
  selectedCustomer: any = {};
  filteredArticles: Article[] = [];
  searchCustomerControl    = new FormControl('');
  searchArticleControl     = new FormControl('');
  filteredCustomers: CounterPart[] = [];
  selectedDate: Date = new Date();
  SalesSite!: Site;

  // Article type flag for wood/wood-lengths UI
  isArticleTypeWood = false;
  isLoading = false;
  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  sourceDocumentId = 0;

  @ViewChild('customerSelect') customerSelect!: MatSelect;
  @ViewChild('articleSelect')  articleSelect!: MatSelect;
  @ViewChildren('articleSelect') articleSelects!: QueryList<MatSelect>;

  displayedColumns: string[] = [
    'index', 'article', 'sellPrice', 'quantity', 'discount', 'tva', 'totalWithoutTva', 'totalWithTva', 'actions'
  ];
  dataMerchand = new MatTableDataSource<Merchand>([]);
  allStocks    = new MatTableDataSource<StockQuantity>([]);
  articles: Article[]    = [];
  TVAs: AppVariable[]    = [];

  // Document totals
  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$   = new BehaviorSubject<number>(0);
  netTTC_doc$     = new BehaviorSubject<number>(0);
  extraDiscount   = 0;

  register_button = REGISTER_BUTTON;
  abort_button    = ABORT_BUTTON;

  constructor() { this.createForm(); }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAppUserSiteAndThenLoadData();
      this.getCustomers();
      this.searchCustomerControl.valueChanges.subscribe(() => this.applyCustomerFilter());

      this.route.queryParams.subscribe(params => {
        if (params['fromQuoteId']) {
          this.sourceDocumentId = +params['fromQuoteId'];
        }
      });
    }
  }

  loadData() {
    this.getArticles();
    this.getStocks();
    this.getTaxes();

    if (this.sourceDocumentId > 0) {
      this.loadSourceDocument(this.sourceDocumentId);
    }
  }

  /** Load site first, THEN data — ensures stock query uses correct site */
  getAppUserSiteAndThenLoadData(): void {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (response) => {
        this.SalesSite = response;
        this.loadData();
      },
      error: () => this.toastr.error('Site de Vente non trouvé.')
    });
  }

  loadSourceDocument(id: number) {
    this.isLoading = true;
    this.docService.GetById(id).subscribe({
      next: (doc) => {
        if (doc.counterpart) {
          this.onOptionCustomerSelected(doc.counterpart.id);
        }
        if (doc.merchandises) {
          this.dataMerchand.data = this.transformMerchandiseToMerchand(doc.merchandises);
          this.calculateTotals(this.dataMerchand.data);
        }
        this.form.get('customerReference')?.setValue(doc.docnumber);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement du document source');
      }
    });
  }

  saveDocument(doc: Document) {
    this.isLoading = true;
    this.docService.Add(doc).subscribe({
      next: (res) => {
        this.toastr.success(`Devis ${res.docRef} créé avec succès`);

        // Register relationship if duplicated from another Quote
        if (this.sourceDocumentId > 0 && res.id > 0) {
          const relationship = {
            parentDocumentId: this.sourceDocumentId,
            childDocumentId: res.id
          };
          this.docService.RegisterRelationship(relationship).subscribe({
            next: () => console.log('Relationship registered for duplicated Quote'),
            error: (err) => console.error('Failed to register relationship:', err)
          });
        }

        this.isLoading = false;
        this.router.navigateByUrl('home/merchandise/devis/list');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('La création du devis a échoué');
      }
    });
  }

  private transformMerchandiseToMerchand(items: Merchandise[]): Merchand[] {
    return items.map(m => {
      const row: Merchand = {
        selectedArticle: m.article,
        unit_price_ht: m.unit_price_ht,
        merchandise_cost_ht: m.cost_ht,
        quantity: m.quantity,
        listLengths: m.lisoflengths || [],
        selldiscountpercentage: m.discount_percentage,
        sellcostprice_discountValue: m.cost_discount_value,
        sellcostprice_net_ht: m.cost_net_ht,
        sellcostprice_taxValue: m.tva_value,
        totalWithTax: m.cost_ttc,
        articleSearchInput: `${m.article.reference}${m.article.description ? ' - ' + m.article.description : ''}`,
        filteredArticles: [...this.articles],
        isWoodArticle: !!m.article.iswood,
        selectedStock: null // Will try to match below
      };

      // Try matching stock
      const stocks = this.getMatchingStocks(m.article.id);
      if (stocks.length > 0) {
        row.selectedStock = stocks.length === 1 ? stocks[0] : null;
      }

      return row;
    });
  }

  getCustomers(): void {
    this.counterPartService.GetAll(CounterPartType_FR.customer).subscribe({
      next: (res: CounterPart[]) => {
        this.allCustomers = res;
        this.filteredCustomers = [...res];
      }
    });
  }

  getArticles() {
    this.articleService.GetAll().subscribe({
      next: (res) => { this.articles = res; this.filteredArticles = [...res]; },
      error: () => this.toastr.error('Erreur chargement articles')
    });
  }

  getStocks() {
    // NOTE: getBySite() sends a POST with the full Site object (not just the ID)
    // Correct method: StockService.getBySite(site: Site) → POST Stock/GetBySite
    this.stockService.getBySite(this.SalesSite).subscribe({
      next: (res) => this.allStocks.data = res,
      error: () => this.toastr.error('Erreur chargement stocks')
    });
  }

  getTaxes() {
    this.appVarService.GetAll('Tva').subscribe({
      next: (res) => this.TVAs = res
    });
  }

  // ── Customer search helpers ──────────────────────────────────────────────

  applyCustomerFilter(): void {
    const v = this.searchCustomerControl.value!.trim().toLowerCase();
    this.filteredCustomers = this.allCustomers.filter(c =>
      c.firstname?.toLowerCase().includes(v) || c.name?.toLowerCase().includes(v)
    );
    this.customerSelect?.open();
  }

  onOptionCustomerSelected(customerId: number): void {
    const c = this.allCustomers.find(x => x.id === customerId);
    if (c) {
      this.selectedCustomer = c;
      this.form.get('customer')?.setValue(c);
      const name = c.name || (c.firstname + ' ' + c.lastname);
      this.searchCustomerControl.setValue(name, { emitEvent: false });
    }
  }

  clearCustomer(): void {
    this.selectedCustomer = {};
    this.searchCustomerControl.setValue('');
    this.filteredCustomers = [...this.allCustomers];
  }

  // ── Article search helpers ───────────────────────────────────────────────

  applyArticleFilter(event: Event, element: Merchand) {
    const v = (event.target as HTMLInputElement).value.trim().toLowerCase();
    element.filteredArticles = this.articles.filter(a =>
      a.reference.toLowerCase().includes(v) ||
      (a.description && a.description.toLowerCase().includes(v))
    );
  }

  openArticleDropdown(element: Merchand) {
    const index = this.dataMerchand.data.indexOf(element);
    this.articleSelects.toArray()[index]?.open();
  }

  onArticleChange(element: Merchand, selectedArticle: Article) {
    if (!selectedArticle) {
      element.articleSearchInput = '';
      element.isWoodArticle = false;
      element.selectedStock = null;
      this.updateTotals(element);
      return;
    }

    element.articleSearchInput = `${selectedArticle.reference}${selectedArticle.description ? ' - ' + selectedArticle.description : ''}`;
    element.quantity = 0;
    element.isWoodArticle = selectedArticle.iswood;

    const matchingStocks = this.allStocks.data.filter(s => s.articleId === selectedArticle.id);

    if (matchingStocks.length > 0) {
      element.selectedStock = matchingStocks.length === 1 ? matchingStocks[0] : null;
      element.unit_price_ht = selectedArticle.sellprice_ht;
      if (element.isWoodArticle) element.listLengths = [];
      if (element.selectedStock) this.updateTotals(element);
    } else {
      element.selectedStock = null;
      // SOFT signal only — quote can reference articles not currently in stock
      this.toastr.info(
        `⚠ Aucun stock trouvé pour ${selectedArticle.reference}. La quantité devra être saisie manuellement.`,
        'Information Stock'
      );
    }
  }

  clearArticle(element: Merchand) {
    element.selectedArticle    = null;
    element.articleSearchInput = '';
    element.selectedStock      = null;
    element.isWoodArticle      = false;
    element.listLengths        = [];
    element.quantity           = 0;
    element.filteredArticles   = [...this.articles];
    this.updateTotals(element);
  }

  getMatchingStocks(articleId: number): StockQuantity[] {
    return this.allStocks.data.filter(s => s.articleId === articleId);
  }

  onMerchandiseChange(element: Merchand) {
    if (element.selectedStock) {
      element.unit_price_ht = element.selectedArticle?.sellprice_ht || 0;
      this.updateTotals(element);
    }
  }

  // ── Wood length dialog ───────────────────────────────────────────────────

  openWoodLengthDialog(element: Merchand): void {
    this.stockService.getWoodStockWithLengthDetails({
      merchandiseRef: element.selectedArticle?.reference ?? '',
      salesSiteId: this.SalesSite.id,
      merchandiseId: element.selectedStock?.merchandiseId ?? element.selectedArticle?.id ?? 0
    }).subscribe({
      next: (details: StockWithLengthDetails[]) => {
        this.openLengthModal(element, details);
      },
      error: () => this.openLengthModal(element, [])
    });
  }

  private openLengthModal(element: Merchand, details: StockWithLengthDetails[]) {
    const dialogRef = this.dialog.open(AddLengthsModalComponent, {
      width: '800px', maxWidth: '90vw', maxHeight: '90vh',
      data: { article: element.selectedArticle, merchand: element, availableStock: details }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.lengths && result?.totalQuantity) {
        element.quantity     = parseFloat(Number(result.totalQuantity).toFixed(3));
        element.listLengths  = result.lengths;
        this.responseFromModalLengths      = result.lengths;
        this.responseFromModalTotQuantity  = result.totalQuantity;
        this.updateTotals(element);
      }
    });
  }

  getTotalNbPieces(element: Merchand): number {
    return (element.listLengths || []).reduce((acc, l) => acc + (l.nbpieces || 0), 0);
  }

  // ── Totals calculation ───────────────────────────────────────────────────

  updateTotals(element: Merchand) {
    if (element.selectedArticle) {
      const net = element.quantity * element.unit_price_ht;
      const disc = net * (element.selldiscountpercentage / 100);
      element.sellcostprice_net_ht = parseFloat((net - disc).toFixed(3));

      let tvaRate = 0;
      if (element.selectedArticle.tva?.value) {
        tvaRate = parseFloat(
          typeof element.selectedArticle.tva.value === 'string'
            ? element.selectedArticle.tva.value.replace('%', '').trim()
            : String(element.selectedArticle.tva.value)
        );
      }
      element.totalWithTax = parseFloat((element.sellcostprice_net_ht * (1 + tvaRate / 100)).toFixed(3));
      element.sellcostprice_discountValue = parseFloat(disc.toFixed(3));
      element.sellcostprice_taxValue = parseFloat((element.sellcostprice_net_ht * tvaRate / 100).toFixed(3));
    } else {
      element.sellcostprice_net_ht = 0;
      element.totalWithTax = 0;
      element.sellcostprice_discountValue = 0;
      element.sellcostprice_taxValue = 0;
    }
    this.calculateTotals(this.dataMerchand.data);
  }

  calculateTotals(data: Merchand[]) {
    this.totalHTNet_doc$.next(data.reduce((s, m) => s + m.sellcostprice_net_ht, 0));
    this.totalRemise_doc$.next(data.reduce((s, m) => s + m.sellcostprice_discountValue, 0));
    this.totalTVA_doc$.next(data.reduce((s, m) => s + m.sellcostprice_taxValue, 0));
    this.netTTC_doc$.next(data.reduce((s, m) => s + m.totalWithTax, 0));
  }

  /** Allow manual rounding adjustments on the TTC total */
  onFinalPriceChange(newTTC: number) {
    this.extraDiscount = this.netTTC_doc$.value - newTTC;
    this.netTTC_doc$.next(newTTC);
  }

  // ── Table row management ─────────────────────────────────────────────────

  addRow() {
    const newRow: Merchand = {
      selectedArticle: null,
      unit_price_ht: 0, merchandise_cost_ht: 0, quantity: 0,
      listLengths: [], selldiscountpercentage: 0,
      sellcostprice_discountValue: 0, sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0, totalWithTax: 0,
      articleSearchInput: '', filteredArticles: [...this.articles], selectedStock: null
    };
    this.dataMerchand.data = [...this.dataMerchand.data, newRow];
    this.calculateTotals(this.dataMerchand.data);
  }

  deleteRow(element: Merchand) {
    const item = { id: element.selectedArticle?.reference, name: element.selectedArticle?.description };
    this.dialog.open(ConfirmDeleteModalComponent, { width: '400px', data: { item } })
      .afterClosed().subscribe(result => {
        if (result) {
          this.dataMerchand.data = this.dataMerchand.data.filter(r => r !== element);
          this.calculateTotals(this.dataMerchand.data);
        }
      });
  }

  /**
   * For quotes, a quantity of 0 is still allowed (pre-pricing).
   * We just warn if the user forgot to enter it.
   */
  shouldDisableQuantityInput(element: Merchand): boolean {
    // ONLY disable if wood article without a selected stock (lengths not possible)
    // isWoodArticle is boolean | undefined — !! coerces to strict boolean
    return !!element.isWoodArticle && !element.selectedStock;
  }

  getStockQuantity(element: Merchand): number {
    return element.selectedStock?.stockQuantity || 0;
  }

  getSelectedTvaFromArticle(art: Article): number | null {
    return art?.tvaid ?? null;
  }

  trackByArticleId(_: number, a: Article): number { return a.id; }

  // ── Form ─────────────────────────────────────────────────────────────────

  createForm() {
    this.form = this.fb.group({
      customer: ['', Validators.required],
      customerReference: ['']
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit() {
    const errors: string[] = [];
    if (!this.selectedCustomer?.id) errors.push('Sélectionner un client.');
    if (!this.dataMerchand.data.length) errors.push('Ajouter au moins un article.');

    if (errors.length) {
      errors.forEach(e => this.toastr.error(e));
      return;
    }

    const doc: Document = {
      id: 0,
      // NOTE: Type = customerQuote — backend will skip stock movement entirely
      type: DocumentTypes.customerQuote,
      stocktransactiontype: TransactionType.None,
      docnumber: '',
      description: '',
      supplierReference: this.form.get('customerReference')?.value || '',
      isinvoiced: false,
      merchandises: this.transformMerchandToMerchandise(this.dataMerchand),
      total_ht_net_doc: this.totalHTNet_doc$.value,
      total_discount_doc: this.totalRemise_doc$.value,
      total_tva_doc: this.totalTVA_doc$.value,
      total_net_ttc: this.netTTC_doc$.value,
      taxe: null!,
      holdingtax: null!,
      withholdingtax: false,
      counterpart: this.selectedCustomer,
      sales_site: this.SalesSite,
      creationdate: new Date(),
      updatedate: new Date(),
      updatedbyid: Number(this.userconnected?.id),
      isdeleted: false,
      regulationid: 0,
      appuser: null!,
      editing: false,
      docstatus: DocStatus.Created,
      isservice: false,
      isPaid: false,
      billingstatus: BillingStatus.NotBilled,
      deliveryNoteDocNumbers: []
    };

    this.saveDocument(doc);
  }

  private transformMerchandToMerchandise(table: MatTableDataSource<Merchand>): Merchandise[] {
    return table.data.map(m => {
      const merch = new Merchandise();
      merch.article          = m.selectedArticle || new Article();
      merch.unit_price_ht    = m.unit_price_ht;
      merch.cost_ht          = m.merchandise_cost_ht;
      merch.quantity         = m.quantity;
      merch.lisoflengths     = m.listLengths;
      merch.discount_percentage   = m.selldiscountpercentage;
      merch.cost_discount_value   = m.sellcostprice_discountValue;
      merch.cost_net_ht           = m.sellcostprice_net_ht;
      merch.tva_value             = m.sellcostprice_taxValue;
      merch.cost_ttc              = m.totalWithTax;
      merch.id                    = m.selectedStock?.merchandiseId || 0;
      merch.packagereference      = m.selectedStock?.packageReference || '';
      merch.description           = m.selectedStock?.MerchandiseDescription || '';
      merch.creationdate          = new Date();
      merch.updatedate            = new Date();
      merch.updatedbyid           = Number(this.userconnected?.id) || 0;
      merch.documentid            = 0;
      merch.isinvoicible          = m.selectedStock?.isInvoicible || true;
      merch.allownegativstock     = m.selectedStock?.allowNegativeStock || false;
      merch.ismergedwith          = m.selectedStock?.isMergedWith || false;
      merch.isdeleted             = false;
      return merch;
    });
  }


  // ── Cleanup ──────────────────────────────────────────────────────────────

  freeAllCalculatedDocumentFields() {
    this.dataMerchand.data = [];
    this.totalHTNet_doc$.next(0);
    this.totalRemise_doc$.next(0);
    this.totalTVA_doc$.next(0);
    this.netTTC_doc$.next(0);
    this.extraDiscount = 0;
  }
}
