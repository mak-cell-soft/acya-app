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
import { BankService } from '../../../../services/configuration/bank.service';
import { CaisseService } from '../../../../services/treasury/caisse.service';
import { BankDepositService } from '../../../../services/treasury/bank-deposit.service';
import { Bank } from '../../../../models/configuration/bank';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { CaisseBalance } from '../../../../models/caisse';

@Component({
  selector: 'app-bank-deposit-modal',
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
  templateUrl: './bank-deposit-modal.component.html',
  styleUrl: './bank-deposit-modal.component.scss'
})
export class BankDepositModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankService = inject(BankService);
  private caisseService = inject(CaisseService);
  private depositService = inject(BankDepositService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<BankDepositModalComponent>);

  depositForm!: FormGroup;
  banks: Bank[] = [];
  sites: CaisseBalance[] = [];
  currentBalance: number = 0;
  loading = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { siteId: number | null, isCentral?: boolean }) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadBanks();
    if (this.data.isCentral) {
      this.caisseService.getCaissePrincipaleBalance().subscribe(res => {
        this.currentBalance = res;
      });
    } else if (this.data.siteId) {
      this.loadCurrentBalance(this.data.siteId);
    } else {
      this.loadSites();
    }
  }

  private initForm() {
    const siteValidators = this.data.isCentral ? [] : [Validators.required];
    this.depositForm = this.fb.group({
      bankId: ['', Validators.required],
      salesSiteId: [this.data.siteId, siteValidators],
      depositType: ['ESPECE', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.001)]],
      reference: [''],
      notes: ['']
    });

    // If site changes, update balance
    this.depositForm.get('salesSiteId')?.valueChanges.subscribe(siteId => {
      if (siteId && !this.data.isCentral) this.loadCurrentBalance(siteId);
    });
  }

  loadBanks() {
    this.bankService.GetAll().subscribe(banks => this.banks = banks);
  }

  loadSites() {
    this.caisseService.getAllBalances().subscribe(sites => this.sites = sites);
  }

  loadCurrentBalance(siteId: number) {
    this.caisseService.getSiteBalance(siteId).subscribe(res => {
      this.currentBalance = res.currentBalance;
    });
  }

  onSubmit() {
    if (this.depositForm.valid) {
      const formValue = this.depositForm.value;
      
      if (formValue.amount > this.currentBalance && formValue.depositType === 'ESPECE') {
        this.snackBar.open('Solde insuffisant dans la caisse', 'Fermer', { duration: 3000 });
        return;
      }

      this.loading = true;
      const depositData = {
        bankId: formValue.bankId,
        depositType: formValue.depositType,
        amountHT: formValue.amount,
        reference: formValue.reference,
        notes: formValue.notes,
        salesSiteId: this.data.isCentral ? null : formValue.salesSiteId,
        createdByUserId: null // The backend should handle this or fetch from claims
      };

      this.depositService.createDeposit(depositData).subscribe({
        next: () => {
          this.snackBar.open('Versement effectué avec succès', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erreur lors du versement', 'Fermer', { duration: 3000 });
          this.loading = false;
        }
      });
    }
  }
}
