import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { SupplierDashboard } from '../../../models/components/supplier-dashboard';
import { BehaviorSubject } from 'rxjs';
import { DocStatus, DocStatus_FR, DocumentTypes, DocTypes_FR } from '../../../models/components/document';

@Component({
  selector: 'app-supplier-dashboard',
  templateUrl: './supplier-dashboard.component.html',
  styleUrls: ['./supplier-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierDashboardComponent implements OnInit {
  dashboard$ = new BehaviorSubject<SupplierDashboard | null>(null);
  loading$ = new BehaviorSubject<boolean>(true);
  
  docStatus_FR = DocStatus_FR;
  docTypes_FR = DocTypes_FR;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private counterpartService: CounterpartService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDashboard(+id);
    }
  }

  loadDashboard(id: number): void {
    this.loading$.next(true);
    this.counterpartService.getSupplierDashboard(id).subscribe({
      next: (data) => {
        this.dashboard$.next(data);
        this.loading$.next(false);
      },
      error: (err) => {
        console.error('Error loading supplier dashboard', err);
        this.loading$.next(false);
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getDocTypeLabel(type: any): string {
    return DocTypes_FR[DocumentTypes[type] as keyof typeof DocTypes_FR] || type?.toString() || '-';
  }

  getDocStatusLabel(status: any): string {
    return DocStatus_FR[DocStatus[status] as keyof typeof DocStatus_FR] || status?.toString() || '-';
  }

  getTransactionTypeLabel(type: string): string {
    if (!type) return '-';
    return this.docTypes_FR[type as keyof typeof DocTypes_FR] || type;
  }

  getPaymentMethod(description: string | undefined): string | null {
    if (!description) return null;
    // Look for "Paiement (METHOD)" pattern
    const match = description.match(/Paiement \((.*?)\)/);
    return match ? match[1] : null;
  }

  getCleanDescription(item: any): string {
    if (!item.description) return '';
    // If it has the "Paiement (METHOD) - " prefix, we might want to keep just the rest for the body
    // but the user might want both. Let's keep it simple for now or strip the prefix.
    return item.description.replace(/Paiement \(.*?\)\s*-\s*/, '');
  }

  onBack(): void {
    this.router.navigate(['/home/providers']);
  }
}
