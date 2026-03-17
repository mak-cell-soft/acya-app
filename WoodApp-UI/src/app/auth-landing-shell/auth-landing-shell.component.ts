import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-auth-landing-shell',
  templateUrl: './auth-landing-shell.component.html',
  styleUrl: './auth-landing-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLandingShellComponent {
  // NOTE: Component logic intentionally kept minimal.
  // Styles handled in SCSS, animations via CSS transitions.
  // Provides current year for the dynamic footer copyright
  currentYear = new Date().getFullYear();
}
