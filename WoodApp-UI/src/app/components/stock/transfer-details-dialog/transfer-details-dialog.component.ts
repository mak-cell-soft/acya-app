import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StockTransferDetails } from '../../../models/components/stock_transfert';
import { ListOfLength } from '../../../models/components/listoflength';

@Component({
  selector: 'app-transfer-details-dialog',
  templateUrl: './transfer-details-dialog.component.html',
  styleUrl: './transfer-details-dialog.component.css'
})
export class TransferDetailsDialogComponent {

  // Common data (same for all items)
  commonData!: Omit<StockTransferDetails, 'refPaquet' | 'refMerchandise' | 'description' | 'quantity' | 'unit' | 'exitDocLengths'>;

  // Array of items with different refPaquet, refMerchandise, and quantity
  items!: Pick<StockTransferDetails, 'refPaquet' | 'refMerchandise' | 'description' | 'quantity' | 'unit' | 'exitDocLengths'>[];


  constructor(@Inject(MAT_DIALOG_DATA) data: StockTransferDetails[]) {
    if (!data || data.length === 0) {
      // Handle empty data case
      this.commonData = new StockTransferDetails();
      this.items = [];
      return;
    }

    // Take common data from the first item (assuming all are the same)
    const { refPaquet, refMerchandise, description, quantity, ...common } = data[0];
    this.commonData = common;

    // Extract the varying items
    this.items = data.map(item => ({
      refPaquet: item.refPaquet,
      refMerchandise: item.refMerchandise,
      quantity: item.quantity,
      description: item.description,
      unit: item.unit,
      exitDocLengths: item.exitDocLengths
    }));
  }

  // Helper method to format merchandise info
  getMerchandiseInfo2(item: { refMerchandise: string, refPaquet: string, description: string, quantity: number, unit: string, lengthsInLine: string }): { line1: string, line2: string, line3: string } {
    return {
      line1: `Article : ${item.refMerchandise || 'N/A'} - Description : ${item.description || 'N/A'}`,
      line2: `Référence paquet : ${item.refPaquet || 'N/A'} # quantité : ${item.quantity || '0.000'} ${item.unit || ''}`,
      line3: `Longueurs : ${item.lengthsInLine || ''}`
    };
  }

  getMerchandiseInfo(item: {
    refMerchandise: string,
    refPaquet: string,
    description: string,
    quantity: number,
    unit: string,
    exitDocLengths: ListOfLength[]
  }): { line1: string, line2: string, line3: string } {
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

}
