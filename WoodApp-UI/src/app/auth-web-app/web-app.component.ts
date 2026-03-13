import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-auth-web-app',
  templateUrl: './web-app.component.html',
  styleUrl: './web-app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebAppComponent {
  // NOTE: Component logic intentionally kept minimal.
  // Styles handled in SCSS, animations via CSS transitions.
  // Provides current year for the dynamic footer copyright
  currentYear = new Date().getFullYear();
}
