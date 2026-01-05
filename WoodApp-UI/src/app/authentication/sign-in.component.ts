import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { AuthenticationService } from '../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export class SignInComponent implements OnInit {

  authService = inject(AuthenticationService);
  toastr = inject(ToastrService);
  router = inject(Router);

  hide: boolean = true;
  loginForm!: FormGroup;
  loading: boolean = false;

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

  get enterpriseRef() {
    return this.loginForm.get('enterpriseRef');
  }

  createForm() {
    this.loginForm = this.fb.group({
      login: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      enterpriseRef: ['', Validators.required]
    });
  }

  submit() {
    if (this.loginForm.valid) {
      this.loading = true;
      let formValues = this.loginForm.value;
      this.authService.login(formValues).subscribe({
        next: (response) => {
          this.toastr.success(response.message);
          this.router.navigateByUrl('home/dashboard');
          this.loading = false;
        },
        error: (error) => {
          this.toastr.error("Impossible de se connecter au serveur");
          this.toastr.show(error.message);
          this.loading = false;
        }
      });
    }
  }



}
