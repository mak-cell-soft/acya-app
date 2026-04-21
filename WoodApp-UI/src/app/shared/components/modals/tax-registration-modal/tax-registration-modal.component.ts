import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

/**
 * TaxRegistrationModalComponent
 * 
 * Provides a specialized, high-end interface for entering the Tunisian Tax Registration Number (Matricule Fiscal).
 * The format follows the pattern: 1234567P /A/M/ 000
 * 
 * Aesthetic: "Eclipse Gold" - Refined dark theme with amber accents and smooth staggered motions.
 */
@Component({
  selector: 'app-tax-registration-modal',
  templateUrl: './tax-registration-modal.component.html',
  styleUrls: ['./tax-registration-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('modalFadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ])
    ]),
    trigger('staggerInputs', [
      transition(':enter', [
        query('.input-section', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ])
      ])
    ])
  ]
})
export class TaxRegistrationModalComponent implements OnInit {
  taxForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TaxRegistrationModalComponent>
  ) {
    this.taxForm = this.fb.group({
      // Part 1: 7 digits + 1 uppercase letter (e.g., 1234567P)
      part1: ['', [Validators.required, Validators.pattern(/^\d{7}[A-Z]$/)]],
      // Part 2: First letter (e.g., A)
      part2a: ['', [Validators.required, Validators.pattern(/^[A-Z]$/)]],
      // Part 2: Second letter (e.g., M)
      part2b: ['', [Validators.required, Validators.pattern(/^[A-Z]$/)]],
      // Part 3: 3 digits (usually 000)
      part3: ['000', [Validators.required, Validators.pattern(/^\d{3}$/)]]
    });
  }

  ngOnInit(): void {}

  /**
   * Automatically handles focus transition for Part 1
   * If length is 8 and valid, move to Part 2A
   */
  onPart1Input(event: any): void {
    const val = event.target.value.toUpperCase();
    this.taxForm.patchValue({ part1: val }, { emitEvent: false });
    
    if (val.length === 8 && /^\d{7}[A-Z]$/.test(val)) {
      this.focusNext('part2a-input');
    }
  }

  onPart2aInput(event: any): void {
    const val = event.target.value.toUpperCase();
    this.taxForm.patchValue({ part2a: val }, { emitEvent: false });
    if (val.length === 1) {
      this.focusNext('part2b-input');
    }
  }

  onPart2bInput(event: any): void {
    const val = event.target.value.toUpperCase();
    this.taxForm.patchValue({ part2b: val }, { emitEvent: false });
    if (val.length === 1) {
      this.focusNext('part3-input');
    }
  }

  onPart3Input(event: any): void {
    // Just uppercase for consistency if any letter was typed (though pattern is \d)
    const val = event.target.value;
    if (val.length === 3) {
      // Stay or submit
    }
  }

  private focusNext(id: string): void {
    const nextEl = document.getElementById(id);
    if (nextEl) {
      nextEl.focus();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Combines the 3 parts into the final string format: 1234567P /A/M/ 000
   */
  onSubmit(): void {
    if (this.taxForm.valid) {
      const { part1, part2a, part2b, part3 } = this.taxForm.value;
      // Pattern: ^\d{7}[A-Z] \/[A-Z]\/[A-Z]\/ \d{3}$
      const finalValue = `${part1} /${part2a}/${part2b}/ ${part3}`;
      this.dialogRef.close(finalValue);
    }
  }
}
