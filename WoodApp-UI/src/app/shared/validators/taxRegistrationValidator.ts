import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fiscalMatriculeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const matriculeFiscalPattern = /^\d{7}[A-Z] \/[A-Z]\/[A-Z]\/ \d{3}$/;
        const valid = matriculeFiscalPattern.test(control.value);
        return valid ? null : { invalidMatriculeFiscal: true };
    };
}
