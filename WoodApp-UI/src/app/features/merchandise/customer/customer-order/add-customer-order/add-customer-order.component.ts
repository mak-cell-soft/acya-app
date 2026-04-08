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
import { ActivatedRoute, Router } from '@angular/router';
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
 * AddCustomerOrderComponent — Create a new customer order (Bon de Commande).
 *
 * KEY FACTS:
 *  - Document type is `customerOrder` (= 4)
 *  - Backend will NOT update stock (enforced in DocumentController.cs)
 *  - A Bon de commande is a formal order BUT stock stays untouched
 *    until the Bon de Livraison is created
 *  - Soft stock signal (info toast) if article is not in stock
 *  - Routes to /bc/list after save (customer orders list)
 */
@Component({
  selector: 'app-add-customer-order',
  templateUrl: './add-customer-order.component.html',
  styleUrl: './add-customer-order.component.css'
})
export class AddCustomerOrderComponent {

  toastr            = inject(ToastrService);
  router            = inject(Router);
  fb                = inject(FormBuilder);
  articleService    = inject(ArticleService);
  appVarService     = inject(AppVariableService);
  stockService      = inject(StockService);
  counterPartService = inject(CounterpartService);
  dialog            = inject(MatDialog);
  authService       = inject(AuthenticationService);
  appUserService    = inject(AppuserService);
  docService        = inject(DocumentService);
  route             = inject(ActivatedRoute);

  isQuantityValid = isQuantityValid;

  selected     = model<Date | null>(null);
  form!: FormGroup;
  userconnected  = this.authService.getUserDetail();

  allCustomers: CounterPart[] = [];
  selectedCustomer: any = {};
  filteredCustomers: CounterPart[] = [];
  searchCustomerControl = new FormControl('');
  selectedDate: Date = new Date();
  SalesSite!: Site;
  isLoading = false;
  sourceDocumentId = 0;

  @ViewChild('customerSelect') customerSelect!: MatSelect;
  @ViewChildren('articleSelect') articleSelects!: QueryList<MatSelect>;

  displayedColumns: string[] = [
    'index', 'article', 'sellPrice', 'quantity', 'discount', 'tva', 'totalWithoutTva', 'totalWithTva', 'actions'
  ];
  dataMerchand = new MatTableDataSource<Merchand>([]);
  allStocks    = new MatTableDataSource<StockQuantity>([]);
  articles: Article[]  = [];
  TVAs: AppVariable[]  = [];

  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$   = new BehaviorSubject<number>(0);
  netTTC_doc$     = new BehaviorSubject<number>(0);
  extraDiscount   = 0;

  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;

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

  getAppUserSiteAndThenLoadData(): void {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (res) => { this.SalesSite = res; this.loadData(); },
      error: () => this.toastr.error('Site de Vente non trouvé.')
    });
  }

  saveDocument(doc: Document) {
    this.isLoading = true;
    this.docService.Add(doc).subscribe({
      next: (response) => {
        const docRef = response.docRef;
        this.toastr.success(`Commande ${docRef} créée avec succès`);

        // Register relationship if transformed from Quote
        if (this.sourceDocumentId > 0 && response.id > 0) {
          const relationship = {
            parentDocumentId: this.sourceDocumentId,
            childDocumentId: response.id
          };
          this.docService.RegisterRelationship(relationship).subscribe({
            next: () => console.log('Relationship registered between Quote and Order'),
            error: (err) => console.error('Failed to register relationship:', err)
          });
        }

        this.freeAllCalculatedDocumentFields();
        this.isLoading = false;
        this.router.navigateByUrl('home/merchandise/bc/list');
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.toastr.error('Un document avec la même référence existe déjà.');
        } else {
          this.toastr.error('La création de la commande a échoué');
        }
      }
    });
  }

  freeAllCalculatedDocumentFields() {
    this.dataMerchand.data = [];
    this.totalHTNet_doc$.next(0);
    this.totalRemise_doc$.next(0);
    this.totalTVA_doc$.next(0);
    this.netTTC_doc$.next(0);
    this.extraDiscount = 0;
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
      next: (res) => { this.allCustomers = res; this.filteredCustomers = [...res]; }
    });
  }

  getArticles()  { this.articleService.GetAll().subscribe({ next: (r) => { this.articles = r; } }); }
  // NOTE: getBySite(site: Site) — sends full Site object, not just ID
  getStocks()    { this.stockService.getBySite(this.SalesSite).subscribe({ next: (r) => this.allStocks.data = r }); }
  getTaxes()     { this.appVarService.GetAll('Tva').subscribe({ next: (r) => this.TVAs = r }); }

  applyCustomerFilter(): void {
    const v = this.searchCustomerControl.value!.trim().toLowerCase();
    this.filteredCustomers = this.allCustomers.filter(c =>
      c.firstname?.toLowerCase().includes(v) || c.name?.toLowerCase().includes(v)
    );
    this.customerSelect?.open();
  }

  onOptionCustomerSelected(id: number): void {
    const c = this.allCustomers.find(x => x.id === id);
    if (c) {
      this.selectedCustomer = c;
      this.form.get('customer')?.setValue(c);
      this.searchCustomerControl.setValue(c.name || (c.firstname + ' ' + c.lastname), { emitEvent: false });
    }
  }

  clearCustomer(): void {
    this.selectedCustomer = {};
    this.searchCustomerControl.setValue('');
    this.filteredCustomers = [...this.allCustomers];
  }

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
      element.articleSearchInput = ''; element.isWoodArticle = false;
      element.selectedStock = null; this.updateTotals(element); return;
    }
    element.articleSearchInput = `${selectedArticle.reference}${selectedArticle.description ? ' - ' + selectedArticle.description : ''}`;
    element.quantity = 0; element.isWoodArticle = selectedArticle.iswood;
    const stocks = this.allStocks.data.filter(s => s.articleId === selectedArticle.id);
    if (stocks.length > 0) {
      element.selectedStock = stocks.length === 1 ? stocks[0] : null;
      element.unit_price_ht = selectedArticle.sellprice_ht;
      if (element.isWoodArticle) element.listLengths = [];
      if (element.selectedStock) this.updateTotals(element);
    } else {
      element.selectedStock = null;
      // Soft signal — order system can register items not in stock yet
      this.toastr.info(`⚠ Aucun stock pour ${selectedArticle.reference}. Quantité manuelle requise.`, 'Info Stock');
    }
  }

  clearArticle(element: Merchand) {
    element.selectedArticle = null; element.articleSearchInput = '';
    element.selectedStock = null; element.isWoodArticle = false;
    element.listLengths = []; element.quantity = 0;
    element.filteredArticles = [...this.articles]; this.updateTotals(element);
  }

  getMatchingStocks(articleId: number): StockQuantity[] {
    return this.allStocks.data.filter(s => s.articleId === articleId);
  }

  onMerchandiseChange(element: Merchand) {
    if (element.selectedStock) { element.unit_price_ht = element.selectedArticle?.sellprice_ht || 0; this.updateTotals(element); }
  }

  openWoodLengthDialog(element: Merchand): void {
    this.stockService.getWoodStockWithLengthDetails({
      merchandiseRef: element.selectedArticle?.reference ?? '',
      salesSiteId: this.SalesSite.id,
      merchandiseId: element.selectedStock?.merchandiseId ?? element.selectedArticle?.id ?? 0
    }).subscribe({
      next: (d) => this.openLengthModal(element, d),
      error: ()   => this.openLengthModal(element, [])
    });
  }

  private openLengthModal(element: Merchand, details: StockWithLengthDetails[]) {
    this.dialog.open(AddLengthsModalComponent, {
      width: '800px', maxWidth: '90vw', maxHeight: '90vh',
      data: { article: element.selectedArticle, merchand: element, availableStock: details }
    }).afterClosed().subscribe(result => {
      if (result?.lengths && result?.totalQuantity) {
        element.quantity = parseFloat(Number(result.totalQuantity).toFixed(3));
        element.listLengths = result.lengths;
        this.responseFromModalLengths = result.lengths;
        this.responseFromModalTotQuantity = result.totalQuantity;
        this.updateTotals(element);
      }
    });
  }

  getTotalNbPieces(element: Merchand): number {
    return (element.listLengths || []).reduce((a, l) => a + (l.nbpieces || 0), 0);
  }

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
      element.sellcostprice_net_ht = 0; element.totalWithTax = 0;
      element.sellcostprice_discountValue = 0; element.sellcostprice_taxValue = 0;
    }
    this.calculateTotals(this.dataMerchand.data);
  }

  calculateTotals(data: Merchand[]) {
    this.totalHTNet_doc$.next(data.reduce((s, m) => s + m.sellcostprice_net_ht, 0));
    this.totalRemise_doc$.next(data.reduce((s, m) => s + m.sellcostprice_discountValue, 0));
    this.totalTVA_doc$.next(data.reduce((s, m) => s + m.sellcostprice_taxValue, 0));
    this.netTTC_doc$.next(data.reduce((s, m) => s + m.totalWithTax, 0));
  }

  onFinalPriceChange(newTTC: number) {
    this.extraDiscount = this.netTTC_doc$.value - newTTC;
    this.netTTC_doc$.next(newTTC);
  }

  addRow() {
    const newRow: Merchand = {
      selectedArticle: null, unit_price_ht: 0, merchandise_cost_ht: 0, quantity: 0,
      listLengths: [], selldiscountpercentage: 0, sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0, sellcostprice_taxValue: 0, totalWithTax: 0,
      articleSearchInput: '', filteredArticles: [...this.articles], selectedStock: null
    };
    this.dataMerchand.data = [...this.dataMerchand.data, newRow];
    this.calculateTotals(this.dataMerchand.data);
  }

  deleteRow(element: Merchand) {
    const item = { id: element.selectedArticle?.reference, name: element.selectedArticle?.description };
    this.dialog.open(ConfirmDeleteModalComponent, { width: '400px', data: { item } })
      .afterClosed().subscribe(res => {
        if (res) {
          this.dataMerchand.data = this.dataMerchand.data.filter(r => r !== element);
          this.calculateTotals(this.dataMerchand.data);
        }
      });
  }

  shouldDisableQuantityInput(element: Merchand): boolean {
    // isWoodArticle is boolean | undefined — !! coerces to strict boolean
    return !!element.isWoodArticle && !element.selectedStock;
  }

  getStockQuantity(element: Merchand): number { return element.selectedStock?.stockQuantity || 0; }
  getSelectedTvaFromArticle(art: Article): number | null { return art?.tvaid ?? null; }
  trackByArticleId(_: number, a: Article): number { return a.id; }

  createForm() {
    this.form = this.fb.group({
      customer: ['', Validators.required],
      customerReference: ['']
    });
  }

  onSubmit() {
    const errors: string[] = [];
    if (!this.selectedCustomer?.id) errors.push('Sélectionner un client.');
    if (!this.dataMerchand.data.length) errors.push('Ajouter au moins un article.');
    if (errors.length) { errors.forEach(e => this.toastr.error(e)); return; }

    const doc: Document = {
      id: 0,
      // NOTE: customerOrder (4) — backend skips stock movement
      type: DocumentTypes.customerOrder,
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
      taxe: null!, holdingtax: null!, withholdingtax: false,
      counterpart: this.selectedCustomer,
      sales_site: this.SalesSite,
      creationdate: new Date(), updatedate: new Date(),
      updatedbyid: Number(this.userconnected?.id),
      isdeleted: false, regulationid: 0, appuser: null!, editing: false,
      docstatus: DocStatus.Created, isservice: false, isPaid: false,
      billingstatus: BillingStatus.NotBilled, deliveryNoteDocNumbers: []
    };

    this.saveDocument(doc);
  }

  private transformMerchandToMerchandise(table: MatTableDataSource<Merchand>): Merchandise[] {
    return table.data.map(m => {
      const merch = new Merchandise();
      merch.article = m.selectedArticle || new Article();
      merch.unit_price_ht = m.unit_price_ht; merch.cost_ht = m.merchandise_cost_ht;
      merch.quantity = m.quantity; merch.lisoflengths = m.listLengths;
      merch.discount_percentage = m.selldiscountpercentage;
      merch.cost_discount_value = m.sellcostprice_discountValue;
      merch.cost_net_ht = m.sellcostprice_net_ht; merch.tva_value = m.sellcostprice_taxValue;
      merch.cost_ttc = m.totalWithTax; merch.id = m.selectedStock?.merchandiseId || 0;
      merch.packagereference = m.selectedStock?.packageReference || '';
      merch.description = m.selectedStock?.MerchandiseDescription || '';
      merch.creationdate = new Date(); merch.updatedate = new Date();
      merch.updatedbyid = Number(this.userconnected?.id) || 0; merch.documentid = 0;
      merch.isinvoicible = m.selectedStock?.isInvoicible || true;
      merch.allownegativstock = m.selectedStock?.allowNegativeStock || false;
      merch.ismergedwith = m.selectedStock?.isMergedWith || false; merch.isdeleted = false;
      return merch;
    });
  }
}
