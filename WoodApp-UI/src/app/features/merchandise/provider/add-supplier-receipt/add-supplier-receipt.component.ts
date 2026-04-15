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
import { AddLengthsModalComponent } from '../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../../models/components/listoflength';
import { DecimalPipe } from '@angular/common';
import { parse } from 'node:path';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../shared/Text_Buttons';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { ToWords } from 'to-words';
import { CanComponentDeactivate } from '../../../../guards/can-deactivate.guard';
import { Document, DocumentTypes, BillingStatus, DocStatus } from '../../../../models/components/document';
import { DocumentService } from '../../../../services/components/document.service';
import { DocumentsRelationship } from '../../../../models/components/documentsrelationship';
import { AppuserService } from '../../../../services/components/appuser.service';
import { Site } from '../../../../models/components/sites';
import { Router } from '@angular/router';
import { AppUser } from '../../../../models/components/appuser';
import { MerchandiseService } from '../../../../services/components/merchandise.service';
import { SalesSiteModalComponent } from '../../../../shared/components/modals/sales-site-modal/sales-site-modal.component';
import { firstValueFrom } from 'rxjs';
import { TransactionType } from '../../../../models/components/stock';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-add-supplier-receipt',
  templateUrl: './add-supplier-receipt.component.html',
  styleUrl: './add-supplier-receipt.component.css'
})
export class AddSupplierReceiptComponent implements OnInit, CanComponentDeactivate {

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
  route = inject(ActivatedRoute);

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

  // Retenue à la Source (RS)
  rsList: AppVariable[] = [];
  selectedRS: AppVariable | null = null;
  total_net_payable$ = new BehaviorSubject<number>(0);

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

  isEditing: boolean = false;
  editIndex: number | null = null;
  originOrderId: number | null = null;


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
      this.loadAppVariables(); // Load RS and others
      this.watchForDiscountPercentage();
      this.watchForQuantity();

      // Check for Order Conversion
      this.route.queryParams.subscribe(params => {
        if (params['orderId']) {
          this.originOrderId = Number(params['orderId']);
          this.loadFromOrder(this.originOrderId);
        }
      });
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

      // Add or Update the Merchandise in the data source
      const currentData = this.merchandisDocument.data;
      if (this.isEditing && this.editIndex !== null) {
        currentData[this.editIndex] = newMerchandise;
        this.isEditing = false;
        this.editIndex = null;
        this.toastr.success('Article modifié');
      } else {
        currentData.push(newMerchandise);
      }
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
    // Find and set the selected article
    const article = this.articles.find((item) => item.id === articleId);
    
    if (article) {
      this.selectedArticle = article;
      // Set the display value in the search input
      const displayValue = article.reference + (article.description ? ' - ' + article.description : '');
      this.searchControl.setValue(displayValue, { emitEvent: false });
      
      this.filteredArticles = this.articles; // Reset filtered articles

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

  clearArticle(): void {
    this.resetMerchandiseForm();
  }

  editRow(element: Merchandise) {
    this.isEditing = true;
    this.editIndex = this.merchandisDocument.data.indexOf(element);

    // Populate the form and article selection
    this.selectedArticle = element.article;
    this.onOptionSelected(element.article.id);

    // Patch form with rest of the values
    this.merchandiseForm.patchValue({
      unit_price_ht: element.unit_price_ht,
      quantity: element.quantity,
      merchandise_cost_ht: element.cost_ht,
      tva: element.article.tvaid,
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

    if (element.article.iswood) {
      this.responseFromModalLengths = element.lisoflengths;
      this.responseFromModalTotQuantity = element.quantity;
      this.isArticleTypeWood = true;
    }

    this.toastr.info('Veuillez modifier les champs et enregistrer');
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
    this.isEditing = false;
    this.editIndex = null;
  }

  getSuppliers(): void {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response: CounterPart[]) => {
        this.allSuppliers = response;

        // Set the first supplier after the data is fetched (REMOVED BY USER REQUEST)
        /* if (this.allSuppliers.length > 0) {
          const firstSupplier = this.allSuppliers[0];
          this.selectedSupplier = firstSupplier;
          this.documentForm.get('supplier')?.setValue(firstSupplier); // Update the form control
        } */
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

  loadAppVariables() {
    this.appVarService.GetAll('RS').subscribe({
      next: (response) => {
        this.rsList = response;
      },
      error: (error) => {
        console.error('Error fetching RS variables:', error);
      }
    });
  }

  onRSChange(rs: AppVariable | null) {
    this.selectedRS = rs;
    this.calculateTotals(this.merchandisDocument.data);
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

  loadFromOrder(orderId: number) {
    this.docService.GetById(orderId).subscribe({
      next: (order: Document) => {
        // 3 - Select Supplier
        const supplier = this.allSuppliers.find(s => s.id === order.counterpart.id);
        if (supplier) {
          this.selectedSupplier = supplier;
          this.documentForm.get('supplier')?.setValue(supplier);
        }

        // Suggest Supplier Reference
        //this.documentForm.get('supplierReference')?.setValue(`BC-${order.docnumber}`);

        // 2 - Pre-fill Merchandises
        if (order.merchandises && order.merchandises.length > 0) {
          const mappedMerchandises: Merchandise[] = order.merchandises.map(m => ({
            ...m,
            id: 0, // New items for receipt
            creationdate: new Date(),
            updatedate: new Date(),
            documentid: 0
          }));

          this.merchandisDocument.data = [...mappedMerchandises];
          this.calculateTotals(this.merchandisDocument.data);
          this.hasUnsavedChanges = true;
          this.toastr.success(`Importé ${mappedMerchandises.length} articles depuis la commande ${order.docnumber}`);
        }
      },
      error: (err) => {
        console.error('Error loading order data:', err);
        this.toastr.error('Impossible de charger les données de la commande');
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
            article: article,
            isPurchase: true
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

    const rsValue = this.selectedRS ? (netTTC * (Number(this.selectedRS.value) / 100)) : 0;
    const netPayable = netTTC - rsValue;

    this.totalHTNet_doc$.next(totalHTNet);
    this.totalRemise_doc$.next(totalRemise);
    this.totalTVA_doc$.next(totalTVA);
    this.netTTC_doc$.next(netTTC);
    this.total_net_payable$.next(netPayable);

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
    this.total_net_payable$.next(null!);

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
          total_net_payable: this.total_net_payable$.value,
          taxe: _taxe,
          holdingtax: this.selectedRS ? {
            id: 0,
            description: this.selectedRS.name,
            taxpercentage: Number(this.selectedRS.value),
            taxvalue: this.netTTC_doc$.value * (Number(this.selectedRS.value) / 100),
            newamountdocvalue: this.total_net_payable$.value,
            issigned: false,
            isdeleted: false,
            updatedbyid: Number(this.userconnected?.id)
          } as any : null,
          withholdingtax: !!this.selectedRS,
          counterpart: this.selectedSupplier,
          sales_site: _sales_site, // Now _s will have the site data
          creationdate: new Date(),
          updatedate: new Date(),
          updatedbyid: Number(this.userconnected?.id),
          isdeleted: false,
          regulationid: 0,
          appuser: _user,
          editing: false,
          isPaid: false,
          docstatus: 3,
          isservice: false,
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

          // 🆕 Update Order Status if originating from an order
          if (this.originOrderId) {
            this.handleOrderStatusUpdate(this.originOrderId, (response as any).id, docRef);
          }

          // Free all calculated document fields
          this.freeAllCalculatedDocumentFields();
          this.router.navigateByUrl('home/merchandise/reception/list');
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

  handleOrderStatusUpdate(orderId: number, receiptId: number, receiptRef: string) {
    // Step 1: Register parent-child relationship between order and new receipt
    const relationship = {
      parentDocumentId: orderId,
      childDocumentId: receiptId
    };

    this.docService.RegisterRelationship(relationship).subscribe({
      next: () => {
        // Step 2: Reload the parent order to get current delivery note references
        this.docService.GetById(orderId).subscribe({
          next: (order: Document) => {
            const siblingRefs = order.deliveryNoteDocNumbers || [];
            if (!siblingRefs.includes(receiptRef)) siblingRefs.push(receiptRef);

            // Step 3: Fetch all supplier receipts to compare ordered vs received quantities
            this.docService.GetByType(DocumentTypes.supplierReceipt).subscribe({
              next: (allReceipts: Document[]) => {
                const siblingReceipts = allReceipts.filter(r => siblingRefs.includes(r.docnumber));
                
                // Build ordered quantities map per article
                const orderedQtities = new Map<number, number>();
                order.merchandises.forEach((m: any) => {
                  orderedQtities.set(m.article.id, (orderedQtities.get(m.article.id) || 0) + m.quantity);
                });

                // Build received quantities map per article across all linked receipts
                const receivedQtities = new Map<number, number>();
                siblingReceipts.forEach((r: any) => {
                  r.merchandises.forEach((m: any) => {
                    receivedQtities.set(m.article.id, (receivedQtities.get(m.article.id) || 0) + m.quantity);
                  });
                });

                // Determine if all articles have been fully received
                let isFullyDelivered = true;
                orderedQtities.forEach((orderedQty, articleId) => {
                  const receivedQty = receivedQtities.get(articleId) || 0;
                  if (receivedQty < orderedQty) isFullyDelivered = false;
                });

                // Step 4: Update order status based on reception completeness
                const newStatus = isFullyDelivered ? DocStatus.Delivered : DocStatus.PartiallyDelivered;
                this.docService.UpdateStatus(orderId, newStatus).subscribe({
                  next: () => {
                    this.toastr.info(`Flux mis à jour: ${isFullyDelivered ? "Réceptionné" : "Réception Partielle"}`);
                  },
                  error: (err) => {
                    console.error('❌ Failed to update order status:', err);
                    this.toastr.warning('Réception créée, mais le statut de la commande n\'a pas pu être mis à jour.');
                  }
                });
              },
              // NOTE: If fetching receipts fails, the status update is skipped — user is warned
              error: (err) => {
                console.error('❌ Failed to fetch receipts for status calculation:', err);
                this.toastr.warning('Réception créée, calcul du statut impossible. Rafraîchissez la commande.');
              }
            });
          },
          // NOTE: If reloading the order fails, the entire status update chain is aborted
          error: (err) => {
            console.error('❌ Failed to reload order for status update:', err);
            this.toastr.warning('Réception créée, statut de commande non mis à jour. Rafraîchissez manuellement.');
          }
        });
      },
      error: (err) => console.error('❌ relationship error:', err)
    });
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
