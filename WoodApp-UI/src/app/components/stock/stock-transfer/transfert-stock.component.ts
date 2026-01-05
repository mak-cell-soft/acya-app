import { Component, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Article } from '../../../models/components/article';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Site } from '../../../models/components/sites';
import { ArticleService } from '../../../services/components/article.service';
import { SalessitesService } from '../../../services/components/salessites.service';
import { TransporterService } from '../../../services/components/transporter.service';
import { Transporter, Vehicle } from '../../../models/components/customer';
import { ToastrService } from 'ngx-toastr';
import { MatSelect } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { AddTransporterModalComponent } from '../../../dashboard/modals/add-transporter-modal/add-transporter-modal.component';
import { Merchand, Merchandise } from '../../../models/components/merchandise';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject } from 'rxjs';
import { StockQuantity, StockWithLengthDetails } from '../../../models/components/stock';
import { AppVariable } from '../../../models/configuration/appvariable';
import { ConfirmDeleteModalComponent } from '../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { AddLengthsModalComponent } from '../../../dashboard/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../models/components/listoflength';
import { StockService } from '../../../services/components/stock.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { AppuserService } from '../../../services/components/appuser.service';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { response } from 'express';
import { StockTransfert } from '../../../models/components/stock_transfert';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/components/notification.service';

@Component({
  selector: 'app-transfert-stock',
  templateUrl: './transfert-stock.component.html',
  styleUrl: './transfert-stock.component.css'
})
export class TransfertStockComponent implements OnInit {
  fb = inject(FormBuilder);
  articleService = inject(ArticleService);
  siteService = inject(SalessitesService);
  transporterService = inject(TransporterService);
  appVarService = inject(AppVariableService);
  toastr = inject(ToastrService);
  dialog = inject(MatDialog);
  stockService = inject(StockService);
  authService = inject(AuthenticationService);
  appuserService = inject(AppuserService);
  router = inject(Router);
  notificationService = inject(NotificationService);

  stockExitForm!: FormGroup;
  loading: boolean = false;
  selectedTransporter: any = {};
  selectedArticle!: Article;
  transporterControl = new FormControl('');
  searchArticleControl = new FormControl('');

  allArticles: Article[] = [];
  allSites: Site[] = [];
  allTransporters: Transporter[] = [];
  filteredTransporters: Transporter[] = [];
  filteredArticles: Article[] = [];
  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;
  userconnected = this.authService.getUserDetail();

  displayedColumns: string[] = ['index', 'article', 'sellPrice', 'quantity', 'tva', 'totalWithoutTva', 'totalWithTva', 'actions'];
  dataMerchand = new MatTableDataSource<Merchand>([]);
  allStocks: MatTableDataSource<StockQuantity> = new MatTableDataSource<StockQuantity>([]);
  merchandises: Merchandise[] = [];
  SalesSite!: Site;
  originSite!: Site;
  articles: Article[] = []; // Fetch from service
  TVAs: AppVariable[] = []; // Fetch from service

  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;

  // BehaviorSubjects to hold totals
  totalHTNet_doc$ = new BehaviorSubject<number>(0);
  totalRemise_doc$ = new BehaviorSubject<number>(0);
  totalTVA_doc$ = new BehaviorSubject<number>(0);
  netTTC_doc$ = new BehaviorSubject<number>(0);

  @ViewChild('transporterSelect') transporterSelect!: MatSelect;
  @ViewChild('articleSelect') articleSelect!: MatSelect;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getSalesSiteUserConnected();
      this.loadData();
      this.notificationService.retryFailedNotifications();
      this.notificationService.retryRegisterHandlers();
    }

  }

  async loadData() {
    this.createForm();
    await this.getSalesSiteUserConnected(); // Wait for this to complete
    this.getAllTransporters();
    this.getArticles();
    this.getTaxes();
    this.getStocks();
    this.getAllSites();
  }

  isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  get selectedArticleControl(): FormControl {
    return this.stockExitForm.get('selectedArticle') as FormControl;
  }

  async getSalesSiteUserConnected(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      this.toastr.warning("Utilisateur non authentifié");
      return;
    }

    const _id = Number(this.authService.getUserDetail()?.id);
    if (isNaN(_id)) {
      this.toastr.warning("ID utilisateur invalide");
      return;
    }

    try {
      const response = await this.appuserService.GetSalesSite(_id).toPromise();

      if (!response) {
        throw new Error("Site de vente non connu");
      }

      this.originSite = response;
      if (this.authService.isLoggedIn()) {
        const _role = this.authService.getUserDetail()?.role;
        /**
         * selon le role de l'utilsateur connecté :
         * 1 - si un utilisateur : dépôt origine sera readOnly
         * 2 - si un Administrateur : déôt origine sera modifiable
         * 3 - Dans les 2 cas Dépôt Destination est toujours différent de l'origine.
         * 4 - Le dépôt Destination peut etre vide - dans ce cas la Description peut etre 
         *     1 - Perte.
         *     2 - Vol.
         *     3 - Utilistion interne
         */
      }
      this.stockExitForm.patchValue({
        FromSiteStock: response.id
      });
    } catch (error) {
      this.toastr.warning("Échec de la récupération du site de vente utilisateur");
      console.error(error);
    }
  }

  differentSitesValidator(control: AbstractControl): ValidationErrors | null {
    const fromSite = control.get('FromSiteStock')?.value;
    console.log("FromSite is : ", fromSite);
    const toSite = control.get('ToSiteStock')?.value;
    console.log("toSite is : ", toSite);

    if (fromSite && toSite && fromSite === toSite) {
      return { sameSites: true };
    }
    return null;
  }


  createForm() {
    const today = new Date();
    this.stockExitForm = this.fb.group({
      FromSiteStock: ['', Validators.required], // Remove hardcoded value
      ToSiteStock: ['', Validators.required],
      selectedArticle: ['', Validators.required],
      stockDate: [today],
      transporterControl: ['', Validators.required], // Remove default value
      description: ['']
    },
      { validators: this.differentSitesValidator }
    );


    // Initialize filtered lists with all items
    this.filteredArticles = this.allArticles;
    this.filteredTransporters = this.allTransporters;

    // Add form validation for the add button
    this.stockExitForm.valueChanges.subscribe(() => {
      this.updateFormValidity();
    });
  }

  // Add this new method
  updateFormValidity() {
    const requiredFieldsFilled =
      this.stockExitForm.get('ToSiteStock')?.valid &&
      this.stockExitForm.get('transporterControl')?.valid;
    this.stockExitForm.setErrors(requiredFieldsFilled ? null : { requiredFields: true });
  }


  onSiteChange(siteId: number): void {
    // Implement your logic when site changes    
    var site = this.allSites.find(s => s.id === siteId);
    console.log("Site selected : ", site);
    console.log("Site selected - address:", site?.address);
    if (site != null) {
      this.getStocksBySelectedSite(site);
    }

  }

  resetFilters() {
    this.stockExitForm.reset();

    // You might want to reload data here
  }

  applyFilters() {
    if (this.stockExitForm.valid) {
      this.loading = true;
      const filters = this.stockExitForm.value;
      // Call your service to get filtered data here
      // After data is loaded:
      this.loading = false;
    }
  }

  //#region Load Data
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

  getAllSites() {
    // Implement your site loading logic
    //this.siteService.GetAll().subscribe(sites => this.allSites = sites);
    this.siteService.GetAll().subscribe({
      next: (response: Site[]) => {
        this.allSites = response;
        console.log('ALL Sites Fetched ', response);
      }
    });

  }

  getStocksBySelectedSite(selectedSite: Site) {
    this.stockService.getBySite(selectedSite).subscribe({
      next: (response: StockQuantity[]) => {
        this.dataMerchand.data = [];
        this.allStocks.data = [];
        this.allStocks.data = response;
      }
    });
  }

  getStocks() {
    this.stockService.getBySite(this.originSite).subscribe({
      next: (response: StockQuantity[]) => {
        if (this.allStocks.data.length > 0) {
          this.allStocks.data = []
        }
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

  //#region Transporter
  /**
   * @description Loaded Transporters when start typing
   * @param element 
   * 
   */
  applyTransporterFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredTransporters = this.allTransporters.filter(transporter =>
      (transporter.firstname && transporter.firstname.toLowerCase().includes(filterValue)) ||
      (transporter.lastname && transporter.lastname.toLowerCase().includes(filterValue)) ||
      (transporter.car?.serialnumber && transporter.car.serialnumber.toLowerCase().includes(filterValue))
    );
  }


  openDropdownTransporters() {
    // Only open if there are filtered items
    if (this.filteredTransporters.length > 0) {
      this.transporterSelect.open();
    }
  }

  onOptionTransporterSelected(transporterId: number): void {
    const transporter = this.allTransporters.find(t => t.id === transporterId);
    console.log("Transporter Selected : ", transporter);
    if (transporter) {
      this.selectedTransporter = transporter;
      console.log("Transporter Selected : ", this.selectedTransporter);
      // this.stockExitForm.patchValue({
      //   transporterControl: `${transporter.firstname} ${transporter.lastname}`
      // });
    }
  }

  addTransporter() {
    const dialogRef = this.dialog.open(AddTransporterModalComponent, {
      width: '950px',
      height: '400px',
      maxWidth: '90vw',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getAllTransporters(); // Refresh the list
        this.toastr.success('Transporteur ajouté avec succès');
      }
    });
  }
  //#endregion


  //#region Article

  /**
  * @description loaded Articles when start typing
  * @param event 
  */
  applyArticleFilter(event: Event, element: Merchand) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    element.filteredArticles = this.articles.filter(article =>
      article.reference.toLowerCase().includes(filterValue) ||
      (article.description && article.description.toLowerCase().includes(filterValue))
    );
  }

  // Update ViewChildren reference
  @ViewChildren('articleSelect') articleSelects!: QueryList<MatSelect>;

  openArticleDropdown(element: Merchand) {
    const index = this.dataMerchand.data.indexOf(element);
    const select = this.articleSelects.toArray()[index];
    if (select) {
      select.open();
    }
  }

  /**
  * Recherche parmi la liste des articles selectionnés :
  * Le ou les Stocks disponibles avec leurs marchandise.
  * - Pour un seul Article on peut trouver plusieurs Stocks
  * @param element 
  * @param selectedArticle 
  */
  onArticleChange(element: Merchand, selectedArticle: Article) {
    if (selectedArticle) {
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
        if (element.isWoodArticle && !element.listLengths) {
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
        this.toastr.error('Stock non trouvé pour ' + selectedArticle.reference);
      }
    } else {
      // Clear wood flag if article is deselected
      element.isWoodArticle = false;
      element.selectedStock = null;
      this.updateTotals(element);
    }
  }

  trackByArticleId(index: number, article: Article): number {
    return article.id;
  }

  getSelectedTvaFromArticle(selectedArticle: Article): number | null {
    if (selectedArticle) {
      return selectedArticle.tvaid; // Return the TVA ID from the selected article
    }
    return null; // Return null if no article is selected
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
      element.sellcostprice_net_ht = netBeforeDiscount - discountValue;

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
      element.totalWithTax = element.sellcostprice_net_ht * (1 + (tvaRate / 100));

      // Update discount value
      element.sellcostprice_discountValue = discountValue;

      // Update TVA value
      element.sellcostprice_taxValue = element.sellcostprice_net_ht * (tvaRate / 100);
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

  shouldDisableQuantityInput(element: Merchand): boolean {
    if (element.selectedStock) {
      return !element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0;
    }
    return true; // Disable if no stock is selected
  }
  //#endregion

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

    this.totalHTNet_doc$.next(totals.totalHTNet);
    this.totalRemise_doc$.next(totals.totalRemise);
    this.totalTVA_doc$.next(totals.totalTVA);
    this.netTTC_doc$.next(totals.netTTC);
  }

  freeAllCalculatedDocumentFields() {
    this.totalHTNet_doc$.next(0);
    this.totalRemise_doc$.next(0);
    this.totalTVA_doc$.next(0);
    this.netTTC_doc$.next(0);

    this.dataMerchand.data = [];
  }

  //#region Stocks

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
  //#endregion

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
    const salesSiteId = Number(this.stockExitForm.get('FromSiteStock')?.value ?? this.originSite?.id ?? 0);

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

  //#region Submit

  validateStockTransfer() {
    // Mark all controls as touched to show errors if any
    this.stockExitForm.markAllAsTouched();

    // if (this.stockExitForm.invalid) {
    //   this.toastr.info("Dépôts source et destination non valides");
    //   return;
    // }
    if (this.dataMerchand.data.length == 0) {
      this.toastr.error("Pas de marchandises à transférer");
      return;
    }


    // Your transfer logic here
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

  onSubmit() {
    this.validateStockTransfer();

    // Check if form is valid before proceeding
    // if (this.stockExitForm.invalid) {
    //   this.toastr.error('Veuillez corriger les erreurs dans le formulaire');
    //   return;
    // }

    try {
      var formValues = this.stockExitForm.value;
      const currentUser = this.userconnected?.id;
      const st: StockTransfert = {
        originSiteId: formValues.FromSiteStock,
        destinationSiteId: formValues.ToSiteStock,
        transporterId: this.selectedTransporter.id,
        merchandisesItems: this.transformMerchandToMerchandise(this.dataMerchand),
        TransferDate: formValues.stockDate ? new Date(formValues.stockDate) : new Date(),
        reference: this.generateReferenceNumber() || '',
        notes: formValues.description || '',
        updatedById: Number(currentUser) || 0
      };

      if (!st.updatedById) {
        this.toastr.error('User ID is required');
        return;
      }

      if (!st.merchandisesItems || st.merchandisesItems.length === 0) {
        this.toastr.error('At least one merchandise item is required');
        return;
      }

      if (st.originSiteId == st.destinationSiteId) {
        this.toastr.info("Dépôt source ne peut pas être lui même la destination");
        return;
      }

      console.log('Created Document : ', st);
      // Form is valid, proceed with the transfer
      console.log('Form is valid, proceeding with transfer');
      // Only proceed if all validations pass
      this.saveTransferStock(st);
    } catch (error) {
      console.error('Error in onSubmit:', error);
      this.toastr.error('La création du document a échoué');
    }
  }

  generateReferenceNumber(): string {
    // Get the form values
    const formValues = this.stockExitForm.value;

    // Get the current date and time
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2); // Get last 2 digits of year
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Find the site objects from the allSites array
    const fromSite = this.allSites.find(site => site.id === formValues.FromSiteStock);
    const toSite = this.allSites.find(site => site.id === formValues.ToSiteStock);

    // Get address parts (use empty string if not found)
    const address1 = fromSite?.address?.replace(/\s+/g, '') || 'unknown-origin';
    const address2 = toSite?.address?.replace(/\s+/g, '') || 'unknown-destination';

    // Construct the reference string
    return `${address1}-${address2}-${year}-${month}-${day}-${hours}:${minutes}`;
  }

  /**
     * Appeler la méthode 
     * @param doc 
     */
  // saveTransferStock(st: StockTransfert) {
  //    console.log("Transfer Process Started");
  //   this.stockService.transferStock(st).subscribe({
  //     next: (response) => {

  //       console.log('Transfer Process:', response);
  //       this.toastr.success(
  //         `Processus Transfert. En attente de Confirmation `
  //       );
  //       this.freeAllCalculatedDocumentFields();
  //       this.router.navigateByUrl('stock/transferinfo');
  //     },
  //     error: (err) => {
  //       console.error('Transfer error:', err);
  //       let errorMsg = 'Erreur Transfer Stock';
  //       if (err.error) {
  //         errorMsg += ': ' + (typeof err.error === 'string' ? err.error : err.message);
  //       }
  //       this.toastr.error(errorMsg);
  //     }
  //   });
  // }
  saveTransferStock(st: StockTransfert) {
    console.log("Transfer Initiated : Process Transfer");
    this.stockService.transferStock(st).subscribe({
      next: (response) => {
        console.log('Transfer Process:', response);
        this.toastr.success(`Processus Transfert. En attente de Confirmation`);

        // Optionally navigate only after ensuring SignalR is connected
        if (this.notificationService.isConnected()) {
          this.router.navigateByUrl('/home/stock/transferinfo');
        } else {
          // Handle case when SignalR isn't connected
          this.toastr.warning('Transfer initiated but real-time updates may be delayed');
          this.router.navigateByUrl('/home/stock/transferinfo');
        }

        this.freeAllCalculatedDocumentFields();
      },
      error: (err) => {
        console.error('Transfer error:', err);
        let errorMsg = 'Erreur Transfer Stock';
        if (err.error) {
          errorMsg += ': ' + (typeof err.error === 'string' ? err.error : err.message);
        }
        this.toastr.error(errorMsg);
      }
    });
  }
  //#endregion
}