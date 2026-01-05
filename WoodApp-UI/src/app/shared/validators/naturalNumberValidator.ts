import { AbstractControl, ValidatorFn } from '@angular/forms';

export function percentageValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const value = control.value;
        const valid = /^[1-9]\d*%$/.test(value); // Checks if the value is a natural number followed by '%'
        return valid ? null : { 'percentage': { value: control.value } };
    };
}

export function millimeterValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const value = control.value;
        return Number.isInteger(+value) && +value > 0
            ? null
            : { millimeterInvalid: true };
    };
}

export function meterValidator(nameControl: AbstractControl): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const name = +nameControl.value;
        const value = parseFloat(control.value);

        const validValue = name / 1000;
        return Math.abs(value - validValue) < 0.0001
            ? null
            : { meterInvalid: true };
    };
}

export function centimeterValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const value = control.value;
        return Number.isInteger(+value) && +value > 0
            ? null
            : { centimeterInvalid: true };
    };
}


export function meterCentimeterValidator(nameControl: AbstractControl): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const nameInCentimeters = +nameControl.value;
        const valueInMeters = parseFloat(control.value);

        // Check if the name in centimeters correctly converts to meters
        const expectedValueInMeters = nameInCentimeters / 100;
        const isValidConversion = Math.abs(valueInMeters - expectedValueInMeters) < 0.0001;

        return isValidConversion
            ? null
            : { meterCentimeterInvalid: true };
    };
}

