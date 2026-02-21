import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StockService } from '../../../services/components/stock.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-transfer-confirm-code-dialog',
    templateUrl: './transfer-confirm-code-dialog.component.html',
    styleUrls: ['./transfer-confirm-code-dialog.component.css']
})
export class TransferConfirmCodeDialogComponent implements AfterViewInit {
    confirmationCode: string = '';
    loading: boolean = false;
    errorMessage: string = '';

    @ViewChild('codeInput') codeInput!: ElementRef;

    constructor(
        public dialogRef: MatDialogRef<TransferConfirmCodeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { transferId: number, comment: string },
        private stockService: StockService,
        private toastr: ToastrService
    ) { }

    ngAfterViewInit() {
        // Auto-focus the input field
        setTimeout(() => {
            this.codeInput.nativeElement.focus();
        }, 100);
    }

    onConfirm(): void {
        if (!this.confirmationCode) return;

        this.loading = true;
        this.errorMessage = '';

        this.stockService.confirmTransfer(this.data.transferId, this.confirmationCode, this.data.comment)
            .subscribe({
                next: (response) => {
                    this.loading = false;
                    this.toastr.success('Transfert confirmé avec succès', 'Confirmation');
                    this.dialogRef.close(true);
                },
                error: (error) => {
                    this.loading = false;
                    this.errorMessage = 'Code incorrect, veuillez réessayer';
                    this.confirmationCode = '';
                    this.codeInput.nativeElement.focus();
                    console.error('Transfer confirmation error:', error);
                }
            });
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
