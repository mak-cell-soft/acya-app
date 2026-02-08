import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DocStatus, Document, DocumentTypes } from '../../../../../models/components/document';
import { PaymentModalComponent } from '../../../../../dashboard/modals/payment-modal/payment-modal.component';
import { DocumentService } from '../../../../../services/components/document.service';
import { PaymentService } from '../../../../../services/components/payment.service';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { Payment } from '../../../../../models/components/payment';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AppVariableService } from '../../../../../services/configuration/app-variable.service';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { AppVariable } from '../../../../../models/configuration/appvariable';
import { CounterPart } from '../../../../../models/components/counterpart';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';

export interface DocumentConversionModalData {
    documents: Document[];
}

@Component({
    selector: 'app-document-conversion-modal',
    templateUrl: './document-conversion-modal.component.html',
    styleUrls: ['./document-conversion-modal.component.css']
})
export class DocumentConversionModalComponent implements OnInit {

    documents: Document[] = [];
    hasPayment: boolean = false;
    isConverting: boolean = false;
    isBatchMode: boolean = false;

    // Batch Mode Controls
    taxeForm!: FormGroup;
    searchCustomerControl = new FormControl('');
    filteredCustomers: CounterPart[] = [];
    allCustomers: CounterPart[] = [];
    appvariablesTaxes: AppVariable[] = [];
    selectedCustomer: CounterPart | null = null;

    // Services
    fb = inject(FormBuilder);
    appVarService = inject(AppVariableService);
    counterpartService = inject(CounterpartService);

    // Calculated totals for batch mode
    totalHT: number = 0;
    totalTTC: number = 0;
    totalTVA: number = 0;
    totalDiscount: number = 0;

    constructor(
        public dialogRef: MatDialogRef<DocumentConversionModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DocumentConversionModalData,
        private dialog: MatDialog,
        private docService: DocumentService,
        private paymentService: PaymentService,
        private authService: AuthenticationService,
        private toastr: ToastrService
    ) {
        this.documents = data.documents || [];
        this.isBatchMode = this.documents.length > 1;
    }

    ngOnInit(): void {
        if (this.isBatchMode) {
            this.createForm();
            this.getAllTaxes();
            this.getCustomers();
            this.searchCustomerControl.valueChanges.subscribe(() => this.applyCustomerFilter());

            // Listen for tax changes to recalculate totals
            this.taxeForm.get('selectedTaxe')?.valueChanges.subscribe(() => {
                this.calculateTotals();
            });
        }

        this.calculateTotals();
        this.checkPayments();
    }

    createForm() {
        this.taxeForm = this.fb.group({
            selectedTaxe: [null, Validators.required]
        });
    }

    getAllTaxes() {
        this.appVarService.GetAll('Taxe').subscribe({
            next: (response: any) => {
                this.appvariablesTaxes = response;
                // Find default tax
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
        this.counterpartService.GetAll(CounterPartType_FR.customer).subscribe({
            next: (response: any) => {
                this.allCustomers = response;
                this.filteredCustomers = this.allCustomers;
            },
            error: (err) => console.error('Error loading customers', err)
        });
    }

    applyCustomerFilter() {
        const filterValue = (this.searchCustomerControl.value || '').trim().toLowerCase();
        this.filteredCustomers = this.allCustomers.filter(customer =>
            (customer.firstname && customer.firstname.toLowerCase().includes(filterValue)) ||
            (customer.lastname && customer.lastname.toLowerCase().includes(filterValue)) ||
            (customer.name && customer.name.toLowerCase().includes(filterValue)) ||
            (customer.description && customer.description.toLowerCase().includes(filterValue))
        );
    }

    onOptionCustomerSelected(customerId: number) {
        this.selectedCustomer = this.allCustomers.find(c => c.id === customerId) || null;
    }

    calculateTotals() {
        this.totalHTNet_doc = this.documents.reduce((sum, doc) => sum + doc.total_ht_net_doc, 0);
        this.totalTVA_doc = this.documents.reduce((sum, doc) => sum + doc.total_tva_doc, 0);
        this.totalDiscount_doc = this.documents.reduce((sum, doc) => sum + doc.total_discount_doc, 0);

        // Base TTC from documents
        let baseTTC = this.documents.reduce((sum, doc) => sum + doc.total_net_ttc, 0);

        if (this.isBatchMode && this.taxeForm) {
            const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
            const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
            const taxValue = selectedTax ? parseFloat(selectedTax.value) : 0; // Assuming value is the amount to add, per reference implementation logic
            // NOTE: Reference implementation adds tax value directly to TTC. 
            // "const netTTC = data.reduce(...) + taxValue;"
            // This implies the tax is a fixed stamp duty or similar added to the final invoice total, not a percentage.

            this.totalTTC = baseTTC + taxValue;
        } else {
            this.totalTTC = baseTTC;
        }
    }

    // Helper properties to match template usage if needed, or update template to use these
    totalHTNet_doc: number = 0;
    totalTVA_doc: number = 0;
    totalDiscount_doc: number = 0;

    checkPayments() {
        // Check if any document has payment (for single mode) or all have payment (for batch)
        this.hasPayment = this.documents.some(doc => doc.billingstatus !== 1);
    }

    openPaymentModal() {
        // Payment modal only available in single-document mode
        if (this.isBatchMode) {
            this.toastr.info('Le paiement en mode batch n\'est pas supporté. Veuillez convertir puis payer individuellement.');
            return;
        }

        const doc = this.documents[0];
        const modalData = {
            documentId: doc.id,
            documentNumber: doc.docnumber,
            totalAmount: doc.total_net_ttc,
            remainingAmount: doc.total_net_ttc,
            ownerFullName: doc.counterpart?.name || doc.counterpart?.firstname + ' ' + doc.counterpart?.lastname || '',
            porterName: doc.counterpart?.name || doc.counterpart?.firstname + ' ' + doc.counterpart?.lastname || '',
            porterId: doc.counterpart?.id || 0,
            billingStatus: doc.billingstatus,
            documentType: doc.type
        };

        const dialogRef = this.dialog.open(PaymentModalComponent, {
            width: '600px',
            disableClose: true,
            data: modalData
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.savePayment(result);
            }
        });
    }

    savePayment(paymentResult: any) {
        const doc = this.documents[0];
        const payment = new Payment();
        payment.documentid = doc.id;
        payment.customerid = doc.counterpart.id;
        payment.paymentdate = paymentResult.date;
        payment.amount = paymentResult.amount;
        payment.paymentmethod = paymentResult.method;

        if (paymentResult.details) {
            if (paymentResult.method === 'ESPECE') {
                payment.notes = paymentResult.details.notes || '';
            } else if (paymentResult.method === 'VIREMENT' || paymentResult.method === 'CARTE') {
                payment.reference = paymentResult.details.reference || '';
                payment.notes = paymentResult.details.notes || '';
            } else {
                payment.reference = paymentResult.details.number || '';
                payment.notes = JSON.stringify(paymentResult.details);
            }
        }

        payment.createdat = new Date();
        payment.createdby = this.authService.getUserDetail()?.fullname || '';
        payment.updatedat = new Date();
        payment.updatedbyid = Number(this.authService.getUserDetail()?.id) || 0;

        this.paymentService.Add(payment).subscribe({
            next: (res) => {
                doc.total_net_ttc -= payment.amount;
                doc.billingstatus = 3; // Update status to at least partially billed
                this.toastr.success('Paiement effectué avec succès');
                this.hasPayment = true;
            },
            error: (err) => {
                console.error('Error saving payment', err);
                this.toastr.error('Erreur lors de l\'enregistrement du paiement');
            }
        });
    }

    onConvert() {
        this.isConverting = true;

        // Use first document as template for invoice header
        const firstDoc = this.documents[0];
        const newInvoice: Document = {
            ...firstDoc,
            deliveryNoteDocNumbers: []
        };

        // If batch mode, validation for required fields
        if (this.isBatchMode) {
            if (this.taxeForm.invalid) {
                this.toastr.warning('Veuillez sélectionner une taxe.');
                this.isConverting = false;
                return;
            }
            if (!this.selectedCustomer) {
                this.toastr.warning('Veuillez sélectionner un client.');
                this.isConverting = false;
                return;
            }

            // Assign selected customer
            newInvoice.counterpart = this.selectedCustomer;

            // Assign selected tax
            const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
            const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
            newInvoice.taxe = selectedTax ?? new AppVariable();
        }

        newInvoice.id = 0; // Reset ID for new document
        newInvoice.type = DocumentTypes.customerInvoice; // Set type to Customer Invoice
        newInvoice.docnumber = ''; // Allow backend to generate new number
        newInvoice.creationdate = new Date();
        newInvoice.updatedate = new Date();
        newInvoice.docstatus = DocStatus.Confirmed;

        // Use calculated totals for batch mode
        if (this.isBatchMode) {
            newInvoice.total_ht_net_doc = this.totalHTNet_doc;
            newInvoice.total_net_ttc = this.totalTTC;
            newInvoice.total_tva_doc = this.totalTVA_doc;
            newInvoice.total_discount_doc = this.totalDiscount_doc;
        }

        // Collect all document IDs for the invoice relationship
        const docChildrenIds = this.documents.map(doc => doc.id);

        const invoiceModel = {
            invoiceDoc: newInvoice,
            docChildrenIds: docChildrenIds
        };

        this.docService.CreateInvoice(invoiceModel).subscribe({
            next: () => {
                const message = this.isBatchMode
                    ? `Conversion de ${this.documents.length} documents réussie`
                    : 'Conversion réussie';
                this.toastr.success(message);
                // Close modal and return true to refresh list
                this.dialogRef.close(true);
            },
            error: (err) => {
                console.error('Conversion error:', err);
                this.toastr.error('Erreur lors de la conversion');
                this.isConverting = false;
            }
        });
    }

    onCancel() {
        this.dialogRef.close(false);
    }
}
