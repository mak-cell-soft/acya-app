import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaymentInstrument, PaymentInstrumentType, PaymentState } from '../../../../models/components/document';
// Adjust path if necessary, assuming shared folder structure exists
import { BANKS_TN } from '../../../constants/modals/bank_modal';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../Text_Buttons';
import { PaymentService } from '../../../../services/components/payment.service';
import { finalize } from 'rxjs';

export interface PaymentModalData {
    documentId: number;
    documentNumber: string;
    totalAmount: number;
    totalNetPayable?: number;
    withholdingtax?: boolean;
    remainingAmount: number;
    // Credit notes (Avoirs financiers) already applied to this invoice
    totalCreditNotes?: number;
    ownerFullName: string;
    porterName: string;
    porterId: number;
    billingStatus: number;
    documentType: number;
}

@Component({
    selector: 'app-payment-modal',
    templateUrl: './payment-modal.component.html',
    styleUrl: './payment-modal.component.scss'
})
export class PaymentModalComponent implements OnInit {
    paymentForm: FormGroup;
    selectedPaymentMethod: 'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE' = 'ESPECE';
    isLoading: boolean = false;
    // Guard against double-click on confirm button
    isSubmitting: boolean = false;

    abort_button_text: string = ABORT_BUTTON;
    register_button_text: string = REGISTER_BUTTON;

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
        private fb: FormBuilder,
        private paymentService: PaymentService
    ) {
        this.paymentForm = this.fb.group({
            // Common fields or Cash specific fields
            amount: [this.data.remainingAmount?.toFixed(3) || '0.000', [Validators.required, Validators.min(0)]],
            paymentDate: [new Date(), Validators.required],
            reference: [''], // For Virement/Carte
            notes: ['']
        });
    }

    ngOnInit(): void {
        this.calculateRemainingAmount();
    }

    calculateRemainingAmount(): void {
        this.isLoading = true;
        this.paymentService.GetByDocumentId(this.data.documentId)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: (payments) => {
                    const totalPaid = (payments || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
                    // Credit notes (Avoirs financiers) already applied to this invoice
                    const totalCreditNotes = this.data.totalCreditNotes || 0;
                    // If RS is applied, target the net payable amount, otherwise target total TTC
                    const targetTotal = (this.data.withholdingtax && this.data.totalNetPayable)
                        ? this.data.totalNetPayable
                        : this.data.totalAmount;
                    // Remaining = Net payable - cash payments already made - credit notes applied
                    this.data.remainingAmount = Number((Number(targetTotal) - totalPaid - totalCreditNotes).toFixed(3));
                    // Clamp to zero (cannot go negative)
                    if (this.data.remainingAmount < 0) this.data.remainingAmount = 0;

                    // Add validator for maximum amount (cannot pay more than remaining balance)
                    this.paymentForm.get('amount')?.setValidators([
                        Validators.required,
                        Validators.min(0.001),
                        Validators.max(this.data.remainingAmount)
                    ]);

                    // Pre-fill form with the calculated remaining amount
                    const suggestedAmount = this.data.remainingAmount > 0 ? this.data.remainingAmount.toFixed(3) : '0.000';
                    this.paymentForm.patchValue({ amount: suggestedAmount });
                    this.paymentForm.get('amount')?.updateValueAndValidity();
                },
                error: (err) => {
                    console.error('Error fetching payments for remaining amount calculation:', err);
                }
            });
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
        // Guard: block if form invalid, balance still loading, or already submitted
        if (!this.isValid() || this.isLoading || this.isSubmitting) return;

        // Lock the button immediately to prevent double-click
        this.isSubmitting = true;

        let result: any = {
            method: this.selectedPaymentMethod,
            date: this.paymentForm.get('paymentDate')?.value,
            amount: Number(Number(this.paymentForm.get('amount')?.value).toFixed(3))
        };

        if (this.selectedPaymentMethod === 'CHEQUE' && this.chequeFormGroup) {
            result.details = this.chequeFormGroup.value;
            if (result.details.amount) result.amount = Number(Number(result.details.amount).toFixed(3));
            if (result.details.paymentDate) result.date = result.details.paymentDate;
        } else if (this.selectedPaymentMethod === 'TRAITE' && this.traiteFormGroup) {
            result.details = this.traiteFormGroup.value;
            if (result.details.amount) result.amount = Number(Number(result.details.amount).toFixed(3));
            if (result.details.paymentDate) result.date = result.details.paymentDate;
        } else if (this.selectedPaymentMethod === 'VIREMENT' || this.selectedPaymentMethod === 'CARTE') {
            result.details = {
                reference: this.paymentForm.get('reference')?.value,
                notes: this.paymentForm.get('notes')?.value
            };
        } else {
            // Cash / Espèce
            result.details = {
                notes: this.paymentForm.get('notes')?.value
            };
        }

        // Artificial delay to show "Traitement..." state and ensure the user sees the confirmation
        setTimeout(() => {
            this.dialogRef.close(result);
        }, 800);
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

    getMethodIcon(method: string): string {
        switch (method) {
            case 'ESPECE': return 'payments';
            case 'CHEQUE': return 'money';
            case 'TRAITE': return 'description';
            case 'VIREMENT': return 'account_balance';
            case 'CARTE': return 'credit_card';
            default: return 'payment';
        }
    }

    isGenericMethod(): boolean {
        return ['ESPECE', 'VIREMENT', 'CARTE'].includes(this.selectedPaymentMethod);
    }
}
