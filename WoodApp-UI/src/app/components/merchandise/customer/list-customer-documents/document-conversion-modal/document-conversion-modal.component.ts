import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Document, DocumentTypes } from '../../../../../models/components/document';
import { PaymentModalComponent } from '../../../../../dashboard/modals/payment-modal/payment-modal.component';
import { DocumentService } from '../../../../../services/components/document.service';
import { PaymentService } from '../../../../../services/components/payment.service';
import { AuthenticationService } from '../../../../../services/components/authentication.service';
import { Payment } from '../../../../../models/components/payment';
import { ToastrService } from 'ngx-toastr';

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
        this.calculateTotals();
        this.checkPayments();
    }

    calculateTotals() {
        this.totalHT = this.documents.reduce((sum, doc) => sum + doc.total_ht_net_doc, 0);
        this.totalTTC = this.documents.reduce((sum, doc) => sum + doc.total_net_ttc, 0);
        this.totalTVA = this.documents.reduce((sum, doc) => sum + doc.total_tva_doc, 0);
        this.totalDiscount = this.documents.reduce((sum, doc) => sum + doc.total_discount_doc, 0);
    }

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
        const newInvoice: Document = { ...firstDoc };
        newInvoice.id = 0; // Reset ID for new document
        newInvoice.type = DocumentTypes.customerInvoice; // Set type to Customer Invoice
        newInvoice.docnumber = ''; // Allow backend to generate new number
        newInvoice.creationdate = new Date();
        newInvoice.updatedate = new Date();

        // Use calculated totals for batch mode
        if (this.isBatchMode) {
            newInvoice.total_ht_net_doc = this.totalHT;
            newInvoice.total_net_ttc = this.totalTTC;
            newInvoice.total_tva_doc = this.totalTVA;
            newInvoice.total_discount_doc = this.totalDiscount;
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
