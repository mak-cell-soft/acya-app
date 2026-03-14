import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LeaveService } from '../../../../services/components/leave.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-leave-management-modal',
  templateUrl: './leave-management-modal.component.html',
  styleUrls: ['./leave-management-modal.component.scss']
})
export class LeaveManagementModalComponent implements OnInit {
  leaveForm: FormGroup;
  leaves: MatTableDataSource<any> = new MatTableDataSource<any>();
  displayedColumns: string[] = ['type', 'start', 'end', 'duration', 'status', 'actions'];
  loading = false;

  leaveTypes = ['Congé Payé', 'Maladie', 'Congé sans solde', 'Autre'];

  constructor(
    public dialogRef: MatDialogRef<LeaveManagementModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employeeId: number, employeeName: string },
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private snackBar: MatSnackBar
  ) {
    this.leaveForm = this.fb.group({
      employeeId: [this.data.employeeId],
      leavetype: ['', Validators.required],
      startdate: ['', Validators.required],
      enddate: ['', Validators.required],
      durationdays: [0, [Validators.required, Validators.min(0.5)]],
      status: ['Pending']
    });
  }

  ngOnInit(): void {
    this.loadLeaves();
  }

  loadLeaves(): void {
    this.loading = true;
    this.leaveService.getByEmployee(this.data.employeeId).subscribe({
      next: (res) => {
        this.leaves.data = res;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Erreur lors du chargement des congés', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.leaves.filter = filterValue.trim().toLowerCase();
  }

  calculateDuration(): void {
    const start = this.leaveForm.get('startdate')?.value;
    const end = this.leaveForm.get('enddate')?.value;
    if (start && end) {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
      this.leaveForm.get('durationdays')?.setValue(days > 0 ? days : 0);
    }
  }

  onSubmit(): void {
    if (this.leaveForm.valid) {
      this.leaveService.add(this.leaveForm.value).subscribe({
        next: () => {
          this.snackBar.open('Demande de congé ajoutée', 'OK', { duration: 3000 });
          this.leaveForm.reset({ employeeId: this.data.employeeId, status: 'Pending' });
          this.loadLeaves();
        },
        error: () => this.snackBar.open("Erreur lors de l'ajout", 'OK', { duration: 3000 })
      });
    }
  }

  updateStatus(leave: any, status: string): void {
    const updatedLeave = { ...leave, status: status };
    this.leaveService.update(leave.id, updatedLeave).subscribe({
      next: () => {
        this.snackBar.open(`Statut mis à jour: ${status}`, 'OK', { duration: 3000 });
        this.loadLeaves();
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour', 'OK', { duration: 3000 })
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
