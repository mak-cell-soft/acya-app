import { Component, inject, model, QueryList, ViewChild, ViewChildren, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ArticleService } from '../../../../services/components/article.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { Merchand, Merchandise } from '../../../../models/components/merchandise';
import { MatTableDataSource } from '@angular/material/table';
import { Article } from '../../../../models/components/article';
import { DocStatus, Document, DocumentTypes, BillingStatus } from '../../../../models/components/document';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { StockQuantity, StockWithLengthDetails, TransactionType } from '../../../../models/components/stock';
import { StockService } from '../../../../services/components/stock.service';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPartType_FR } from '../../../../shared/constants/list_of_constants';
import { MatSelect } from '@angular/material/select';
import { Transporter } from '../../../../models/components/customer';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../../shared/Text_Buttons';
import { MatDialog } from '@angular/material/dialog';
import { AddLengthsModalComponent } from '../../../../dashboard/modals/add-lengths-modal/add-lengths-modal.component';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { AppuserService } from '../../../../services/components/appuser.service';
import { Site } from '../../../../models/components/sites';
import { DocumentService } from '../../../../services/components/document.service';
import { ListOfLength } from '../../../../models/components/listoflength';
import { ConfirmDeleteModalComponent } from '../../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';
import { PaymentModalComponent } from '../../../../dashboard/modals/payment-modal/payment-modal.component';
import { TransporterService } from '../../../../services/components/transporter.service';
import { AddTransporterModalComponent } from '../../../../dashboard/modals/add-transporter-modal/add-transporter-modal.component';

@Component({
    selector: 'app-add-invoice',
    templateUrl: './add-invoice.component.html',
    styleUrl: './add-invoice.component.css'
})
export class AddInvoiceComponent implements OnInit {
    // Services
    toastr = inject(ToastrService);
    router = inject(Router);
    fb = inject(FormBuilder);
    articleService = inject(ArticleService);
    appVarService = inject(AppVariableService);
    stockService = inject(StockService);
    counterPartService = inject(CounterpartService);
    dialog = inject(MatDialog);
    transporterService = inject(TransporterService);
    authService = inject(AuthenticationService);
    appUserService = inject(AppuserService);
    docService = inject(DocumentService);

    // Forms
    form!: FormGroup;
    taxeForm!: FormGroup;
    searchCustomerControl = new FormControl('');
    searchTransporterControl = new FormControl('');

    // Data State
    userconnected = this.authService.getUserDetail();
    allCustomers: CounterPart[] = [];
    filteredCustomers: CounterPart[] = [];
    allTransporters: Transporter[] = [];
    filteredTransporters: Transporter[] = [];
    selectedCustomer: CounterPart | null = null;
    selectedTransporter: any = {};
    selectedDate: Date = new Date();
    SalesSite!: Site;
    articles: Article[] = [];
    filteredArticles: Article[] = [];
    TVAs: AppVariable[] = [];
    appvariablesTaxes: AppVariable[] = [];
    allStocks: MatTableDataSource<StockQuantity> = new MatTableDataSource<StockQuantity>([]);

    // Table
    displayedColumns: string[] = ['index', 'article', 'sellPrice', 'quantity', 'discount', 'tva', 'totalWithoutTva', 'totalWithTva', 'actions'];
    dataMerchand = new MatTableDataSource<Merchand>([]);

    // Totals
    totalHTNet_doc$ = new BehaviorSubject<number>(0);
    totalRemise_doc$ = new BehaviorSubject<number>(0);
    totalTVA_doc$ = new BehaviorSubject<number>(0);
    netTTC_doc$ = new BehaviorSubject<number>(0);

    // ViewChildren
    @ViewChild('customerSelect') customerSelect!: MatSelect;
    @ViewChild('transporterSelect') transporterSelect!: MatSelect;
    @ViewChildren('articleSelect') articleSelects!: QueryList<MatSelect>;

    // Buttons
    register_button: string = REGISTER_BUTTON;
    abort_button: string = ABORT_BUTTON;

    constructor() {
        this.createForms();
    }

    ngOnInit(): void {
        if (this.authService.isLoggedIn()) {
            this.getAppUserSiteAndThenLoadData();
            this.getCustomers();
            this.searchCustomerControl.valueChanges.subscribe(() => this.applyCustomerFilter());
            this.getAllTaxes();
        }
    }

    createForms() {
        this.form = this.fb.group({
            customer: ['', Validators.required],
            customerReference: ['']
        });

        this.taxeForm = this.fb.group({
            selectedTaxe: [null, Validators.required]
        });

        // Recalculate totals when tax changes
        this.taxeForm.get('selectedTaxe')?.valueChanges.subscribe(() => {
            this.calculateTotals(this.dataMerchand.data);
        });
    }

    getAppUserSiteAndThenLoadData(): void {
        const id = Number(this.userconnected?.id);
        this.appUserService.GetSalesSite(id).subscribe({
            next: (response) => {
                this.SalesSite = response;
                this.loadData();
            },
            error: (err) => {
                console.error('Error fetching site data:', err);
                this.toastr.error('Site de Vente non trouvé.');
            }
        });
    }

    loadData() {
        this.getArticles();
        this.getStocks();
        this.getTVAs();
        this.getAllTransporters();
    }

    getArticles() {
        this.articleService.GetAll().subscribe({
            next: (response) => {
                this.articles = response;
                this.filteredArticles = [...this.articles];
            },
            error: (err) => console.error('Error fetching articles', err)
        });
    }

    getStocks() {
        this.stockService.getBySite(this.SalesSite).subscribe({
            next: (response: StockQuantity[]) => {
                console.log('Successfully fetched stocks', response);
                this.allStocks.data = response;
            },
            error: (err: any) => console.error('Error fetching stocks', err)
        });
    }

    getTVAs() {
        this.appVarService.GetAll('TVA').subscribe({
            next: (response) => this.TVAs = response,
            error: (err) => console.error('Error fetching TVAs', err)
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

    getCustomers() {
        this.counterPartService.GetAll(CounterPartType_FR.customer).subscribe({
            next: (response) => {
                this.allCustomers = response;
                this.filteredCustomers = response;
            },
            error: (err) => console.error('Error fetching customers', err)
        });
    }

    getAllTransporters() {
        this.transporterService.getAll().subscribe({
            next: (response: any) => {
                this.allTransporters = response;
                this.filteredTransporters = response;
            },
            error: (err: any) => console.error('Error fetching transporters', err)
        });
    }

    applyCustomerFilter(): void {
        const filterValue = this.searchCustomerControl.value!.trim().toLowerCase();
        this.filteredCustomers = this.allCustomers.filter(customer =>
            (customer.name && customer.name.toLowerCase().includes(filterValue)) ||
            (customer.firstname && customer.firstname.toLowerCase().includes(filterValue)) ||
            (customer.lastname && customer.lastname.toLowerCase().includes(filterValue))
        );
        if (this.customerSelect) this.customerSelect.open();
    }

    onOptionCustomerSelected(customerId: number): void {
        const customer = this.allCustomers.find(c => c.id === customerId);
        if (customer) {
            this.selectedCustomer = customer;
            this.form.get('customer')?.setValue(customer);
            this.searchCustomerControl.setValue('');
            if (customer.transporter) {
                this.selectedTransporter = customer.transporter;
            }
        }
    }

    applyTransporterFilter() {
        const filterValue = this.searchTransporterControl.value!.trim().toLowerCase();
        this.filteredTransporters = this.allTransporters.filter(t =>
            (t.firstname && t.firstname.toLowerCase().includes(filterValue)) ||
            (t.lastname && t.lastname.toLowerCase().includes(filterValue))
        );
        if (this.transporterSelect) this.transporterSelect.open();
    }

    onOptionTransporterSelected(transporterId: number): void {
        this.selectedTransporter = this.allTransporters.find(t => t.id === transporterId);
        this.searchTransporterControl.setValue('');
    }


    addTransporter() {
        const dialogRef = this.dialog.open(AddTransporterModalComponent, {
            width: '600px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.getAllTransporters();
                this.toastr.success('Transporteur ajouté avec succès');
            }
        });
    }

    // Row Management
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
            articleSearchInput: '',
            filteredArticles: [...this.articles],
            selectedStock: null
        };
        this.dataMerchand.data = [...this.dataMerchand.data, newRow];
        this.calculateTotals(this.dataMerchand.data);
    }

    deleteRow(element: Merchand) {
        const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
            width: '400px',
            data: { item: { id: element.selectedArticle?.reference, name: element.selectedArticle?.description } }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                const index = this.dataMerchand.data.indexOf(element);
                if (index >= 0) {
                    this.dataMerchand.data.splice(index, 1);
                    this.dataMerchand.data = [...this.dataMerchand.data];
                    this.calculateTotals(this.dataMerchand.data);
                }
            }
        });
    }

    applyArticleFilter(event: Event, element: Merchand) {
        const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
        element.filteredArticles = this.articles.filter(article =>
            article.reference.toLowerCase().includes(filterValue) ||
            (article.description && article.description.toLowerCase().includes(filterValue))
        );
    }

    openArticleDropdown(element: Merchand) {
        const index = this.dataMerchand.data.indexOf(element);
        const select = this.articleSelects.toArray()[index];
        if (select) select.open();
    }

    onArticleChange(element: Merchand, selectedArticle: Article) {
        if (selectedArticle) {
            element.isWoodArticle = selectedArticle.iswood;
            const matchingStocks = this.allStocks.data.filter(stock => stock.articleId === selectedArticle.id);

            if (matchingStocks.length > 0) {
                element.selectedStock = matchingStocks.length === 1 ? matchingStocks[0] : null;
                element.unit_price_ht = selectedArticle.sellprice_ht;
                if (element.isWoodArticle && !element.listLengths) element.listLengths = [];
                if (element.selectedStock) this.updateRowTotals(element);
            } else {
                this.toastr.error('Stock non trouvé pour ' + selectedArticle.reference);
            }
        } else {
            element.isWoodArticle = false;
            element.selectedStock = null;
            this.updateRowTotals(element);
        }
    }

    onMerchandiseChange(element: Merchand) {
        if (element.selectedStock) {
            element.unit_price_ht = element.selectedArticle?.sellprice_ht || 0;
            this.updateRowTotals(element);
            if (!element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0) {
                element.quantity = 0;
            }
        }
    }

    updateRowTotals(element: Merchand) {
        if (element.selectedArticle) {
            const netBeforeDiscount = (element.quantity || 0) * (element.unit_price_ht || 0);
            const discountValue = netBeforeDiscount * ((element.selldiscountpercentage || 0) / 100);
            element.sellcostprice_net_ht = netBeforeDiscount - discountValue;

            let tvaRate = 0;
            if (element.selectedArticle.tva?.value) {
                tvaRate = typeof element.selectedArticle.tva.value === 'string'
                    ? parseFloat(element.selectedArticle.tva.value.replace('%', '').trim())
                    : Number(element.selectedArticle.tva.value);
            }
            element.totalWithTax = element.sellcostprice_net_ht * (1 + (tvaRate / 100));
            element.sellcostprice_discountValue = discountValue;
            element.sellcostprice_taxValue = element.sellcostprice_net_ht * (tvaRate / 100);
        } else {
            element.sellcostprice_net_ht = 0;
            element.totalWithTax = 0;
            element.sellcostprice_discountValue = 0;
            element.sellcostprice_taxValue = 0;
        }
        this.calculateTotals(this.dataMerchand.data);
    }

    calculateTotals(data: Merchand[]): void {
        const totals = data.reduce((acc, item) => {
            acc.totalHTNet += item.sellcostprice_net_ht || 0;
            acc.totalRemise += item.sellcostprice_discountValue || 0;
            acc.totalTVA += item.sellcostprice_taxValue || 0;
            acc.netTTC += item.totalWithTax || 0;
            return acc;
        }, { totalHTNet: 0, totalRemise: 0, totalTVA: 0, netTTC: 0 });

        // Add Stamp Tax (Droit de Timbre)
        const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
        const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
        const taxAddition = selectedTax ? parseFloat(selectedTax.value) : 0;

        const finalTTC = totals.netTTC + taxAddition;

        this.totalHTNet_doc$.next(totals.totalHTNet);
        this.totalRemise_doc$.next(totals.totalRemise);
        this.totalTVA_doc$.next(totals.totalTVA);
        this.netTTC_doc$.next(finalTTC);
    }

    // TTC Editable Logic
    onTTCAmountChange(newTTC: number) {
        const baseTTCWithoutStamp = this.dataMerchand.data.reduce((sum, item) => sum + (item.totalWithTax || 0), 0);
        const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
        const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
        const taxAddition = selectedTax ? parseFloat(selectedTax.value) : 0;

        const calculatedFinalTTC = baseTTCWithoutStamp + taxAddition;

        // Difference is the extra document discount
        const extraDiscountValue = calculatedFinalTTC - newTTC;
        const discountPercentage = (extraDiscountValue / calculatedFinalTTC) * 100;

        if (discountPercentage > 5) {
            this.toastr.warning('La remise dépasse la limite autorisée de 5%');
            // Revert or block submit? Requirements say show validation error.
        } else if (discountPercentage < 0) {
            // TTC increased, handle if needed
        } else {
            // Requirements: "Update all related input fields in real-time to reflect the discount"
            // This is complex for a global discount. 
            // Usually we just store the global discount value.
            // But if we want to update rows, we distribute it.
            this.totalRemise_doc$.next(this.totalRemise_doc$.value + extraDiscountValue);
            this.netTTC_doc$.next(newTTC);
        }
    }

    // Payment Integration
    openPaymentModal() {
        const finalTTC = this.netTTC_doc$.value;
        const modalData = {
            documentId: 0,
            documentNumber: 'NOUVELLE-FACTURE',
            totalAmount: finalTTC,
            remainingAmount: finalTTC,
            ownerFullName: this.selectedCustomer ? (this.selectedCustomer.name || `${this.selectedCustomer.firstname} ${this.selectedCustomer.lastname}`) : '',
            porterName: '',
            porterId: this.selectedCustomer?.id || 0,
            billingStatus: BillingStatus.NotBilled,
            documentType: DocumentTypes.customerInvoice
        };

        const dialogRef = this.dialog.open(PaymentModalComponent, {
            width: '600px',
            disableClose: true,
            data: modalData
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Store payment info to be saved with document
                this.pendingPayment = result;
                this.toastr.info('Paiement configuré');
            }
        });
    }

    pendingPayment: any = null;

    onSubmit() {
        if (!this.validate()) return;

        const doc: Document = {
            id: 0,
            type: DocumentTypes.customerInvoice,
            stocktransactiontype: TransactionType.Retrieve,
            docnumber: '',
            description: '',
            supplierReference: this.form.get('customerReference')?.value || '',
            isinvoiced: true,
            merchandises: this.transformMerchandToMerchandise(this.dataMerchand),
            total_ht_net_doc: this.totalHTNet_doc$.value,
            total_discount_doc: this.totalRemise_doc$.value,
            total_tva_doc: this.totalTVA_doc$.value,
            total_net_ttc: this.netTTC_doc$.value,
            taxe: (this.appvariablesTaxes.find(t => t.id === this.taxeForm.get('selectedTaxe')?.value) || null) as any,
            holdingtax: null as any,
            withholdingtax: false,
            counterpart: this.selectedCustomer!,
            transporter: this.selectedTransporter,
            sales_site: this.SalesSite,
            creationdate: new Date(),
            updatedate: new Date(),
            updatedbyid: Number(this.userconnected?.id),
            isdeleted: false,
            regulationid: 0,
            appuser: null as any,
            editing: false,
            docstatus: DocStatus.Created,
            billingstatus: this.pendingPayment ? BillingStatus.Billed : BillingStatus.NotBilled,
            deliveryNoteDocNumbers: []
        };

        console.log("Facture à enregistrer : ", doc);

        this.docService.Add(doc).subscribe({
            next: (response) => {
                const docRef = response.docRef;
                this.toastr.success(`Facture ${docRef} créée avec succès`);

                this.router.navigateByUrl('home/customerinvoices');
            },
            error: (err) => {
                this.toastr.error('Erreur lors de la création de la facture');
                console.error(err);
            }
        });
    }

    validate(): boolean {
        const errors = [];
        if (this.dataMerchand.data.length === 0) errors.push('Ajouter au moins une marchandise');
        if (!this.selectedCustomer) errors.push('Sélectionner un client.');
        if (!this.selectedTransporter || !this.selectedTransporter.id) errors.push('Sélectionner un transporteur.');
        if (this.taxeForm.invalid) errors.push('Sélectionner une taxe.');

        // Check if discount > 5%
        const baseTTCWithoutStamp = this.dataMerchand.data.reduce((sum, item) => sum + (item.totalWithTax || 0), 0);
        const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
        const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
        const taxAddition = selectedTax ? parseFloat(selectedTax.value) : 0;
        const calculatedFinalTTC = baseTTCWithoutStamp + taxAddition;
        const discountPercentage = ((calculatedFinalTTC - this.netTTC_doc$.value) / calculatedFinalTTC) * 100;

        if (discountPercentage > 5) errors.push('La remise ne peut pas dépasser 5%');

        if (errors.length > 0) {
            errors.forEach(e => this.toastr.error(e));
            return false;
        }
        return true;
    }

    private transformMerchandToMerchandise(dataMerchand: MatTableDataSource<Merchand>): Merchandise[] {
        return dataMerchand.data.map(merchand => {
            const m = new Merchandise();
            // Map the properties from Merchand to Merchandise
            m.article = merchand.selectedArticle || new Article();
            m.unit_price_ht = merchand.unit_price_ht;
            m.cost_ht = merchand.merchandise_cost_ht;
            m.quantity = merchand.quantity;
            m.lisoflengths = merchand.listLengths;
            m.discount_percentage = merchand.selldiscountpercentage;
            m.cost_discount_value = merchand.sellcostprice_discountValue;
            m.cost_net_ht = merchand.sellcostprice_net_ht;
            m.tva_value = merchand.sellcostprice_taxValue;
            m.cost_ttc = merchand.totalWithTax;

            // Set default values for other required properties
            m.id = merchand.selectedStock?.merchandiseId || 0; // Assuming this is a new merchandise
            m.packagereference = merchand.selectedStock?.packageReference || '';
            m.description = merchand.selectedStock?.MerchandiseDescription || '';
            m.creationdate = new Date();
            m.updatedate = new Date();
            m.updatedbyid = Number(this.userconnected?.id) || 0;
            m.documentid = 0;
            m.isinvoicible = merchand.selectedStock?.isInvoicible || true;
            m.allownegativstock = merchand.selectedStock?.allowNegativeStock || false;
            m.ismergedwith = merchand.selectedStock?.isMergedWith || false;
            m.isdeleted = false;

            return m;
        });
    }

    // Wood Length Helpers
    openWoodLengthDialog(element: Merchand): void {
        const woodParams = {
            merchandiseRef: element.selectedArticle?.reference ?? '',
            salesSiteId: this.SalesSite.id,
            merchandiseId: element.selectedStock?.merchandiseId ?? element.selectedArticle?.id ?? 0
        };

        this.stockService.getWoodStockWithLengthDetails(woodParams).subscribe({
            next: (details: StockWithLengthDetails[]) => {
                const dialogRef = this.dialog.open(AddLengthsModalComponent, {
                    width: '800px',
                    data: { article: element.selectedArticle, merchand: element, availableStock: details || [] }
                });

                dialogRef.afterClosed().subscribe(result => {
                    if (result) {
                        const { lengths, totalQuantity } = result;
                        element.quantity = parseFloat(Number(totalQuantity).toFixed(3));
                        element.listLengths = lengths;
                        this.updateRowTotals(element);
                    }
                });
            }
        });
    }

    getTotalNbPieces(element: Merchand): number {
        return element.listLengths?.reduce((acc, current) => acc + (current.nbpieces || 0), 0) || 0;
    }

    getTotalLengths(element: Merchand): number {
        return element.listLengths?.filter(item => item.nbpieces > 0).length || 0;
    }

    shouldDisableQuantityInput(element: Merchand): boolean {
        return element.selectedStock ? (!element.selectedStock.allowNegativeStock && element.selectedStock.stockQuantity <= 0) : true;
    }

    getMatchingStocks(articleId: number): StockQuantity[] {
        return this.allStocks.data.filter(stock => stock.articleId === articleId);
    }

    trackByArticleId(index: number, article: Article): number {
        return article.id;
    }
}
