import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdvanceService } from '../../../services/components/advance.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-advance-management-modal',
  templateUrl: './advance-management-modal.component.html',
  styleUrls: ['./advance-management-modal.component.scss']
})
export class AdvanceManagementModalComponent implements OnInit {
  advanceForm: FormGroup;
  advances: MatTableDataSource<any> = new MatTableDataSource<any>();
  displayedColumns: string[] = ['date', 'amount', 'repaid', 'remaining', 'status', 'actions'];
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<AdvanceManagementModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employeeId: number, employeeName: string },
    private fb: FormBuilder,
    private advanceService: AdvanceService,
    private snackBar: MatSnackBar
  ) {
    this.advanceForm = this.fb.group({
      employeeId: [this.data.employeeId],
      amount: [0, [Validators.required, Validators.min(1)]],
      requestdate: [new Date(), Validators.required],
      repaymentschedule: ['', Validators.required],
      amountrepaid: [0],
      status: ['Pending']
    });
  }

  ngOnInit(): void {
    this.loadAdvances();
  }

  loadAdvances(): void {
    this.loading = true;
    this.advanceService.getByEmployee(this.data.employeeId).subscribe({
      next: (res) => {
        this.advances.data = res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des avances', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.advances.filter = filterValue.trim().toLowerCase();
  }

  onSubmit(): void {
    if (this.advanceForm.valid) {
      this.advanceService.add(this.advanceForm.value).subscribe({
        next: () => {
          this.snackBar.open('Demande d\'avance ajoutée', 'OK', { duration: 3000 });
          this.advanceForm.reset({ employeeId: this.data.employeeId, requestdate: new Date(), status: 'Pending', amountrepaid: 0 });
          this.loadAdvances();
        },
        error: () => this.snackBar.open('Erreur lors de l\'envoi', 'OK', { duration: 3000 })
      });
    }
  }

  updateStatus(advance: any, status: string): void {
    const updated = { ...advance, status: status };
    this.advanceService.update(advance.id, updated).subscribe({
      next: () => {
        this.snackBar.open(`Avance ${status === 'Approved' ? 'approuvée' : 'rejetée'}`, 'OK', { duration: 3000 });
        this.loadAdvances();
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour', 'OK', { duration: 3000 })
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
