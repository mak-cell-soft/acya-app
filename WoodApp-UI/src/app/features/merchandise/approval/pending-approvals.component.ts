import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ApprovalService, DocumentApproval, ApprovalDecision } from '../../../services/components/approval.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { ApprovalActionsDialogComponent } from '../../../shared/components/modals/approval-actions-dialog/approval-actions-dialog.component';
import { ApprovalSettingsComponent } from './approval-settings/approval-settings.component';
import { DocumentDetailModalComponent } from '../customer/list-customer-documents/document-detail-modal/document-detail-modal.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pending-approvals',
  template: `
    <div class="page-container">
      <div class="header">
        <div class="header-content">
          <h1>Approbations en attente</h1>
          <p class="subtitle">Gérez les demandes d'approbation pour les bons de commande dépassant le seuil.</p>
        </div>
        <button mat-stroked-button color="primary" (click)="openSettings()">
          <mat-icon>settings</mat-icon> Paramètres
        </button>
      </div>

      <div class="table-container mat-elevation-z2">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="docNumber">
            <th mat-header-cell *matHeaderCellDef> N° Document </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.docnumber}} </td>
          </ng-container>

          <ng-container matColumnDef="counterpart">
            <th mat-header-cell *matHeaderCellDef> Contrepartie </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.counterpart?.name}} </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef> Montant TTC </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.total_net_ttc | number:'1.3-3'}} TND </td>
          </ng-container>

          <ng-container matColumnDef="submittedBy">
            <th mat-header-cell *matHeaderCellDef> Soumis par </th>
            <td mat-cell *matCellDef="let element"> 
              {{element.submittedBy?.person?.firstname}} {{element.submittedBy?.person?.lastname}} 
            </td>
          </ng-container>

          <ng-container matColumnDef="submittedAt">
            <th mat-header-cell *matHeaderCellDef> Date soumission </th>
            <td mat-cell *matCellDef="let element"> {{element.submittedAt | date:'dd/MM/yyyy HH:mm'}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let element">
              <div class="action-buttons">
                <button mat-icon-button color="accent" (click)="viewDocument(element)" matTooltip="Voir détails">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-flat-button color="primary" class="decision-btn" (click)="openDecisionDialog(element)">
                  <mat-icon>gavel</mat-icon>
                  <span>Décider</span>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="6" style="text-align: center; padding: 20px;">
              Aucune demande d'approbation en attente.
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h1 { margin: 0; color: #2c3e50; font-weight: 700; }
    .subtitle { color: #7f8c8d; margin-top: 4px; }
    .table-container { border-radius: 8px; overflow: hidden; background: white; }
    table { width: 100%; }
    .mat-column-actions { width: 180px; text-align: center; }
    .action-buttons { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
    .decision-btn { border-radius: 20px; padding: 0 16px; font-weight: 500; }
    .decision-btn mat-icon { margin-right: 4px; font-size: 20px; }
  `]
})
export class PendingApprovalsComponent implements OnInit {
  displayedColumns: string[] = ['docNumber', 'counterpart', 'amount', 'submittedBy', 'submittedAt', 'actions'];
  dataSource = new MatTableDataSource<DocumentApproval>([]);
  enterpriseId: number = 0;
  currentUserId: number = 0;

  constructor(
    private approvalService: ApprovalService,
    private authService: AuthenticationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    const user = this.authService.getCurrentUser();
    this.enterpriseId = user?.enterpriseId ? Number(user.enterpriseId) : 0;
    this.currentUserId = user?.id ? Number(user.id) : 0;
  }

  ngOnInit(): void {
    this.loadPendingApprovals();
  }

  loadPendingApprovals(): void {
    if (this.enterpriseId > 0) {
      this.approvalService.getPending(this.enterpriseId).subscribe(data => {
        this.dataSource.data = data;
      });
    }
  }

  viewDocument(approval: DocumentApproval): void {
    this.dialog.open(DocumentDetailModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: approval.document
    });
  }

  openSettings(): void {
    const dialogRef = this.dialog.open(ApprovalSettingsComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh if needed, though settings don't affect the list directly
      }
    });
  }

  openDecisionDialog(approval: DocumentApproval): void {
    const dialogRef = this.dialog.open(ApprovalActionsDialogComponent, {
      width: '450px',
      data: {
        docNumber: approval.document?.docNumber,
        counterpartName: approval.document?.counterPart?.name,
        totalAmount: approval.document?.totalCostNetTTCDoc
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processDecision(approval.documentId, result.decision, result.rejectionReason);
      }
    });
  }

  processDecision(docId: number, decision: ApprovalDecision, reason: string): void {
    this.approvalService.decide(docId, decision, this.currentUserId, reason).subscribe({
      next: () => {
        this.snackBar.open(
          decision === ApprovalDecision.Approved ? 'Document approuvé avec succès' : 'Document rejeté',
          'Fermer',
          { duration: 3000 }
        );
        this.loadPendingApprovals();
      },
      error: (err) => {
        this.snackBar.open('Erreur: ' + err.error, 'Fermer', { duration: 5000 });
      }
    });
  }
}
