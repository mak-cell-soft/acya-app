import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DocumentService } from '../../../../services/components/document.service';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterPartType_FR } from '../../../../shared/constants/list_of_constants';
import { Document, DocumentTypes, DocStatus, BillingStatus } from '../../../../models/components/document';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { AppVariable } from '../../../../models/configuration/appvariable';

@Component({
  selector: 'app-add-credit-note-dialog',
  templateUrl: './add-credit-note-dialog.component.html',
  styleUrl: './add-credit-note-dialog.component.css'
})
export class AddCreditNoteDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  
  suppliers: CounterPart[] = [];
  invoices: Document[] = [];
  selectedInvoice: Document | null = null;
  tvas: AppVariable[] = [];
  
  user = inject(AuthenticationService).getUserDetail();

  constructor(
    private fb: FormBuilder,
    private docService: DocumentService,
    private counterpartService: CounterpartService,
    private appVarService: AppVariableService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<AddCreditNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: 'supplier' | 'customer' }
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadTVAs();
    
    // Listen to supplier changes to load their invoices
    this.form.get('counterpart')?.valueChanges.subscribe(supplier => {
      if (supplier) {
        this.loadInvoices(supplier.id);
      } else {
        this.invoices = [];
        this.selectedInvoice = null;
        this.form.get('parentInvoice')?.setValue(null);
      }
    });

    // Listen to invoice changes to show details and update description
    this.form.get('parentInvoice')?.valueChanges.subscribe((invoice: Document) => {
      this.selectedInvoice = invoice;
      this.updateAutoDescription();
      if (invoice) {
        // Reset discount to trigger recalculation if needed
        this.calculateTotals();
      }
    });

    // Auto-calculate totals on percentage change
    this.form.get('discountPercentage')?.valueChanges.subscribe(() => {
      this.calculateTotals();
      this.updateAutoDescription();
    });

    // Auto-calculate totals on manual HT change
    this.form.get('amountHT')?.valueChanges.subscribe((val) => {
      if (this.form.get('amountHT')?.dirty && !this.isCalculating) {
         this.calculateTotals(true);
      }
    });
  }

  isCalculating = false;

  createForm() {
    this.form = this.fb.group({
      counterpart: [null, Validators.required],
      parentInvoice: [null],
      description: ['', Validators.required],
      discountPercentage: [0, [Validators.min(0), Validators.max(100)]],
      amountHT: [0, [Validators.required, Validators.min(0.001)]],
      amountTVA: [0],
      amountTTC: [{ value: 0, disabled: true }]
    });
  }

  loadSuppliers() {
    const type = this.data.type === 'supplier' ? CounterPartType_FR.supplier : CounterPartType_FR.customer;
    this.counterpartService.GetAll(type).subscribe(res => {
      this.suppliers = res;
    });
  }

  loadTVAs() {
    this.appVarService.GetAll('TVA').subscribe(res => {
      this.tvas = res;
      // Set default TVA if available (e.g. 19%)
      const defaultTva = res.find(t => t.value === '19' || t.value === '19%');
      if (defaultTva) this.form.get('tva')?.setValue(defaultTva);
    });
  }

  loadInvoices(supplierId: number) {
    const docType = this.data.type === 'supplier' ? DocumentTypes.supplierInvoice : DocumentTypes.customerInvoice;
    this.docService.GetByType(docType).subscribe(res => {
      this.invoices = res.filter(d => d.counterpart?.id === supplierId);
    });
  }

  updateAutoDescription() {
    const invoice = this.form.get('parentInvoice')?.value as Document;
    const discount = this.form.get('discountPercentage')?.value || 0;
    
    if (invoice) {
      const desc = `Avoir de la Facture numéro ${invoice.docnumber} sur Achat au comptant ${discount}%`;
      this.form.get('description')?.setValue(desc, { emitEvent: false });
    }
  }

  calculateTotals(isManualHT = false) {
    this.isCalculating = true;
    const invoice = this.form.get('parentInvoice')?.value as Document;
    let ht = this.form.get('amountHT')?.value || 0;
    const discountPercent = this.form.get('discountPercentage')?.value || 0;

    if (invoice && !isManualHT) {
      // Calculate HT based on percentage of invoice HT
      const invoiceHT = invoice.total_ht_net_doc || 0;
      ht = (invoiceHT * discountPercent) / 100;
      this.form.get('amountHT')?.setValue(ht, { emitEvent: false });
    }

    // Determine TVA rate from invoice or default
    let tvaRate = 0;
    if (invoice && invoice.total_ht_net_doc > 0) {
      tvaRate = (invoice.total_tva_doc || 0) / invoice.total_ht_net_doc;
    } else {
      // Fallback to default 19% if no invoice
      tvaRate = 0.19;
    }
    
    const tvaAmount = ht * tvaRate;
    const ttc = ht + tvaAmount;

    this.form.get('amountTVA')?.setValue(tvaAmount, { emitEvent: false });
    this.form.get('amountTTC')?.setValue(ttc, { emitEvent: false });
    this.isCalculating = false;
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const formValue = this.form.getRawValue();
    const parentInvoice = formValue.parentInvoice as Document;

    const creditNote: any = {
      id: 0,
      type: this.data.type === 'supplier' ? DocumentTypes.supplierInvoiceReturn : DocumentTypes.customerInvoiceReturn,
      docnumber: '', 
      description: formValue.description,
      isinvoiced: true,
      isservice: true, 
      counterpart: formValue.counterpart,
      total_ht_net_doc: formValue.amountHT,
      total_tva_doc: formValue.amountTVA,
      total_net_ttc: formValue.amountTTC,
      total_net_payable: formValue.amountTTC,
      updatedbyid: this.user?.id ? +this.user.id : 0,
      creationdate: new Date(),
      updatedate: new Date(),
      docstatus: DocStatus.Created,
      billingstatus: BillingStatus.NotBilled,
      isdeleted: false,
      merchandises: [],
      sales_site: parentInvoice.sales_site
    };

    if (parentInvoice) {
      this.docService.CreateCreditNote(parentInvoice.id, creditNote).subscribe({
        next: () => {
          this.toastr.success('Avoir créé avec succès');
          this.dialogRef.close(true);
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erreur lors de la création de l\'avoir');
          this.loading = false;
        }
      });
    } else {
      // Manual creation without parent invoice link (if allowed)
      this.docService.Add(creditNote).subscribe({
        next: () => {
          this.toastr.success('Avoir créé avec succès');
          this.dialogRef.close(true);
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Erreur lors de la création de l\'avoir');
          this.loading = false;
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
