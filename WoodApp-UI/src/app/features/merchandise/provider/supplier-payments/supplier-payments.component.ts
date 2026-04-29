// Angular core imports
import { Component, OnInit, inject, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Router
import { ActivatedRoute, Router } from '@angular/router';

// RxJS — Subject and operators must all be imported
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Chart.js
import { Chart, registerables } from 'chart.js';

// App services
import { PaymentService } from '../../../../services/components/payment.service';
import { CounterpartService } from '../../../../services/components/counterpart.service';
import { DocumentService } from '../../../../services/components/document.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { EnterpriseService } from '../../../../services/components/enterprise.service';

// App models
import { Payment, SupplierEcheanceDto } from '../../../../models/components/payment';
import { Document, DocumentTypes } from '../../../../models/components/document';
import { CounterPart } from '../../../../models/components/counterpart';
import { CounterPartType_FR } from '../../../../shared/constants/list_of_constants';

// Shared components
import { PaymentModalComponent } from '../../../../shared/components/modals/payment-modal/payment-modal.component';
import { EcheanceDetailsModalComponent } from './echeance-details-modal/echeance-details-modal.component';
import { MatToolbar } from "@angular/material/toolbar";

// Register Chart.js plugins once
Chart.register(...registerables);

@Component({
  selector: 'app-supplier-payments',
  templateUrl: './supplier-payments.component.html',
  styleUrls: ['./supplier-payments.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatToolbar,
    MatProgressBarModule,
    MatProgressSpinnerModule
]
})
export class SupplierPaymentsComponent implements OnInit, AfterViewInit, OnDestroy {
  private paymentService = inject(PaymentService);
  private counterpartService = inject(CounterpartService);
  private docService = inject(DocumentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthenticationService);
  private enterpriseService = inject(EnterpriseService);

  // Subject used by takeUntil to cancel all subscriptions on destroy
  private destroy$ = new Subject<void>();

  // Table data sources
  invoicesDataSource = new MatTableDataSource<Document>([]);
  traitesDataSource = new MatTableDataSource<Payment>([]);

  @ViewChild('invoicePaginator') invoicePaginator!: MatPaginator;
  @ViewChild('traitePaginator') traitePaginator!: MatPaginator;
  @ViewChild('invoiceSort') invoiceSort!: MatSort;
  @ViewChild('traiteSort') traiteSort!: MatSort;

  // Chart — typed to ensure safe nativeElement access
  @ViewChild('echeanceChart') echeanceChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  // Flag so we only attempt chart init after the view is ready
  private viewInitialized = false;

  // KPI summary values (all monetary amounts in TND)
  kpis = {
    remaining: 0,      // Total remaining balance across unpaid invoices
    pendingTraites: 0, // Sum of traite amounts not yet paid at bank
    overdue: 0,        // Sum of traite amounts past their due date
    paidInBank: 0,     // Sum of traite amounts confirmed paid at bank
    totalCreditNotes: 0 // Sum of credit notes applied
  };

  // UI state
  loading = false;
  selectedSupplier: CounterPart | null = null;
  allSuppliers: CounterPart[] = [];
  enterpriseName: string = '';
  enterpriseId: number = 0;

  // Column definitions for both tables
  displayedInvoiceColumns = ['docnumber', 'updatedate', 'total_net_ttc', 'total_paid', 'remaining_balance', 'actions'];
  displayedTraiteColumns = ['paymentMethod', 'instrumentNumber', 'bank', 'dueDate', 'amount', 'isPaidAtBank', 'actions'];

  // Filter state
  showSettledInvoices = false;
  projectionDays = 120; // Default to 120 days projection


  ngOnInit() {
    this.loadSuppliers();
    this.loadEnterpriseInfo();

    // Auto-select supplier if supplierId is in query params (e.g. navigated from invoice list)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['supplierId']) {
        const id = +params['supplierId'];
        // If suppliers are already loaded, select immediately; otherwise fetch first
        if (this.allSuppliers.length > 0) {
          this.selectSupplierById(id);
        } else {
          this.counterpartService.GetAll(CounterPartType_FR.supplier).pipe(takeUntil(this.destroy$)).subscribe(data => {
            this.allSuppliers = data;
            this.selectSupplierById(id);
          });
        }
      }
    });
  }

  ngAfterViewInit() {
    // Wire paginator and sort to data sources after DOM is ready
    this.invoicesDataSource.paginator = this.invoicePaginator;
    this.invoicesDataSource.sort = this.invoiceSort;
    this.traitesDataSource.paginator = this.traitePaginator;
    this.traitesDataSource.sort = this.traiteSort;

    // Mark view as ready so initChart won't crash on a null canvas ref
    this.viewInitialized = true;

    // Load écheance projection for the chart
    this.loadEcheances();
  }

  ngOnDestroy() {
    // Cancel all active subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Destroy Chart.js instance to free WebGL/Canvas resources
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  // ─── Supplier selection ─────────────────────────────────────────────────────

  loadSuppliers() {
    this.counterpartService.GetAll(CounterPartType_FR.supplier).pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.allSuppliers = data;
    });
  }

  loadEnterpriseInfo() {
    const user = this.authService.getUserDetail();
    if (user && user.enterpriseId) {
      this.enterpriseId = +user.enterpriseId;
      this.enterpriseService.getEnterpriseInfo(this.enterpriseId).pipe(takeUntil(this.destroy$)).subscribe(ent => {
        this.enterpriseName = ent.name;
      });
    }
  }

  // Called by mat-autocomplete (optionSelected) — receives the selected Provider object
  onSupplierSelect(supplier: CounterPart) {
    if (!supplier || typeof supplier === 'string') return;
    this.selectedSupplier = supplier;
    // Persist selection in URL so the page can be bookmarked / refreshed
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { supplierId: supplier.id },
      queryParamsHandling: 'merge'
    });
    this.loadSupplierData();
  }

  // Internal helper — select a supplier by ID after the list is loaded
  private selectSupplierById(id: number) {
    const supplier = this.allSuppliers.find((s: CounterPart) => s.id === id);
    if (supplier) {
      this.selectedSupplier = supplier;
      this.loadSupplierData();
    }
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  loadSupplierData() {
    if (!this.selectedSupplier) return;
    this.loading = true;

    // Use forkJoin to wait for both invoices and payments history
    forkJoin({
      invoices: this.docService.GetByType(DocumentTypes.supplierInvoice),
      payments: this.paymentService.GetTraitesBySupplierId(this.selectedSupplier.id)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ invoices, payments }) => {
        // Filter invoices for the selected supplier and status
        this.invoicesDataSource.data = invoices.filter(d =>
          d.counterpart?.id === this.selectedSupplier?.id &&
          (this.showSettledInvoices || (d.remaining_balance || 0) > 0)
        );

        // Update traite/chèque history
        this.traitesDataSource.data = payments;

        // Recalculate KPIs based on new data
        this.calculateKPIs();
      },
      error: (err) => {
        console.error('Error loading supplier data:', err);
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', { duration: 3000 });
      }
    });
  }

  loadEcheances() {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + this.projectionDays);

    this.loading = true;
    this.paymentService.GetEcheances(fromDate, toDate).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe(data => {
      this.initChart(data);
    });
  }

  onProjectionDaysChange(days: number) {
    this.projectionDays = days;
    this.loadEcheances();
  }

  // ─── KPI calculations ─────────────────────────────────────────────────────

  calculateKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight to avoid timezone drift

    // Sum remaining balance on unpaid invoices
    this.kpis.remaining = this.invoicesDataSource.data
      .reduce((acc, curr) => acc + (curr.remaining_balance || 0), 0);

    // Sum of credit notes applied
    this.kpis.totalCreditNotes = this.invoicesDataSource.data
      .reduce((acc, curr) => acc + (curr.total_credit_notes || 0), 0);

    // Sum of traite amounts not yet confirmed as paid at bank
    this.kpis.pendingTraites = this.traitesDataSource.data
      .filter(t => !t.instrument?.isPaidAtBank)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Sum of overdue traites (due date in the past, not yet paid)
    this.kpis.overdue = this.traitesDataSource.data
      .filter(t => {
        if (!t.instrument?.dueDate || t.instrument.isPaidAtBank) return false;
        const due = new Date(t.instrument.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      })
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Sum of traites already confirmed paid at bank
    this.kpis.paidInBank = this.traitesDataSource.data
      .filter(t => t.instrument?.isPaidAtBank)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }

  // ─── Chart ────────────────────────────────────────────────────────────────

  initChart(data: SupplierEcheanceDto[]) {
    // Guard: do not run before ngAfterViewInit or if canvas ref is missing
    if (!this.viewInitialized || !this.echeanceChartCanvas) return;

    const ctx = this.echeanceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance before re-creating
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => this.formatDate(d.dueDate)),
        datasets: [{
          label: 'Montant Échéances (TND)',
          data: data.map(d => d.totalAmount),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // Format tooltip with 3 decimal places for TND
              label: (context) => `Total: ${context?.parsed?.y?.toFixed(3)} TND`
            }
          }
        },
        // Chart click — show supplier breakdown for that due date
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            this.showEcheanceDetails(data[elements[0].index]);
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  showEcheanceDetails(detail: SupplierEcheanceDto) {
    this.dialog.open(EcheanceDetailsModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: detail,
      panelClass: 'premium-modal-overlay'
    });
  }

  /** Helper to format date consistently and avoid timezone shifts */
  private formatDate(dateInput: any): string {
    if (!dateInput) return '--/--/----';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '--/--/----';

    // If it's a string from backend like "2026-05-19T00:00:00", 
    // new Date() might shift it if interpreted as UTC.
    // We use fr-FR to ensure DD/MM/YYYY format
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  openPaymentModal(invoice: Document) {
    const dialogRef = this.dialog.open(PaymentModalComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: {
        documentId: invoice.id,
        documentNumber: invoice.docnumber,
        totalAmount: invoice.total_net_ttc,
        remainingAmount: invoice.remaining_balance,
        // Pass credit notes so the modal can deduct avoirs from the remaining balance
        totalCreditNotes: invoice.total_credit_notes || 0,
        ownerFullName: invoice.counterpart?.name ||
          `${invoice.counterpart?.firstname} ${invoice.counterpart?.lastname}`.trim(),
        withholdingtax: invoice.holdingtax,
        totalNetPayable: invoice.total_net_payable,
        porterName: this.enterpriseName || 'Moi-même',
        porterId: this.enterpriseId
      }
    });

    // Handle payment creation when modal returns a result
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.processPayment(invoice, result);
      }
    });
  }

  private processPayment(invoice: Document, result: any) {
    const user = this.authService.getUserDetail();
    
    // Helper to format date as YYYY-MM-DD without UTC shift
    const formatLocal = (d: any) => {
      if (!d) return null;
      const date = new Date(d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const payment: any = {
      documentId: invoice.id,
      customerId: invoice.counterpart?.id || 0,
      updatedbyid: user?.id ? +user.id : 0,
      amount: result.details?.amount || result.amount,
      paymentDate: formatLocal(result.date),
      paymentMethod: result.method,
      reference: result.details?.reference || '',
      notes: result.details?.notes || ''
    };

    // If it's a Traite or Cheque, add instrument details (backend expects InstrumentDetails)
    if (result.method === 'CHEQUE' || result.method === 'TRAITE') {
      payment.instrumentDetails = {
        type: result.method,
        instrumentNumber: result.details.number,
        bank: result.details.bank,
        owner: result.details.owner,
        porter: result.details.porter,
        issueDate: formatLocal(result.details.paymentDate || result.date),
        dueDate: formatLocal(result.details.dueDate),
        expirationDate: formatLocal(result.details.expirationDate),
        isPaidAtBank: false
      };
    }

    this.loading = true;
    this.paymentService.Add(payment).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Paiement enregistré avec succès', 'Fermer', { duration: 3000 });
        this.loadSupplierData();
        this.loadEcheances();
      },
      error: (err) => {
        console.error('Error creating payment:', err);
        this.snackBar.open('Erreur lors de l\'enregistrement du paiement', 'Fermer', { duration: 4000 });
      }
    });
  }

  toggleSettledInvoices() {
    this.showSettledInvoices = !this.showSettledInvoices;
    this.loadSupplierData();
  }

  markAsPaidInBank(traite: Payment) {
    if (!traite.instrument) return;

    if (confirm(`Confirmer que la traite ${traite.instrument.instrumentNumber} est payée en banque ?`)) {
      this.paymentService.MarkTraiteAsPaid(traite.instrument.id, {
        paidAtBankDate: new Date(),
        notes: 'Confirmé via tableau de bord fournisseur'
      }).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.snackBar.open('Mise à jour effectuée', 'Fermer', { duration: 2000 });
        this.loadSupplierData();
        this.loadEcheances();
      });
    }
  }

  /**
   * Open the PaymentModalComponent in EDIT mode for an existing payment row.
   * Pre-fills all fields from the payment; on confirm sends PUT /Payments/{id}.
   */
  editPayment(payment: Payment) {
    const pid = payment.paymentId || payment.id; // backend returns PaymentId → camelCase paymentId

    const dialogRef = this.dialog.open(PaymentModalComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: {
        // Edit mode: existing payment data
        isEditMode: true,
        paymentId: pid,
        documentId: payment.documentId,
        documentNumber: payment.reference || '',
        // Pass the full invoice amount so remaining can be re-evaluated with this payment excluded
        totalAmount: payment.amount || 0,
        // In edit mode we allow changing the amount freely up to the original amount
        remainingAmount: payment.amount || 0,
        totalCreditNotes: 0,
        ownerFullName: this.selectedSupplier?.name ||
          `${this.selectedSupplier?.firstname ?? ''} ${this.selectedSupplier?.lastname ?? ''}`.trim(),
        porterName: this.enterpriseName || 'Moi-même',
        porterId: this.enterpriseId,
        // Pre-fill fields for the modal
        prefillAmount: payment.amount,
        prefillDate: payment.paymentDate,
        prefillMethod: payment.paymentMethod,
        prefillReference: payment.reference,
        prefillNotes: payment.notes,
        prefillInstrument: payment.instrument
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return; // User cancelled

      const user = this.authService.getUserDetail();
      const formatLocal = (d: any) => {
        if (!d) return null;
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const updatePayload: any = {
        paymentId: pid,
        amount: result.details?.amount || result.amount,
        paymentDate: formatLocal(result.date),
        paymentMethod: result.method,
        reference: result.details?.reference || '',
        notes: result.details?.notes || '',
        instrumentDetails: result.method === 'CHEQUE' || result.method === 'TRAITE' ? {
          instrumentNumber: result.details?.number,
          bank: result.details?.bank,
          owner: result.details?.owner,
          porter: result.details?.porter,
          issueDate: formatLocal(result.details?.issueDate),
          dueDate: formatLocal(result.details?.dueDate),
          expirationDate: formatLocal(result.details?.expirationDate)
        } : null
      };

      this.loading = true;
      this.paymentService.Update(pid, updatePayload)
        .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.snackBar.open('Paiement modifié avec succès', 'Fermer', { duration: 3000 });
            this.loadSupplierData();
          },
          error: (err) => {
            console.error('Error updating payment:', err);
            this.snackBar.open(err?.error?.message || 'Erreur lors de la modification', 'Fermer', { duration: 4000 });
          }
        });
    });
  }

  // Returns true when a traite is past its due date and not yet paid at bank
  isOverdue(traite: Payment): boolean {
    if (!traite.instrument?.dueDate || traite.instrument.isPaidAtBank) return false;
    const dueDate = new Date(traite.instrument.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  goBack() {
    this.router.navigate(['home/merchandise/sinvoices']);
  }
}
