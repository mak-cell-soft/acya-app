import { Component, inject, model, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ProviderService } from '../../../../services/components/provider.service';
import { ToastrService } from 'ngx-toastr';
import { ArticleService } from '../../../../services/components/article.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { Provider } from '../../../../models/components/provider';
import { Merchand, Merchandise } from '../../../../models/components/merchandise';
import { MatTableDataSource } from '@angular/material/table';
import { Article } from '../../../../models/components/article';
import { DocStatus, Document, DocumentTypes, BillingStatus } from '../../../../models/components/document';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { Stock, StockQuantity, StockWithLengthDetails, TransactionType } from '../../../../models/components/stock';
import { StockService } from '../../../../services/components/stock.service';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPartList_FR, CounterPartType_FR } from '../../../../shared/constants/list_of_constants';
import { MatSelect } from '@angular/material/select';
import { Transporter, Vehicle } from '../../../../models/components/customer';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../shared/Text_Buttons';
import { MatDialog } from '@angular/material/dialog';
import { AddTransporterModalComponent } from '../../../../shared/components/modals/add-transporter-modal/add-transporter-modal.component';
import { TransporterService } from '../../../../services/components/transporter.service';
import { AddLengthsModalComponent } from '../../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { AppuserService } from '../../../../services/components/appuser.service';
import { Site } from '../../../../models/components/sites';

import { DocumentService } from '../../../../services/components/document.service';
import { ListOfLength } from '../../../../models/components/listoflength';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { isQuantityValid } from '../../../../shared/validators/naturalNumberValidator';

@Component({
  selector: 'customer-app-add-document',
  templateUrl: './customer-add-document.component.html',
  styleUrl: './customer-add-document.component.css'
})
export class CustomerAddDocumentComponent {
  providerService = inject(ProviderService);
  toastr = inject(ToastrService);
  router = inject(Router);
  fb = inject(FormBuilder);
  articleService = inject(ArticleService);
  isQuantityValid = isQuantityValid; // Expose to template if needed
  appVarService = inject(AppVariableService);
  stockService = inject(StockService);
  counterPartService = inject(CounterpartService);
  dialog = inject(MatDialog);
  transporterService = inject(TransporterService);
  authService = inject(AuthenticationService);
  appUserService = inject(AppuserService);
  docService = inject(DocumentService);
  route = inject(ActivatedRoute);

  typeDoc: string = '';
  selected = model<Date | null>(null);
  form!: FormGroup;
  userconnected = this.authService.getUserDetail();

  allCustomers: CounterPart[] = [];
  allTransporters: Transporter[] = [];
  selectedCustomer: any = {}; //CounterPart | null = null;
  selectedTransporter: any = {};
  // Store filtered articles for each row
  filteredArticles: Article[] = [];
  searchCustomerControl = new FormControl('');
  searchTransporterControl = new FormControl('');
  searchArticleControl = new FormControl('');
  filteredCustomers: CounterPart[] = [];
  filteredTransporters: Transporter[] = [];
  selectedDate: Date = new Date();

  isArticleTypeWood: boolean = false;
  isLoading = false;
  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  sourceDocumentId = 0;

  @ViewChild('customerSelect') customerSelect!: MatSelect;
  @ViewChild('transporterSelect') transporterSelect!: MatSelect;
  @ViewChildren('articleSelect') articleSelects!: QueryList<MatSelect>;

  displayedColumns: string[] = ['index', 'article', 'sellPrice', 'quantity', 'discount', 'tva', 'totalWithoutTva', 'totalWithTva', 'actions'];
  dataMerchand = new MatTableDataSource<Merchand>([]);
  allStocks: MatTableDataSource<StockQuantity> = new MatTableDataSource<StockQuantity>([]);
  merchandises: Merchandise[] = [];
  SalesSite!: Site;
  articles: Article[] = []; // Fetch from service
  TVAs: AppVariable[] = []; // Fetch from service

  // BehaviorSubjects to hold totals
  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);
  extraDiscount: number = 0; // Extra discount at document level (rounding)

  /**
   * Control Buttons
   */
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;


  constructor() {
    this.createForm();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getAppUserSiteAndThenLoadData();
      //this.getAppUserSite();
      this.getCustomers();
      this.searchCustomerControl.valueChanges.subscribe(() => this.applyCustomerFilter());

      this.route.queryParams.subscribe(params => {
        if (params['fromOrderId']) {
          this.sourceDocumentId = +params['fromOrderId'];
        } else if (params['fromQuoteId']) {
          this.sourceDocumentId = +params['fromQuoteId'];
        }
      });
    }
  }

  loadData() {
    this.getArticles();
    this.getStocks();
    this.getTaxes();
    this.getAllTransporters();

    if (this.sourceDocumentId > 0) {
      this.loadSourceDocument(this.sourceDocumentId);
    }
  }

  /**
   * Pour que le Stock soit cohérent (this.getStocks(); fonctionne bien)
   * On a besoin de spécifier le site de la personne connectée.
   * Pour cela, on récupère le site de la personne connectée En premier lieu,
   * ensuite charger les autres éléments de this.loadData();
   */
  getAppUserSiteAndThenLoadData(): void {
    const id = Number(this.userconnected?.id);
    this.appUserService.GetSalesSite(id).subscribe({
      next: (response) => {
        console.log('Site Object As response: ', response);
        this.SalesSite = response;
        this.loadData(); // Only load data after we have SalesSite
      },
      error: (err) => {
        console.error('Error fetching site data:', err);
        this.toastr.error('Site de Vente non trouvé.');
      }
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


  //#region isTypeWood + Dialog
  /**
   * 1- Appler le même Modal pour l'ajout des listes des longueur 
   * dans la création de la marchandise.
   * 2- Rajout du test pour le stock disponible des longueurs.
   * 3- Modifier l'affichage pour calcul du stock du même site. 
   * @param Merchand 
   */
  openWoodLengthDialog(element: Merchand): void {
    // changed: fetch wood length details from backend to compute availableStock before opening modal
    const salesSiteId = this.SalesSite.id; //Number(this.stockExitForm.get('FromSiteStock')?.value ?? this.originSite?.id ?? 0);

    const woodParams = {
      merchandiseRef: element.selectedArticle?.reference ?? '',
      salesSiteId: salesSiteId,
      merchandiseId: element.selectedStock?.merchandiseId ?? element.selectedArticle?.id ?? 0
    };

    this.stockService.getWoodStockWithLengthDetails(woodParams).subscribe({
      next: (details: StockWithLengthDetails[]) => {
        // simplified: assume details items expose remainingPieces
        const availableStock = (details || []).reduce((acc, d) => acc + (d.RemainingPieces ?? 0), 0);

        console.log("Available stock:", details);

        const dialogRef = this.dialog.open(AddLengthsModalComponent, {
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: {
            article: element.selectedArticle,
            merchand: element,
            availableStock: details || []
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            const { lengths, totalQuantity } = result;
            if (lengths && totalQuantity) {
              this.responseFromModalLengths = lengths;
              this.responseFromModalTotQuantity = totalQuantity;
              element.quantity = parseFloat(Number(totalQuantity).toFixed(3));
              element.listLengths = lengths;
            }
            this.updateTotals(element);
          }
        });
      },
      error: (err) => {
        console.error('Error fetching wood length details:', err);
        // fallback to previous behavior if service fails
        const dialogRef = this.dialog.open(AddLengthsModalComponent, {
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: {
            article: element.selectedArticle,
            merchand: element,
            availableStock: element.selectedStock?.stockQuantity || 0
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            const { lengths, totalQuantity } = result;
            if (lengths && totalQuantity) {
              this.responseFromModalLengths = lengths;
              this.responseFromModalTotQuantity = totalQuantity;
              element.quantity = parseFloat(Number(totalQuantity).toFixed(3));
              element.listLengths = lengths;
            }
            this.updateTotals(element);
          }
        });
      }
    });
  }


  // openWoodLengthDialogOriginal(element: Merchand): void {
  //   const dialogRef = this.dialog.open(AddLengthsModalComponent, {
  //     width: '800px',
  //     maxWidth: '90vw',
  //     maxHeight: '90vh',
  //     data: {
  //       article: element.selectedArticle,
  //       merchand: element,
  //       availableStock: element.selectedStock?.stockQuantity || 0
  //     }
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       const { lengths, totalQuantity } = result;
  //       if (lengths && totalQuantity) {
  //         this.responseFromModalLengths = lengths;
  //         this.responseFromModalTotQuantity = totalQuantity;
  //         element.quantity = parseFloat(Number(totalQuantity).toFixed(3));
  //         element.listLengths = lengths;
  //       }
  //       this.updateTotals(element);
  //     }
  //   });
  // }

  getTotalNbPieces(element: Merchand): number {
    if (!element.listLengths || element.listLengths.length === 0) {
      return 0;
    }
    return element.listLengths.reduce((acc, current) => acc + (current.nbpieces || 0), 0);
  }

  getTotalLengths(element: Merchand): number {
    if (!element.listLengths || element.listLengths.length === 0) {
      return 0;
    }
    return element.listLengths.reduce((count, item) => {
      return item.nbpieces > 0 ? count + 1 : count;
    }, 0);
  }
  //#endregion

  //#region Update Totals + addRow
  updateTotals(element: Merchand) {
    if (element.selectedArticle) {
      // Calculate net price before discount
      const netBeforeDiscount = element.quantity * element.unit_price_ht;

      // Calculate discount value
      const discountValue = netBeforeDiscount * (element.selldiscountpercentage / 100);

      // Calculate net HT price after discount
      element.sellcostprice_net_ht = parseFloat((netBeforeDiscount - discountValue).toFixed(3));

      // Calculate total with tax
      // const tvaRate = Number(element.selectedArticle.tva?.value) || 0;
      // Parse TVA rate - handle both number and percentage string cases
      let tvaRate = 0;
      if (element.selectedArticle.tva?.value) {
        if (typeof element.selectedArticle.tva.value === 'string') {
          // Remove % sign and convert to number
          tvaRate = parseFloat(element.selectedArticle.tva.value.replace('%', '').trim());
        } else {
          // Already a number
          tvaRate = Number(element.selectedArticle.tva.value);
        }
      }
      element.totalWithTax = parseFloat((element.sellcostprice_net_ht * (1 + (tvaRate / 100))).toFixed(3));

      // Update discount value
      element.sellcostprice_discountValue = parseFloat(discountValue.toFixed(3));

      // Update TVA value
      element.sellcostprice_taxValue = parseFloat((element.sellcostprice_net_ht * (tvaRate / 100)).toFixed(3));
    } else {
      // Reset values if no article selected
      element.sellcostprice_net_ht = 0;
      element.totalWithTax = 0;
      element.sellcostprice_discountValue = 0;
      element.sellcostprice_taxValue = 0;
    }

    // Recalculate document totals
    this.calculateTotals(this.dataMerchand.data);
  }

  addRow() {
    const newRow: Merchand = {
      selectedArticle: null,
      unit_price_ht: 0,
      merchandise_cost_ht: 0,
      quantity: 0,
      listLengths: [],
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      articleSearchInput: '', // Add this
      filteredArticles: [...this.articles], // Initialize with all articles
      selectedStock: null
    };
    // Create a new array with the existing rows plus the new one
    const newData = [...this.dataMerchand.data, newRow];
    this.dataMerchand.data = newData;

    // Recalculate totals after adding a row
    this.calculateTotals(this.dataMerchand.data);
  }

  deleteRow(element: Merchand) {
    //this.dataMerchand.data = this.dataMerchand.data.filter((row) => row !== element);
    const item = { id: element.selectedArticle?.reference, name: element.selectedArticle?.description };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.dataMerchand.data.indexOf(element);
        if (index >= 0) {
          this.dataMerchand.data.splice(index, 1);
          this.dataMerchand.data = [...this.dataMerchand.data]; // Trigger table update
          this.calculateTotals(this.dataMerchand.data); // Recalculate totals after deletion
        }
      } else {
        console.log('Deletion canceled');
        this.toastr.info("Suppression annulé");
      }
    });
  }
  //#endregion


  //#region Display
  /**
   * @description loaded Articles when start typing
   * @param event 
   */
  applyArticleFilter(event: Event, element: Merchand) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    element.filteredArticles = this.articles.filter(article => {
      const reference = (article.reference || '').toLowerCase();
      const description = (article.description || '').toLowerCase();
      return reference.includes(filterValue) || description.includes(filterValue);
    });
  }

  /**
  * @description loaded Customers when start typing
  * @param event 
  */
  applyCustomerFilter(): void {
    const filterValue = (this.searchCustomerControl.value || '').trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredCustomers = [...this.allCustomers];
    } else {
      this.filteredCustomers = this.allCustomers.filter(customer => {
        const name = (customer.name || '').toLowerCase();
        const firstname = (customer.firstname || '').toLowerCase();
        const lastname = (customer.lastname || '').toLowerCase();
        const description = (customer.description || '').toLowerCase();
        const phone = (customer.phonenumberone || '').toLowerCase();

        return name.includes(filterValue) || 
               firstname.includes(filterValue) || 
               lastname.includes(filterValue) || 
               description.includes(filterValue) ||
               phone.includes(filterValue);
      });
    }
    this.openCustomerDropdown(); // Open dropdown on filter
  }

  // Open dropdown programmatically
  openCustomerDropdown(): void {
    if (this.customerSelect) {
      this.customerSelect.open();
    }
  }


  openArticleDropdown(element: Merchand) {
    const index = this.dataMerchand.data.indexOf(element);
    const select = this.articleSelects.toArray()[index];
    if (select) {
      select.open();
    }
  }

  // Clear input when an option is selected => Update the view
  onOptionCustomerSelected(customerId: number): void {
    const selectedCustomer = this.allCustomers.find(customer => customer.id === customerId);
    if (selectedCustomer) {
      this.selectedCustomer = selectedCustomer;
      this.form.get('customer')?.setValue(selectedCustomer); // Update the form control
      
      // Update the search input to show the selected customer's name
      const displayName = selectedCustomer.name || (selectedCustomer.firstname + ' ' + selectedCustomer.lastname);
      this.searchCustomerControl.setValue(displayName, { emitEvent: false });
      
      // Assign values to `selectedTransporter`
      if (selectedCustomer.transporter) {
        this.selectedTransporter = selectedCustomer.transporter;
        const transpDisplayName = selectedCustomer.transporter.firstname + ' ' + selectedCustomer.transporter.lastname;
        this.searchTransporterControl.setValue(transpDisplayName, { emitEvent: false });
      }
    }
  }

  clearCustomer(): void {
    this.selectedCustomer = {};
    this.searchCustomerControl.setValue('');
    this.filteredCustomers = [...this.allCustomers];
    // If the customer was cleared, we might want to clear the transporter too if it was auto-linked
    this.clearTransporter();
  }

  /**
   * @description Loaded Transporters when start typing
   * @param element 
   * 
   */
  applyTransporterFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredTransporters = [...this.allTransporters];
    } else {
      this.filteredTransporters = this.allTransporters.filter(transporter => {
        const firstname = (transporter.firstname || '').toLowerCase();
        const lastname = (transporter.lastname || '').toLowerCase();
        const matricule = (transporter.car?.serialnumber || '').toLowerCase();

        return firstname.includes(filterValue) || 
               lastname.includes(filterValue) || 
               matricule.includes(filterValue);
      });
    }
    // Open dropdown on filter
    this.openDropdownTransporters();
  }

  openDropdownTransporters() {
    if (this.transporterSelect) {
      this.transporterSelect.open();
    }
  }

  onOptionTransporterSelected(transporterId: number): void {
    // Find the selected transporter from allTransporters
    const selected = this.allTransporters.find(
      transporter => transporter.id === transporterId
    );

    if (selected) {
      this.selectedTransporter = selected;
      const displayName = selected.firstname + ' ' + selected.lastname;
      this.searchTransporterControl.setValue(displayName, { emitEvent: false });
    }
  }

  clearTransporter(): void {
    this.selectedTransporter = {};
    this.searchTransporterControl.setValue('');
    this.filteredTransporters = [...this.allTransporters];
  }
  //#region Manage Marchand

  /**
   * Recherche parmi la liste des articles selectionnés :
   * Le ou les Stocks disponibles avec leurs marchandise.
   * - Pour un seul Article on peut trouver plusieurs Stocks
   * @param element 
   * @param selectedArticle 
   */
  onArticleChange(element: Merchand, selectedArticle: Article) {
    if (selectedArticle) {
      // Sync the search input with formatted reference and description
      element.articleSearchInput = `${selectedArticle.reference}${selectedArticle.description ? ' - ' + selectedArticle.description : ''}`;
      element.quantity = 0; // Reset quantity on article change

      // Set wood type flag on the element itself, not globally
      element.isWoodArticle = selectedArticle.iswood;

      // Find all stocks for this article
      const matchingStocks = this.allStocks.data.filter(stock =>
        stock.articleId === selectedArticle.id
      );

      if (matchingStocks.length > 0) {
        // For single stock, select it automatically
        if (matchingStocks.length === 1) {
          element.selectedStock = matchingStocks[0];
        } else {
          // For multiple stocks, we'll let the user choose via the UI
          // So we won't automatically select one here
          element.selectedStock = null;
        }

        element.unit_price_ht = selectedArticle.sellprice_ht;

        // Initialize wood lengths array if this is a wood article
        if (element.isWoodArticle) {
          element.listLengths = [];
        }

        // Update calculations if we have a selected stock
        if (element.selectedStock) {
          this.updateTotals(element);

          if (!element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0) {
            console.log("Quantity input disabled: allowNegativStock is false and no stock found");
          }
        }
      } else {
        element.selectedStock = null;
        this.toastr.error('Stock non trouvé pour ' + selectedArticle.reference);
      }
    } else {
      // Clear wood flag if article is deselected
      element.articleSearchInput = '';
      element.isWoodArticle = false;
      element.selectedStock = null;
      this.updateTotals(element);
    }
  }


  clearArticle(element: Merchand) {
    element.selectedArticle = null;
    element.articleSearchInput = '';
    element.selectedStock = null;
    element.isWoodArticle = false;
    element.listLengths = [];
    element.quantity = 0;
    element.filteredArticles = [...this.articles];
    this.updateTotals(element);
  }

  getMatchingStocks(articleId: number): StockQuantity[] {
    return this.allStocks.data.filter(stock => stock.articleId === articleId);
  }

  onMerchandiseChange(element: Merchand) {
    if (element.selectedStock) {
      // Update the unit price (you might want to customize this based on merchandise)
      element.unit_price_ht = element.selectedArticle?.sellprice_ht || 0;

      // Update calculations
      this.updateTotals(element);

      // Check stock availability
      if (!element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0) {
        console.log("Quantity input disabled: allowNegativStock is false and no stock found");
        // You might want to reset quantity here
        element.quantity = 0;
      }
    }
  }

  // onArticleChange(element: Merchand, selectedArticle: Article) {
  //   if (selectedArticle) {
  //     // Set wood type flag on the element itself, not globally
  //     element.isWoodArticle = selectedArticle.iswood;

  //     const stock = this.allStocks.data.find(stock =>
  //       stock.articleId === selectedArticle.id
  //     );
  //     /**
  //      * Lors du choix de l'Article 
  //      * - on doit définir à quel stock il appartient
  //      * et de suite à quel marchandise
  //      */
  //     element.selectedStock = stock || null;
  //     element.unit_price_ht = selectedArticle.sellprice_ht;

  //     if (stock) {
  //       // Initialize wood lengths array if this is a wood article
  //       if (element.isWoodArticle && !element.listLengths) {
  //         element.listLengths = [];
  //       }

  //       // Update calculations
  //       this.updateTotals(element);

  //       if (!stock.allowNegativeStock && stock.stockQuantity <= 0) {
  //         console.log("Quantity input disabled: allowNegativStock is false and no stock found");
  //       }
  //     } else {
  //       this.toastr.error('Stock non trouvé pour ' + selectedArticle.reference);
  //     }

  //     this.updateTotals(element);
  //   } else {
  //     // Clear wood flag if article is deselected
  //     element.isWoodArticle = false;
  //     this.updateTotals(element);
  //   }
  // }

  trackByArticleId(index: number, article: Article): number {
    return article.id;
  }

  shouldDisableQuantityInput(element: Merchand): boolean {
    if (element.selectedStock) {
      return !element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0;
    }
    return true; // Disable if no stock is selected
  }

  getSelectedTvaFromArticle(selectedArticle: Article): number | null {
    if (selectedArticle) {
      return selectedArticle.tvaid; // Return the TVA ID from the selected article
    }
    return null; // Return null if no article is selected
  }
  //#endregion
  //#region GetStockQuantity
  /**
   * 
   * @param element 
   * @returns 
   */
  getStockQuantity(element: Merchand): number {
    return element.selectedStock?.stockQuantity || 0;
  }
  // getStockQuantity(element: Merchand): number {
  //   if (element.selectedArticle) {
  //     const stock = this.allStocks.data.find(stock => stock.articleId === element.selectedArticle!.id);
  //     return stock ? stock.stockQuantity : 0;
  //   }
  //   return 0;
  // }

  getStockQuantity2(element: Merchand): number {
    if (element.selectedArticle) {
      const stock = this.allStocks.data.find(
        stock => stock.articleId === element.selectedArticle!.id
      );
      return stock ? stock.stockQuantity : 0;
    }
    return 0;
  }
  //#endregion

  //#endregion

  editRow(element: Merchand) {
    // Logic for editing a row
  }

  validateRow(element: Merchand) {
    // Logic for validating a row
  }

  createForm() {
    this.form = this.fb.group({
      customer: ['', Validators.required],
      customerReference: ['', Validators.required]
    });
  }

  //#region Submit + Save
  /**
   * Construire le Document après Validation du dataMerchand
   * Appler la méthode saveDocument(doc: Document)
   * @param dataMerchand
   */
  onSubmit() {
    let _taxe: any = null;
    let _holdingTax: any = null;
    let _user: any = null;
    try {
      const doc: Document = {
        id: 0,
        type: DocumentTypes.customerDeliveryNote,
        stocktransactiontype: TransactionType.Retrieve,
        docnumber: '',
        description: '',
        supplierReference: '',
        isinvoiced: false,
        merchandises: this.transformMerchandToMerchandise(this.dataMerchand),
        total_ht_net_doc: this.totalHTNet_doc$.value,
        total_discount_doc: this.totalRemise_doc$.value,
        total_tva_doc: this.totalTVA_doc$.value,
        total_net_ttc: this.netTTC_doc$.value,
        taxe: _taxe,
        holdingtax: _holdingTax,
        withholdingtax: false,
        counterpart: this.selectedCustomer,
        sales_site: this.SalesSite, // Directly use the property
        creationdate: new Date(),
        updatedate: new Date(),
        updatedbyid: Number(this.userconnected?.id),
        isdeleted: false,
        regulationid: 0,
        appuser: _user,
        editing: false,
        docstatus: 3,
        isservice: false,
        isPaid: false,
        billingstatus: BillingStatus.NotBilled,
        deliveryNoteDocNumbers: []
      };

      console.log('Created Document : ', doc);

      // Validate before saving
      const errors = [];
      if (!doc.merchandises || doc.merchandises.length === 0) {
        errors.push('Ajouter au moins une marchandise');
      }
      if (!this.selectedCustomer || !this.selectedCustomer.id) {
        errors.push('Sélectionner un client.');
      }
      if (doc.merchandises.some(m => !isQuantityValid(m.quantity))) {
        errors.push('Veuillez saisir une quantité supérieure à 0 pour tous les articles');
      }
      if (!this.selectedTransporter || !this.selectedTransporter.id) {
        errors.push('Sélectionner un transporteur.');
      }

      if (errors.length > 0) {
        errors.forEach(error => this.toastr.error(error));
        return; // Important: return early if there are errors
      }

      // Only proceed if all validations pass
      this.saveDocument(doc);
    } catch (error) {
      console.error('Error in onSubmit:', error);
      this.toastr.error('La création du document a échoué');
    }
  }

  private transformMerchandToMerchandise(dataMerchand: MatTableDataSource<Merchand>): Merchandise[] {
    return dataMerchand.data.map(merchand => {
      const merchandise = new Merchandise();

      // Map the properties from Merchand to Merchandise
      merchandise.article = merchand.selectedArticle || new Article();
      merchandise.unit_price_ht = merchand.unit_price_ht;
      merchandise.cost_ht = merchand.merchandise_cost_ht;
      merchandise.quantity = merchand.quantity;
      merchandise.lisoflengths = merchand.listLengths;
      merchandise.discount_percentage = merchand.selldiscountpercentage;
      merchandise.cost_discount_value = merchand.sellcostprice_discountValue;
      merchandise.cost_net_ht = merchand.sellcostprice_net_ht;
      merchandise.tva_value = merchand.sellcostprice_taxValue;
      merchandise.cost_ttc = merchand.totalWithTax;

      // Set default values for other required properties
      merchandise.id = merchand.selectedStock?.merchandiseId || 0; // Assuming this is a new merchandise
      merchandise.packagereference = merchand.selectedStock?.packageReference || '';
      merchandise.description = merchand.selectedStock?.MerchandiseDescription || '';
      merchandise.creationdate = new Date();
      merchandise.updatedate = new Date();
      merchandise.updatedbyid = Number(this.userconnected?.id) || 0;
      merchandise.documentid = 0;
      merchandise.isinvoicible = merchand.selectedStock?.isInvoicible || true;
      merchandise.allownegativstock = merchand.selectedStock?.allowNegativeStock || false;
      merchandise.ismergedwith = merchand.selectedStock?.isMergedWith || false;
      merchandise.isdeleted = false;
      return merchandise;
    });
  }

  /**
   * Appeler la méthode AddDocRetreive de docService
   * @param doc 
   */
  saveDocument(doc: Document) {
    this.isLoading = true;

    const saveObs = this.sourceDocumentId > 0
      ? this.docService.Convert(this.sourceDocumentId, doc)
      : this.docService.Add(doc);

    saveObs.subscribe({
      next: (response) => {
        const docRef = response.docRef;
        const docTypeLabel = doc.type === DocumentTypes.customerDeliveryNote ? 'Bon de Livraison' : 'Document';
        this.toastr.success(`${docTypeLabel} ${docRef} créé avec succès`);

        this.freeAllCalculatedDocumentFields();
        this.isLoading = false;
        this.router.navigateByUrl('home/merchandise/customerdelivery');
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.toastr.error('Un document avec la même référence existe déjà.');
        } else {
          this.toastr.error('La création du document a échoué');
        }
      }
    });
  }
  //#endregion

  //#region Calculate Totals
  // calculateTotals(): void {
  //   const data = this.dataMerchand.data;

  //   const totals = data.reduce((acc, item) => {
  //     acc.totalHTNet += item.sellcostprice_net_ht || 0;
  //     acc.totalRemise += (item.sellcostprice_net_ht * (item.selldiscountpercentage || 0) / 100) || 0;
  //     acc.totalTVA += (item.sellcostprice_taxValue || 0);//* item.sellcostprice_net_ht / 100 || 0;
  //     acc.netTTC += item.totalWithTax || 0;
  //     return acc;
  //   }, {
  //     totalHTNet: 0,
  //     totalRemise: 0,
  //     totalTVA: 0,
  //     netTTC: 0
  //   });

  //   this.totalHTNet_doc$.next(totals.totalHTNet);
  //   this.totalRemise_doc$.next(totals.totalRemise);
  //   this.totalTVA_doc$.next(totals.totalTVA);
  //   this.netTTC_doc$.next(totals.netTTC);
  // }

  calculateTotals(data: Merchand[]): void {
    const totals = data.reduce((acc, item) => {
      acc.totalHTNet += item.sellcostprice_net_ht || 0;
      acc.totalRemise += (item.sellcostprice_net_ht * (item.selldiscountpercentage || 0) / 100) || 0;
      acc.totalTVA += (item.sellcostprice_taxValue || 0);
      acc.netTTC += item.totalWithTax || 0;
      return acc;
    }, {
      totalHTNet: 0,
      totalRemise: 0,
      totalTVA: 0,
      netTTC: 0
    });

    // Fix to 3 decimal places to ensure consistent math
    const cleanTotalHT = parseFloat(totals.totalHTNet.toFixed(3));
    const cleanTotalTVA = parseFloat(totals.totalTVA.toFixed(3));
    const cleanTotalTTC = parseFloat(totals.netTTC.toFixed(3));
    const cleanTotalRemise = parseFloat(totals.totalRemise.toFixed(3));

    // Apply the extra document-level discount (rounding)
    const finalNetTTC = parseFloat((cleanTotalTTC - this.extraDiscount).toFixed(3));
    const finalTotalRemise = parseFloat((cleanTotalRemise + this.extraDiscount).toFixed(3));

    this.totalHTNet_doc$.next(cleanTotalHT);
    this.totalRemise_doc$.next(finalTotalRemise);
    this.totalTVA_doc$.next(cleanTotalTVA);
    this.netTTC_doc$.next(finalNetTTC);
  }

  /**
   * Called when the user manually edits the Net TTC Final field.
   * Adjusts the extraDiscount to match the desired final price.
   * @param newValue The new manual value for Net TTC Final
   */
  onFinalPriceChange(newValue: number | string): void {
    // Re-verify the current natural totals
    const data = this.dataMerchand.data;
    const naturalTTC = parseFloat(data.reduce((sum, item) => sum + (item.totalWithTax || 0), 0).toFixed(3));
    const naturalRemise = parseFloat(data.reduce((sum, item) => sum + ((item.sellcostprice_net_ht * (item.selldiscountpercentage || 0) / 100) || 0), 0).toFixed(3));

    const manualValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
    if (isNaN(manualValue)) return;

    // The extra discount is the difference between what it should be and what the user wants it to be
    this.extraDiscount = parseFloat((naturalTTC - manualValue).toFixed(3));

    // Update the subjects immediately
    this.netTTC_doc$.next(manualValue);
    this.totalRemise_doc$.next(parseFloat((naturalRemise + this.extraDiscount).toFixed(3)));
  }

  freeAllCalculatedDocumentFields() {
    this.totalHTNet_doc$.next(0);
    this.totalRemise_doc$.next(0);
    this.totalTVA_doc$.next(0);
    this.netTTC_doc$.next(0);
    this.extraDiscount = 0;

    this.dataMerchand.data = [];
  }

  //#endregion

  //#region Load Data
  getCustomers(): void {
    this.counterPartService.GetAll(CounterPartType_FR.customer).subscribe({
      next: (response: CounterPart[]) => {
        console.log('Successfully fetched Customers', response);
        this.allCustomers = response;
        this.filteredCustomers = response; // Initialize filtered list with all customers
      },
      error: (error) => {
        console.error('Error fetching Customers', error);
        this.toastr.error('Erreur chargement Clients');
      }
    });
  }

  getArticles() {
    this.articles = [];
    this.articleService.GetAll().subscribe({
      next: (response) => {
        this.articles = response;
        console.log("Succefully loaded Articles", this.articles);
        // Initialize filteredArticles with all articles
        this.filteredArticles = [...this.articles];
        // Subscribe to searchControl value changes to filter the articles
        this.searchArticleControl.valueChanges.subscribe((searchTerm) => {
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

  getStocks() {
    this.stockService.getBySite(this.SalesSite).subscribe({
      next: (response: StockQuantity[]) => {
        console.log('Successfully fetched stocks', response);
        this.allStocks.data = response;
      }
    });
  }


  getTaxes() {
    this.TVAs = [];
    this.appVarService.GetAll('Tva').subscribe({
      next: (response) => {
        console.log("getTaxes() Method RESPONSE : ", response);
        this.TVAs = response;
      },
      error: (error) => {
        console.error('Error fetching Taxes:', error);
      }
    });
  }

  //#endregion

  //#region manage Customer
  addCustomer(): void {
    console.log('Add button clicked');
    this.router.navigateByUrl('home/customers/add');
  }

  onCustomerChange(customer: any): void {
    this.selectedCustomer = customer;
  }
  //#endregion

  //#region manage Transporters
  addTransporter() {
    const dialogRef = this.dialog.open(AddTransporterModalComponent, {
      width: '950px',
      height: '500px',
      maxWidth: '90vw',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("Transporter ADD", result);

        this.allTransporters = [];
        this.getAllTransporters();
        // Ensure `selectedTransporter` is initialized
        if (!this.selectedTransporter) {
          this.selectedTransporter = {};
        }

        // Create a new instance of `_Transporter` and map values
        const newTransporter = ({
          transpSurname: result.transpSurname,
          transpName: result.transpName,
          vehiculematricule: result.vehiculematricule,
        });

        const car = new Vehicle(newTransporter.vehiculematricule);

        // Assign values to `selectedTransporter`
        this.selectedTransporter.firstname = newTransporter.transpSurname;
        this.selectedTransporter.lastname = newTransporter.transpName;
        this.selectedTransporter.car = car;
      }
    });
  }

  getAllTransporters() {
    this.transporterService.getAll().subscribe({
      next: (response: Transporter[]) => {
        this.allTransporters = response;
        this.filteredTransporters = response;
        console.log('Successfully fetched Transporters', response);
        // Set the first supplier after the data is fetched
        // if (this.allTransporters.length > 0) {
        //   const firstTransporter = this.allTransporters[0];
        //   this.selectedTransporter = firstTransporter;
        // }
      },
      error: (error) => {
        console.error('Error fetching Transporters', error);
        this.toastr.error('Erreur chargement des Transporteurs');
      }
    });
  }

  //#endregion

}



