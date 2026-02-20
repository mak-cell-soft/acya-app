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
      line1: `Article : ${item.refMerchandise || 'N/A'} - Description : ${item.description || 'N/A'}`,
      line2: `Référence paquet : ${item.refPaquet || 'N/A'} # quantité : ${item.quantity || '0.000'} ${item.unit || ''}`,
      line3: `Longueurs : ${lengthsLine}`
    };
  }

  private transformLengthsToLine(lengths: ListOfLength[]): string {
    if (!lengths || lengths.length === 0) {
      return 'Aucune longueur disponible';
    }
    return lengths
      .map(length => `${length.nbpieces}/${length.length?.name || 'N/A'}`)
      .join(', ');
  }

  onConfirm(): void {
    const dialogRef = this.dialog.open(TransferConfirmCodeDialogComponent, {
      width: '400px',
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

  onReject(): void {
    this.stockTransferService.rejectTransfer(this.data.id, this.comment).subscribe(() => {
      this.toastr.info(
        `Transfer rejeté avec succés`,
        'Rejet'
      );
      this.dialogRef.close(false);
    });
  }

  onAbort() {
    this.dialogRef.close();
  }
}
