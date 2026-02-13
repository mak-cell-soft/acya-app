import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DocumentDetailModalComponent } from '../list-customer-documents/document-detail-modal/document-detail-modal.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { BillingStatus, DocStatus, DocStatus_FR, Document, DocumentTypes } from '../../../../models/components/document';
import { Router } from '@angular/router';
import { DocumentService } from '../../../../services/components/document.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-list-customer-invoices',
    templateUrl: './list-customer-invoices.component.html',
    styleUrl: './list-customer-invoices.component.css'
})
export class ListCustomerInvoicesComponent implements OnInit, AfterViewInit {

    router = inject(Router);
    docService = inject(DocumentService);
    dialog = inject(MatDialog);
    toastr = inject(ToastrService);

    // Filters
    filterClient: string = '';
    filterDate: Date | null = new Date(); // Default to today
    filterStartDate?: Date;
    filterEndDate?: Date;

    // Data
    allCustomerInvoices: MatTableDataSource<Document> = new MatTableDataSource<Document>();
    displayedColumns: string[] = ['reference', 'date', 'counterPart', 'amount', 'status', 'isInvoiced', 'sellSite', 'action'];
    selection = new SelectionModel<any>(false, []);

    // Summary
    totalHt: number = 0;
    totalTva: number = 0;
    totalTtc: number = 0;
    invoiceCount: number = 0;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    // Enums for Template
    DocStatus = DocStatus;
    BillingStatus = BillingStatus;
    isLoading: boolean = false;

    ngAfterViewInit() {
        this.allCustomerInvoices.paginator = this.paginator;
    }

    ngOnInit() {
        // Initial load: Fetch invoices for today
        this.fetchInvoices();
    }

    fetchInvoices() {
        this.isLoading = true;
        // Note: The backend generally handles retrieving by type. 
        // If the API supports filtering by date params directly, we would use that.
        // Based on reference, it fetches by type then filters or fetches specific filtered type.
        // The user requirement says "fetching documents via the equivalent of getAllCustomerDeliveryNotesDocuments()".
        // Reference uses `docService.GetByType(DocumentTypes.customerDeliveryNote)` which returns ALL.
        // However, it also has `GetByTypeDocsFiltered`.
        // Given the Default Behavior "Initial load: Automatically fetch and display invoices for the current date (today)",
        // and "Update all cards when date filters change", I should probably filter efficiently.
        // For now, I will fetch all (or filtered if possible) and apply client/date filters locally or via API if available.
        // The reference `getAllCustomerDeliveryNotesDocumentsFiltered` uses `typeDoc`, `month`, `year`, `day`.
        // It seems restrictive for "Date Range".
        // I will fetch all invoices of this type and filter them client-side for the prototype 
        // OR check if `GetByType` can be optimized. Reference logic seems to fetch by day frequently.

        // Changing strategy: Fetch ALL customer invoices, then apply the client/date filters on the DataSource.
        // This might be heavy but ensures I match the "Filter Card" requirement flexibly.

        this.docService.GetByType(DocumentTypes.customerInvoice).subscribe({
            next: (response: Document[]) => {
                let filteredData = response;
                console.log(filteredData);
                this.allCustomerInvoices.data = filteredData;
                // Filter by Date (Single Date)
                if (this.filterDate && !this.filterStartDate && !this.filterEndDate) {
                    filteredData = filteredData.filter(d => this.isSameDay(new Date(d.updatedate), this.filterDate!));
                    // Note: using updatedate as per reference (or creationdate?) Reference uses updatedate in table display.
                }

                // Filter by Date Range
                if (this.filterStartDate && this.filterEndDate) {
                    filteredData = filteredData.filter(d => {
                        const docDate = new Date(d.updatedate);
                        return docDate >= this.filterStartDate! && docDate <= this.filterEndDate!;
                    });
                }

                // Filter by Client
                if (this.filterClient) {
                    const search = this.filterClient.toLowerCase();
                    filteredData = filteredData.filter(d =>
                        d.counterpart?.firstname?.toLowerCase().includes(search) ||
                        d.counterpart?.lastname?.toLowerCase().includes(search) ||
                        d.counterpart?.name?.toLowerCase().includes(search)
                    );
                }

                // Sort desc
                filteredData.sort((a, b) => (b.docnumber || "").localeCompare(a.docnumber || ""));

                this.allCustomerInvoices.data = filteredData;
                this.updateSummary();
                this.isLoading = false;
            },
            error: (error) => {
                console.error(error);
                this.toastr.error('Erreur lors du chargement des factures');
                this.isLoading = false;
            }
        });
    }

    isSameDay(d1: Date, d2: Date): boolean {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    onFilterChange() {
        // Re-fetch or Re-filter?
        // If we fetched everything, we could just filter local data, but the `fetchInvoices` logic above fetches freshly.
        // This is safer for data consistency.
        this.fetchInvoices();
    }

    updateSummary() {
        this.invoiceCount = this.allCustomerInvoices.data.length;
        this.totalHt = this.allCustomerInvoices.data.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
        this.totalTva = this.allCustomerInvoices.data.reduce((acc, curr) => acc + (curr.total_tva_doc || 0), 0);
        this.totalTtc = this.totalHt + this.totalTva;
    }

    onDetail(doc: Document) {
        const dialogRef = this.dialog.open(DocumentDetailModalComponent, {
            width: '800px',
            maxHeight: '90vh',
            data: doc
        });
    }

    onAddNew() {
        this.router.navigateByUrl('home/customerinvoices/add');
    }

    onExport() {
        // Implement export if needed
    }

    // Helpers for Status
    getStatusInfo(status: DocStatus): { text: string, color: string, bgColor: string } {
        switch (status) {
            case DocStatus.Delivered: return { text: DocStatus_FR.Delivered, color: '#2e7d32', bgColor: '#e8f5e9' };
            case DocStatus.Abandoned: return { text: DocStatus_FR.Abandoned, color: '#c62828', bgColor: '#ffebee' };
            case DocStatus.Created: return { text: DocStatus_FR.Created, color: '#1565c0', bgColor: '#e3f2fd' };
            case DocStatus.Deleted: return { text: DocStatus_FR.Deleted, color: '#37474f', bgColor: '#eceff1' };
            case DocStatus.NotDelivered: return { text: DocStatus_FR.NotDelivered, color: '#ef6c00', bgColor: '#fff3e0' };
            case DocStatus.NotConfirmed: return { text: DocStatus_FR.NotConfirmed, color: '#f9a825', bgColor: '#fffde7' };
            case DocStatus.Confirmed: return { text: DocStatus_FR.Confirmed, color: '#2e7d32', bgColor: '#e8f5e9' };
            default: return { text: 'Inconnu', color: '#37474f', bgColor: '#eceff1' };
        }
    }

    getBillingStatusInfo(status: BillingStatus): { text: string, color: string, bgColor: string } {
        switch (status) {
            case BillingStatus.NotBilled: return { text: 'Non Payé', color: '#d84315', bgColor: '#fbe9e7' };
            case BillingStatus.Billed: return { text: 'Payé', color: '#2e7d32', bgColor: '#e8f5e9' };
            case BillingStatus.PartiallyBilled: return { text: 'Partiellement Payé', color: '#f9a825', bgColor: '#fffde7' };
            default: return { text: 'Non Payé', color: '#d84315', bgColor: '#fbe9e7' };
        }
    }
}
