import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApprovalDecision } from '../../../../services/components/approval.service';

@Component({
  selector: 'app-approval-actions-dialog',
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Actions d'approbation</h2>
      <mat-dialog-content>
        <div class="doc-summary">
          <p><strong>Document:</strong> {{ data.docNumber }}</p>
          <p><strong>Contrepartie:</strong> {{ data.counterpartName }}</p>
          <p><strong>Montant TTC:</strong> {{ data.totalAmount | number:'1.3-3' }} TND</p>
        </div>

        <div class="decision-section">
          <label>Décision:</label>
          <mat-radio-group [(ngModel)]="decision" class="radio-group">
            <mat-radio-button [value]="ApprovalDecision.Approved">Approuver</mat-radio-button>
            <mat-radio-button [value]="ApprovalDecision.Rejected">Rejeter</mat-radio-button>
          </mat-radio-group>
        </div>

        <div class="reason-section" *ngIf="decision === ApprovalDecision.Rejected">
          <label>Motif de rejet (Obligatoire):</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select [(ngModel)]="rejectionReason" placeholder="Sélectionnez un motif">
              <mat-option *ngFor="let reason of rejectionReasons" [value]="reason">
                {{ reason }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Annuler</button>
        <button mat-raised-button color="primary" 
                [disabled]="!isValid()" 
                (click)="onConfirm()">
          Confirmer
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 8px; }
    .doc-summary { 
      background: #f8f9fa; 
      padding: 12px; 
      border-radius: 8px; 
      margin-bottom: 20px; 
    }
    .doc-summary p { margin: 4px 0; }
    .decision-section { margin-bottom: 20px; }
    .radio-group { display: flex; gap: 16px; margin-top: 8px; }
    .reason-section { margin-top: 16px; }
    .full-width { width: 100%; }
  `]
})
export class ApprovalActionsDialogComponent {
  ApprovalDecision = ApprovalDecision;
  decision: ApprovalDecision = ApprovalDecision.Approved;
  rejectionReason: string = '';
  
  rejectionReasons: string[] = [
    'Prix trop élevé',
    'Client risqué / Limite de crédit atteinte',
    'Stock insuffisant / Rupture',
    'Erreur de saisie / Doublon',
    'Conditions de paiement non conformes',
    'Remise non autorisée'
  ];

  constructor(
    public dialogRef: MatDialogRef<ApprovalActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  isValid(): boolean {
    if (this.decision === ApprovalDecision.Approved) return true;
    return !!this.rejectionReason;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.isValid()) {
      this.dialogRef.close({
        decision: this.decision,
        rejectionReason: this.decision === ApprovalDecision.Rejected ? this.rejectionReason : null
      });
    }
  }
}
