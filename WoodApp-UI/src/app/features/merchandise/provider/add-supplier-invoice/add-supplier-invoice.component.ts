import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProviderService } from '../../../../services/components/provider.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ArticleService } from '../../../../services/components/article.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { ExchangeRateService } from '../../../../services/components/exchange-rate.service';
import { EnterpriseService } from '../../../../services/components/enterprise.service';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { Article } from '../../../../models/components/article';
import { MatTableDataSource } from '@angular/material/table';
import { Merchand, Merchandise, LineType } from '../../../../models/components/merchandise';
import { MatSelect } from '@angular/material/select';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../shared/constants/list_of_constants';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { MatDialog } from '@angular/material/dialog';
import { AddLengthsModalComponent } from '../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../../models/components/listoflength';
import { DecimalPipe } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { Document, DocumentTypes, DocStatus } from '../../../../models/components/document';
import { Currency } from '../../../../models/components/exchange-rate';
import { DocumentService } from '../../../../services/components/document.service';
import { AppuserService } from '../../../../services/components/appuser.service';
import { Site } from '../../../../models/components/sites';
import { Router, ActivatedRoute } from '@angular/router';
import { AppUser } from '../../../../models/components/appuser';
import { MerchandiseService } from '../../../../services/components/merchandise.service';

@Component({
  selector: 'app-add-supplier-invoice',
  templateUrl: './add-supplier-invoice.component.html',
  styleUrl: './add-supplier-invoice.component.css'
})
export class AddSupplierInvoiceComponent implements OnInit {

  hasUnsavedChanges = false;
  isLoading = false;

  providerService = inject(ProviderService);
  toastr = inject(ToastrService);
  fb = inject(FormBuilder);
  articleService = inject(ArticleService);
  appVarService = inject(AppVariableService);
  appUserService = inject(AppuserService);
  counterpartService = inject(CounterpartService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  decimalPipe = inject(DecimalPipe);
  docService = inject(DocumentService);
  merchandiseService = inject(MerchandiseService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  exchangeRateService = inject(ExchangeRateService);
  enterpriseService = inject(EnterpriseService);

  @ViewChild('articleSelect') articleSelect!: MatSelect;

  selected: Date = new Date();
  documentForm!: FormGroup;
  merchandiseForm!: FormGroup;
  taxeForm!: FormGroup;

  allSuppliers: CounterPart[] = [];
  selectedSupplier: any = null;
  selectedArticle!: Article;
  isArticleTypeWood: boolean = false;
  
  displayedColumns = ['index', 'article', 'sellCostPriceHT', 'quantity', 'costHT', 'discountPercentage', 'costNetHT', 'actions'];
  merchandisDocument = new MatTableDataSource<Merchandise>([]);

  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);

  articles: Article[] = [];
  TVAs: AppVariable[] = [];
  appvariablesTaxes: AppVariable[] = [];
  searchControl = new FormControl('');
  filteredArticles: Article[] = [];

  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  userconnected = this.authService.getUserDetail();
  SalesSite!: Site;
  appUser!: AppUser;

  // RS and Taxes
  rsList: AppVariable[] = [];
  selectedRS: AppVariable | null = null;
  total_net_payable$ = new BehaviorSubject<number>(0);
  
  additionalTaxes = [
    { name: 'Fodec', amount: 0.000 }
  ];

  isEditing: boolean = false;
  editIndex: number | null = null;
  
  baseCurrency: string = 'TND';
  currencies!: Observable<Currency[]>;

  constructor() {
    this.currencies = this.exchangeRateService.getCurrencies();
    this.merchandisDocument.connect().subscribe((data) => {
      this.calculateTotals(data);
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAppUserSite();
      this.getSuppliers();
      this.createDocumentForm();
      this.createMerchandiseForm();
      this.loadData();
      this.loadAppVariables();
      this.watchForDiscountPercentage();
      this.watchForQuantity();
      this.getAllTaxes();
      this.loadEnterpriseInfo();
    }
  }

  getAppUserSite() {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (response: any) => {
        console.log('Site : ', response);
        this.SalesSite = response;
      },
      error: (err: any) => {
        console.error('Error fetching site data:', err);
        this.toastr.error('Site de Vente non trouvé.');
      }
    });
  }

  loadData() {
    this.getArticles();
    this.getTVAs();
  }

  createDocumentForm() {
    this.documentForm = this.fb.group({
      supplier: ['', Validators.required],
      supplierReference: ['', Validators.required],
      currency: ['TND', Validators.required],
      exchangeRate: [1.0, [Validators.required, Validators.min(0.000001)]]
    });

    this.taxeForm = this.fb.group({
      selectedTaxe: [null, Validators.required]
    });

    this.taxeForm.get('selectedTaxe')?.valueChanges.subscribe(() => {
      this.calculateTotals(this.merchandisDocument.data);
    });
  }

  createMerchandiseForm() {
    this.merchandiseForm = this.fb.group({
      unit_price_ht: ['', Validators.required],
      merchandise_cost_ht: ['', Validators.required],
      quantity: ['', Validators.required],
      tva: ['', Validators.required],
      sellcostprice_discountValue: [0],
      selldiscountpercentage: [0],
      sellcostprice_net_ht: ['', Validators.required],
      sellcostprice_taxValue: ['', Validators.required],
      totalWithTax: ['', Validators.required],
      reference: [''],
      description: [''],
      isinvoicible: [true],
      allownegativstock: [false]
    });
  }

  getSuppliers(): void {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response: CounterPart[]) => {
        this.allSuppliers = response;
      }
    });
  }

  onSupplierChange(supplier: any): void {
    this.selectedSupplier = supplier;
  }

  getArticles() {
    this.articleService.GetAll().subscribe({
      next: (response) => {
        this.articles = response;
        this.filteredArticles = [...this.articles];
        this.searchControl.valueChanges.subscribe((searchTerm) => {
          const lowerTerm = (searchTerm || '').toLowerCase();
          this.filteredArticles = this.articles.filter(article =>
            article.reference.toLowerCase().includes(lowerTerm) ||
            article.description?.toLowerCase().includes(lowerTerm)
          );
        });
      }
    });
  }

  getTVAs() {
    this.appVarService.GetAll('Tva').subscribe({
      next: (response) => {
        this.TVAs = response;
      }
    });
  }

  getAllTaxes() {
    this.appVarService.GetAll('Taxe').subscribe({
      next: (response: any) => {
        this.appvariablesTaxes = response;
        const defaultTax = this.appvariablesTaxes.find(taxe => taxe.isdefault === true);
        if (defaultTax) {
          this.taxeForm.get('selectedTaxe')?.setValue(defaultTax.id);
        } else if (this.appvariablesTaxes.length > 0) {
          this.taxeForm.get('selectedTaxe')?.setValue(this.appvariablesTaxes[0].id);
        }
      },
      error: (err) => console.error('Error loading taxes', err)
    });
  }

  loadAppVariables() {
    this.appVarService.GetAll('RS').subscribe({
      next: (response) => {
        this.rsList = response;
      }
    });
  }

  loadEnterpriseInfo() {
    this.enterpriseService.getEnterpriseInfo(1).subscribe({
      next: (ent) => {
        if (ent && ent.devise) {
          this.baseCurrency = ent.devise;
        }
      }
    });
  }

  onCurrencyChange(newCurrency: string) {
    if (newCurrency === this.baseCurrency) {
      this.documentForm.get('exchangeRate')?.setValue(1.0);
    } else {
      this.exchangeRateService.getExchangeRate(newCurrency, this.baseCurrency).subscribe({
        next: (rate: number) => {
          this.documentForm.get('exchangeRate')?.setValue(rate);
        }
      });
    }
  }

  onRSChange(rs: AppVariable | null) {
    this.selectedRS = rs;
    this.calculateTotals(this.merchandisDocument.data);
  }

  addMerchandise() {
    if (this.merchandiseForm.valid) {
      let qtity: number = 0;
      let list_lengths: any = null;
      if (this.isArticleTypeWood) {
        qtity = this.responseFromModalTotQuantity;
        list_lengths = this.responseFromModalLengths;
      } else {
        qtity = this.merchandiseForm.get('quantity')?.value || 0;
      }

      const newMerchandise: Merchandise = {
        id: 0,
        packagereference: this.merchandiseForm.get('reference')?.value || 'Standard',
        description: this.merchandiseForm.get('description')?.value || '',
        creationdate: new Date(),
        updatedate: new Date(),
        updatedbyid: Number(this.userconnected?.id),
        unit_price_ht: this.merchandiseForm.get('unit_price_ht')?.value || 0,
        quantity: qtity,
        cost_ht: this.merchandiseForm.get('merchandise_cost_ht')?.value || 0,
        discount_percentage: this.merchandiseForm.get('selldiscountpercentage')?.value || 0,
        cost_net_ht: this.merchandiseForm.get('sellcostprice_net_ht')?.value || 0,
        tva_value: this.merchandiseForm.get('sellcostprice_taxValue')?.value || 0,
        cost_discount_value: this.merchandiseForm.get('sellcostprice_discountValue')?.value || 0,
        cost_ttc: this.merchandiseForm.get('totalWithTax')?.value || 0,
        documentid: 0,
        isinvoicible: this.merchandiseForm.get('isinvoicible')?.value || false,
        allownegativstock: this.merchandiseForm.get('allownegativstock')?.value || false,
        article: this.selectedArticle,
        lisoflengths: list_lengths,
        ismergedwith: false,
        idmergedmerchandise: 0,
        isdeleted: false,
        line_type: LineType.Merchandise
      };

      const currentData = this.merchandisDocument.data;
      if (this.isEditing && this.editIndex !== null) {
        currentData[this.editIndex] = newMerchandise;
        this.isEditing = false;
        this.editIndex = null;
      } else {
        currentData.push(newMerchandise);
      }
      this.merchandisDocument.data = [...currentData];
      this.hasUnsavedChanges = true;
      this.resetMerchandiseForm();
    } else {
      this.toastr.info('Veuillez remplir tous les champs obligatoires');
    }
  }

  addTransportFee() {
    const newMerchandise: Merchandise = {
      id: 0,
      packagereference: 'Standard',
      description: 'Frais de transport',
      creationdate: new Date(),
      updatedate: new Date(),
      updatedbyid: Number(this.userconnected?.id),
      unit_price_ht: 0,
      quantity: 1,
      cost_ht: 0,
      discount_percentage: 0,
      cost_net_ht: 0,
      tva_value: 0,
      cost_discount_value: 0,
      cost_ttc: 0,
      documentid: 0,
      isinvoicible: true,
      allownegativstock: false,
      article: null as any,
      lisoflengths: null as any,
      ismergedwith: false,
      idmergedmerchandise: 0,
      isdeleted: false,
      line_type: LineType.TransportFee
    };

    const currentData = this.merchandisDocument.data;
    currentData.push(newMerchandise);
    this.merchandisDocument.data = [...currentData];
    this.hasUnsavedChanges = true;
  }

  editRow(element: Merchandise) {
    this.isEditing = true;
    this.editIndex = this.merchandisDocument.data.indexOf(element);
    this.selectedArticle = element.article;
    this.onOptionSelected(element.article);

    this.merchandiseForm.patchValue({
      unit_price_ht: element.unit_price_ht,
      quantity: element.quantity,
      merchandise_cost_ht: element.cost_ht,
      tva: element.article?.tvaid,
      sellcostprice_discountValue: element.cost_discount_value,
      selldiscountpercentage: element.discount_percentage,
      sellcostprice_net_ht: element.cost_net_ht,
      sellcostprice_taxValue: element.tva_value,
      totalWithTax: element.cost_ttc,
      reference: element.packagereference,
      description: element.description,
      isinvoicible: element.isinvoicible,
      allownegativstock: element.allownegativstock
    });

    if (element.article?.iswood) {
      this.responseFromModalLengths = element.lisoflengths;
      this.responseFromModalTotQuantity = element.quantity;
      this.isArticleTypeWood = true;
    }
  }

  deleteRow(element: Merchandise) {
    const item = { 
      id: element.line_type === LineType.TransportFee ? 'Transport' : element.article?.reference, 
      name: element.line_type === LineType.TransportFee ? element.description : element.article?.description 
    };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.merchandisDocument.data.indexOf(element);
        if (index >= 0) {
          this.merchandisDocument.data.splice(index, 1);
          this.merchandisDocument.data = [...this.merchandisDocument.data];
        }
      }
    });
  }

  resetMerchandiseForm() {
    this.merchandiseForm.reset({
      isinvoicible: true,
      allownegativstock: false,
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0
    });
    this.searchControl.reset('');
    this.selectedArticle = null!;
    this.isArticleTypeWood = false;
    this.isEditing = false;
    this.editIndex = null;
  }

  onOptionSelected(article: Article): void {
    if (article) {
      this.selectedArticle = article;
      const displayValue = article.reference + (article.description ? ' - ' + article.description : '');
      this.searchControl.setValue(displayValue, { emitEvent: false });
      this.merchandiseForm.get('tva')?.setValue(article.tvaid);
      this.isArticleTypeWood = article.iswood;
      if (this.isArticleTypeWood) {
        this.merchandiseForm.get('quantity')?.disable();
      } else {
        this.merchandiseForm.get('quantity')?.enable();
      }
    }
  }

  openDropdown() {
    if (this.articleSelect) {
      this.articleSelect.open();
    }
  }

  clearArticle() {
    this.resetMerchandiseForm();
  }

  openAddQuantityModal(article: Article) {
    if (article && this.merchandiseForm.get('unit_price_ht')?.valid) {
      const dialogRef = this.dialog.open(AddLengthsModalComponent, {
        width: '800px',
        data: { article: article, isPurchase: true }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const { lengths, totalQuantity } = result;
          this.responseFromModalLengths = lengths;
          this.responseFromModalTotQuantity = totalQuantity;
          this.updateCalculationsFromModal(totalQuantity);
        }
      });
    } else {
      this.toastr.warning("Saisissez le prix unitaire HT d'abord");
    }
  }

  updateCalculationsFromModal(qtity: number) {
    const unitPrice = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value || 0);
    const priceHT = unitPrice * qtity;
    const discountPercent = parseFloat(this.merchandiseForm.get('selldiscountpercentage')?.value || 0);
    const discountVal = priceHT * (discountPercent / 100);
    const netHT = priceHT - discountVal;
    
    let tvaRate = 0;
    if (this.selectedArticle?.tva) {
      tvaRate = parseFloat(this.selectedArticle.tva.value.replace('%', '')) || 0;
    } else {
      const tvaObj = this.TVAs.find(t => t.id === this.merchandiseForm.get('tva')?.value);
      tvaRate = parseFloat(tvaObj?.value.replace('%', '') || '0') || 0;
    }
    
    const tvaVal = netHT * (tvaRate / 100);
    const ttc = netHT + tvaVal;

    this.merchandiseForm.patchValue({
      quantity: qtity,
      merchandise_cost_ht: priceHT,
      sellcostprice_discountValue: discountVal,
      sellcostprice_net_ht: netHT,
      sellcostprice_taxValue: tvaVal,
      totalWithTax: ttc
    });
  }

  watchForDiscountPercentage() {
    this.merchandiseForm.get('selldiscountpercentage')?.valueChanges.subscribe((discountPercent: number) => {
      this.recalculateForm();
    });
  }

  watchForQuantity() {
    this.merchandiseForm.get('quantity')?.valueChanges.subscribe((qtity: number) => {
      this.recalculateForm();
    });
    this.merchandiseForm.get('unit_price_ht')?.valueChanges.subscribe(() => {
      this.recalculateForm();
    });
  }

  recalculateForm() {
    const unitPrice = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value || 0);
    const qtity = parseFloat(this.merchandiseForm.get('quantity')?.value || 0);
    const discountPercent = parseFloat(this.merchandiseForm.get('selldiscountpercentage')?.value || 0);
    
    const priceHT = unitPrice * qtity;
    const discountVal = priceHT * (discountPercent / 100);
    const netHT = priceHT - discountVal;
    
    const tvaId = this.merchandiseForm.get('tva')?.value;
    const tvaObj = this.TVAs.find(t => t.id === tvaId);
    const tvaRate = parseFloat(tvaObj?.value.replace('%', '') || '0') || 0;
    
    const tvaVal = netHT * (tvaRate / 100);
    const ttc = netHT + tvaVal;

    this.merchandiseForm.patchValue({
      merchandise_cost_ht: parseFloat(priceHT.toFixed(3)),
      sellcostprice_discountValue: parseFloat(discountVal.toFixed(3)),
      sellcostprice_net_ht: parseFloat(netHT.toFixed(3)),
      sellcostprice_taxValue: parseFloat(tvaVal.toFixed(3)),
      totalWithTax: parseFloat(ttc.toFixed(3)),
    }, { emitEvent: false });
  }

  calculateTotals(data: Merchandise[]) {
    let totalHT = 0;
    let totalRemise = 0;
    let totalTVA = 0;

    data.forEach(item => {
      totalHT += item.cost_ht;
      totalRemise += item.cost_discount_value;
      totalTVA += item.tva_value;
    });

    // Add Stamp Tax (Droit de Timbre)
    const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
    const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
    const taxAddition = selectedTax ? parseFloat(selectedTax.value) : 0;

    // Fodec (assuming it's still manually handled as before or from the additionalTaxes array)
    const fodec = this.additionalTaxes.find(t => t.name === 'Fodec')?.amount || 0;
    
    const totalTTC = (totalHT - totalRemise + totalTVA) + taxAddition + fodec;

    this.totalHTNet_doc$.next(totalHT);
    this.totalRemise_doc$.next(totalRemise);
    this.totalTVA_doc$.next(totalTVA);
    this.netTTC_doc$.next(totalTTC);

    if (this.selectedRS) {
      const rsVal = totalTTC * (parseFloat(this.selectedRS.value) / 100);
      this.total_net_payable$.next(totalTTC - rsVal);
    } else {
      this.total_net_payable$.next(totalTTC);
    }
  }

  onSubmit() {
    if (this.documentForm.invalid) {
      this.toastr.warning('Veuillez remplir les informations générales');
      return;
    }

    if (this.merchandisDocument.data.length === 0) {
      this.toastr.warning('Veuillez ajouter au moins un article');
      return;
    }

    this.isLoading = true;
    const document: Document = {
      id: 0,
      type: DocumentTypes.supplierInvoice,
      docnumber: '',
      description: 'Facture Fournisseur',
      supplierReference: this.documentForm.get('supplierReference')?.value,
      isinvoiced: true,
      merchandises: this.merchandisDocument.data,
      total_ht_net_doc: this.totalHTNet_doc$.value,
      total_discount_doc: this.totalRemise_doc$.value,
      total_tva_doc: this.totalTVA_doc$.value,
      total_net_ttc: this.netTTC_doc$.value,
      total_net_payable: this.total_net_payable$.value,
      taxe: (this.appvariablesTaxes.find(t => t.id === this.taxeForm.get('selectedTaxe')?.value) || null) as any,
      currency: this.documentForm.get('currency')?.value,
      exchangeRate: this.documentForm.get('exchangeRate')?.value,
      counterpart: this.selectedSupplier,
      sales_site: this.SalesSite,
      creationdate: new Date(),
      updatedate: new Date(),
      docstatus: DocStatus.Created,
      isPaid: false,
      isservice: false
    } as any;

    this.docService.Add(document).subscribe({
      next: (res: any) => {
        this.toastr.success('Facture enregistrée avec succès');
        this.hasUnsavedChanges = false;
        this.router.navigate(['/home/merchandise/sinvoices']);
      },
      error: (err: any) => {
        this.toastr.error('Erreur lors de l\'enregistrement');
        this.isLoading = false;
      }
    });
  }
}
