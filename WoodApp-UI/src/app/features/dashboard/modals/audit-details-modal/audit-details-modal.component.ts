import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuditLog } from '../../../../models/audit-log';

@Component({
  selector: 'app-audit-details-modal',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align: middle; margin-right: 8px; color: #3f51b5;">manage_search</mat-icon>
      Détails de l'Activité
    </h2>
    <mat-dialog-content>
      <div class="audit-summary mb-4 p-3 rounded" style="background: #f8fafc; border-left: 4px solid #3f51b5;">
        <h4 class="mb-1" style="font-weight: 600;">Résumé</h4>
        <p class="mb-0 text-muted">{{ humanizedText }}</p>
      </div>

      <div class="mb-3">
        <strong>Utilisateur:</strong> {{ data.userName || 'Système' }}<br/>
        <strong>Date & Heure:</strong> {{ data.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}
      </div>
      
      <div class="row">
        <div class="col-md-6" *ngIf="data.oldValues">
          <h4 style="color: #d32f2f; font-size: 1rem;">Anciennes Valeurs</h4>
          <pre class="json-viewer">{{ parseJson(data.oldValues) }}</pre>
        </div>

        <div [class.col-md-6]="data.oldValues" [class.col-md-12]="!data.oldValues" *ngIf="data.newValues">
          <h4 style="color: #388e3c; font-size: 1rem;">Nouvelles Valeurs</h4>
          <pre class="json-viewer">{{ parseJson(data.newValues) }}</pre>
        </div>
      </div>

      <div *ngIf="data.changedColumns" class="mt-3">
        <strong>Colonnes impactées:</strong> 
        <mat-chip-listbox>
            <mat-chip *ngFor="let col of parseChanged(data.changedColumns)">{{ col }}</mat-chip>
        </mat-chip-listbox>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .json-viewer {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Consolas', monospace;
    }
    .audit-summary p {
        font-size: 0.95rem;
        line-height: 1.4;
    }
  `]
})
export class AuditDetailsModalComponent {
  humanizedText: string = '';

  constructor(
    public dialogRef: MatDialogRef<AuditDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AuditLog
  ) {
    // Basic humanization logic if passed from parent or calculated here
    // Since we want it to be nice, I'll add a simplified version here
    this.humanizedText = this.generateSummary();
  }

  generateSummary(): string {
    const mapping: { [key: string]: string } = {
        'tbl_document': 'Document',
        'tbl_counter_part': 'Tiers',
        'tbl_stock': 'Stock',
        'tbl_payments': 'Paiement',
        'tbl_article': 'Article',
        'tbl_merchandise': 'Marchandise',
        'AuditLogs': 'Journal d\'Audit',
        'EmployeePayslip': 'Fiche de paie',
        'Enterprise': 'Entreprise'
    };
    const entity = mapping[this.data.tableName] || this.data.tableName;
    const action = this.data.action === 'Insert' ? 'créé' : (this.data.action === 'Update' ? 'modifié' : 'supprimé');
    const gender = (entity === 'Fiche de paie' || entity === 'Entreprise' || entity === 'Marchandise') ? 'e' : '';
    
    let summary = `L'utilisateur ${this.data.userName || 'Système'} a ${action}${gender} ${entity === 'Paiement' || entity === 'Document' || entity === 'Article' || entity === 'Stock' || entity === 'Journal d\'Audit' ? 'le' : 'la'} ${entity}.`;
    
    if (this.data.action === 'Update' && this.data.changedColumns) {
        try {
            const changed = JSON.parse(this.data.changedColumns) as string[];
            summary += ` Les modifications concernent : ${changed.join(', ')}.`;
        } catch {}
    }
    
    return summary;
  }

  parseChanged(json: string): string[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  parseJson(jsonStr: string): string {
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  }
}
