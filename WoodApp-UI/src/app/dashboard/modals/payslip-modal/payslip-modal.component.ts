import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PayslipService } from '../../../services/components/payslip.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-payslip-modal',
  templateUrl: './payslip-modal.component.html',
  styleUrls: ['./payslip-modal.component.scss']
})
export class PayslipModalComponent implements OnInit {
  payslipForm: FormGroup;
  payslips: MatTableDataSource<any> = new MatTableDataSource<any>();
  displayedColumns: string[] = ['period', 'base', 'bonuses', 'deductions', 'net', 'actions'];
  loading = false;

  months = [
    { id: 1, name: 'Janvier' }, { id: 2, name: 'Février' }, { id: 3, name: 'Mars' },
    { id: 4, name: 'Avril' }, { id: 5, name: 'Mai' }, { id: 6, name: 'Juin' },
    { id: 7, name: 'Juillet' }, { id: 8, name: 'Août' }, { id: 9, name: 'Septembre' },
    { id: 10, name: 'Octobre' }, { id: 11, name: 'Novembre' }, { id: 12, name: 'Décembre' }
  ];
  years: number[] = [];

  constructor(
    public dialogRef: MatDialogRef<PayslipModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employeeId: number, employeeName: string },
    private fb: FormBuilder,
    private payslipService: PayslipService,
    private snackBar: MatSnackBar
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear; y++) {
      this.years.push(y);
    }

    this.payslipForm = this.fb.group({
      employeeId: [this.data.employeeId],
      periodmonth: [new Date().getMonth() + 1, Validators.required],
      periodyear: [currentYear, Validators.required],
      basesalary: [0, [Validators.required, Validators.min(0)]],
      bonuses: [0, Validators.min(0)],
      deductions: [0, Validators.min(0)],
      netsalary: [{ value: 0, disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadPayslips();
  }

  loadPayslips(): void {
    this.loading = true;
    this.payslipService.getByEmployee(this.data.employeeId).subscribe({
      next: (res) => {
        this.payslips.data = res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des fiches de paie', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.payslips.filter = filterValue.trim().toLowerCase();
  }

  calculateNet(): void {
    const base = this.payslipForm.get('basesalary')?.value || 0;
    const bonuses = this.payslipForm.get('bonuses')?.value || 0;
    const deductions = this.payslipForm.get('deductions')?.value || 0;
    const net = base + bonuses - deductions;
    this.payslipForm.get('netsalary')?.setValue(net > 0 ? net : 0);
  }

  onSubmit(): void {
    if (this.payslipForm.valid) {
      const payload = this.payslipForm.getRawValue();
      this.payslipService.generate(payload).subscribe({
        next: () => {
          this.snackBar.open('Fiche de paie générée', 'OK', { duration: 3000 });
          this.loadPayslips();
        },
        error: () => this.snackBar.open('Erreur lors de la génération', 'OK', { duration: 3000 })
      });
    }
  }

  downloadPdf(payslip: any): void {
    this.payslipService.downloadPdf(payslip.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fiche_Paie_${this.data.employeeName}_${payslip.periodmonth}_${payslip.periodyear}.pdf`;
        a.click();
      },
      error: () => this.snackBar.open('Erreur lors du téléchargement', 'OK', { duration: 3000 })
    });
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.id === month)?.name || month.toString();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
