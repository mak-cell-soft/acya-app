import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProviderService } from '../../../../../services/components/provider.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ArticleService } from '../../../../../services/components/article.service';
import { AppVariableService } from '../../../../../services/configuration/app-variable.service';
import { AppVariable } from '../../../../../models/configuration/appvariable';
import { Article } from '../../../../../models/components/article';
import { MatTableDataSource } from '@angular/material/table';
import { Merchand, Merchandise } from '../../../../../models/components/merchandise';
import { MatSelect } from '@angular/material/select';
import { CounterPart } from '../../../../../models/components/counterpart';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { MatDialog } from '@angular/material/dialog';
import { AddLengthsModalComponent } from '../../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../../../models/components/listoflength';
import { DecimalPipe } from '@angular/common';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../../shared/Text_Buttons';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfirmDeleteModalComponent } from '../../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { Document, DocumentTypes, BillingStatus, DocStatus } from '../../../../../models/components/document';
import { DocumentService } from '../../../../../services/components/document.service';
import { AppuserService } from '../../../../../services/components/appuser.service';
import { Site } from '../../../../../models/components/sites';
import { Router } from '@angular/router';
import { AppUser } from '../../../../../models/components/appuser';
import { MerchandiseService } from '../../../../../services/components/merchandise.service';
import { SalesSiteModalComponent } from '../../../../../shared/components/modals/sales-site-modal/sales-site-modal.component';
import { TransactionType } from '../../../../../models/components/stock';

@Component({
  selector: 'app-add-supplier-order',
  templateUrl: './add-supplier-order.component.html',
  styleUrl: './add-supplier-order.component.css'
})
export class AddSupplierOrderComponent implements OnInit {

  hasUnsavedChanges = false;
  providerService = inject(ProviderService);
  toastr = inject(ToastrService);
  fb = inject(FormBuilder);
  fb2 = inject(FormBuilder);
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

  @ViewChild('articleSelect') articleSelect!: MatSelect;

  typeDoc: DocumentTypes = DocumentTypes.supplierOrder;
  selectedDate: Date = new Date();
  documentForm!: FormGroup;
  merchandiseForm!: FormGroup;

  allSuppliers: CounterPart[] = [];
  selectedSupplier: any = null;
  selectedArticle!: Article;
  isArticleTypeWood: boolean = false;
  tempMerchand!: Merchand;
  tvaValue: number = 0;

  displayedColumns = ['index', 'article', 'description', 'quantity', 'unit', 'lastPurchasePrice', 'unit_price_ht', 'total', 'actions'];
  merchandisDocument = new MatTableDataSource<Merchandise>([]);

  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);

  articles: Article[] = [];
  TVAs: AppVariable[] = [];
  searchControl = new FormControl('');
  filteredArticles: Article[] = [];

  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  userconnected = this.authService.getUserDetail();
  SalesSite!: Site;
  appUser!: AppUser;

  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;

  statuses = [
    { value: DocStatus.Pending, label: 'En attente' },
    { value: DocStatus.Sent, label: 'Envoyé' },
    { value: DocStatus.PartiallyDelivered, label: 'Partiellement livré' },
    { value: DocStatus.Delivered, label: 'Livré' }
  ];

  constructor() {
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
      this.watchForQuantity();
    }
  }

  loadData() {
    this.getArticles();
    this.getTVAs();
  }

  createDocumentForm() {
    this.documentForm = this.fb.group({
      supplier: ['', Validators.required],
      supplierReference: [''], // Header level supplier reference
      status: [DocStatus.Pending, Validators.required],
      notes: ['']
    });
  }

  createMerchandiseForm() {
    this.merchandiseForm = this.fb2.group({
      unit_price_ht: ['', Validators.required],
      quantity: ['', Validators.required],
      tva: ['', Validators.required],
      description: [''],
      last_purchase_price: [{value: '', disabled: true}]
    });
  }

  getSuppliers(): void {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response: CounterPart[]) => {
        this.allSuppliers = response;
        if (this.allSuppliers.length > 0) {
          const firstSupplier = this.allSuppliers[0];
          this.selectedSupplier = firstSupplier;
          this.documentForm.get('supplier')?.setValue(firstSupplier);
        }
      },
      error: (error) => {
        this.toastr.error('Erreur chargement Fournisseurs');
      }
    });
  }

  getArticles() {
    this.articleService.GetAll().subscribe({
      next: (response) => {
        this.articles = response;
        this.filteredArticles = [...this.articles];
        this.searchControl.valueChanges.subscribe((searchTerm) => {
          this.filteredArticles = this.articles.filter(article =>
            article.reference.toLowerCase().includes((searchTerm || '').toLowerCase())
          );
        });
      },
      error: (error) => {
        this.toastr.error("Erreur recherche des articles");
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredArticles = this.articles.filter(article =>
      article.reference.toLowerCase().includes(filterValue) ||
      (article.description && article.description.toLowerCase().includes(filterValue))
    );
    this.articleSelect.open();
  }

  onOptionSelected(articleId: number): void {
    this.searchControl.setValue('');
    const article = this.articles.find((item) => item.id === articleId);
    if (article) {
      this.selectedArticle = article;
      this.merchandiseForm.get('tva')?.setValue(article.tvaid);
      this.merchandiseForm.get('last_purchase_price')?.setValue(article.lastpurchaseprice_ttc);
      this.isArticleTypeWood = this.selectedArticle.iswood;
    }
  }

  addMerchandise() {
    if (this.merchandiseForm.valid && this.selectedArticle) {
        let qtity = this.isArticleTypeWood ? this.responseFromModalTotQuantity : this.merchandiseForm.get('quantity')?.value;
        const unitPrice = this.merchandiseForm.get('unit_price_ht')?.value;
        const tvaId = this.merchandiseForm.get('tva')?.value;
        const tvaObj = this.TVAs.find(t => t.id === tvaId);
        const tvaRate = tvaObj ? parseFloat(tvaObj.value.replace('%', '')) : 0;
        
        const costHT = qtity * unitPrice;
        const taxValue = costHT * (tvaRate / 100);
        const costTTC = costHT + taxValue;

        const newMerchandise: Merchandise = {
            id: 0,
            packagereference: 'Standard',
            description: this.merchandiseForm.get('description')?.value || '',
            creationdate: new Date(),
            updatedate: new Date(),
            updatedbyid: Number(this.userconnected?.id),
            unit_price_ht: unitPrice,
            quantity: qtity,
            cost_ht: costHT,
            discount_percentage: 0,
            cost_net_ht: costHT,
            tva_value: taxValue,
            cost_discount_value: 0,
            cost_ttc: costTTC,
            documentid: 0,
            isinvoicible: true,
            allownegativstock: false,
            article: this.selectedArticle,
            lisoflengths: this.isArticleTypeWood ? this.responseFromModalLengths : [],
            ismergedwith: false,
            idmergedmerchandise: 0,
            isdeleted: false
        };

        const currentData = this.merchandisDocument.data;
        currentData.push(newMerchandise);
        this.merchandisDocument.data = [...currentData];
        this.hasUnsavedChanges = true;
        this.resetMerchandiseForm();
    } else {
        this.toastr.info('Veuillez remplir tous les champs');
    }
  }

  resetMerchandiseForm() {
    this.merchandiseForm.reset({
      unit_price_ht: '',
      quantity: '',
      tva: '',
      description: '',
      last_purchase_price: ''
    });
    this.searchControl.reset('');
    this.isArticleTypeWood = false;
  }

  deleteRow(element: Merchandise) {
    const index = this.merchandisDocument.data.indexOf(element);
    if (index >= 0) {
      this.merchandisDocument.data.splice(index, 1);
      this.merchandisDocument.data = [...this.merchandisDocument.data];
    }
  }

  calculateTotals(data: Merchandise[]): void {
    const totalHTNet = data.reduce((sum, item) => sum + item.cost_net_ht, 0);
    const totalTVA = data.reduce((sum, item) => sum + item.tva_value, 0);
    const netTTC = data.reduce((sum, item) => sum + item.cost_ttc, 0);

    this.totalHTNet_doc$.next(totalHTNet);
    this.totalTVA_doc$.next(totalTVA);
    this.netTTC_doc$.next(netTTC);
  }

  watchForQuantity() {
    // Basic logic for auto-calculating preview if needed
  }

  async onSubmit() {
    if (this.documentForm.valid && this.merchandisDocument.data.length > 0) {
      const formValues = this.documentForm.value;
      const doc: Document = {
        id: 0,
        type: DocumentTypes.supplierOrder,
        stocktransactiontype: TransactionType.None, // supplierOrder: no stock movement
        docnumber: '',
        description: formValues.notes,
        supplierReference: formValues.supplierReference,
        isinvoiced: false,
        merchandises: this.merchandisDocument.data,
        total_ht_net_doc: this.totalHTNet_doc$.value,
        total_discount_doc: 0,
        total_tva_doc: this.totalTVA_doc$.value,
        total_net_ttc: this.netTTC_doc$.value,
        taxe: null!,
        holdingtax: null!,
        withholdingtax: false,
        counterpart: formValues.supplier,
        sales_site: this.SalesSite,
        creationdate: new Date(),
        updatedate: new Date(),
        updatedbyid: Number(this.userconnected?.id),
        isdeleted: false,
        regulationid: 0,
        appuser: null!,
        editing: false,
        isPaid: false,
        docstatus: formValues.status,
        isservice: false,
        billingstatus: BillingStatus.NotBilled
      };

      this.saveDocument(doc);
    } else {
      this.toastr.warning('Veuillez remplir le formulaire et ajouter des articles');
    }
  }

  async saveDocument(doc: Document) {
    this.docService.Add(doc).subscribe({
      next: (response) => {
        this.toastr.success(`Commande ${response.docRef} créée`);
        this.hasUnsavedChanges = false;
        this.router.navigateByUrl('home/supplierorder/list');
      },
      error: () => this.toastr.error('Erreur lors de la création')
    });
  }

  getAppUserSite() {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (response) => this.SalesSite = response
    });
  }

  openAddQuantityModal(article: Article) {
    const dialogRef = this.dialog.open(AddLengthsModalComponent, {
      width: '800px',
      data: { article: article }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.responseFromModalLengths = result.lengths;
        this.responseFromModalTotQuantity = result.totalQuantity;
        this.merchandiseForm.patchValue({ quantity: result.totalQuantity });
      }
    });
  }

  printOrder() {
    window.print();
  }

  sendEmail() {
    this.toastr.info('Fonctionnalité email à venir');
  }
}
