export interface StockMovementTimeline {
  documentId: number;
  date: Date;
  quantityDelta: number;
  quantityAfter: number;
  documentType: string;
  documentNumber: string;
  description: string;
  packageNumber: string;
  counterpartSiteName: string;
  isTransfer: boolean;
}

export interface StockMovementSummary {
  currentStock: number;
  totalIn: number;
  totalOut: number;
  unit: string;
}

export interface StockMovementReconciliation {
  computedQuantity: number;
  stockQuantity: number;
  isReconciled: boolean;
}
