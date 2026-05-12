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
import { AuditLog } from '../../../models/audit-log';
import { AuditDetailsModalComponent } from '../modals/audit-details-modal/audit-details-modal.component';
import { BankDepositService } from '../../../services/treasury/bank-deposit.service';
import { CaisseService } from '../../../services/treasury/caisse.service';
import { BankBalance } from '../../../models/bank-deposit';

@Component({
  selector: 'app-accounting-balance-dashboard',
  templateUrl: './accounting-balance-dashboard.component.html',
  styleUrls: ['./accounting-balance-dashboard.component.css']
})
export class AccountingBalanceDashboardComponent implements OnInit {
    customerBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    supplierBalances: MatTableDataSource<BalanceEntry> = new MatTableDataSource<BalanceEntry>();
    
    // Treasury data
    bankBalances: BankBalance[] = [];
    siteBalances: any[] = [];
    totalCaissePrincipale: number = 0;
    loadingTreasury = false;
    loading = false;
    activeTab: 'customers' | 'suppliers' = 'customers';
    displayedColumns: string[] = ['label', 'closingBalance', 'lastTransaction', 'lastTxDate', 'action'];
    kpis: DashboardKpi | undefined;
    customerFilter: string = '';
    supplierFilter: string = '';

    // Audit logs
    auditLogs = new MatTableDataSource<AuditLog>();
    loadingAudit = false;
    displayedAuditColumns: string[] = ['userName', 'action', 'tableName', 'timestamp', 'details'];
    auditUserFilter: string = '';
    auditDateFilter: Date | null = null;

    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
    @ViewChild('customerPaginator') customerPaginator!: MatPaginator;
    @ViewChild('supplierPaginator') supplierPaginator!: MatPaginator;
    @ViewChild('auditPaginator') auditPaginator!: MatPaginator;

    // Reporting Properties
    reportStartDate: Date | null = null;
    reportEndDate: Date | null = null;
    isExporting = false;

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
        private bankService: BankDepositService,
        private caisseService: CaisseService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadData();
        this.loadKpis();
        this.loadAuditLogs();
        this.loadTreasuryData();
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

    openDepositDialog() {
        import('../modals/bank-deposit-modal/bank-deposit-modal.component').then(m => {
            const dialogRef = this.dialog.open(m.BankDepositModalComponent, {
                width: '550px',
                maxWidth: '95vw',
                data: { siteId: null } // null for admin/main caisse or let them choose?
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) this.loadTreasuryData();
            });
        });
    }

    refresh(): void {
        this.loading = true;
        this.adminDashService.refreshBalances().subscribe({
            next: () => {
                this.loadData();
                this.loadTreasuryData();
            },
            error: () => this.loading = false
        });
    }

    loadTreasuryData(): void {
        this.loadingTreasury = true;
        
        // Load Bank Balances
        this.bankService.getAllBankBalances().subscribe({
            next: (balances) => this.bankBalances = balances,
            error: (err) => console.error('Failed to load bank balances', err)
        });

        // Load Site Caisse Balances
        this.caisseService.getAllBalances().subscribe({
            next: (sites) => {
                this.siteBalances = sites;
                this.totalCaissePrincipale = sites.reduce((sum, s) => sum + s.currentBalance, 0);
                this.loadingTreasury = false;
            },
            error: (err) => {
                console.error('Failed to load site balances', err);
                this.loadingTreasury = false;
            }
        });
    }

    loadAuditLogs(): void {
        this.loadingAudit = true;
        const dateStr = this.auditDateFilter ? this.auditDateFilter.toISOString() : undefined;
        this.adminDashService.getRecentAuditLogs(50, this.auditUserFilter, dateStr).subscribe({
            next: (data) => {
                this.auditLogs.data = data;
                this.auditLogs.paginator = this.auditPaginator;
                this.loadingAudit = false;
            },
            error: (err) => {
                console.error('Failed to load audit logs', err);
                this.loadingAudit = false;
            }
        });
    }

    translateAction(action: string): string {
        switch (action) {
            case 'Insert': return 'Ajout';
            case 'Update': return 'Modification';
            case 'Delete': return 'Suppression';
            default: return action;
        }
    }

    getEntityName(tableName: string): string {
        const mapping: { [key: string]: string } = {
            'tbl_document': 'Document',
            'tbl_counter_part': 'Tiers',
            'tbl_stock': 'Stock',
            'tbl_payments': 'Paiement',
            'tbl_article': 'Article',
            'tbl_merchandise': 'Marchandise',
            'AuditLogs': 'Journal d\'Audit',
            'EmployeePayslip': 'Fiche de paie',
            'Enterprise': 'Entreprise'
        };
        return mapping[tableName] || tableName;
    }

    humanizeAudit(log: AuditLog): string {
        const entity = this.getEntityName(log.tableName);
        const action = this.translateAction(log.action);
        
        if (log.action === 'Insert') {
            return `${action} d'un nouveau ${entity}`;
        }
        
        if (log.action === 'Delete') {
            return `${action} du ${entity} ID: ${log.keyValues}`;
        }

        if (log.action === 'Update' && log.changedColumns) {
            try {
                const changed = JSON.parse(log.changedColumns) as string[];
                return `Mise à jour des champs [${changed.join(', ')}] sur le ${entity}`;
            } catch {
                return `${action} sur le ${entity}`;
            }
        }

        return `${action} sur le ${entity}`;
    }

    refreshAudit(): void {
        this.loadAuditLogs();
    }

    showAuditDetails(log: AuditLog): void {
        // Implement dialogue or expansion for details
        console.log('Audit Details', log);
        // For now, a simple alert or ideally a dialog.
        // A dialog showing oldValues and newValues JSON would go here.
        // I will use MatDialog for a simple component or just alert if we don't have a component.
        // Let's create a dynamic dialog to show JSON.
        this.dialog.open(AuditDetailsModalComponent, {
            width: '600px',
            data: log
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

    onExport(type: string, format: string): void {
        this.isExporting = true;
        const filters = {
            startDate: this.reportStartDate?.toISOString(),
            endDate: this.reportEndDate?.toISOString()
        };

        this.adminDashService.exportReport(type, format, filters).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Report_${type}_${new Date().getTime()}.${format}`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.isExporting = false;
            },
            error: (err) => {
                console.error('Export failed', err);
                this.isExporting = false;
            }
        });
    }
}
