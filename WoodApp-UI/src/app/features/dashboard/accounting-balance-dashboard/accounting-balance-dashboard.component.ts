import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { AdminDashService } from '../../../services/components/admin-dash.service';
import { BalanceEntry } from '../../../models/balance-entry';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CustomerAccountModalComponent } from '../../customers/customer-account-modal/customer-account-modal.component';
import { CounterPart } from '../../../models/components/counterpart';
import { AnalyticsService } from '../../../services/components/analytics.service';
import { DashboardKpi } from '../../../models/analytics';

@Component({
  selector: 'app-accounting-balance-dashboard',
  templateUrl: './accounting-balance-dashboard.component.html',
  styleUrls: ['./accounting-balance-dashboard.component.css']
})
export class AccountingBalanceDashboardComponent implements OnInit {
    customerBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    supplierBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    loading = false;
    activeTab: 'customers' | 'suppliers' = 'customers';
    displayedColumns: string[] = ['label', 'closingBalance', 'lastTransaction', 'lastTxDate', 'action'];
    kpis: DashboardKpi | undefined;
    customerFilter: string = '';
    supplierFilter: string = '';

    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
    @ViewChild('customerPaginator') customerPaginator!: MatPaginator;
    @ViewChild('supplierPaginator') supplierPaginator!: MatPaginator;

    // Chart Properties
    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        scales: {
            x: {},
            y: { min: 0 }
        },
        plugins: {
            legend: { display: true },
        }
    };
    public barChartType: ChartType = 'bar';
    public barChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [
            { data: [], label: 'Solde de Clôture (TND)', backgroundColor: '#3f51b5' }
        ]
    };

    constructor(
        private adminDashService: AdminDashService, 
        private analyticsService: AnalyticsService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadData();
        this.loadKpis();
    }

    loadData(): void {
        this.loading = true;
        this.adminDashService.getCustomerBalances().subscribe({
            next: (data) => {
                this.customerBalances.data = data;
                this.customerBalances.paginator = this.customerPaginator;
                if (this.activeTab === 'customers') this.updateChart();
                this.loading = false;
            },
            error: () => this.loading = false
        });

        this.adminDashService.getSupplierBalances().subscribe({
            next: (data) => {
                this.supplierBalances.data = data;
                this.supplierBalances.paginator = this.supplierPaginator;
                if (this.activeTab === 'suppliers') this.updateChart();
            }
        });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        if (this.activeTab === 'customers') {
            this.customerBalances.filter = filterValue.trim().toLowerCase();
        } else {
            this.supplierBalances.filter = filterValue.trim().toLowerCase();
        }
    }

    loadKpis(): void {
        this.analyticsService.getDashboardKpis().subscribe({
            next: (data) => this.kpis = data,
            error: (err) => console.error('Failed to load KPIs', err)
        });
    }

    onShowAccount(entry: BalanceEntry): void {
        this.dialog.open(CustomerAccountModalComponent, {
            width: '90vw',
            maxWidth: '1200px',
            data: { customer: { id: entry.id } as CounterPart }
        });
    }

    refresh(): void {
        this.loading = true;
        this.adminDashService.refreshBalances().subscribe({
            next: () => this.loadData(),
            error: () => this.loading = false
        });
    }

    switchTab(tab: 'customers' | 'suppliers'): void {
        this.activeTab = tab;
        this.updateChart();
    }

    updateChart(): void {
        const data = this.activeTab === 'customers' ? this.customerBalances.data : this.supplierBalances.data;
        // Sort and take top 10
        const top10 = [...data].sort((a, b) => b.closingBalance - a.closingBalance).slice(0, 10);

        this.barChartData.labels = top10.map(item => item.label);
        this.barChartData.datasets[0].data = top10.map(item => item.closingBalance);
        this.barChartData.datasets[0].label = this.activeTab === 'customers' ? 'Top 10 Soldes Clients' : 'Top 10 Soldes Fournisseurs';
        this.barChartData.datasets[0].backgroundColor = this.activeTab === 'customers' ? '#3f51b5' : '#ff4081';

        this.chart?.update();
    }
}
