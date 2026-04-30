import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApprovalService, ApprovalConfig } from '../../../../services/components/approval.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';

@Component({
  selector: 'app-approval-settings',
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="primary">settings</mat-icon>
      Paramètres d'Approbation
    </h2>

    <mat-dialog-content class="mat-typography">
      <p class="subtitle">Configurez les seuils et les approbateurs pour votre entreprise.</p>
      
      <form [formGroup]="form" class="settings-form">
        <div class="form-section">
          <h3><mat-icon>straighten</mat-icon> Seuil de déclenchement</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Seuil d'approbation (TND)</mat-label>
            <input matInput type="number" formControlName="thresholdAmount" placeholder="Ex: 1000">
            <mat-icon matPrefix>payments</mat-icon>
            <mat-hint>Les documents dépassant ce montant seront bloqués jusqu'à approbation.</mat-hint>
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <div class="form-section">
          <h3><mat-icon>notifications_active</mat-icon> Notifications & Approbateurs</h3>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Emails des approbateurs</mat-label>
            <input matInput formControlName="approverEmails" placeholder="email1@example.com, email2@example.com">
            <mat-icon matPrefix>email</mat-icon>
            <mat-hint>Séparez les emails par des virgules.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Rôles autorisés à approuver</mat-label>
            <mat-select formControlName="approverRoles" multiple>
              <mat-option value="Admin">Administrateur</mat-option>
              <mat-option value="SuperAdmin">Super Administrateur</mat-option>
              <mat-option value="Manager">Responsable Achat/Vente</mat-option>
            </mat-select>
            <mat-icon matPrefix>admin_panel_settings</mat-icon>
            <mat-hint>Rôles recevant les notifications système.</mat-hint>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || loading">
        <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
        <span *ngIf="!loading">Enregistrer</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .subtitle { color: #7f8c8d; font-size: 14px; margin-bottom: 24px; }
    .settings-form { display: flex; flex-direction: column; gap: 20px; }
    .form-section { display: flex; flex-direction: column; gap: 12px; }
    .form-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #34495e; }
    .form-section h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3498db; }
    .full-width { width: 100%; }
    mat-divider { margin: 8px 0; }
    mat-dialog-content { min-width: 400px; max-width: 500px; }
  `]
})
export class ApprovalSettingsComponent implements OnInit {
  form: FormGroup;
  enterpriseId: number = 0;
  loading: boolean = false;
  configId: number = 0;

  constructor(
    private fb: FormBuilder,
    private approvalService: ApprovalService,
    private authService: AuthenticationService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ApprovalSettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      thresholdAmount: [0, [Validators.required, Validators.min(0)]],
      approverEmails: [''],
      approverRoles: [[]]
    });

    const user = this.authService.getCurrentUser();
    this.enterpriseId = user?.enterpriseId ? Number(user.enterpriseId) : 0;
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    if (this.enterpriseId > 0) {
      this.loading = true;
      this.approvalService.getConfig(this.enterpriseId).subscribe({
        next: (config) => {
          if (config) {
            this.configId = config.id || 0;
            this.form.patchValue({
              thresholdAmount: config.thresholdAmount,
              approverEmails: config.approverEmails,
              approverRoles: config.approverRoles ? JSON.parse(config.approverRoles) : []
            });
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.valid) {
      this.loading = true;
      const formValue = this.form.value;
      
      const config: ApprovalConfig = {
        id: this.configId,
        enterpriseId: this.enterpriseId,
        thresholdAmount: formValue.thresholdAmount,
        approverEmails: formValue.approverEmails,
        approverRoles: JSON.stringify(formValue.approverRoles)
      };

      this.approvalService.saveConfig(config).subscribe({
        next: () => {
          this.snackBar.open('Configuration enregistrée', 'Fermer', { duration: 3000 });
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackBar.open('Erreur: ' + (err.error || 'Serveur inaccessible'), 'Fermer', { duration: 5000 });
          this.loading = false;
        }
      });
    }
  }
}
