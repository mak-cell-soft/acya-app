import { Component, Input } from '@angular/core';
import { DocStatus } from '../../../models/components/document';

@Component({
  selector: 'app-approval-badge',
  template: `
    <span class="badge-container" [ngClass]="getBadgeClass()">
      <i class="fas" [ngClass]="getBadgeIcon()"></i>
      {{ getBadgeLabel() }}
    </span>
  `,
  styles: [`
    .badge-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-pending {
      background-color: #fff4e5;
      color: #663c00;
      border: 1px solid #ffd599;
    }
    .badge-approved {
      background-color: #e6fffa;
      color: #065666;
      border: 1px solid #81e6d9;
    }
    .badge-rejected {
      background-color: #fff5f5;
      color: #822727;
      border: 1px solid #feb2b2;
    }
    .badge-submitted {
      background-color: #ebf8ff;
      color: #2c5282;
      border: 1px solid #90cdf4;
    }
  `]
})
export class ApprovalBadgeComponent {
  @Input() status: number | undefined;

  getBadgeClass(): string {
    switch (this.status) {
      case 13: return 'badge-submitted';
      case 14: return 'badge-pending';
      case 15: return 'badge-approved';
      case 16: return 'badge-rejected';
      default: return '';
    }
  }

  getBadgeIcon(): string {
    switch (this.status) {
      case 13: return 'fa-paper-plane';
      case 14: return 'fa-hourglass-half';
      case 15: return 'fa-check-circle';
      case 16: return 'fa-times-circle';
      default: return '';
    }
  }

  getBadgeLabel(): string {
    switch (this.status) {
      case 13: return 'Soumis';
      case 14: return 'En attente';
      case 15: return 'Approuvé';
      case 16: return 'Rejeté';
      default: return 'Inconnu';
    }
  }
}
