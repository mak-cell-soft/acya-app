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

  onBack(): void {
    this.router.navigate(['/home/providers']);
  }
}
