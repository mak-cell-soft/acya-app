import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { AccountingService } from '../../../services/components/accounting.service';
import { AccountStatement } from '../../../models/components/ledger';
import { DocTypes_FR } from '../../../models/components/document';

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
    docTypes_FR = DocTypes_FR;

    constructor(
        public dialogRef: MatDialogRef<CustomerAccountModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: CounterPart },
        private accountingService: AccountingService
    ) {
        const today = new Date();
        this.endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        this.startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        console.log("account customer", this.data.customer);
        console.log("start date", this.startDate, "end date", this.endDate);
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

    getDocTypeLabel(type: string): string {
        const key = type as keyof typeof DocTypes_FR;
        const normalizedKey = (type.charAt(0).toLowerCase() + type.slice(1)) as keyof typeof DocTypes_FR;
        return this.docTypes_FR[key] || this.docTypes_FR[normalizedKey] || type;
    }
}
