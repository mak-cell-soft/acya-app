import { Component, inject, model, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProviderService } from '../../../../services/components/provider.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ArticleService } from '../../../../services/components/article.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { Article } from '../../../../models/components/article';
import { MatTableDataSource } from '@angular/material/table';
import { Merchand, Merchandise } from '../../../../models/components/merchandise';
import { MatSelect } from '@angular/material/select';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../shared/constants/list_of_constants';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { MatDialog } from '@angular/material/dialog';
import { AddLengthsModalComponent } from '../../../../dashboard/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../../models/components/listoflength';
import { DecimalPipe } from '@angular/common';
import { parse } from 'node:path';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../shared/Text_Buttons';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDeleteModalComponent } from '../../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { ToWords } from 'to-words';
import { CanComponentDeactivate } from '../../../../guards/can-deactivate.guard';
import { Document, DocumentTypes, BillingStatus } from '../../../../models/components/document';
import { DocumentService } from '../../../../services/components/document.service';
import { AppuserService } from '../../../../services/components/appuser.service';
import { Site } from '../../../../models/components/sites';
import { Router } from '@angular/router';
import { AppUser } from '../../../../models/components/appuser';
import { MerchandiseService } from '../../../../services/components/merchandise.service';
import { SalesSiteModalComponent } from '../../../../dashboard/modals/sales-site-modal/sales-site-modal.component';
import { firstValueFrom } from 'rxjs';
import { TransactionType } from '../../../../models/components/stock';

@Component({
  selector: 'app-add-document',
  templateUrl: './add-document.component.html',
  styleUrl: './add-document.component.css'
})
export class AddDocumentComponent implements OnInit, CanComponentDeactivate {

  hasUnsavedChanges = false; // Flag for tracking unsaved changes

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


  typeDoc!: DocumentTypes;
  selected: Date = new Date();
  documentForm!: FormGroup;
  merchandiseForm!: FormGroup;

  allSuppliers: CounterPart[] = [];
  selectedSupplier: any = null;
  selectedArticle!: Article;
  isArticleTypeWood: boolean = false;
  tempMerchand!: Merchand;
  tvaValue: number = 0;
  // Store filtered articles for each row
  // filteredArticles: { [key: number]: any[] } = {};

  displayedColumns = ['index', 'article', 'sellCostPriceHT', 'quantity', 'costHT', 'discountPercentage', 'costNetHT', 'actions'];
  merchandisDocument = new MatTableDataSource<Merchandise>([]);

  // BehaviorSubjects to hold totals
  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);

  merchandise!: Merchandise;
  articles: Article[] = []; // Fetch from service
  TVAs: AppVariable[] = []; // Fetch from service

  searchControl = new FormControl('');
  // Filtered articles for the dropdown
  filteredArticles: Article[] = [];

  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  userconnected = this.authService.getUserDetail();
  SalesSite!: Site;
  appUser!: AppUser;

  /**
   * Table Summary
   * 
   */
  totalHTNet_doc: number = 0;
  totalRemise_doc: number = 0;
  totalTVA_doc: number = 0;
  netTTC_doc: number = 0;

  /**
   * Control Buttons
   */
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;


  constructor() {
    // Watch for data changes and recalculate totals
    this.merchandisDocument.connect().subscribe((data) => {
      this.calculateTotals(data);
    });
  }

  // Method called when the user tries to navigate away
  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes. Do you really want to leave?');
    }
    return true; // Allow navigation if there are no unsaved changes
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAppUserSite();
      this.getSuppliers();
      this.createDocumentForm();
      this.createMerchandiseForm();
      //this.addRow();
      this.loadData();
      this.watchForDiscountPercentage();
      this.watchForQuantity();
    }

  }

  loadData() {
    this.getArticles();
    this.getTVAs();
  }

  addMerchandise() {
    console.log('addMerchandise is clicked');
    console.log('this.merchandiseForm.valid', this.merchandiseForm.valid)

    if (this.merchandiseForm.valid) {
      /**
           * Traitement de la liste des longueurs et la Quantité
           */
      let qtity: number = 0;
      let list_lengths: any;
      if (this.isArticleTypeWood) {
        qtity = this.responseFromModalTotQuantity;
        list_lengths = this.responseFromModalLengths;
      } else {
        qtity = this.merchandiseForm.get('quantity')?.value || 0;
        list_lengths = null;
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
        isdeleted: false
      };

      // Add the new Merchandise to the data source
      const currentData = this.merchandisDocument.data;
      currentData.push(newMerchandise);
      this.merchandisDocument.data = [...currentData]; // Update the data source
      /**
       * Appliquer ici où on veux tester le Composant comment il a changé.
       */
      this.hasUnsavedChanges = true;
      console.log(' this.merchandisDocument.data =', this.merchandisDocument.data);
      this.resetMerchandiseForm();
    } else {
      this.toastr.info('Terminez les champs et remplissez tous les champs de la marchandise');
    }
  }

  /**
   * @description loaded Articles when start typing
   * @param event 
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredArticles = this.articles.filter(article =>
      article.reference.toLowerCase().includes(filterValue) ||
      (article.description && article.description.toLowerCase().includes(filterValue))
    );
    // Open dropdown on filter
    this.openDropdown();
  }

  // Open dropdown programmatically
  openDropdown() {
    this.articleSelect.open();
  }

  // Clear input when an option is selected
  onOptionSelected(articleId: number): void {
    this.searchControl.setValue('');
    this.filteredArticles = this.articles; // Reset filtered articles

    // Find and set the selected article
    const article = this.articles.find((item) => item.id === articleId);
    if (article) {
      this.selectedArticle = article;

      console.log("Selected Article : ", this.selectedArticle)

      // Optionally link the selected article's tva to the TVAs array
      this.selectedArticle.tva = this.TVAs.find((tva) => tva.id === article.tvaid) || null;

      // Update the form control for tva
      this.merchandiseForm.get('tva')?.setValue(article.tvaid);
      this.merchandiseForm.get('tva')?.disable();

      // Handle wood-specific logic
      this.isArticleTypeWood = this.selectedArticle.iswood;
      if (this.isArticleTypeWood) {
        console.log('Type Wood Selected : ', this.isArticleTypeWood);
        this.merchandiseForm.get('quantity')?.disabled; // Disable the quantity input
      }


    }
  }

  editRow(element: Merchand) {
    // Logic for editing a row
  }

  validateRow(element: Merchand) {
    // Logic for validating a row
  }

  deleteRow(element: Merchandise) {
    const item = { id: element.article.reference, name: element.article.description };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.merchandisDocument.data.indexOf(element);
        if (index >= 0) {
          this.merchandisDocument.data.splice(index, 1);
          this.merchandisDocument.data = [...this.merchandisDocument.data]; // Trigger table update
          this.calculateTotals(this.merchandisDocument.data); // Recalculate totals after deletion
        }
      } else {
        console.log('Deletion canceled');
        this.toastr.info("Suppression annulé");
      }
    });
  }


  createDocumentForm() {
    this.documentForm = this.fb.group({
      supplier: ['', Validators.required],
      supplierReference: ['', Validators.required],

    });
  }
  // unit_price_ht: number = 0;
  // merchandise_cost_ht: number = 0; // Prix Achat HT
  // quantity: number = 0; // Quantité
  // listLengths: ListOfLength[] = []; // La liste des Longueurs
  // sellcostprice_discountValue: number = 0; // valeur de la remise
  // selldiscountpercentage: number = 0; // % remise
  // sellcostprice_net_ht: number = 0; // Prix Achat avec Remise
  // sellcostprice_taxValue: number = 0; // valeur de la TVA
  // totalWithTax: number = 0; // Prix Achat TTC

  createMerchandiseForm() {
    this.merchandiseForm = this.fb2.group({
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

  resetMerchandiseForm() {
    this.merchandiseForm.reset({
      unit_price_ht: '',
      quantity: '',
      merchandise_cost_ht: '',
      selldiscountpercentage: '',
      tva: '',
      sellcostprice_net_ht: '',
      sellcostprice_discountValue: 0,
      sellcostprice_taxValue: '',
      totalWithTax: '',
      reference: '',
      description: '',
      isinvoicible: true,
      allownegativstock: false,
    });

    this.searchControl.reset('');

    // Clear dropdown selection
    this.articleSelect.value = null;
    this.isArticleTypeWood = false;
    this.responseFromModalLengths = [];
    this.responseFromModalTotQuantity = 0;
  }

  getSuppliers(): void {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response: CounterPart[]) => {
        this.allSuppliers = response;

        // Set the first supplier after the data is fetched
        if (this.allSuppliers.length > 0) {
          const firstSupplier = this.allSuppliers[0];
          this.selectedSupplier = firstSupplier;
          this.documentForm.get('supplier')?.setValue(firstSupplier); // Update the form control
        }
      },
      error: (error) => {
        console.error('Error fetching providers', error);
        this.toastr.error('Erreur chargement Fournisseurs');
      }
    });
  }

  onSupplierChange(supplier: any): void {
    this.selectedSupplier = supplier;
  }

  getArticles() {
    this.articles = [];
    this.articleService.GetAll().subscribe({
      next: (response) => {
        this.articles = response;
        // Initialize filteredArticles with all articles
        this.filteredArticles = [...this.articles];
        // Subscribe to searchControl value changes to filter the articles
        this.searchControl.valueChanges.subscribe((searchTerm) => {
          this.filteredArticles = this.articles.filter(article =>
            article.reference.toLowerCase().includes((searchTerm || '').toLowerCase())
          );
        });
      },
      error: (error) => {
        console.error('Error fetching Articles:', error);
        this.toastr.error("Erreur recherche des articles");
      }
    });
  }

  getTVAs() {
    this.TVAs = [];
    this.appVarService.GetAll('Tva').subscribe({
      next: (response) => {
        this.TVAs = response;
      },
      error: (error) => {
        console.error('Error fetching Taxes:', error);
        this.toastr.error("Erreur Serveur");
      }
    });
  }

  openAddQuantityModal(article: Article) {
    if (article != null) {
      if (!this.merchandiseForm.get('unit_price_ht')?.valid) {
        this.toastr.warning("Saisir le prix d'achat HT");
      } else {
        const dialogRef = this.dialog.open(AddLengthsModalComponent, {
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: {
            article: article
          }
        });
        /**
         * When the modal is closed, we need to update other inputs by 
         * claculating other values.
         */
        dialogRef.afterClosed().subscribe(result => {
          console.log('Modal Result:', result); // Log the entire result to verify structure

          if (result) {
            const { lengths, totalQuantity } = result; // Destructure for clarity

            console.log('Lengths:', lengths);
            console.log('Total Quantity:', totalQuantity);

            if (lengths && totalQuantity) {
              this.responseFromModalLengths = lengths;
              this.responseFromModalTotQuantity = totalQuantity;

              console.log('dialogRef.afterClosed().lengths', lengths);
              console.log('dialogRef.afterClosed().totalQuantity', totalQuantity);

              let merchand = this.createTemporaryMerchand(lengths, totalQuantity, article);
              this.populateMerchandiseForm(merchand);
            } else {
              console.warn('Incomplete data received from modal:', result);
            }
          } else {
            console.warn('No result returned from modal.');
          }
        });

      }

    } else {
      console.error('Article not found');
      this.toastr.error("Article non trouvé");
    }
  }

  createTemporaryMerchand(list: ListOfLength[], qtity: number, article: Article): Merchand {
    /**
     * Use Merchand from merchandise.ts
     */
    console.log('Détails Calcul des champs:')
    const merchand = new Merchand();
    merchand.unit_price_ht = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value || '0,000');
    console.log('unit_price_ht', merchand.unit_price_ht);
    /**
     * Prix Hors Taxe
     */
    // merchand.merchandise_cost_ht = article.sellprice_ht;
    merchand.merchandise_cost_ht = parseFloat(merchand.unit_price_ht.toFixed(3));
    console.log('Quantité:', qtity);
    /**
     * Quantité
     */
    merchand.quantity = parseFloat(qtity.toFixed(3));
    console.log('merchand.quantity', merchand.quantity)
    /**
     * Prix Total Hors Taxe sans Remise
     */
    let merchadise_cost_ht = parseFloat((merchand.merchandise_cost_ht * merchand.quantity).toFixed(3));
    merchand.merchandise_cost_ht = merchadise_cost_ht;
    console.log('Total prix HT = PHT * QTITE:', merchadise_cost_ht);
    /**
     * La liste des longueurs
     */
    merchand.listLengths = list; // La liste des Longueurs
    /**
     * Valeur de la remise (pourcentage remise)
     */
    let discountPercentage = parseFloat(
      this.merchandiseForm.get('selldiscountpercentage')?.value || '0');
    merchand.selldiscountpercentage = parseFloat(discountPercentage.toFixed(3));// % remise
    console.log('Pourcentage remise:', discountPercentage);
    /**
     * Valeur de la remise calculé 
     */
    let valRemise = merchadise_cost_ht * (discountPercentage / 100);
    console.log('Valeur de la remise:', valRemise);
    merchand.sellcostprice_discountValue = parseFloat(valRemise.toFixed(3));
    /**
     * Prix Total Hors Taxe avec Remise (Net Hors Taxe)
     */
    merchand.sellcostprice_net_ht = merchadise_cost_ht - valRemise; // Prix Achat avec Remise
    console.log('Total prix ht avec remise:', merchand.sellcostprice_net_ht);
    let tvaValue = parseFloat(article.tva!.value.replace('%', '')) || 0;
    this.tvaValue = tvaValue;
    /**
     * Valeur de la TVA calculé sur la base du prix net Hors Taxes
     */
    console.log('Valeur de la TVA : ', tvaValue)
    merchand.sellcostprice_taxValue = parseFloat((merchand.sellcostprice_net_ht * (tvaValue / 100)).toFixed(3)); // Prix Achat TTC
    console.log('Valeur de la TVA en sbasant sur le prix achat tot net HT', merchand.sellcostprice_taxValue)
    /**
     * Valeur du prix d'Achat en TTC
     */
    merchand.totalWithTax = merchand.sellcostprice_net_ht + merchand.sellcostprice_taxValue;
    console.log("Prix ACHAT TTC ", merchand.totalWithTax)
    this.tempMerchand = merchand;
    return merchand;

  }

  populateMerchandiseForm(merchand: Merchand) {
    if (merchand != null) {
      this.merchandiseForm.patchValue({
        quantity: merchand.quantity,
        merchandise_cost_ht: merchand.merchandise_cost_ht,
        sellcostprice_net_ht: merchand.sellcostprice_net_ht,
        sellcostprice_taxValue: merchand.sellcostprice_taxValue,
        totalWithTax: merchand.totalWithTax,
        sellcostprice_discountValue: merchand.sellcostprice_discountValue
      });
    }
  }

  // // Utility function to format values
  // private formatValueTransform(value: number): string {
  //   console.log("this.decimalPipe.transform(value, '1.3-3')", this.decimalPipe.transform(value, '1.3-3'));
  //   return this.decimalPipe.transform(value, '1.3-3') || '0,000';
  // }

  /**
   * @description Veiller sur la valeur de la remise et mettre à jour sa valeur
   * et la valeur TTC de la marchandise.
   * @param null
   */
  watchForDiscountPercentage() {
    // if (merchand != null) {
    this.merchandiseForm.get('selldiscountpercentage')?.valueChanges.subscribe((discountPercentage: number) => {
      // const tva = this.tvaValue;
      let tvaValue = parseFloat(this.selectedArticle.tva!.value.replace('%', '')) || 0;
      const tva = tvaValue;
      let quantity = 0;
      let priceNetHT = 0;
      priceNetHT = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value);
      quantity = parseFloat(this.merchandiseForm.get('quantity')?.value);
      const priceHT = priceNetHT * quantity;
      const discountValue = priceHT * (discountPercentage / 100);
      console.log("discountPercentage / 100 == ", discountValue);
      const costNetHT = priceHT - discountValue;
      console.log("costNetHT == ", costNetHT);
      console.log("this.merchandiseForm.get('tva')?.value", tva)
      console.log("(tva / 100) ", (tva / 100));
      const taxValue = costNetHT * (tva / 100);
      console.log("taxValue = costNetHT * (tva / 100)", taxValue);

      const totalWithTax = costNetHT + taxValue;
      console.log("totalWithTax == costNetHT + taxValue", totalWithTax);

      this.merchandiseForm.patchValue({
        merchandise_cost_ht: parseFloat(priceHT.toFixed(3)),
        sellcostprice_discountValue: parseFloat(discountValue.toFixed(3)),
        sellcostprice_net_ht: parseFloat(costNetHT.toFixed(3)),
        sellcostprice_taxValue: parseFloat(taxValue.toFixed(3)),
        totalWithTax: parseFloat(totalWithTax.toFixed(3)),
      });
    });
  }

  watchForQuantity() {
    this.merchandiseForm.get('quantity')?.valueChanges.subscribe((qtity: number) => {
      const quantity = qtity;
      // const priceNetHT = merchand.sellcostprice_net_ht;
      let tvaValue = parseFloat(this.selectedArticle.tva!.value.replace('%', '')) || 0;
      const tva = tvaValue;
      //const tva = this.tvaValue;

      let priceNetHT = 0;
      priceNetHT = parseFloat(this.merchandiseForm.get('unit_price_ht')?.value);
      const priceHT = priceNetHT * quantity;
      const discountPercentage = 0;
      const discountValue = priceHT * (discountPercentage / 100);
      console.log("discountPercentage / 100 == ", discountValue);
      const costNetHT = priceHT - discountValue;
      console.log("costNetHT == ", costNetHT);
      console.log("this.merchandiseForm.get('tva')?.value", tva)
      console.log("(tva / 100) ", (tva / 100));
      const taxValue = costNetHT * (tva / 100);
      console.log("taxValue = costNetHT * (tva / 100)", taxValue);
      const totalWithTax = costNetHT + taxValue;
      console.log("totalWithTax == costNetHT + taxValue", totalWithTax);
      this.merchandiseForm.patchValue({
        merchandise_cost_ht: parseFloat(priceHT.toFixed(3)),
        sellcostprice_discountValue: parseFloat(discountValue.toFixed(3)),
        sellcostprice_net_ht: parseFloat(costNetHT.toFixed(3)),
        sellcostprice_taxValue: parseFloat(taxValue.toFixed(3)),
        totalWithTax: parseFloat(totalWithTax.toFixed(3)),
      });
    });
  }

  calculateTotals(data: Merchandise[]): void {
    const toWords = new ToWords({
      localeCode: 'fr-FR', // French locale
      converterOptions: {
        currency: true,
        ignoreDecimal: false, // To include decimals
        ignoreZeroCurrency: false,
      },
    });

    const totalHTNet = data.reduce((sum, item) => sum + item.cost_net_ht, 0);
    const totalRemise = data.reduce((sum, item) => sum + item.cost_discount_value, 0);
    const totalTVA = data.reduce((sum, item) => sum + item.tva_value, 0);
    const netTTC = data.reduce((sum, item) => sum + item.cost_ttc, 0);

    this.totalHTNet_doc$.next(totalHTNet);
    this.totalRemise_doc$.next(totalRemise);
    this.totalTVA_doc$.next(totalTVA);
    this.netTTC_doc$.next(netTTC);

    /**
     * Exemple ecriture chiffre en lettres.
     */
    // const number = 26041.402; // Your number
    // const words = toWords.convert(number, { currency: true });
    // console.log(words);
  }

  freeAllCalculatedDocumentFields() {
    this.totalHTNet_doc$.next(null!);
    this.totalRemise_doc$.next(null!);
    this.totalTVA_doc$.next(null!);
    this.netTTC_doc$.next(null!);

    this.merchandisDocument.data = [];
  }

  getAppUserById(id: number) {
    return this.appUserService.GetById(id).subscribe({
      next: (response: AppUser) => {
        this.appUser = response;
      }
    });
  }

  //#region Submit + SaveDoc
  onSubmit() {
    if (this.documentForm.valid) {
      let docformValues = this.documentForm.value;
      let _taxe: any = null;
      let _holdingTax: any = null;
      let _user: any = null;
      try {
        let _sales_site: any = this.SalesSite; // Getted when Init component

        const doc: Document = {
          id: 0,
          type: DocumentTypes.supplierReceipt,
          stocktransactiontype: TransactionType.Add,
          docnumber: '',
          description: '',
          supplierReference: docformValues.supplierReference,
          isinvoiced: false,
          merchandises: this.merchandisDocument.data,
          total_ht_net_doc: this.totalHTNet_doc$.value,
          total_discount_doc: this.totalRemise_doc$.value,
          total_tva_doc: this.totalTVA_doc$.value,
          total_net_ttc: this.netTTC_doc$.value,
          taxe: _taxe,
          holdingtax: _holdingTax,
          withholdingtax: false,
          counterpart: this.selectedSupplier,
          sales_site: _sales_site, // Now _s will have the site data
          creationdate: new Date(),
          updatedate: new Date(),
          updatedbyid: Number(this.userconnected?.id),
          isdeleted: false,
          regulationid: 0,
          appuser: _user,
          editing: false,
          docstatus: 3,
          billingstatus: BillingStatus.NotBilled
        };

        console.log('Created Document : ', doc);

        if (doc.merchandises.length == 0) {
          this.toastr.info('Ajouter au moins une marchandise');
        } else {
          this.saveDocument(doc);
        }

        this.hasUnsavedChanges = false; // Reset the flag
      } catch (error) {
        console.error('Error fetching site data:', error);
        this.toastr.error('Failed to fetch site data');
      }
    } else {
      this.toastr.info("Veuillez remplir la Référence Fournisseur");
    }
    console.log("onSubmit() Document Supplier");
  }

  async saveDocument(doc: Document) {
    /**
     * Add modal of confirmation of Sales Site :
     * Where to save the merchandise of Document
     * doc.sales_site = newSalesSite
     */
    // First open the confirmation modal
    const dialogRef = this.dialog.open(SalesSiteModalComponent, {
      width: '500px',
      data: {
        currentSite: doc.sales_site,  // Current selected site
        //allSites: this.allSites.data       // Your array of available sites
      }
    });

    try {

      // Use firstValueFrom instead of toPromise
      const newSalesSite = await firstValueFrom(dialogRef.afterClosed());

      if (!newSalesSite) {
        this.toastr.info('Opération annulée');
        return;
      }

      doc.sales_site = newSalesSite;
      console.log("New Sales Site:", newSalesSite);  // Log the entire object
      console.log("New Sales Site Address:", newSalesSite.address);  // Specific property

      // Proceed with saving
      this.docService.Add(doc).subscribe({
        next: (response) => {
          // Access the docRef property from the response
          const docRef = response.docRef;

          // Log the document reference to the console
          console.log('Document created with reference: ', docRef);

          // Display a success message using toastr
          this.toastr.success(`Document ${docRef} créé avec succès`);

          // Free all calculated document fields
          this.freeAllCalculatedDocumentFields();
          this.router.navigateByUrl('home/reception/list');
        },
        error: (err) => {
          if (err.status === 409) {
            this.toastr.error('Un document avec la même référence fournisseur existe déjà.');
          } else if (err.status === 400) {
            this.toastr.error('Données invalides. Veuillez vérifier les champs.');
          } else if (err.status === 500) {
            this.toastr.error('Une erreur interne est survenue. Veuillez réessayer plus tard.');
          } else {
            console.error('Error creating document: ', err);
            this.toastr.error('Erreur lors de la création du document');
          }
        }
      });

    } catch (error) {
      console.error('Error in sales site selection:', error);
    }
  }
  //#endregion


  getAppUserSite() {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (response) => {
        console.log('Site : ', response);
        this.SalesSite = response;
      },
      error: (err) => {
        console.error('Error fetching site data:', err);
        this.toastr.error('Site de Vente non trouvé.');
      }
    });

  }

  isLoading = false;

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
