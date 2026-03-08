import { Component, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelect } from '@angular/material/select';
import { DecimalPipe } from '@angular/common';

import { Document, DocumentTypes, BillingStatus } from '../../../models/components/document';
import { Merchandise, Merchand } from '../../../models/components/merchandise';
import { Article } from '../../../models/components/article';
import { AppVariable } from '../../../models/configuration/appvariable';
import { ListOfLength } from '../../../models/components/listoflength';

import { DocumentService } from '../../../services/components/document.service';
import { ArticleService } from '../../../services/components/article.service';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { ConfirmDeleteModalComponent } from '../confirm-delete-modal/confirm-delete-modal.component';
import { AddLengthsModalComponent } from '../add-lengths-modal/add-lengths-modal.component';
import { MerchandiseService } from '../../../services/components/merchandise.service';

@Component({
    selector: 'app-edit-document-modal',
    templateUrl: './edit-document-modal.component.html',
    styleUrl: './edit-document-modal.component.css'
})
export class EditDocumentModalComponent implements OnInit {

    fb = inject(FormBuilder);
    articleService = inject(ArticleService);
    appVarService = inject(AppVariableService);
    docService = inject(DocumentService);
    authService = inject(AuthenticationService);
    toastr = inject(ToastrService);
    merchandiseService = inject(MerchandiseService);
    dialog = inject(MatDialog);
    decimalPipe = inject(DecimalPipe);

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
    responseFromModalLengths!: ListOfLength[];
    responseFromModalTotQuantity!: number;
    userconnected = this.authService.getUserDetail();

    // Totals
    totalHTNet_doc$ = new BehaviorSubject<number>(0);
    totalRemise_doc$ = new BehaviorSubject<number>(0);
    totalTVA_doc$ = new BehaviorSubject<number>(0);
    netTTC_doc$ = new BehaviorSubject<number>(0);

    editingMerchandise: Merchandise | null = null;
    isLoading = false;

    constructor(
        public dialogRef: MatDialogRef<EditDocumentModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { document: Document }
    ) {
        this.document = data.document;
        this.merchandisDocument.data = [...(this.document.merchandises || [])];

        this.merchandisDocument.connect().subscribe((data) => {
            this.calculateTotals(data);
        });
    }

    ngOnInit(): void {
        this.createDocumentForm();
        this.createMerchandiseForm();
        this.loadData();
        this.watchForDiscountPercentage();
        this.watchForQuantity();
    }

    createDocumentForm() {
        this.documentForm = this.fb.group({
            supplierReference: [this.document.supplierReference, Validators.required],
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

    loadData() {
        this.getArticles();
        this.getTVAs();
    }

    getArticles() {
        this.articleService.GetAll().subscribe({
            next: (res) => {
                this.articles = res;
                this.filteredArticles = [...this.articles];
                this.searchControl.valueChanges.subscribe((term) => {
                    this.filteredArticles = this.articles.filter(a =>
                        a.reference.toLowerCase().includes((term || '').toLowerCase())
                    );
                });
            }
        });
    }

    getTVAs() {
        this.appVarService.GetAll('Tva').subscribe({
            next: (res) => this.TVAs = res
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
        // Find existing article from pre-loaded list to ensure we have thickness/width objects
        const article = this.articles.find(a => a.id === articleId);
        if (article) {
            console.log('Hydrated article for selection:', article);
            console.log('Thickness present:', !!article.thickness);
            console.log('Width present:', !!article.width);
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
                packagereference: this.merchandiseForm.get('reference')?.value || 'Standard',
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
                // Update existing
                const index = this.merchandisDocument.data.indexOf(this.editingMerchandise);
                if (index > -1) {
                    const updatedList = [...this.merchandisDocument.data];
                    updatedList[index] = { ...this.editingMerchandise, ...merchData };
                    this.merchandisDocument.data = updatedList;
                }
                this.editingMerchandise = null;
            } else {
                // Add new
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
        // Find existing article from pre-loaded list to ensure we have thickness/width objects
        this.selectedArticle = this.articles.find(a => a.id === element.article.id) || element.article;
        this.isArticleTypeWood = this.selectedArticle.iswood;

        if (this.isArticleTypeWood) {
            this.responseFromModalLengths = element.lisoflengths;
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
            reference: element.packagereference,
            description: element.description,
            isinvoicible: element.isinvoicible,
            allownegativstock: element.allownegativstock
        });

        // Search control setup
        this.searchControl.setValue(element.article.reference);
        this.merchandiseForm.get('tva')?.disable();
    }

    calculateTotals(data: Merchandise[]) {
        const totalHTNet = data.reduce((sum, item) => sum + item.cost_net_ht, 0);
        const totalRemise = data.reduce((sum, item) => sum + item.cost_discount_value, 0);
        const totalTVA = data.reduce((sum, item) => sum + item.tva_value, 0);
        const netTTC = data.reduce((sum, item) => sum + item.cost_ttc, 0);

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
        if (this.documentForm.valid) {
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

            this.isLoading = true;
            this.docService.Update(this.document.id, updatedDoc).subscribe({
                next: () => {
                    this.isLoading = false;
                    this.toastr.success('Document mis à jour avec succès');
                    this.dialogRef.close(true);
                },
                error: () => {
                    this.isLoading = false;
                    this.toastr.error('Erreur lors de la mise à jour');
                }
            });
        }
    }

    onCancel() {
        this.dialogRef.close();
    }

     generateMerchandReference() {
    if (this.selectedArticle != null) {
      this.isLoading = true; // Start loading
      this.merchandiseService.getMerchandiseReferenceAsString(this.selectedArticle.id).subscribe({
        next: (response: string) => {
          this.merchandiseForm.get('reference')?.setValue(response);
          this.isLoading = false; // Stop loading
        },
        error: (err) => {
          console.error('Error fetching merchandise reference:', err);
          this.toastr.error('Failed to generate reference. Please try again.');
          this.isLoading = false; // Stop loading
        }
      });
    } else {
      this.toastr.info("Selectionner un Article d\'abord");
    }
  }

}
