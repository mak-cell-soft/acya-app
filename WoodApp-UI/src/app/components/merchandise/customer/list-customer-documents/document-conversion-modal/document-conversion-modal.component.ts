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
    document: Document;
}

@Component({
    selector: 'app-document-conversion-modal',
    templateUrl: './document-conversion-modal.component.html',
    styleUrls: ['./document-conversion-modal.component.css']
})
export class DocumentConversionModalComponent implements OnInit {

    document!: Document;
    hasPayment: boolean = false;
    isConverting: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<DocumentConversionModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DocumentConversionModalData,
        private dialog: MatDialog,
        private docService: DocumentService,
        private paymentService: PaymentService,
        private authService: AuthenticationService,
        private toastr: ToastrService
    ) {
        this.document = data.document;
    }

    ngOnInit(): void {
        this.checkPayments();
    }

    checkPayments() {
        // 1 = NotBilled, 2 = Billed, 3 = PartiallyBilled
        this.hasPayment = this.document.billingstatus !== 1;
    }

    openPaymentModal() {
        const modalData = {
            documentId: this.document.id,
            documentNumber: this.document.docnumber,
            totalAmount: this.document.total_net_ttc,
            remainingAmount: this.document.total_net_ttc,
            ownerFullName: this.document.counterpart?.name || this.document.counterpart?.firstname + ' ' + this.document.counterpart?.lastname || '',
            porterName: this.document.counterpart?.name || this.document.counterpart?.firstname + ' ' + this.document.counterpart?.lastname || '',
            porterId: this.document.counterpart?.id || 0,
            billingStatus: this.document.billingstatus,
            documentType: this.document.type
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
        const payment = new Payment();
        payment.documentid = this.document.id;
        payment.customerid = this.document.counterpart.id;
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
                this.document.total_net_ttc -= payment.amount;
                this.document.billingstatus = 3; // Update status to at least partially billed
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

        // Create the new invoice object (clone of the current document)
        const newInvoice: Document = { ...this.document };
        newInvoice.id = 0; // Reset ID for new document
        newInvoice.type = DocumentTypes.customerInvoice; // Set type to Customer Invoice
        newInvoice.docnumber = ''; // Allow backend to generate new number
        newInvoice.creationdate = new Date();
        newInvoice.updatedate = new Date();
        // Assuming backend handles stock transaction type logic for Invoices (usually no movement if coming from Delivery Note)
        // Constraint: "Do NOT update stock levels during this conversion"

        const invoiceModel = {
            invoiceDoc: newInvoice,
            docChildrenIds: [this.document.id]
        };

        this.docService.CreateInvoice(invoiceModel).subscribe({
            next: () => {
                this.toastr.success('Conversion réussie');
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
