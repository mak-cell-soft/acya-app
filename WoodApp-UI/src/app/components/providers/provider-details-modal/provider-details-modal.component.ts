import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { SupplierCategories_FR } from '../../../shared/constants/list_of_constants';

@Component({
    selector: 'app-provider-details-modal',
    templateUrl: './provider-details-modal.component.html',
    styleUrls: ['./provider-details-modal.component.css']
})
export class ProviderDetailsModalComponent {
    constructor(
        public dialogRef: MatDialogRef<ProviderDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { supplier: CounterPart }
    ) { }

    onClose(): void {
        this.dialogRef.close();
    }

    getSupplierCategoryValue(_k: string): string {
        const key = Number(_k);
        const category = SupplierCategories_FR.find(cat => cat.id === key);
        return category ? category.value : '** Non Connue **';
    }

    getFullName(): string {
        const element = this.data.supplier;
        return `${element.prefix} - ${element.name}`;
    }
}
