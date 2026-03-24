import { Component, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { StockService } from '../../../services/components/stock.service';
import { StockTransferDetails, StockTransferInfo } from '../../../models/components/stock_transfert';
import { ListOfLength } from '../../../models/components/listoflength';
import { ToastrService } from 'ngx-toastr';
import { TransferConfirmCodeDialogComponent } from '../transfer-confirm-code-dialog/transfer-confirm-code-dialog.component';

@Component({
  selector: 'app-transfer-confirmation',
  templateUrl: './transfer-confirmation.component.html',
  styleUrl: './transfer-confirmation.component.css'
})
export class TransferConfirmationComponent implements OnInit {
  comment: string = '';
  rejectionReason: string = '';
  customRejectionReason: string = '';
  showRejectionForm: boolean = false;
  
  rejectionReasons = [
    { value: 'PROB_QTY', label: 'Erreur de quantité' },
    { value: 'PROB_QUAL', label: 'Marchandise endommagée' },
    { value: 'WRONG_REF', label: 'Mauvaise référence' },
    { value: 'MISSING', label: 'Marchandise manquante' },
    { value: 'OTHER', label: 'Autre (Veuillez préciser)' }
  ];

  stockTransferService = inject(StockService);
  toastr = inject(ToastrService);
  loading: boolean = false;
  private dialog = inject(MatDialog);

  // Common data (same for all items)
  commonData: any = {};
  // Array of items with different refPaquet, refMerchandise, and quantity
  items: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<TransferConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StockTransferInfo
  ) { }

  ngOnInit(): void {
    console.log('Data in ngOnInit:', this.data);
    this.loadDetails();
  }

  loadDetails(): void {
    this.loading = true;
    this.stockTransferService.getStockTransferDetails(this.data.docSortie, this.data.docReception)
      .subscribe({
        next: (details: StockTransferDetails[]) => {
          console.log('Transfer Stock Details : ', details);
          if (details && details.length > 0) {
            const { refPaquet, refMerchandise, description, quantity, unit, exitDocLengths, ...common } = details[0];
            this.commonData = common;
            this.items = details.map(item => ({
              refPaquet: item.refPaquet,
              refMerchandise: item.refMerchandise,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              exitDocLengths: item.exitDocLengths
            }));
          } else {
            this.commonData = this.data;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading transfer details', err);
          this.commonData = this.data;
          this.loading = false;
        }
      });
  }

  getMerchandiseInfo(item: any): { line1: string, line2: string, line3: string } {
    const lengthsLine = this.transformLengthsToLine(item.exitDocLengths);
    return {
      line1: `Article : ${item.refMerchandise || 'N/A'}`,
      line2: `Référence paquet : ${item.refPaquet || 'N/A'} # quantité : ${item.quantity || '0.000'} ${item.unit || ''}`,
      line3: `Désignation : ${item.description || 'N/A'}`
    };
  }

  public transformLengthsToLine(lengths: ListOfLength[]): string {
    if (!lengths || lengths.length === 0) {
      return 'Aucune longueur disponible';
    }
    return lengths
      .map(length => `${length.nbpieces}/${length.length?.name || 'N/A'}`)
      .join(', ');
  }

  onConfirm(): void {
    const dialogRef = this.dialog.open(TransferConfirmCodeDialogComponent, {
      width: '450px',
      data: {
        transferId: this.data.id,
        comment: this.comment
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dialogRef.close(true);
      }
    });
  }

  toggleRejection(): void {
    this.showRejectionForm = !this.showRejectionForm;
  }

  onReject(): void {
    if (!this.rejectionReason) {
      this.toastr.warning('Veuillez sélectionner un motif de rejet', 'Attention');
      return;
    }

    const reasonLabel = this.rejectionReasons.find(r => r.value === this.rejectionReason)?.label;
    const finalReason = this.rejectionReason === 'OTHER' 
      ? `Autre: ${this.customRejectionReason}` 
      : reasonLabel;

    const fullComment = `${finalReason}${this.comment ? ' - Obs: ' + this.comment : ''}`;

    this.loading = true;
    this.stockTransferService.rejectTransfer(this.data.id, fullComment).subscribe({
      next: () => {
        this.toastr.info('Transfert rejeté avec succès', 'Rejet');
        this.loading = false;
        this.dialogRef.close(false);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error('Erreur lors du rejet du transfert');
        console.error(err);
      }
    });
  }

  onAbort() {
    this.dialogRef.close();
  }
}
