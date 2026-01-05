import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-delete-modal',
  templateUrl: './confirm-delete-modal.component.html',
  styleUrl: './confirm-delete-modal.component.css'
})
export class ConfirmDeleteModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: any } // Accepts any type
  ) { }

  // Confirm deletion
  confirmDelete(): void {
    this.dialogRef.close(true);
  }

  // Cancel deletion
  cancel(): void {
    this.dialogRef.close(false);
  }
}
