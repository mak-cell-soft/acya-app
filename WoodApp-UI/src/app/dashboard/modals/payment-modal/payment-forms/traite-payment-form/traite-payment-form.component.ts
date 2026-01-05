import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BANKS_TN } from '../../../../../shared/constants/modals/bank_modal';

@Component({
    selector: 'app-traite-payment-form',
    templateUrl: './traite-payment-form.component.html',
    styleUrls: ['./traite-payment-form.component.css']
})
export class TraitePaymentFormComponent implements OnInit {
    @Input() ownerName: string = '';
    @Input() porterId: number = 0;
    @Input() porterName: string = '';
    @Input() defaultAmount: number = 0;
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
            porter: this.porterId,
            amount: this.defaultAmount
        });

        this.formReady.emit(this.paymentForm);
    }
}
