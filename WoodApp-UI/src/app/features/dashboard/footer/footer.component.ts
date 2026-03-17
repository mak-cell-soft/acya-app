import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProfileModalComponent } from '../modals/profile-modal/profile-modal.component';
import { AuthenticationService } from '../../../services/components/authentication.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  private dialog = inject(MatDialog);
  private authService = inject(AuthenticationService);

  openProfileModal(): void {
    const userId = Number(this.authService.getUserDetail()?.id);
    this.dialog.open(ProfileModalComponent, {
      width: '800px',
      panelClass: 'premium-modal-panel',
      data: { id: userId },
      autoFocus: false
    });
  }
}
