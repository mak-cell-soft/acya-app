import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaymentInstrument, PaymentInstrumentType, PaymentState } from '../../../models/components/document';
// Adjust path if necessary, assuming shared folder structure exists
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';

export interface PaymentModalData {
    documentId: number;
    documentNumber: string;
    totalAmount: number;
    remainingAmount: number;
    ownerFullName: string;
    porterName: string;
    porterId: number;
    billingStatus: number;
    documentType: number;
}

@Component({
    selector: 'app-payment-modal',
    templateUrl: './payment-modal.component.html',
    styleUrls: ['./payment-modal.component.css']
})
export class PaymentModalComponent implements OnInit {
    paymentForm: FormGroup;
    selectedPaymentMethod: 'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE' = 'ESPECE';

    // Payment methods for selection
    paymentMethods = [
        { value: 'ESPECE', label: 'Espèce', icon: 'money_bill' }, // Using local material icons or fontawesome if available
        { value: 'CHEQUE', label: 'Chèque', icon: 'payment' },
        { value: 'TRAITE', label: 'Traite', icon: 'receipt' },
        { value: 'VIREMENT', label: 'Virement', icon: 'receipt' },
        { value: 'CARTE', label: 'Carte', icon: 'receipt' }
    ];

    // Forms for validaton tracking
    chequeFormGroup: FormGroup | null = null;
    traiteFormGroup: FormGroup | null = null;

    constructor(
        public dialogRef: MatDialogRef<PaymentModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PaymentModalData,
        private fb: FormBuilder
    ) {
        this.paymentForm = this.fb.group({
            // Common fields or Cash specific fields
            amount: [this.data.remainingAmount, [Validators.required, Validators.min(0)]],
            paymentDate: [new Date(), Validators.required],
            reference: [''], // For Virement/Carte
            notes: ['']
        });
    }

    ngOnInit(): void {
    }

    onPaymentMethodChange(method: string): void {
        this.selectedPaymentMethod = method as 'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE';
        // Reset validity check logic if needed
    }

    // Receives form from child component
    onCustomFormReady(form: FormGroup, type: 'CHEQUE' | 'TRAITE') {
        if (type === 'CHEQUE') {
            this.chequeFormGroup = form;
        } else {
            this.traiteFormGroup = form;
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        if (!this.isValid()) return;

        let result: any = {
            method: this.selectedPaymentMethod,
            amount: this.paymentForm.get('amount')?.value,
            date: this.paymentForm.get('paymentDate')?.value,
        };

        if (this.selectedPaymentMethod === 'CHEQUE' && this.chequeFormGroup) {
            result.details = this.chequeFormGroup.value;
        } else if (this.selectedPaymentMethod === 'TRAITE' && this.traiteFormGroup) {
            result.details = this.traiteFormGroup.value;
        } else if (this.selectedPaymentMethod === 'VIREMENT' || this.selectedPaymentMethod === 'CARTE') {
            result.details = {
                reference: this.paymentForm.get('reference')?.value,
                notes: this.paymentForm.get('notes')?.value
            };
        } else {
            // Cash
            result.details = {
                notes: this.paymentForm.get('notes')?.value
            };
        }

        this.dialogRef.close(result);
    }

    isValid(): boolean {
        if (this.selectedPaymentMethod === 'ESPECE' || this.selectedPaymentMethod === 'VIREMENT' || this.selectedPaymentMethod === 'CARTE') {
            return this.paymentForm.valid;
        } else if (this.selectedPaymentMethod === 'CHEQUE') {
            return this.chequeFormGroup ? this.chequeFormGroup.valid : false;
        } else if (this.selectedPaymentMethod === 'TRAITE') {
            return this.traiteFormGroup ? this.traiteFormGroup.valid : false;
        }
        return false;
    }
}
