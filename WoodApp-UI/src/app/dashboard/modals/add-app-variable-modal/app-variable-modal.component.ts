import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ERROR_ADD_APPVAR, ERROR_ADD_APPVAR_TVA_VALUE, ERROR_INVALID_CENTIMETER, ERROR_INVALID_MILLIMETER, ERROR_VALUE_MATCH_CENTIMETER, ERROR_VALUE_MATCH_METER, MAT_DIALOG_APPVAR_TITLE, MAT_LABEL_APPVAR_ISACTIVE, MAT_LABEL_APPVAR_ISDEFAULT, MAT_LABEL_APPVAR_ISEDITABLE, MAT_LABEL_APPVAR_NAME, MAT_LABEL_APPVAR_NATURE, MAT_LABEL_APPVAR_VALUE, MAT_PLACEHOLDER_APPVAR_DIMENSION_NAME, MAT_PLACEHOLDER_APPVAR_DIMENSION_VALUE, MAT_PLACEHOLDER_APPVAR_LENGTH_NAME, MAT_PLACEHOLDER_APPVAR_LENGTH_VALUE, MAT_PLACEHOLDER_APPVAR_NAME as MAT_PLACEHOLDER_APPVAR_NAME, MAT_PLACEHOLDER_APPVAR_VALUE as MAT_PLACEHOLDER_APPVAR_VALUE, MAT_PLACEHOLDER_DIMENSION_NAME, MAT_PLACEHOLDER_DIMENSION_VALUE, MAT_PLACEHOLDER_LENGTH_NAME, MAT_PLACEHOLDER_LENGTH_VALUE, MAT_PLACEHOLDER_TAXE_NAME, MAT_PLACEHOLDER_TAXE_VALUE, MAT_PLACEHOLDER_TVA_NAME, MAT_PLACEHOLDER_TVA_VALUE, SUCCESS_ADD_APPVAR, WARNING_ADD_APPVAR } from '../../../shared/constants/modals/app_variable_modal';
import { AppVariable } from '../../../models/configuration/appvariable';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { centimeterValidator, meterCentimeterValidator, meterValidator, millimeterValidator, percentageValidator } from '../../../shared/validators/naturalNumberValidator';
import { Length, Nature } from '../../../models/configuration/dimensions';
import { Store } from '@ngrx/store';
import { addAppVariable } from '../../../store/actions/appvariable.actions';  // Adjust the path if needed


@Component({
  selector: 'app-app-variable-modal',
  templateUrl: './app-variable-modal.component.html',
  styleUrl: './app-variable-modal.component.css'
})
export class AppVariableModalComponent {

  nature!: string;
  natureDimensions!: Nature;
  natureKeys = Object.entries(Nature);

  //#region Labels Constants
  mat_dialog_appvar_title: string = MAT_DIALOG_APPVAR_TITLE;
  mat_label_appvar_name: string = MAT_LABEL_APPVAR_NAME;
  mat_label_appvar_value: string = MAT_LABEL_APPVAR_VALUE;
  mat_label_appvar_nature: string = MAT_LABEL_APPVAR_NATURE;
  mat_label_appvar_isactive: string = MAT_LABEL_APPVAR_ISACTIVE;
  mat_label_appvar_isdefault: string = MAT_LABEL_APPVAR_ISDEFAULT;
  mat_label_appvar_iseditable: string = MAT_LABEL_APPVAR_ISEDITABLE;

  mat_placeholder_appvar_name: string = MAT_PLACEHOLDER_APPVAR_NAME;
  mat_placeholder_appvar_value: string = MAT_PLACEHOLDER_APPVAR_VALUE;

  register_button_text: string = REGISTER_BUTTON;
  abort_button_text: string = ABORT_BUTTON;
  //#endregion

  //#region Output Messages
  success_add_appvariable: string = SUCCESS_ADD_APPVAR;
  warning_add_appvariable: string = WARNING_ADD_APPVAR;
  error_add_appvariable: string = ERROR_ADD_APPVAR;
  warning_add_appvariable_tva_value: string = ERROR_ADD_APPVAR_TVA_VALUE;
  error_invalid_millimeter_value: string = ERROR_INVALID_MILLIMETER;
  error_invalid_centimeter_value: string = ERROR_INVALID_CENTIMETER;
  error_value_match_meter: string = ERROR_VALUE_MATCH_METER;
  error_invalid_meter_centimeter_value: string = ERROR_VALUE_MATCH_CENTIMETER;
  //#endregion

  appvariableForm!: FormGroup;
  dimensionName: string = '';


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<AppVariableModalComponent>,
    private fb: FormBuilder,
    private appvarService: AppVariableService,
    private toastr: ToastrService,
    private store: Store
  ) {
    this.createForm();
    this.nature = data.nature;
    console.log("NATURE SELECTIONNE : " + this.nature);
    this.initializeLabels();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  initializeLabels() {
    if (this.nature === 'Length') {
      this.mat_dialog_appvar_title = MAT_DIALOG_APPVAR_TITLE + " " + Length.length;
      this.mat_label_appvar_name = MAT_LABEL_APPVAR_NAME + " " + Length.length;
      this.mat_label_appvar_value = MAT_LABEL_APPVAR_VALUE + " " + Length.length;
      this.success_add_appvariable = Length.length + " " + SUCCESS_ADD_APPVAR;
    } else {
      this.mat_dialog_appvar_title = MAT_DIALOG_APPVAR_TITLE + " " + this.nature;
      this.mat_label_appvar_name = MAT_LABEL_APPVAR_NAME + " " + this.nature;
      this.mat_label_appvar_value = MAT_LABEL_APPVAR_VALUE + " " + this.nature;
      this.success_add_appvariable = this.nature + " " + SUCCESS_ADD_APPVAR;
    }


    this.error_add_appvariable = ERROR_ADD_APPVAR + " " + this.nature;
    this.mat_placeholder_appvar_name = MAT_PLACEHOLDER_APPVAR_NAME + " " + this.nature;

    /**
     * The first half is common of Nature, the second is specified to user examples
     */

    const placeholdersAppVar_Name: { [key: string]: string } = {
      'Taxe': `${MAT_PLACEHOLDER_APPVAR_NAME + " " + MAT_PLACEHOLDER_TAXE_NAME}`,
      'Tva': `${MAT_PLACEHOLDER_APPVAR_NAME + " " + MAT_PLACEHOLDER_TVA_NAME}`,
      'Dimension': `${MAT_PLACEHOLDER_APPVAR_DIMENSION_NAME + " " + MAT_PLACEHOLDER_DIMENSION_NAME}`,
      'Length': `${MAT_PLACEHOLDER_APPVAR_LENGTH_NAME + " " + MAT_PLACEHOLDER_LENGTH_NAME}`
    };
    this.mat_placeholder_appvar_name = placeholdersAppVar_Name[this.nature] || MAT_PLACEHOLDER_APPVAR_NAME;

    const placeholdersAppVar_Value: { [key: string]: string } = {
      'Taxe': `${MAT_PLACEHOLDER_APPVAR_VALUE + " " + MAT_PLACEHOLDER_TAXE_VALUE}`,
      'Tva': `${MAT_PLACEHOLDER_APPVAR_VALUE + " " + MAT_PLACEHOLDER_TVA_VALUE}`,
      'Dimension': `${MAT_PLACEHOLDER_APPVAR_DIMENSION_VALUE + " " + MAT_PLACEHOLDER_DIMENSION_VALUE}`,
      'Length': `${MAT_PLACEHOLDER_APPVAR_LENGTH_VALUE + " " + MAT_PLACEHOLDER_LENGTH_VALUE}`
    };
    this.mat_placeholder_appvar_value = placeholdersAppVar_Value[this.nature] || MAT_PLACEHOLDER_APPVAR_VALUE;
  }

  createForm() {
    this.appvariableForm = this.fb.group({
      name: ['', Validators.required],
      value: ['', Validators.required],
      nature: [''],
      isactive: [false],
      isdefault: [false],
      iseditable: [false]
    });
  }

  onSubmit(): void {
    this.applyValidatorsBasedOnNature();

    if (this.appvariableForm.valid) {
      const formValues = this.appvariableForm.value;
      const appvar = new AppVariable();
      appvar.id = 0; // Assuming it will be initialized in BackEnd
      appvar.nature = this.nature;
      appvar.name = '' + formValues.name;
      // Check if nature is 'Tva' and remove '%' if it exists
      if (this.nature === 'Tva') {
        appvar.value = formValues.value.replace(/%$/, '');
      }
      if (this.nature === 'Dimension') {
        appvar.nature = formValues.nature;
        appvar.value = '' + formValues.value;
      }
      else {
        appvar.value = '' + formValues.value;
      }
      appvar.isactive = formValues.isactive ? formValues.isactive : false;
      appvar.isdefault = formValues.isdefault ? formValues.isdefault : false;
      appvar.iseditable = formValues.iseditable ? formValues.iseditable : false;
      appvar.isdeleted = false;

      this.addAppVariable(appvar);
    } else if (this.nature === 'Tva' && this.appvariableForm.get('value')!.errors?.['percentage']) {
      this.toastr.warning(this.warning_add_appvariable_tva_value);
    } else {
      this.toastr.warning(this.warning_add_appvariable);
    }
  }

  applyValidatorsBasedOnNature(): void {
    const nameControl = this.appvariableForm.get('name')!;
    const valueControl = this.appvariableForm.get('value')!;
    if (this.nature === 'Tva') {
      console.log("Tva is SELECTED AND setValidators is called");
      this.appvariableForm.get('value')!.setValidators([
        Validators.required,
        percentageValidator()
      ]);
      this.appvariableForm.get('value')!.updateValueAndValidity();
      console.log("TVA MODAL IS Validated");
    } else if (this.nature === 'Taxe') {
      console.log("TAXE MODAL IS Validated");
    } else if (this.nature === 'Dimension') {
      console.log("Dimension validation is applied");
      nameControl.setValidators([
        Validators.required,
        millimeterValidator()
      ]);
      valueControl.setValidators([
        Validators.required,
        meterValidator(nameControl)
      ]);
    } else if (this.nature === 'Length') {
      console.log("Length validation is applied");
      nameControl.setValidators([
        Validators.required,
        centimeterValidator()
      ]);
      valueControl.setValidators([
        Validators.required,
        meterCentimeterValidator(nameControl)
      ]);
    } else {
      // Clear validators for other cases if necessary
      nameControl.clearValidators();
      valueControl.clearValidators();
    }

    nameControl.updateValueAndValidity();
    valueControl.updateValueAndValidity();
  }

  // addAppVariable(appvar: AppVariable): void {
  //   if (appvar) {
  //     this.appvarService.AddAppVariable(appvar).subscribe({
  //       next: (response) => {
  //         this.toastr.success(this.success_add_appvariable);
  //         this.dialogRef.close(response);
  //       },
  //       error: (error) => {
  //         console.error('Error adding AppVar', error);
  //         this.toastr.error(this.error_add_appvariable);
  //       }
  //     });
  //   } else {
  //     this.toastr.warning(this.warning_add_appvariable);
  //   }
  // }

  addAppVariable(appvar: AppVariable): void {
    if (appvar) {
      this.store.dispatch(addAppVariable({ appVariable: appvar }));
      this.dialogRef.close(appvar);
    } else {
      this.toastr.warning(this.warning_add_appvariable);
    }
  }

}


