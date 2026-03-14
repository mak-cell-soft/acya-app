import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Document } from '../../../../../models/components/document';
import { ListOfLength } from '../../../../../models/components/listoflength';

@Component({
    selector: 'app-document-detail-modal',
    templateUrl: './document-detail-modal.component.html',
    styleUrls: ['./document-detail-modal.component.css']
})
export class DocumentDetailModalComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<DocumentDetailModalComponent>,
        @Inject(MAT_DIALOG_DATA) public document: Document
    ) { }

    ngOnInit(): void {
    }

    onClose(): void {
        this.dialogRef.close();
    }

    // Helper to calculate subtotal of lengths if needed, or just display
    getLengthsString(lengths: ListOfLength[]): string {
        if (!lengths || lengths.length === 0) return '';
        return lengths.map(l => `${l.quantity} x ${l.length.name}`).join(', ');
    }
}
