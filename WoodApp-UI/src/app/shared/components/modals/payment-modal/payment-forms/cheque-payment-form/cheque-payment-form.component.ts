import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BANKS_TN } from '../../../../../constants/modals/bank_modal';

@Component({
    selector: 'app-cheque-payment-form',
    templateUrl: './cheque-payment-form.component.html',
    styleUrl: './cheque-payment-form.component.scss'
})
export class ChequePaymentFormComponent implements OnInit {
    @Input() ownerName: string = '';
    @Input() porterId: number = 0;
    @Input() porterName: string = '';
    @Input() defaultAmount: number = 0;
    @Input() prefillInstrument?: any;
    @Output() formReady = new EventEmitter<FormGroup>();

    paymentForm: FormGroup;
    bankOptions = BANKS_TN.sort((a, b) => a.key.localeCompare(b.key));

    constructor(private fb: FormBuilder) {
        this.paymentForm = this.fb.group({
            number: ['', Validators.required],
            bank: ['', Validators.required],
            owner: ['', Validators.required],
            porter: ['', Validators.required],
            amount: [0, [Validators.required, Validators.min(0)]],
            paymentDate: [new Date(), Validators.required],
            dueDate: [new Date(), Validators.required],
            expirationDate: [new Date(), Validators.required]
        });
    }

    ngOnInit(): void {
        // Initialize defaults
        this.paymentForm.patchValue({
            owner: this.ownerName,
            porter: this.porterName || 'Moi-même', 
            amount: this.defaultAmount?.toFixed(3) || '0.000'
        });

        if (this.prefillInstrument) {
            this.paymentForm.patchValue({
                number: this.prefillInstrument.instrumentNumber,
                bank: this.prefillInstrument.bank,
                owner: this.prefillInstrument.owner,
                porter: this.prefillInstrument.porter,
                amount: this.prefillInstrument.amount?.toFixed(3) || this.defaultAmount?.toFixed(3),
                paymentDate: this.prefillInstrument.issueDate ? new Date(this.prefillInstrument.issueDate) : new Date(),
                dueDate: this.prefillInstrument.dueDate ? new Date(this.prefillInstrument.dueDate) : new Date(),
                expirationDate: this.prefillInstrument.expirationDate ? new Date(this.prefillInstrument.expirationDate) : new Date()
            });
        }

        // Emit Form immediately so parent can track validity
        this.formReady.emit(this.paymentForm);
    }
}
