import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { AccountingService } from '../../../services/components/accounting.service';
import { AccountStatement } from '../../../models/components/ledger';

@Component({
    selector: 'app-customer-account-modal',
    templateUrl: './customer-account-modal.component.html',
    styleUrls: ['./customer-account-modal.component.css']
})
export class CustomerAccountModalComponent implements OnInit {
    statement?: AccountStatement;
    loading = true;
    startDate: Date = new Date();
    endDate: Date = new Date();

    constructor(
        public dialogRef: MatDialogRef<CustomerAccountModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: CounterPart },
        private accountingService: AccountingService
    ) {
        this.startDate.setMonth(this.startDate.getMonth() - 1); // Default to last month
    }

    ngOnInit(): void {
        this.loadStatement();
    }

    loadStatement(): void {
        this.loading = true;
        this.accountingService.getStatement(this.data.customer.id, this.startDate, this.endDate)
            .subscribe({
                next: (res) => {
                    this.statement = res;
                    this.loading = false;
                },
                error: (err) => {
                    console.error(err);
                    this.loading = false;
                }
            });
    }

    onClose(): void {
        this.dialogRef.close();
    }

    formatDate(date: any): string {
        return new Date(date).toLocaleDateString('fr-FR');
    }
}
