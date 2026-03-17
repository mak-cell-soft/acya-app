import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { AccountService } from '../../../../services/components/account.service';
import { AppUser } from '../../../../models/components/appuser';
import { ProfileUpdate, PasswordUpdate } from '../../../../models/components/Authentication/profile-management';

@Component({
  selector: 'app-profile-modal',
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.scss']
})
export class ProfileModalComponent implements OnInit {
  
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  isSaving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  
  hideOld = true;
  hideNew = true;
  hideConfirm = true;
  
  activeTab = 0;
  userId: number;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProfileModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private accountService: AccountService
  ) {
    this.userId = data.id;
    this.initForms();
  }

  ngOnInit(): void {
    if (this.userId) {
      this.loadProfile(this.userId);
    }
  }

  private initForms(): void {
    this.profileForm = this.fb.group({
      login: [{ value: '', disabled: false }],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: [''],
      address: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  private loadProfile(id: number): void {
    this.accountService.getProfile(id).subscribe({
      next: (user: AppUser) => {
        this.profileForm.patchValue({
          login: user.login,
          email: user.email,
          firstName: user.person?.firstname,
          lastName: user.person?.lastname,
          phoneNumber: user.person?.phonenumber,
          address: user.person?.address
        });
      },
      error: (err: any) => {
        this.showMessage('Erreur lors du chargement du profil', 'error');
      }
    });
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSaving = true;
    const model: ProfileUpdate = this.profileForm.getRawValue();

    this.accountService.updateProfile(model).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMessage('Profil mis à jour avec succès', 'success');
      },
      error: (err: any) => {
        this.isSaving = false;
        this.showMessage('Erreur lors de la mise à jour', 'error');
      }
    });
  }

  onUpdatePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isSaving = true;
    const model: PasswordUpdate = {
      oldPassword: this.passwordForm.value.oldPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.accountService.updatePassword(model).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMessage('Mot de passe mis à jour avec succès', 'success');
        this.passwordForm.reset();
      },
      error: (err: any) => {
        this.isSaving = false;
        const errMsg = err.error?.message || 'Identifiants invalides ou erreur serveur';
        this.showMessage(errMsg, 'error');
      }
    });
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
