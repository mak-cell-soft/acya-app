import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BANKS_TN } from '../../../../../constants/modals/bank_modal';
import { PaymentService } from '../../../../../../services/components/payment.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-traite-payment-form',
    templateUrl: './traite-payment-form.component.html',
    styleUrl: './traite-payment-form.component.scss'
})
export class TraitePaymentFormComponent implements OnInit, OnDestroy {
    @Input() ownerName: string = '';
    @Input() porterId: number = 0;
    @Input() porterName: string = '';
    @Input() defaultAmount: number = 0;
    @Output() formReady = new EventEmitter<FormGroup>();

    paymentForm: FormGroup;
    bankOptions = BANKS_TN.sort((a, b) => a.key.localeCompare(b.key));
    existingEcheance: any = null;
    private destroy$ = new Subject<void>();

    constructor(private fb: FormBuilder, private paymentService: PaymentService) {
        this.paymentForm = this.fb.group({
            number: ['', Validators.required],
            bank: ['', Validators.required],
            owner: ['', Validators.required],
            porter: ['', Validators.required],
            amount: [0, [Validators.required, Validators.min(0.001)]],
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

        this.formReady.emit(this.paymentForm);

        // Watch for DueDate changes with debounce to avoid spamming the API
        this.paymentForm.get('dueDate')?.valueChanges.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(date => {
            if (date) {
                this.checkEcheances(date);
            }
        });

        // Initial check
        const initialDate = this.paymentForm.get('dueDate')?.value;
        if (initialDate) {
            this.checkEcheances(initialDate);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    checkEcheances(date: any) {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return;

        const start = new Date(d);
        start.setHours(0,0,0,0);
        const end = new Date(d);
        end.setHours(23,59,59,999);

        this.paymentService.GetEcheances(start, end).pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                this.existingEcheance = (data && data.length > 0) ? data[0] : null;
            },
            error: () => {
                this.existingEcheance = null;
            }
        });
    }
}
