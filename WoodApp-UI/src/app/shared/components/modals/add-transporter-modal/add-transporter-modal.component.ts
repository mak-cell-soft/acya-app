import { Component, HostListener, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SeriesOptions_FR } from '../../../constants/list_of_constants';
import { TransporterService } from '../../../../services/components/transporter.service';
import { Transporter, Vehicle } from '../../../../models/components/customer';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../Text_Buttons';

export interface _Transporter {
  transpSurname: string;
  transpName: string;
  vehiculematricule: string;
}

@Component({
  selector: 'app-add-transporter-modal',
  templateUrl: './add-transporter-modal.component.html',
  styleUrl: './add-transporter-modal.component.scss'
})
export class AddTransporterModalComponent implements OnInit {

  fb = inject(FormBuilder);
  transporterService = inject(TransporterService);

  transporterForm!: FormGroup;

  register_button_text: string = REGISTER_BUTTON;
  abort_button_text: string = ABORT_BUTTON;
  allSeries = Object.values(SeriesOptions_FR);

  constructor(
    public dialogRef: MatDialogRef<AddTransporterModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit(): void {
    this.createTransporterForm();
  }

  createTransporterForm() {
    this.transporterForm = this.fb.group({
      transpSurname: ['', Validators.required],
      transpName: ['', Validators.required],
      serie: ['', Validators.pattern(/^\d{1,3}$/)], // 1 to 3 digits
      letter: [this.allSeries[0].id],
      number: ['', Validators.pattern(/^\d{1,4}$/)] // 1 to 4 digits
    });
  }

  onSubmit() {
    if (this.transporterForm.valid) {
      const formValue = this.transporterForm.value;

      // Construct vehiculematricule from serie, letter, and number
      const vehiculematricule = `${formValue.serie} ${this.getSelectedSeriesValue(formValue.letter)} ${formValue.number}`;

      // Create a new instance of Vehicle
      const vehicle = new Vehicle(vehiculematricule);
      vehicle.isowned = false;

      // Transform into Transporter format
      const transporter: Transporter = {
        id: 0,
        firstname: formValue.transpSurname,
        lastname: formValue.transpName,
        fullname: `${formValue.transpSurname} ${formValue.transpName}`,
        car: vehicle
      };

      // Call the Add method from the service
      this.transporterService.Add(transporter).subscribe({
        next: (response) => {
          console.log('Transporter added successfully', response);
          this.dialogRef.close(transporter); 
        },
        error: (error) => {
          console.error('Error adding transporter', error);
        }
      });
    }
  }

  getSelectedSeriesValue(letterId: number | string): string {
    const selectedSeries = this.allSeries.find(series => series.id === letterId);
    return selectedSeries ? selectedSeries.value : ''; 
  }

  onCancel() {
    this.dialogRef.close(); 
  }
}
