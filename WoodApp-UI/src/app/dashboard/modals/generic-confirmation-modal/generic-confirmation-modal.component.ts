import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-generic-confirmation-modal',
  template: `
    <div class="modal-container">
        <div class="modal-header">
            <mat-icon [color]="data.color || 'primary'" class="info-icon">{{ data.icon || 'info' }}</mat-icon>
            <h2 class="modal-title">{{ data.title || 'Confirmation' }}</h2>
        </div>
        <div class="modal-body">
            <p>{{ data.message }}</p>
        </div>
        <div class="control-button">
            <button mat-raised-button [color]="data.color || 'primary'" (click)="confirm()">{{ data.confirmText || 'Oui' }}</button>
            <button mat-button (click)="cancel()">{{ data.cancelText || 'Non' }}</button>
        </div>
    </div>
  `,
  styles: [`
    .modal-container { padding: 24px; display: flex; flex-direction: column; min-width: 350px; }
    .modal-header { display: flex; align-items: center; margin-bottom: 20px; }
    .info-icon { font-size: 28px; height: 28px; width: 28px; margin-right: 12px; }
    .modal-title { font-size: 20px; font-weight: 800; margin: 0; font-family: 'Playfair Display', serif; }
    .modal-body { margin-bottom: 24px; font-size: 15px; color: #4a5568; line-height: 1.6; }
    .control-button { display: flex; justify-content: flex-end; gap: 12px; }
    button { font-weight: 700; border-radius: 8px; }
  `]
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
