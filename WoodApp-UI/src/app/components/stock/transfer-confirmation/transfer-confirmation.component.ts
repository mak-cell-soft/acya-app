import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StockService } from '../../../services/components/stock.service';

@Component({
  selector: 'app-transfer-confirmation',
  templateUrl: './transfer-confirmation.component.html',
  styleUrl: './transfer-confirmation.component.css'
  //   selector: 'app-transfer-confirmation',
  //   template: `
  //     <h2 mat-dialog-title>Confirmer le transfert</h2>
  //     <mat-dialog-content>
  //       <p>Depuis le site: {{data.originSite}}</p>
  //       <p>Nombre d'articles: {{data.itemsCount}}</p>
  //       <p>Date: {{data.date | date}}</p>

  //       <mat-form-field appearance="fill" *ngIf="!data.confirmed">
  //         <mat-label>Commentaire</mat-label>
  //         <textarea matInput [(ngModel)]="comment"></textarea>
  //       </mat-form-field>
  //     </mat-dialog-content>
  //     <mat-dialog-actions align="end">
  //       <button mat-button (click)="onReject()" color="warn">Rejeter</button>
  //       <button mat-button (click)="onConfirm()" color="primary" cdkFocusInitial>Confirmer</button>
  //     </mat-dialog-actions>
  //   `
})
export class TransferConfirmationComponent {
  comment: string = '';

  constructor(
    public dialogRef: MatDialogRef<TransferConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private stockService: StockService
  ) { }

  onConfirm(): void {
    this.stockService.confirmTransfer(this.data.id, this.comment).subscribe(() => {
      this.dialogRef.close(true);
    });
  }

  onReject(): void {
    this.stockService.rejectTransfer(this.data.id, this.comment).subscribe(() => {
      this.dialogRef.close(false);
    });
  }

  onAbort() {
    this.dialogRef.close();
  }
}
