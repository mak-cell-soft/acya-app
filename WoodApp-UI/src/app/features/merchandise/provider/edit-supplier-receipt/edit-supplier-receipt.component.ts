import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelect } from '@angular/material/select';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { Document } from '../../../../models/components/document';
import { Merchandise } from '../../../../models/components/merchandise';
import { Article } from '../../../../models/components/article';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { ListOfLength } from '../../../../models/components/listoflength';

import { DocumentService } from '../../../../services/components/document.service';
import { ArticleService } from '../../../../services/components/article.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { MerchandiseService } from '../../../../services/components/merchandise.service';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { AddLengthsModalComponent } from '../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';

@Component({
  selector: 'app-edit-supplier-receipt',
  templateUrl: './edit-supplier-receipt.component.html',
  styleUrl: './edit-supplier-receipt.component.scss'
})
export class EditSupplierReceiptComponent implements OnInit {

  private fb = inject(FormBuilder);
  private articleService = inject(ArticleService);
  private appVarService = inject(AppVariableService);
  private docService = inject(DocumentService);
  private authService = inject(AuthenticationService);
  private toastr = inject(ToastrService);
  private merchandiseService = inject(MerchandiseService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public decimalPipe = inject(DecimalPipe);

  @ViewChild('articleSelect') articleSelect!: MatSelect;

  document!: Document;
  documentForm!: FormGroup;
  merchandiseForm!: FormGroup;
  searchControl = new FormControl('');

  merchandisDocument = new MatTableDataSource<Merchandise>([]);
  displayedColumns = [
    'index', 'article', 'sellCostPriceHT', 'quantity', 'costHT',
    'discountPercentage', 'costNetHT', 'actions'
  ];

  articles: Article[] = [];
  filteredArticles: Article[] = [];
  TVAs: AppVariable[] = [];

  selectedArticle!: Article;
  isArticleTypeWood: boolean = false;
  responseFromModalLengths: ListOfLength[] = [];
  responseFromModalTotQuantity: number = 0;
  userconnected = this.authService.getUserDetail();

  // Totals
  totalBrutHT_doc$ = new BehaviorSubject<number>(0);
  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);

  editingMerchandise: Merchandise | null = null;
  isLoading = false;
  isSaving = false;

  ngOnInit(): void {
    this.createDocumentForm();
    this.createMerchandiseForm();
    this.loadInitialData();
    this.watchForDiscountPercentage();
    this.watchForQuantity();

    this.merchandisDocument.connect().subscribe((data) => {
      this.calculateTotals(data);
    });
  }

  createDocumentForm() {
    this.documentForm = this.fb.group({
      supplierReference: ['', Validators.required],
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
      packagereference: [''],
      description: [''],
      isinvoicible: [true],
      allownegativstock: [false]
    });
  }

  loadInitialData() {
    this.isLoading = true;
    const docId = this.route.snapshot.params['id'];
    
    // load TVAs and Articles first
    this.appVarService.GetAll('Tva').subscribe(tvas => {
      this.TVAs = tvas;
      this.articleService.GetAll().subscribe(articles => {
        this.articles = articles;
        this.filteredArticles = [...this.articles];
        
        // now load document
        this.docService.GetById(docId).subscribe({
          next: (doc: Document) => {
            this.document = doc;
            this.merchandisDocument.data = [...(this.document.merchandises || [])];
            this.documentForm.patchValue({
              supplierReference: this.document.supplierReference
            });
            this.isLoading = false;

            this.searchControl.valueChanges.subscribe((term) => {
              this.filteredArticles = this.articles.filter(a =>
                a.reference.toLowerCase().includes((term || '').toLowerCase())
              );
            });
          },
          error: () => {
            this.toastr.error('Erreur lors du chargement du document');
            this.isLoading = false;
            this.goBack();
          }
        });
      });
    });
  }

  applyFilter(event: Event) {
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredArticles = this.articles.filter(a =>
      a.reference.toLowerCase().includes(val) ||
      (a.description && a.description.toLowerCase().includes(val))
    );
    this.articleSelect.open();
  }

  onOptionSelected(articleId: number) {
    this.searchControl.setValue('');
    const article = this.articles.find(a => a.id === articleId);
    if (article) {
      this.selectedArticle = article;
      this.selectedArticle.tva = this.TVAs.find(t => t.id === article.tvaid) || null;
      this.merchandiseForm.get('tva')?.setValue(article.tvaid);
      this.merchandiseForm.get('tva')?.disable();
      this.isArticleTypeWood = this.selectedArticle.iswood;
    }
  }

  addMerchandise() {
    if (this.merchandiseForm.valid) {
      let qtity = this.isArticleTypeWood ? this.responseFromModalTotQuantity : (this.merchandiseForm.get('quantity')?.value || 0);
      let list_lengths = this.isArticleTypeWood ? this.responseFromModalLengths : [];

      const merchData: Partial<Merchandise> = {
        packagereference: this.merchandiseForm.get('packagereference')?.value || 'Standard',
        description: this.merchandiseForm.get('description')?.value || '',
        updatedate: new Date(),
        updatedbyid: Number(this.userconnected?.id),
        unit_price_ht: this.merchandiseForm.get('unit_price_ht')?.value || 0,
        quantity: qtity,
        cost_ht: this.merchandiseForm.get('merchandise_cost_ht')?.value || 0,
        discount_percentage: this.merchandiseForm.get('selldiscountpercentage')?.value || 0,
        cost_discount_value: this.merchandiseForm.get('sellcostprice_discountValue')?.value || 0,
        cost_net_ht: this.merchandiseForm.get('sellcostprice_net_ht')?.value || 0,
        tva_value: this.merchandiseForm.get('sellcostprice_taxValue')?.value || 0,
        cost_ttc: this.merchandiseForm.get('totalWithTax')?.value || 0,
        isinvoicible: this.merchandiseForm.get('isinvoicible')?.value || false,
        allownegativstock: this.merchandiseForm.get('allownegativstock')?.value || false,
        article: this.selectedArticle,
        lisoflengths: list_lengths,
      };

      if (this.editingMerchandise) {
        const index = this.merchandisDocument.data.indexOf(this.editingMerchandise);
        if (index > -1) {
          const updatedList = [...this.merchandisDocument.data];
          updatedList[index] = { ...this.editingMerchandise, ...merchData };
          this.merchandisDocument.data = updatedList;
        }
        this.editingMerchandise = null;
      } else {
        const newM: Merchandise = {
          ...(merchData as Merchandise),
          id: 0,
          creationdate: new Date(),
          documentid: this.document.id,
          ismergedwith: false,
          idmergedmerchandise: 0,
          isdeleted: false
        };
        this.merchandisDocument.data = [...this.merchandisDocument.data, newM];
      }
      this.resetMerchandiseForm();
    } else {
      this.toastr.info('Veuillez remplir tous les champs de la marchandise');
    }
  }

  resetMerchandiseForm() {
    this.merchandiseForm.reset({
      isinvoicible: true,
      allownegativstock: false,
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0
    });
    this.searchControl.setValue('');
    if (this.articleSelect) {
      this.articleSelect.value = null;
    }
    this.isArticleTypeWood = false;
    this.responseFromModalLengths = [];
    this.responseFromModalTotQuantity = 0;
    this.editingMerchandise = null;
    this.selectedArticle = undefined!;
    this.merchandiseForm.get('tva')?.enable();
  }

  deleteRow(element: Merchandise) {
    if (this.editingMerchandise === element) {
      this.editingMerchandise = null;
      this.resetMerchandiseForm();
    }
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item: { id: element.article.reference, name: element.article.description } }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.merchandisDocument.data = this.merchandisDocument.data.filter(m => m !== element);
      }
    });
  }

  editRow(element: Merchandise) {
    this.editingMerchandise = element;
    this.selectedArticle = this.articles.find(a => a.id === element.article.id) || element.article;
    this.isArticleTypeWood = this.selectedArticle.iswood;

    if (this.isArticleTypeWood) {
      this.responseFromModalLengths = element.lisoflengths || [];
      this.responseFromModalTotQuantity = element.quantity;
    }

    this.merchandiseForm.patchValue({
      unit_price_ht: element.unit_price_ht,
      merchandise_cost_ht: element.cost_ht,
      quantity: element.quantity,
      tva: element.article.tvaid,
      selldiscountpercentage: element.discount_percentage,
      sellcostprice_discountValue: element.cost_discount_value,
      sellcostprice_net_ht: element.cost_net_ht,
      sellcostprice_taxValue: element.tva_value,
      totalWithTax: element.cost_ttc,
      packagereference: element.packagereference,
      description: element.description,
      isinvoicible: element.isinvoicible,
      allownegativstock: element.allownegativstock
    });

    this.searchControl.setValue(element.article.reference);
    if (this.articleSelect) {
      this.articleSelect.value = element.article.id;
    }
    this.merchandiseForm.get('tva')?.disable();
  }

  calculateTotals(data: Merchandise[]) {
    const totalBrutHT = data.reduce((sum, item) => sum + item.cost_ht, 0);
    const totalHTNet = data.reduce((sum, item) => sum + item.cost_net_ht, 0);
    const totalRemise = data.reduce((sum, item) => sum + item.cost_discount_value, 0);
    const totalTVA = data.reduce((sum, item) => {
      const tva = item.tva_value > 0 ? item.tva_value : (item.cost_ttc - item.cost_net_ht);
      return sum + tva;
    }, 0);
    const netTTC = data.reduce((sum, item) => sum + item.cost_ttc, 0);

    this.totalBrutHT_doc$.next(totalBrutHT);
    this.totalHTNet_doc$.next(totalHTNet);
    this.totalRemise_doc$.next(totalRemise);
    this.totalTVA_doc$.next(totalTVA);
    this.netTTC_doc$.next(netTTC);
  }

  watchForDiscountPercentage() {
    this.merchandiseForm.get('selldiscountpercentage')?.valueChanges.subscribe((pct: number) => {
      this.recalculateFormFields(pct, this.merchandiseForm.get('quantity')?.value);
    });
  }

  watchForQuantity() {
    this.merchandiseForm.get('quantity')?.valueChanges.subscribe((qty: number) => {
      this.recalculateFormFields(this.merchandiseForm.get('selldiscountpercentage')?.value, qty);
    });
  }

  recalculateFormFields(discountPct: number, quantity: number) {
    if (!this.selectedArticle) return;
    const unitPrice = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value?.toString() || '0');
    const priceHT = unitPrice * quantity;
    const discountVal = priceHT * (discountPct / 100);
    const costNetHT = priceHT - discountVal;
    const tvaPct = parseFloat(this.selectedArticle.tva?.value?.replace('%', '') || '0');
    const taxVal = costNetHT * (tvaPct / 100);
    const ttc = costNetHT + taxVal;

    this.merchandiseForm.patchValue({
      merchandise_cost_ht: parseFloat(priceHT.toFixed(3)),
      sellcostprice_discountValue: parseFloat(discountVal.toFixed(3)),
      sellcostprice_net_ht: parseFloat(costNetHT.toFixed(3)),
      sellcostprice_taxValue: parseFloat(taxVal.toFixed(3)),
      totalWithTax: parseFloat(ttc.toFixed(3)),
    }, { emitEvent: false });
  }

  openAddQuantityModal(article: Article) {
    const dialogRef = this.dialog.open(AddLengthsModalComponent, {
      width: '800px',
      data: {
        article,
        lengths: this.responseFromModalLengths
      }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        const formattedQty = Number(res.totalQuantity.toFixed(3));
        this.responseFromModalLengths = res.lengths;
        this.responseFromModalTotQuantity = formattedQty;
        this.merchandiseForm.patchValue({ quantity: formattedQty });
      }
    });
  }

  onSubmit() {
    if (this.documentForm.valid && this.merchandisDocument.data.length > 0) {
      const updatedDoc: Document = {
        ...this.document,
        supplierReference: this.documentForm.get('supplierReference')?.value,
        merchandises: this.merchandisDocument.data,
        total_ht_net_doc: this.totalHTNet_doc$.value,
        total_discount_doc: this.totalRemise_doc$.value,
        total_tva_doc: this.totalTVA_doc$.value,
        total_net_ttc: this.netTTC_doc$.value,
        updatedbyid: Number(this.userconnected?.id),
        updatedate: new Date()
      };

      this.isSaving = true;
      this.docService.Update(this.document.id, updatedDoc).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastr.success('Document mis à jour avec succès');
          this.goBack();
        },
        error: () => {
          this.isSaving = false;
          this.toastr.error('Erreur lors de la mise à jour');
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/home/merchandise/reception/list']);
  }

  generateMerchandReference() {
    if (this.selectedArticle != null) {
      this.isLoading = true;
      this.merchandiseService.getMerchandiseReferenceAsString(this.selectedArticle.id).subscribe({
        next: (response: string) => {
          this.merchandiseForm.get('packagereference')?.setValue(response);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching merchandise reference:', err);
          this.toastr.error('Failed to generate reference.');
          this.isLoading = false;
        }
      });
    } else {
      this.toastr.info("Sélectionner un article d'abord");
    }
  }

}
