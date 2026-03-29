import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DocStatus } from '../../../../models/components/document';

@Component({
  selector: 'app-status-order-modal',
  templateUrl: './status-order-modal.component.html',
  styleUrl: './status-order-modal.component.css'
})
export class StatusOrderModalComponent implements OnInit {
  statusForm: FormGroup;
  DocStatus = DocStatus;

  statuses = [
    { value: DocStatus.Pending, label: 'En attente' },
    { value: DocStatus.Sent, label: 'Envoyé' },
    { value: DocStatus.PartiallyDelivered, label: 'Partiellement livré' },
    { value: DocStatus.Delivered, label: 'Livré' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StatusOrderModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentStatus: number, supplierReference: string, docNumber: string }
  ) {
    this.statusForm = this.fb.group({
      status: [data.currentStatus, Validators.required],
      supplierReference: [data.supplierReference]
    });
  }

  ngOnInit(): void {
    this.onStatusChange();
  }

  onStatusChange(): void {
    const status = this.statusForm.get('status')?.value;
    const refControl = this.statusForm.get('supplierReference');
    if (status === DocStatus.Delivered) {
      refControl?.setValidators([Validators.required]);
    } else {
      refControl?.clearValidators();
    }
    refControl?.updateValueAndValidity();
  }

  confirm(): void {
    if (this.statusForm.valid) {
      this.dialogRef.close(this.statusForm.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
