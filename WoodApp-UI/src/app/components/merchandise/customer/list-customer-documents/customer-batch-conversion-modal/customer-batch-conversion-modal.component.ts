import { Component, OnInit, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Document, DocumentTypes, DocStatus } from '../../../../../models/components/document';
import { CounterPart } from '../../../../../models/components/counterpart';
import { AppVariable } from '../../../../../models/configuration/appvariable';
import { DocumentService } from '../../../../../services/components/document.service';
import { AppVariableService } from '../../../../../services/configuration/app-variable.service';
import { CounterpartService } from '../../../../../services/components/counterpart.service';
import { ToastrService } from 'ngx-toastr';
import { CounterPartType_FR } from '../../../../../shared/constants/list_of_constants';
import { SelectionModel } from '@angular/cdk/collections';
import { startOfMonth, endOfMonth } from 'date-fns';
import { DocumentDetailModalComponent } from '../document-detail-modal/document-detail-modal.component';

@Component({
    selector: 'app-customer-batch-conversion-modal',
    templateUrl: './customer-batch-conversion-modal.component.html',
    styleUrls: ['./customer-batch-conversion-modal.component.css']
})
export class CustomerBatchConversionModalComponent implements OnInit {

    // Form and Controls
    searchCustomerControl = new FormControl('');
    dateRangeForm = new FormGroup({
        start: new FormControl<Date | null>(startOfMonth(new Date())),
        end: new FormControl<Date | null>(endOfMonth(new Date()))
    });
    taxeForm!: FormGroup;

    // Data
    allCustomers: CounterPart[] = [];
    filteredCustomers: CounterPart[] = [];
    selectedCustomer: CounterPart | null = null;
    appvariablesTaxes: AppVariable[] = [];

    deliveryNotes: Document[] = [];
    selection = new SelectionModel<Document>(true, []);

    // State
    isLoading = false;
    isConverting = false;

    // Totals
    totalHTNet_doc: number = 0;
    totalTVA_doc: number = 0;
    totalDiscount_doc: number = 0;
    totalTTC: number = 0;

    // Services
    private fb = inject(FormBuilder);
    private docService = inject(DocumentService);
    private appVarService = inject(AppVariableService);
    private counterpartService = inject(CounterpartService);
    private toastr = inject(ToastrService);
    private dialog = inject(MatDialog);
    public dialogRef = inject(MatDialogRef<CustomerBatchConversionModalComponent>);

    ngOnInit(): void {
        this.createTaxeForm();
        this.getAllTaxes();
        this.getCustomers();

        this.searchCustomerControl.valueChanges.subscribe(() => this.applyCustomerFilter());

        // Listen for date range changes
        this.dateRangeForm.valueChanges.subscribe(() => {
            if (this.selectedCustomer && this.dateRangeForm.valid) {
                this.fetchDeliveryNotes();
            }
        });

        // Listen for tax changes to recalculate totals
        this.taxeForm.get('selectedTaxe')?.valueChanges.subscribe(() => {
            this.calculateTotals();
        });
    }

    createTaxeForm() {
        this.taxeForm = this.fb.group({
            selectedTaxe: [null, Validators.required]
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
            }
        });
    }

    getCustomers() {
        this.counterpartService.GetAll(CounterPartType_FR.customer).subscribe({
            next: (response: any) => {
                this.allCustomers = response;
                this.filteredCustomers = this.allCustomers;
            }
        });
    }

    applyCustomerFilter() {
        const value = this.searchCustomerControl.value as any;
        const filterValue = (typeof value === 'string' ? value : (value?.name || '')).toLowerCase();

        this.filteredCustomers = this.allCustomers.filter(customer =>
            (customer.firstname && customer.firstname.toLowerCase().includes(filterValue)) ||
            (customer.lastname && customer.lastname.toLowerCase().includes(filterValue)) ||
            (customer.name && customer.name.toLowerCase().includes(filterValue)) ||
            (customer.description && customer.description.toLowerCase().includes(filterValue))
        );
    }

    displayCustomer(customer: CounterPart): string {
        if (!customer) return '';
        return customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim();
    }

    onCustomerSelected(customer: CounterPart) {
        this.selectedCustomer = customer;
        if (this.selectedCustomer) {
            this.fetchDeliveryNotes();
        }
    }

    clearCustomerSelection(event: Event) {
        event.stopPropagation();
        this.selectedCustomer = null;
        this.searchCustomerControl.setValue('');
        this.deliveryNotes = [];
        this.selection.clear();
        this.calculateTotals();
    }

    fetchDeliveryNotes() {
        if (!this.selectedCustomer) return;

        this.isLoading = true;
        this.deliveryNotes = [];
        this.selection.clear();

        const startDate = this.dateRangeForm.get('start')?.value;
        const endDate = this.dateRangeForm.get('end')?.value;

        this.docService.GetByType(DocumentTypes.customerDeliveryNote).subscribe({
            next: (response: Document[]) => {
                // Filter by customer and date range, and non-invoiced
                this.deliveryNotes = response.filter(doc => {
                    const docDate = new Date(doc.updatedate);
                    const isSameCustomer = doc.counterpart.id === this.selectedCustomer?.id;
                    const notInvoiced = !doc.isinvoiced;
                    const withinRange = (!startDate || docDate >= startDate) && (!endDate || docDate <= endDate);

                    return isSameCustomer && notInvoiced && withinRange;
                });

                this.deliveryNotes.sort((a, b) => new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime());
                this.isLoading = false;
                this.calculateTotals();
            },
            error: (err) => {
                console.error('Error fetching delivery notes', err);
                this.toastr.error('Erreur lors de la récupération des bons de livraison');
                this.isLoading = false;
            }
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.deliveryNotes.length;
        return numSelected === numRows && numRows > 0;
    }

    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.deliveryNotes.forEach(row => this.selection.select(row));
        this.calculateTotals();
    }

    toggleRow(row: Document) {
        this.selection.toggle(row);
        this.calculateTotals();
    }

    calculateTotals() {
        const selectedDocs = this.selection.selected;
        this.totalHTNet_doc = selectedDocs.reduce((sum, doc) => sum + doc.total_ht_net_doc, 0);
        this.totalTVA_doc = selectedDocs.reduce((sum, doc) => sum + doc.total_tva_doc, 0);
        this.totalDiscount_doc = selectedDocs.reduce((sum, doc) => sum + (doc.total_discount_doc || 0), 0);

        let baseTTC = selectedDocs.reduce((sum, doc) => sum + doc.total_net_ttc, 0);
        let taxValue = 0;

        if (this.taxeForm) {
            const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
            const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
            taxValue = selectedTax ? parseFloat(selectedTax.value) : 0;
        }

        this.totalTTC = baseTTC + taxValue;
    }

    viewDetails(doc: Document) {
        this.dialog.open(DocumentDetailModalComponent, {
            width: '800px',
            maxHeight: '90vh',
            data: doc
        });
    }

    onConvert() {
        if (this.selection.selected.length === 0) {
            this.toastr.warning('Veuillez sélectionner au moins un bon de livraison.');
            return;
        }

        if (this.taxeForm.invalid) {
            this.toastr.warning('Veuillez sélectionner une taxe.');
            return;
        }

        this.isConverting = true;

        const firstDoc = this.selection.selected[0];
        const newInvoice: Document = {
            ...firstDoc,
            deliveryNoteDocNumbers: []
        };

        newInvoice.id = 0;
        newInvoice.type = DocumentTypes.customerInvoice;
        newInvoice.docnumber = '';
        newInvoice.creationdate = new Date();
        newInvoice.updatedate = new Date();
        newInvoice.docstatus = DocStatus.Confirmed;
        newInvoice.isinvoiced = false;
        newInvoice.isservice = false;

        newInvoice.counterpart = this.selectedCustomer!;

        const selectedTaxId = this.taxeForm.get('selectedTaxe')?.value;
        const selectedTax = this.appvariablesTaxes.find(t => t.id === selectedTaxId);
        newInvoice.taxe = selectedTax ?? new AppVariable();

        newInvoice.total_ht_net_doc = this.totalHTNet_doc;
        newInvoice.total_net_ttc = this.totalTTC;
        newInvoice.total_tva_doc = this.totalTVA_doc;
        newInvoice.total_discount_doc = this.totalDiscount_doc;

        const docChildrenIds = this.selection.selected.map(doc => doc.id);

        const invoiceModel = {
            invoiceDoc: newInvoice,
            docChildrenIds: docChildrenIds
        };

        this.docService.CreateInvoice(invoiceModel).subscribe({
            next: () => {
                this.toastr.success(`Conversion de ${docChildrenIds.length} documents réussie`);
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
