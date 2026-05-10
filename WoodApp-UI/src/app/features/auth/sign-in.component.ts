import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { AuthenticationService } from '../../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent implements OnInit {

  authService = inject(AuthenticationService);
  toastr = inject(ToastrService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  hide: boolean = true;
  loginForm!: FormGroup;
  loading: boolean = false;
  
  // Forgot password feature
  showForgotPanel: boolean = false;
  forgotEmail: string = '';
  isForgotLoading: boolean = false;
  resetToken: string | null = null;
  tokenExpiry: string | null = null;

  constructor(
    private fb: NonNullableFormBuilder
  ) { }

  ngOnInit(): void {
    this.createForm();
  }

  get login() {
    return this.loginForm.get('login');
  }

  get password() {
    return this.loginForm.get('password');
  }



  createForm() {
    this.loginForm = this.fb.group({
      login: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  submit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.cdr.markForCheck(); // NOTE: explicitly mark for check due to OnPush
      let formValues = this.loginForm.value;
      this.authService.login(formValues).subscribe({
        next: (response) => {
          /**
           * BUSINESS LOGIC ERROR HANDLING:
           * The backend returns 200 OK even for failed authentication attempts to avoid browser-level interception.
           * We check the isSuccess flag to determine if the login actually succeeded.
           */
          if (response.isSuccess) {
            this.toastr.success(`Authentification avec succès à ${response.enterpriseName}`, "Succès");
            this.router.navigateByUrl('home/dashboard');
          } else {
            // Business logic failures (incorrect password/email/enterprise)
            this.toastr.warning(response.message, "Avertissement connexion");
          }
          
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          /**
           * TECHNICAL/INFRASTRUCTURE ERROR HANDLING:
           * This block is only triggered if the server is unreachable, CORS fails, or a 500 error occurs.
           */
          this.loading = false;
          this.toastr.error("Impossible de joindre le serveur. Vérifiez votre connexion.", "Erreur réseau");
          this.cdr.markForCheck();
        }
      });
    }
  }
  
  openForgotPanel() {
    this.showForgotPanel = !this.showForgotPanel;
    this.resetToken = null;
    this.cdr.markForCheck();
  }

  submitForgotPassword() {
    if (!this.forgotEmail || !this.forgotEmail.includes('@')) {
      this.toastr.warning("Veuillez saisir un email valide.", "Attention");
      return;
    }

    this.isForgotLoading = true;
    this.cdr.markForCheck();

    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.resetToken = res.token;
        this.tokenExpiry = res.expiresAt;
        this.isForgotLoading = false;
        this.toastr.success(res.message, "Succès");
        this.cdr.markForCheck();
      },
      error: () => {
        this.isForgotLoading = false;
        this.toastr.error("Une erreur est survenue.", "Erreur");
        this.cdr.markForCheck();
      }
    });
  }

}
