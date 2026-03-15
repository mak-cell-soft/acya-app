import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-generic-confirmation-modal',
  templateUrl: './generic-confirmation-modal.component.html',
  styleUrl: './generic-confirmation-modal.component.scss'
})
export class GenericConfirmationModalComponent {
  constructor(
    public dialogRef: MatDialogRef<GenericConfirmationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      title?: string, 
      message: string, 
      confirmText?: string, 
      cancelText?: string,
      icon?: string,
      color?: string
    }
  ) { }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
