import { Component, OnInit, ViewChild } from '@angular/core';
import { AdminDashService } from '../../services/components/admin-dash.service';
import { BalanceEntry } from '../../models/balance-entry';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CustomerAccountModalComponent } from '../../components/customers/customer-account-modal/customer-account-modal.component';
import { CounterPart } from '../../models/components/counterpart';

@Component({
    selector: 'app-admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
    customerBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    supplierBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    loading = false;
    activeTab: 'customers' | 'suppliers' = 'customers';
    displayedColumns: string[] = ['label', 'closingBalance', 'lastTransaction', 'lastTxDate', 'action'];

    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

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

    constructor(private adminDashService: AdminDashService, private dialog: MatDialog) { }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.loading = true;
        this.adminDashService.getCustomerBalances().subscribe({
            next: (data) => {
                this.customerBalances.data = data;
                if (this.activeTab === 'customers') this.updateChart();
                this.loading = false;
            },
            error: () => this.loading = false
        });

        this.adminDashService.getSupplierBalances().subscribe({
            next: (data) => {
                this.supplierBalances.data = data;
                if (this.activeTab === 'suppliers') this.updateChart();
            }
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
