import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { CounterPartActivities_FR } from '../../../shared/constants/list_of_constants';

@Component({
    selector: 'app-customer-details-modal',
    templateUrl: './customer-details-modal.component.html',
    styleUrls: ['./customer-details-modal.component.css']
})
export class CustomerDetailsModalComponent {
    constructor(
        public dialogRef: MatDialogRef<CustomerDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: CounterPart }
    ) { }

    onClose(): void {
        this.dialogRef.close();
    }

    getCounterPartJobTitleValue(_k: string): string {
        const key = Number(_k);
        const mapping = CounterPartActivities_FR.reduce(
            (acc, activity) => ({ ...acc, [activity.key]: activity.value }),
            {} as { [key: number]: string }
        );
        return mapping[key] || '** Non Connue **';
    }

    getFullName(): string {
        const element = this.data.customer;
        if (element.prefix === 'MRS' || element.prefix === 'MME') {
            return `${element.prefix} - ${element.firstname} ${element.lastname}`;
        }
        return `${element.prefix} - ${element.name}`;
    }
}
