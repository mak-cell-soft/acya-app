import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit {
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  authService = inject(AuthenticationService);
  toastr = inject(ToastrService);
  cdr = inject(ChangeDetectorRef);

  resetForm!: FormGroup;
  loading: boolean = false;
  token: string | null = null;
  hideNew: boolean = true;
  hideConfirm: boolean = true;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.createForm();
  }

  createForm() {
    this.resetForm = this.fb.group({
      token: [this.token, Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  submit() {
    if (this.resetForm.valid) {
      this.loading = true;
      this.cdr.markForCheck();

      this.authService.resetPassword(this.resetForm.value).subscribe({
        next: (res: any) => {
          this.toastr.success(res.message, "Succès");
          this.router.navigate(['/login']);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toastr.error(err.error || "Une erreur est survenue", "Erreur");
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }
}
