import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function atLeastOneRequiredValidator(...fields: string[]): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
        const isValid = fields.some(field => {
            const value = formGroup.get(field)?.value;
            return value && value.trim() !== ''; // Check if the field is not empty
        });
        return isValid ? null : { atLeastOneRequired: true };
    };
}

export function vehiculeMatriculeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        // Regex pattern explanation:
        // ^ - Start of the string
        // \d{3} - Exactly three digits
        // \s - A single space
        // [A-Za-z]{2,3} - Two or three letters (case-insensitive)
        // \s - A single space
        // \d{1,4} - Between one and four digits
        // $ - End of the string
        const pattern = /^\d{2,3}\s[A-Za-z]{2,3}\s\d{1,4}$/;

        if (!value) {
            return null; // Allow empty values if not required
        }

        const isValid = pattern.test(value);
        return isValid ? null : { vehiculeMatriculeInvalid: true };
    };
}

export function numericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        const isValid = /^[0-9]*$/.test(value);
        return isValid ? null : { numeric: true };
    };
}

export function uppercaseAlphanumericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        const isValid = /^[A-Z0-9]*$/.test(value);
        return isValid ? null : { uppercaseAlphanumeric: true };
    };
}

