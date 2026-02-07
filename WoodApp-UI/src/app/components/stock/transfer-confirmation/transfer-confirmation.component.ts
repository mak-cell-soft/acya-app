import { Component, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StockService } from '../../../services/components/stock.service';
import { StockTransferDetails, StockTransferInfo } from '../../../models/components/stock_transfert';
import { ListOfLength } from '../../../models/components/listoflength';
import { ToastrService } from 'ngx-toastr';

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

  // onConfirm(): void {
  //   this.stockTransferService.confirmTransfer(this.data.id, this.comment).subscribe(() => {
  //     this.dialogRef.close(true);
  //   });
  // }

  onConfirm(): void {
    this.stockTransferService.confirmTransfer(this.data.id, this.comment).subscribe({
      next: (response) => {
        this.toastr.success(
          `Transfer confirmé avec succés`,
          'Confirmation'
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        const errorMessage = error.error?.Message || error.error || 'An error occurred while confirming the transfer';
        this.toastr.error(errorMessage, 'Confirmation Failed');
        console.error('Transfer confirmation error:', error);
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
