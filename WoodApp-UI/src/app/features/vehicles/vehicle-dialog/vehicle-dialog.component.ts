import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Vehicle } from '../../../models/components/vehicle';
import { VehicleService } from '../../../services/components/vehicle.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-dialog',
  templateUrl: './vehicle-dialog.component.html',
  styleUrls: ['./vehicle-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleDialogComponent implements OnInit {
  vehicleForm: FormGroup;
  isEditMode: boolean;
  isReadOnly: boolean = false;
  loading = false;
  drainingOptions = [
    'Changement Huile',
    'Filtre à Huile',
    'Filtre à air',
    'Liquide Frein',
    'Filtre à Gasoil',
    'Huile Pond',
    'Graissage'
  ];
  selectedDrainingOptions: string[] = [];

  constructor(
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private dialogRef: MatDialogRef<VehicleDialogComponent>,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: Vehicle | null
  ) {
    this.isEditMode = !!data && !(data as any).isReadOnly;
    this.isReadOnly = (data as any)?.isReadOnly || false;
    
    this.vehicleForm = this.fb.group({
      id: [data?.id || 0],
      serialnumber: [data?.serialnumber || '', Validators.required],
      brand: [data?.brand || '', Validators.required],
      insurancedate: [data?.insurancedate || null],
      technicalvisitdate: [data?.technicalvisitdate || null],
      mileage: [data?.mileage || ''],
      draining: [data?.draining || ''],
      drainingdate: [data?.drainingdate || null],
      isowned: [data?.isowned ?? true],
    });

    if (data?.draining) {
      this.selectedDrainingOptions = data.draining.split(',').map(s => s.trim()).filter(s => s !== '');
    }

    if (this.isReadOnly) {
      this.vehicleForm.disable();
    }
  }

  ngOnInit(): void {}

  onDrainingOptionToggle(option: string, checked: boolean): void {
    if (this.isReadOnly) return;
    
    if (checked) {
      if (!this.selectedDrainingOptions.includes(option)) {
        this.selectedDrainingOptions.push(option);
      }
    } else {
      this.selectedDrainingOptions = this.selectedDrainingOptions.filter(o => o !== option);
    }
    this.vehicleForm.get('draining')?.setValue(this.selectedDrainingOptions.join(', '));
  }

  isOptionSelected(option: string): boolean {
    return this.selectedDrainingOptions.includes(option);
  }

  onSubmit(): void {
    if (this.vehicleForm.invalid) return;

    this.loading = true;
    const formValue = this.vehicleForm.value;
    
    // Create a cleanly formatted payload matching the backend expectations
    const payload: Vehicle = {
      ...formValue,
      id: formValue.id || 0,
      mileage: formValue.mileage ? String(formValue.mileage) : null
    };

    if (this.isEditMode) {
      this.vehicleService.update(payload).subscribe({
        next: () => {
          this.loading = false;
          this.toastr.success('Véhicule mis à jour avec succès');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          console.error('Update Error:', err);
          this.toastr.error('Impossible de mettre à jour le véhicule');
        }
      });
    } else {
      this.vehicleService.add(payload).subscribe({
        next: () => {
          this.loading = false;
          this.toastr.success('Véhicule ajouté avec succès');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          console.error('Add Error:', err);
          this.toastr.error(err.error?.title || "Impossible d'ajouter le véhicule");
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
