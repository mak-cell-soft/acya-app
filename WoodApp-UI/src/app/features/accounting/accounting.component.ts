import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-accounting',
  templateUrl: './accounting.component.html',
  styleUrl: './accounting.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountingComponent {
  constructor() {}
}
