import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ApprovalService, DocumentApproval, ApprovalDecision } from '../../../services/components/approval.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { ApprovalActionsDialogComponent } from '../../../shared/components/modals/approval-actions-dialog/approval-actions-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pending-approvals',
  template: `
    <div class="page-container">
      <div class="header">
        <h1>Approbations en attente</h1>
        <p class="subtitle">Gérez les demandes d'approbation pour les bons de commande dépassant le seuil.</p>
      </div>

      <div class="table-container mat-elevation-z2">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="docNumber">
            <th mat-header-cell *matHeaderCellDef> N° Document </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.docNumber}} </td>
          </ng-container>

          <ng-container matColumnDef="counterpart">
            <th mat-header-cell *matHeaderCellDef> Contrepartie </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.counterPart?.name}} </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef> Montant TTC </th>
            <td mat-cell *matCellDef="let element"> {{element.document?.totalCostNetTTCDoc | number:'1.3-3'}} TND </td>
          </ng-container>

          <ng-container matColumnDef="submittedBy">
            <th mat-header-cell *matHeaderCellDef> Soumis par </th>
            <td mat-cell *matCellDef="let element"> 
              {{element.submittedBy?.persons?.name}} {{element.submittedBy?.persons?.surname}} 
            </td>
          </ng-container>

          <ng-container matColumnDef="submittedAt">
            <th mat-header-cell *matHeaderCellDef> Date soumission </th>
            <td mat-cell *matCellDef="let element"> {{element.submittedAt | date:'dd/MM/yyyy HH:mm'}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="primary" (click)="openDecisionDialog(element)" matTooltip="Décider">
                <i class="fas fa-gavel"></i>
              </button>
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
    .header { margin-bottom: 24px; }
    .header h1 { margin: 0; color: #2c3e50; font-weight: 700; }
    .subtitle { color: #7f8c8d; margin-top: 4px; }
    .table-container { border-radius: 8px; overflow: hidden; background: white; }
    table { width: 100%; }
    .mat-column-actions { width: 60px; text-align: center; }
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
