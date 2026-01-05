import { Component, HostListener, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, NgControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vehiculeMatriculeValidator } from '../../../shared/validators/atLeastOneRequiredValidator';
import { SeriesOptions_FR } from '../../../shared/constants/list_of_constants';
import { TransporterService } from '../../../services/components/transporter.service';
import { Transporter, Vehicle } from '../../../models/components/customer';


export interface _Transporter {
  transpSurname: string;
  transpName: string;
  vehiculematricule: string;
}

@Component({
  selector: 'app-add-transporter-modal',
  templateUrl: './add-transporter-modal.component.html',
  styleUrl: './add-transporter-modal.component.css'
})
export class AddTransporterModalComponent implements OnInit {

  fb = inject(FormBuilder);
  transporterService = inject(TransporterService);
  // ngControl = inject(NgControl);

  transporterForm!: FormGroup;


  allSeries = Object.values(SeriesOptions_FR);
  //#region constructor
  /**
   *
   */
  constructor(
    public dialogRef: MatDialogRef<AddTransporterModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  //#endregion


  ngOnInit(): void {
    this.createTransporterForm();
  }

  // @HostListener('input', ['$event.target.value'])
  // onInput(value: string): void {
  //   this.ngControl.control?.setValue(value.toUpperCase(), { emitEvent: false });
  // }


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

      // Transform into Transporter format
      const transporter: Transporter = {
        id: 0,
        firstname: formValue.transpSurname,
        lastname: formValue.transpName,
        fullname: '',
        car: vehicle
      };

      // Call the Add method from the service
      this.transporterService.Add(transporter).subscribe({
        next: (response) => {
          // Handle the response if needed
          console.log('Transporter added successfully', response);
          this.dialogRef.close(transporter); // Pass the transformed data back to the parent
        },
        error: (error) => {
          // Handle the error if needed
          console.error('Error adding transporter', error);
        }
      });
    }
  }

  // Helper function to get selected series value by ID
  getSelectedSeriesValue(letterId: number | string): string {
    const selectedSeries = this.allSeries.find(series => series.id === letterId);
    return selectedSeries ? selectedSeries.value : ''; // Adjust this based on your series data structure
  }

  onCancel() {
    this.dialogRef.close(); // Simply close the modal without returning data
  }
}
