import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SupplierEcheanceDto } from '../../../../../models/components/payment';

/**
 * EcheanceDetailsModalComponent
 * 
 * A premium, glassmorphism-inspired modal that displays a detailed list of payment instruments
 * due on a specific date. Part of the Supplier Payments feature.
 */
@Component({
  selector: 'app-echeance-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './echeance-details-modal.component.html',
  styleUrls: ['./echeance-details-modal.component.css']
})
export class EcheanceDetailsModalComponent {
  constructor(
    public dialogRef: MatDialogRef<EcheanceDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SupplierEcheanceDto
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
