import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-accounting-dashboard',
  templateUrl: './accounting-dashboard.component.html',
  styleUrl: './accounting-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountingDashboardComponent {
  constructor() {}
}

