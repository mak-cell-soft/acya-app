import { AfterViewInit, Component, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MAT_HEADER_CELL_DOC_NUMBER, MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE, MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC, MAT_HEADER_CELL_DOC_TOTALNETHT, MAT_HEADER_CELL_DOC_TOTALNETTTC, MAT_HEADER_CELL_DOC_TOTALTVADOC, MAT_HEADER_CELL_DOC_UPDATEDDATE, NUMBER_OF_ROWS } from '../../../../shared/constants/components/reception';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject } from 'rxjs';
import { Document, DocumentTypes, BillingStatus, DocStatus } from '../../../../models/components/document';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HoldingTaxe } from '../../../../models/components/holdingtax';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { AppuserService } from '../../../../services/components/appuser.service';
import { AppUser } from '../../../../models/components/appuser';
import { Site } from '../../../../models/components/sites';
import { ToastrService } from 'ngx-toastr';
import { DocumentService } from '../../../../services/components/document.service';
import { GenerateInvoice } from '../../../../models/components/generate_invoice';
import { TransactionType } from '../../../../models/components/stock';

@Component({
  selector: 'app-generate-invoice-modal',
  templateUrl: './generate-invoice-modal.component.html',
  styleUrl: './generate-invoice-modal.component.css'
})
export class GenerateInvoiceModalComponent implements OnInit, AfterViewInit {

  appvarService = inject(AppVariableService);
  fb = inject(FormBuilder);
  authService = inject(AuthenticationService);
  appUserService = inject(AppuserService);
  docService = inject(DocumentService);
  toastr = inject(ToastrService);

  allSelectedDocs: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  displayedDocumentsColumns: string[] = ['count', 'number', 'supplierreference', 'TotalHTNet', 'TotalDiscountDoc', 'TotalTVADoc', 'TotalNetTTC', 'EditedBy'];

  appvariablesTaxes: AppVariable[] = [];
  selectedTaxDoc!: AppVariable;
  docChildIds!: number[];
  taxeForm!: FormGroup;
  appUser: any;
  salesSite: any;
  userId: number = 0;
  userconnected = this.authService.getUserDetail();

  @ViewChild(MatPaginator) PaginationDocument!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  //#region Labels
  mat_header_cell_doc_number: string = MAT_HEADER_CELL_DOC_NUMBER;
  mat_header_cell_doc_supplierReference: string = MAT_HEADER_CELL_DOC_SUPPLIERREFERENCE;

  mat_header_cell_doc_TotalHTNet: string = MAT_HEADER_CELL_DOC_TOTALNETHT;
  mat_header_cell_doc_TotalDiscountDoc: string = MAT_HEADER_CELL_DOC_TOTALDISCOUNTDOC;
  mat_header_cell_doc_TotalTVADoc: string = MAT_HEADER_CELL_DOC_TOTALTVADOC;
  mat_header_cell_doc_TotalNetTTC: string = MAT_HEADER_CELL_DOC_TOTALNETTTC;
  mat_header_cell_doc_UpdatedDate: string = MAT_HEADER_CELL_DOC_UPDATEDDATE;
  Number_of_Rows: string = NUMBER_OF_ROWS;
  //#endregion Labels

  totalHTNet_invoice_doc$ = new BehaviorSubject<number>(0);
  totalRemise_invoice_doc$ = new BehaviorSubject<number>(0);
  totalTVA_invoice_doc$ = new BehaviorSubject<number>(0);
  netTTC_invoice_doc$ = new BehaviorSubject<number>(0);

  /**
   * Table Summary
   */
  totalHTNet_invoice_doc: number = 0;
  totalRemise_invoice_doc: number = 0;
  totalTVA_invoice_doc: number = 0;
  netTTC_invoice_doc: number = 0;

  loading: boolean = false; // Add loading state

  //#region constructor
  /**
   *
   */
  constructor(
    public dialogRef: MatDialogRef<GenerateInvoiceModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  //#endregion

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userId = Number(this.authService.getUserDetail()?.id);
      this.createForm();
      this.allSelectedDocs.data = (this.data.input || []).map((doc: any, index: any) => ({
        ...doc,
        customIndex: index + 1, // Add a custom index starting from 1
      }));
      this.getAllTaxes(); // Fetch taxes and set default
      this.getAppUserSalesSite();


    }

  }
  ngAfterViewInit(): void {
    this.allSelectedDocs.paginator = this.PaginationDocument;
    this.allSelectedDocs.sort = this.sort;

    // Listen for changes to the selectedTaxe form control
    this.taxeForm.get('selectedTaxe')!.valueChanges.subscribe((selectedTaxId) => {
      console.log('Selected Taxe changed to:', selectedTaxId);
      this.calculateTotals(this.allSelectedDocs.data); // Recalculate totals
    });
  }

  createForm() {
    this.taxeForm = this.fb.group({
      selectedTaxe: ['', Validators.required],
      supplierReference: ['', Validators.required]
    });
  }

  getAppUserById(id: number) {
    return this.appUserService.GetById(id).subscribe({
      next: (response: AppUser) => {
        this.appUser = response;
      }
    });
  }

  getAppUserSalesSite() {
    this.appUserService.GetSalesSite(this.userId).subscribe({
      next: (res: Site) => {
        this.salesSite = res;
      }
    });
  }

  //#region onSubmit
  onSubmit() {
    let formValues: any;

    if (this.taxeForm.valid) {
      this.loading = true; // Start loading
      formValues = this.taxeForm.value;
      let doc = this.createInvoiceInstance(formValues); // Assuming this returns a `Document`
      let childsIds = this.createDocChildIds(); // Assuming this returns `number[]`

      console.log('Invoice Doc Created ', doc);
      console.log('Invoice Childs Created ', childsIds);

      // Create an instance of GenerateInvoice and assign values
      let _gi = new GenerateInvoice();
      _gi.invoiceDoc = doc; // Assign the document
      _gi.docChildrenIds = childsIds; // Assign the child IDs

      // Call the service to create the invoice
      this.docService.CreateInvoice(_gi).subscribe({
        next: (response: any) => {
          this.loading = false; // Stop loading
          // Assuming the response object contains the invoice details
          // and the DocRef property is available directly in the response.
          const docRef = response.DocRef;

          // Handle the response here
          console.log('Invoice created successfully', response);
          this.toastr.success('Facture référence ' + docRef + ' est crée avec succés.');
          this.dialogRef.close(true); // Close with success
        },
        error: (err: any) => {
          this.loading = false; // Stop loading on error
          // Handle errors here
          console.error('Error creating invoice', err);
          this.toastr.error('Erreur lors de la création de la facture.');
        }
      });
    } else {
      this.taxeForm.markAllAsTouched();
      this.toastr.info('Veuillez remplir les champs obligatoires');
    }
  }
  //#endregion onSubmit

  //#region Generate Invoice Object 
  createInvoiceInstance(formValues: any): Document {
    let _user: any = null;
    let _holdingTax: any = null;
    let selectedTax: any = null;
    if (formValues.selectedTaxe != null) {
      selectedTax = this.appvariablesTaxes.find(taxe => taxe.id === formValues.selectedTaxe);
    } else {
      selectedTax = new AppVariable();
    }
    const newInvoice: Document = {
      id: 0,
      type: DocumentTypes.supplierInvoice,
      docnumber: '',
      description: '',
      supplierReference: formValues.supplierReference,
      stocktransactiontype: TransactionType.None,
      isinvoiced: false,
      merchandises: [],
      total_ht_net_doc: this.totalHTNet_invoice_doc$.value,
      total_discount_doc: this.totalRemise_invoice_doc$.value,
      total_tva_doc: this.totalTVA_invoice_doc$.value,
      total_net_ttc: this.netTTC_invoice_doc$.value,
      taxe: selectedTax,
      holdingtax: _holdingTax,
      withholdingtax: false,
      counterpart: this.allSelectedDocs.data[0].counterpart,
      sales_site: this.salesSite,
      creationdate: new Date(),
      updatedate: new Date(),
      updatedbyid: Number(this.userconnected?.id),
      appuser: _user,
      isdeleted: false,
      regulationid: 0,
      editing: false,
      docstatus: DocStatus.Created,
      billingstatus: BillingStatus.NotBilled,
      isservice: false
    }
    return newInvoice;
  }

  // docChildIds!: number[];
  createDocChildIds(): number[] {
    const docChildIds: number[] = []; // Initialize the array to store the IDs

    this.allSelectedDocs.data.forEach(element => {
      docChildIds.push(element.id); // Push each element's ID into the array
    });

    return docChildIds; // Return the populated array
  }
  //#endregion

  getSupplierName(): string {
    return this.allSelectedDocs.data[0].counterpart.name;
  }

  onCancel() {
    this.dialogRef.close(); // Simply close the modal without returning data
  }

  calculateTotals(data: Document[]): void {
    const totalHTNet = data.reduce((sum, item) => sum + item.total_ht_net_doc, 0);
    const totalRemise = data.reduce((sum, item) => sum + item.total_discount_doc, 0);
    const totalTVA = data.reduce((sum, item) => sum + item.total_tva_doc, 0);

    // Get the selected tax ID from the form
    const selectedTaxId = this.taxeForm.get('selectedTaxe')!.value;

    // Find the selected tax object from appvariablesTaxes
    const selectedTax = this.appvariablesTaxes.find(taxe => taxe.id === selectedTaxId);

    // Convert the tax value to a number (assuming it's a percentage or fixed amount)
    const taxValue = selectedTax ? parseFloat(selectedTax.value) : 0;

    // Calculate netTTC by adding the tax value
    const netTTC = data.reduce((sum, item) => sum + item.total_net_ttc, 0) + taxValue;

    console.log('Selected Taxe is ', selectedTaxId);
    console.log('Tax Value is ', taxValue);

    this.totalHTNet_invoice_doc$.next(totalHTNet);
    this.totalRemise_invoice_doc$.next(totalRemise);
    this.totalTVA_invoice_doc$.next(totalTVA);
    this.netTTC_invoice_doc$.next(netTTC);
  }

  getAllTaxes() {
    this.appvarService.GetAll('Taxe').subscribe({
      next: (response: any) => {
        this.appvariablesTaxes = response;

        // Find the default tax
        const defaultTax = this.appvariablesTaxes.find(taxe => taxe.isdefault === true);

        // If a default tax is found, set it as the value of the form control
        if (defaultTax) {
          this.taxeForm.get('selectedTaxe')!.setValue(defaultTax.id);
        }

        this.calculateTotals(this.allSelectedDocs.data);
      }
    });
  }

}
