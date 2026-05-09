import { Component, OnInit, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { DocumentService } from '../../services/components/document.service';
import { Document, DocumentTypes, typeDocsToFilter } from '../../models/components/document';

@Component({
  selector: 'app-accounting-dashboard',
  templateUrl: './accounting-dashboard.component.html',
  styleUrl: './accounting-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountingDashboardComponent implements OnInit {
  // Navigation
  years: number[] = [];
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() - 1; // Default to last month
  months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Achats (Purchase)
  achatsData: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  achatsColumns = ['date', 'supplier', 'reference', 'ht', 'tva', 'tax', 'rs', 'ttc'];
  isLoadingAchats = false;
  achatsFilter: string = '';

  achatsTotals = { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 };
  ventesTotals = { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 };

  // Ventes (Sell)
  ventesData: MatTableDataSource<Document> = new MatTableDataSource<Document>();
  ventesColumns = ['date', 'customer', 'number', 'ht', 'tva_pct', 'tva_val', 'tax', 'rs', 'ttc'];
  isLoadingVentes = false;
  ventesFilter: string = '';
  ventesNumberFilter: string = '';


  @ViewChild('achatsPaginator') achatsPaginator!: MatPaginator;
  @ViewChild('achatsSort') achatsSort!: MatSort;
  @ViewChild('ventesPaginator') ventesPaginator!: MatPaginator;
  @ViewChild('ventesSort') ventesSort!: MatSort;

  constructor(
    private documentService: DocumentService,
    private cdr: ChangeDetectorRef
  ) {
    // Fill years from 2020 to current + 1
    const currentYear = new Date().getFullYear();
    for (let i = 2020; i <= currentYear + 1; i++) {
      this.years.push(i);
    }

    // Handle month wrap around (if current is January, default to December previous year)
    if (this.selectedMonth < 0) {
      this.selectedMonth = 11;
      this.selectedYear -= 1;
    }
  }

  ngOnInit(): void {
    this.setupFilters();
    this.loadAllData();
  }

  setupFilters(): void {
    // Custom filter for Achats (Supplier name)
    this.achatsData.filterPredicate = (data: Document, filter: string) => {
      const searchStr = filter.toLowerCase();
      return data.counterpart?.name?.toLowerCase().includes(searchStr) ||
        data.docnumber?.toLowerCase().includes(searchStr);
    };

    // Custom filter for Ventes (Customer name and Invoice number)
    this.ventesData.filterPredicate = (data: Document, filter: string) => {
      const search = JSON.parse(filter);
      const nameMatch = !search.name || (
        data.counterpart?.name?.toLowerCase().includes(search.name.toLowerCase()) ||
        data.counterpart?.firstname?.toLowerCase().includes(search.name.toLowerCase()) ||
        data.counterpart?.lastname?.toLowerCase().includes(search.name.toLowerCase())
      );
      const numMatch = !search.number || data.docnumber?.toLowerCase().includes(search.number.toLowerCase());
      return nameMatch && numMatch;
    };
  }

  loadAllData(): void {
    this.loadAchats();
    this.loadVentes();
  }

  loadAchats(): void {
    this.isLoadingAchats = true;
    const filter: typeDocsToFilter = {
      year: this.selectedYear,
      month: this.selectedMonth + 1, // API is 1-indexed for months probably, but check. 
      // Actually the backend usually expects 1-12.
      day: 0,
      typeDoc: DocumentTypes.supplierInvoice
    };

    this.documentService.GetByTypeDocsFiltered(filter).subscribe({
      next: (docs) => {
        this.achatsData.data = docs;
        this.achatsData.paginator = this.achatsPaginator;
        this.achatsData.sort = this.achatsSort;
        this.calculateAchatsTotals();
        this.isLoadingAchats = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading achats', err);
        this.isLoadingAchats = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadVentes(): void {
    this.isLoadingVentes = true;
    const filter: typeDocsToFilter = {
      year: this.selectedYear,
      month: this.selectedMonth + 1,
      day: 0,
      typeDoc: DocumentTypes.customerInvoice
    };

    this.documentService.GetByTypeDocsFiltered(filter).subscribe({
      next: (docs) => {
        this.ventesData.data = docs;
        this.ventesData.paginator = this.ventesPaginator;
        this.ventesData.sort = this.ventesSort;
        this.calculateVentesTotals();
        this.isLoadingVentes = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading ventes', err);
        this.isLoadingVentes = false;
        this.cdr.markForCheck();
      }
    });
  }

  calculateAchatsTotals(): void {
    this.achatsTotals = this.achatsData.data.reduce((acc, doc) => {
      acc.ht += doc.total_ht_net_doc || 0;
      acc.tva += doc.total_tva_doc || 0;
      acc.tax += parseFloat(doc.taxe?.value || '0');
      acc.rs += doc.holdingtax?.taxvalue || 0;
      acc.ttc += doc.total_net_ttc || 0;
      acc.count++;
      return acc;
    }, { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 });
  }

  calculateVentesTotals(): void {
    this.ventesTotals = this.ventesData.data.reduce((acc, doc) => {
      acc.ht += doc.total_ht_net_doc || 0;
      acc.tva += doc.total_tva_doc || 0;
      acc.tax += parseFloat(doc.taxe?.value || '0');
      acc.rs += doc.holdingtax?.taxvalue || 0;
      acc.ttc += doc.total_net_ttc || 0;
      acc.count++;
      return acc;
    }, { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 });
  }

  onMonthSelected(event: any): void {
    this.selectedMonth = event.value;
    this.loadAllData();
  }

  prevYear(): void {
    this.selectedYear--;
    this.loadAllData();
  }

  nextYear(): void {
    this.selectedYear++;
    this.loadAllData();
  }

  applyAchatsFilter(): void {
    this.achatsData.filter = this.achatsFilter.trim().toLowerCase();
  }

  applyVentesFilter(): void {
    this.ventesData.filter = JSON.stringify({
      name: this.ventesFilter,
      number: this.ventesNumberFilter
    });
  }

  getTvaRate(doc: Document): string {
    if (!doc.total_ht_net_doc || doc.total_ht_net_doc === 0) return '—';
    const rate = (doc.total_tva_doc / doc.total_ht_net_doc) * 100;
    // Common Tunisian rates: 7, 13, 19
    return Math.round(rate) + '%';
  }
}


