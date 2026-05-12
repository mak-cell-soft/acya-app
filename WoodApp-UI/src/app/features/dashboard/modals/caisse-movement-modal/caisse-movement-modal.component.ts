import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CaisseService } from '../../../../services/treasury/caisse.service';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { AuthenticationService } from '../../../../services/components/authentication.service';

@Component({
  selector: 'app-caisse-movement-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinner
  ],
  template: `
    <div class="modal-container">
        <div class="modal-header">
            <div class="title-group">
                <mat-icon color="primary">{{ data.type === 'ENTREE' ? 'add_circle' : 'payments' }}</mat-icon>
                <h2>{{ data.type === 'ENTREE' ? 'Approvisionnement Caisse' : 'Remise de Caisse' }}</h2>
            </div>
            <button mat-icon-button (click)="dialogRef.close()">
                <mat-icon>close</mat-icon>
            </button>
        </div>

        <mat-divider></mat-divider>

        <div class="balance-banner" [class.entree]="data.type === 'ENTREE'">
            <div class="info">
                <span class="label">Solde Actuel</span>
                <span class="value">{{ currentBalance | number:'1.3-3' }} TND</span>
            </div>
            <mat-icon class="watermark">{{ data.type === 'ENTREE' ? 'trending_up' : 'trending_down' }}</mat-icon>
        </div>

        <!-- Appro limit banner — shown only for ENTREE type -->
        <div class="appro-limit-banner" *ngIf="data.type === 'ENTREE' && approLimit !== null">
            <div class="limit-row">
                <mat-icon class="limit-icon">payments</mat-icon>
                <div class="limit-text">
                    <span class="limit-label">Plafond espèces du jour</span>
                    <span class="limit-detail">
                        {{ approLimit!.especeTotal | number:'1.3-3' }} TND perçus
                        · {{ approLimit!.alreadyIn | number:'1.3-3' }} TND déjà approvisionnés
                    </span>
                </div>
                <span class="limit-remaining" [class.limit-zero]="approLimit!.remaining <= 0">
                    {{ approLimit!.remaining | number:'1.3-3' }} TND
                </span>
            </div>
            <div class="limit-bar-track">
                <div class="limit-bar-fill"
                     [style.width.%]="approLimit!.especeTotal > 0 ? (approLimit!.alreadyIn / approLimit!.especeTotal) * 100 : 0">
                </div>
            </div>
        </div>

        <form [formGroup]="movementForm" (ngSubmit)="onSubmit()" class="modal-content">
            <div class="form-grid">
                <!-- Amount -->
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Montant (Espèces)</mat-label>
                    <input matInput type="number" formControlName="amount" placeholder="0.000">
                    <span matSuffix>TND</span>
                    <mat-icon matPrefix>attach_money</mat-icon>
                    <!-- Frontend cap hint for ENTREE -->
                    <mat-hint *ngIf="data.type === 'ENTREE' && approLimit !== null">
                        Max disponible : {{ approLimit!.remaining | number:'1.3-3' }} TND
                    </mat-hint>
                    <mat-error *ngIf="movementForm.get('amount')?.hasError('exceedsLimit')">
                        Montant dépasse le plafond disponible ({{ approLimit?.remaining | number:'1.3-3' }} TND)
                    </mat-error>
                </mat-form-field>

                <!-- Reason Selection -->
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Motif</mat-label>
                    <mat-select formControlName="reason">
                        <ng-container *ngIf="data.type === 'ENTREE'">
                            <mat-option value="SOLDE_INITIAL">Solde Initial</mat-option>
                            <mat-option value="APPROVISIONNEMENT">Approvisionnement</mat-option>
                            <mat-option value="AUTRE">Autre Entrée</mat-option>
                        </ng-container>
                        <ng-container *ngIf="data.type === 'SORTIE'">
                            <mat-option value="REMISE_CENTRALE">Remise à la Caisse Principale</mat-option>
                            <mat-option value="DEPENSE_DIVERS">Dépense Divers</mat-option>
                        </ng-container>
                    </mat-select>
                    <mat-icon matPrefix>info</mat-icon>
                </mat-form-field>

                <!-- Reference -->
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Référence / Pièce</mat-label>
                    <input matInput formControlName="reference" placeholder="Ex: REF-001">
                    <mat-icon matPrefix>receipt</mat-icon>
                </mat-form-field>

                <!-- Notes -->
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Notes</mat-label>
                    <textarea matInput formControlName="notes" rows="2"></textarea>
                    <mat-icon matPrefix>notes</mat-icon>
                </mat-form-field>
            </div>

            <div class="modal-actions">
                <button mat-button type="button" (click)="dialogRef.close()">Annuler</button>
                <button mat-flat-button [color]="data.type === 'ENTREE' ? 'accent' : 'primary'" type="submit"
                        [disabled]="movementForm.invalid || loading || (data.type === 'ENTREE' && approLimit !== null && approLimit!.remaining <= 0)">
                    <mat-icon *ngIf="!loading">check_circle</mat-icon>
                    <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
                    Confirmer
                </button>
            </div>
        </form>
    </div>
  `,
  styles: [`
    .modal-container { padding: 0; overflow: hidden; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8fafc; }
    .title-group { display: flex; align-items: center; gap: 12px; }
    .title-group h2 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #1e293b; }
    .balance-banner { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; position: relative; overflow: hidden; }
    .balance-banner.entree { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .info { display: flex; flex-direction: column; z-index: 1; }
    .label { font-size: 0.875rem; opacity: 0.9; }
    .value { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.025em; }
    .watermark { position: absolute; right: -10px; bottom: -10px; font-size: 100px; width: 100px; height: 100px; opacity: 0.15; transform: rotate(-15deg); pointer-events: none; }

    /* ── Appro limit banner ── */
    .appro-limit-banner {
      padding: 12px 24px;
      background: #fefce8;
      border-bottom: 1px solid #fef08a;
    }
    .limit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .limit-icon { font-size: 20px; width: 20px; height: 20px; color: #92400e; }
    .limit-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .limit-label { font-size: 0.75rem; font-weight: 700; color: #78350f; text-transform: uppercase; letter-spacing: 0.5px; }
    .limit-detail { font-size: 0.68rem; color: #92400e; }
    .limit-remaining { font-size: 1rem; font-weight: 800; color: #15803d; white-space: nowrap; }
    .limit-remaining.limit-zero { color: #dc2626; }
    .limit-bar-track { height: 4px; background: #fde68a; border-radius: 4px; overflow: hidden; }
    .limit-bar-fill { height: 100%; background: linear-gradient(to right, #f59e0b, #ef4444); border-radius: 4px; transition: width 0.4s ease; }

    .modal-content { padding: 24px; }
    .form-grid { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  `]
})
export class CaisseMovementModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private caisseService = inject(CaisseService);
  private authService = inject(AuthenticationService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<CaisseMovementModalComponent>);

  movementForm!: FormGroup;
  currentBalance: number = 0;
  loading = false;

  /** Plafond approvisionnement du jour — null pendant le chargement */
  approLimit: { especeTotal: number; alreadyIn: number; remaining: number } | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { siteId: number, type: 'ENTREE' | 'SORTIE' }) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCurrentBalance();
    // Charger le plafond uniquement pour les approvisionnements
    if (this.data.type === 'ENTREE') {
      this.loadApproLimit();
    }
  }

  private initForm() {
    this.movementForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0.001)]],
      reason: [this.data.type === 'ENTREE' ? 'APPROVISIONNEMENT' : 'REMISE_CENTRALE', Validators.required],
      reference: [''],
      notes: ['']
    });
  }

  loadCurrentBalance() {
    this.caisseService.getSiteBalance(this.data.siteId).subscribe(res => {
      this.currentBalance = res.currentBalance;
    });
  }

  loadApproLimit() {
    this.caisseService.getApproLimit(this.data.siteId).subscribe({
      next: (limit) => {
        this.approLimit = limit;
        // Appliquer le validateur de plafond dynamiquement
        this.movementForm.get('amount')?.setValidators([
          Validators.required,
          Validators.min(0.001),
          (control) => {
            if (this.approLimit && control.value > this.approLimit.remaining)
              return { exceedsLimit: true };
            return null;
          }
        ]);
        this.movementForm.get('amount')?.updateValueAndValidity();
      },
      error: () => { /* silencieux si endpoint pas encore dispo */ }
    });
  }

  onSubmit() {
    if (this.movementForm.valid) {
      const formValue = this.movementForm.value;

      // Vérification côté client du solde pour les SORTIES
      if (this.data.type === 'SORTIE' && formValue.amount > this.currentBalance) {
        this.snackBar.open('Solde insuffisant dans la caisse', 'Fermer', { duration: 3000 });
        return;
      }

      // Vérification côté client du plafond pour les ENTREES
      if (this.data.type === 'ENTREE' && this.approLimit && formValue.amount > this.approLimit.remaining) {
        this.snackBar.open(
          `Plafond dépassé. Max disponible : ${this.approLimit.remaining.toFixed(3)} TND`,
          'Fermer', { duration: 5000 }
        );
        return;
      }

      this.loading = true;
      const movementData = {
        salesSiteId:     this.data.siteId,
        type:            this.data.type,
        reason:          formValue.reason,
        amount:          formValue.amount,
        reference:       formValue.reference,
        notes:           formValue.notes,
        createdByUserId: this.authService.getUserDetail()?.id
      };

      this.caisseService.addMovement(movementData).subscribe({
        next: () => {
          this.snackBar.open('Mouvement enregistré avec succès', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          // Le backend renvoie le message d'erreur détaillé en cas de dépassement
          const msg = err?.error?.message || 'Erreur lors de l\'enregistrement';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
          this.loading = false;
        }
      });
    }
  }
}
