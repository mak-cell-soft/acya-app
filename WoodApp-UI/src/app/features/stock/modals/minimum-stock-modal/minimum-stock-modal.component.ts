import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Stock } from '../../../../models/components/stock';

/**
 * Modal component to edit the minimum stock threshold for a specific item.
 * Designed with a premium aesthetic to provide a better user experience than window.prompt.
 */
@Component({
  selector: 'app-minimum-stock-modal',
  templateUrl: './minimum-stock-modal.component.html',
  styleUrl: './minimum-stock-modal.component.css'
})
export class MinimumStockModalComponent implements OnInit {

  minimumStock: number = 0;
  loading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<MinimumStockModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stock: Stock }
  ) { }

  ngOnInit(): void {
    // Initialize with current value
    this.minimumStock = this.data.stock.minimumstock || 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.minimumStock < 0) {
      return;
    }
    this.dialogRef.close(this.minimumStock);
  }
}
