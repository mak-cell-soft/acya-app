import { Component, OnInit, inject } from '@angular/core';
import { CounterpartService } from '../../services/components/counterpart.service';
import { DocumentService } from '../../services/components/document.service';
import { CounterPartType_FR } from '../../shared/constants/list_of_constants';
import { DocumentTypes } from '../../models/components/document';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { AuthenticationService } from '../../services/components/authentication.service';
import { PaymentService } from '../../services/components/payment.service';
import { DashboardPaymentDto } from '../../models/components/payment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home-dashboard',
  templateUrl: './home-dashboard.component.html',
  styleUrl: './home-dashboard.component.css'
})
export class HomeDashboardComponent implements OnInit {

  counterpartService = inject(CounterpartService);
  documentService = inject(DocumentService);
  authService = inject(AuthenticationService);
  paymentService = inject(PaymentService);
  router = inject(Router);

  selectedDate: Date = new Date();
  payments: DashboardPaymentDto[] = [];
  paymentMethodTotals: { method: string, total: number, icon: string, color: string }[] = [];
  paymentsLoading: boolean = false;

  // Data for Charts
  countsChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };
  countsChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  salesChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  salesChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Ventes des 7 derniers jours' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // KPIs
  customerCount: number = 0;
  providerCount: number = 0;
  dailySales: number = 0;

  loading: boolean = true;
  userName: string = 'Utilisateur'; // Could fetch from AuthService

  ngOnInit() {
    this.loadDashboardData();
    this.loadDashboardPayments();
    this.userName = this.authService.getUserDetail()?.fullname || 'Utilisateur';
  }

  loadDashboardPayments() {
    this.paymentsLoading = true;
    this.paymentService.GetDashboardPayments(this.selectedDate).subscribe({
      next: (payments) => {
        this.payments = payments;
        this.calculatePaymentTotals();
        this.paymentsLoading = false;
      },
      error: (err) => {
        console.error('Error loading payments', err);
        this.paymentsLoading = false;
      }
    });
  }

  onDateChange(event: any) {
    const dateInput = event.target.value;
    if (dateInput) {
      this.selectedDate = new Date(dateInput);
      this.loadDashboardPayments();
    }
  }

  calculatePaymentTotals() {
    const totals: { [key: string]: number } = {};
    const methodConfigs: { [key: string]: { icon: string, color: string } } = {
      'CASH': { icon: 'payments', color: '#66BB6A' }, // Green
      'ESPECE': { icon: 'payments', color: '#66BB6A' },
      'CHEQUE': { icon: 'contactless', color: '#FFA726' }, // Orange
      'VIREMENT': { icon: 'account_balance', color: '#42A5F5' }, // Blue
      'CARTE': { icon: 'credit_card', color: '#9575CD' }, // Purple
      'TRAITE': { icon: 'assignment', color: '#EF5350' } // Red
    };

    this.payments.forEach(p => {
      const method = (p.paymentMethod || 'AUTRE').toUpperCase();
      totals[method] = (totals[method] || 0) + p.amount;
    });

    this.paymentMethodTotals = Object.keys(totals).map(method => ({
      method: method,
      total: totals[method],
      icon: methodConfigs[method]?.icon || 'pi pi-wallet',
      color: methodConfigs[method]?.color || '#78909C'
    }));
  }

  getPaymentMethodColor(method: string): string {
    const colors: { [key: string]: string } = {
      'CASH': 'green',
      'ESPECE': 'green',
      'CHEQUE': 'orange',
      'VIREMENT': 'blue',
      'CARTE': 'purple',
      'TRAITE': 'red'
    };
    return colors[(method || '').toUpperCase()] || 'gray';
  }

  loadDashboardData() {
    this.loading = true;

    // 1. Fetch Customers and Providers
    const customers$ = this.counterpartService.GetAll(CounterPartType_FR.customer);
    const providers$ = this.counterpartService.GetAll(CounterPartType_FR.supplier);

    // 2. Fetch Sales (Invoices) - Assuming fetching all for now, optimization would be a backend aggregation endpoint
    const sales$ = this.documentService.GetByType(DocumentTypes.customerInvoice);

    forkJoin({
      customers: customers$,
      providers: providers$,
      sales: sales$
    }).subscribe({
      next: (data) => {
        // Customer vs Provider
        this.customerCount = data.customers.length;
        this.providerCount = data.providers.length;
        this.updateCountsChart();

        // Daily Sales & Sales Chart
        this.processSalesData(data.sales);

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        this.loading = false;
      }
    });
  }

  processSalesData(invoices: any[]) {
    // Filter for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = invoices.filter(inv => {
      const d = new Date(inv.creationdate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    this.dailySales = todaySales.reduce((acc, curr) => acc + (curr.total_net_ttc || 0), 0);

    // Prepare Sales Chart (e.g., Last 7 Days)
    const last7Days: Date[] = [];
    const salesData: number[] = [];
    const labels: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d);
      labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));

      // Sum sales for this day
      const dStart = new Date(d); dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);

      const dayTotal = invoices
        .filter(inv => {
          const invDate = new Date(inv.creationdate);
          return invDate >= dStart && invDate <= dEnd;
        })
        .reduce((sum, inv) => sum + (inv.total_net_ttc || 0), 0);

      salesData.push(dayTotal);
    }

    this.salesChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Ventes (TND)',
          data: salesData,
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        }
      ]
    };
  }

  updateCountsChart() {
    this.countsChartData = {
      labels: ['Clients', 'Fournisseurs'],
      datasets: [
        {
          data: [this.customerCount, this.providerCount],
          backgroundColor: [
            "#66BB6A",
            "#FFA726"
          ],
          hoverBackgroundColor: [
            "#81C784",
            "#FFB74D"
          ]
        }
      ]
    };
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
