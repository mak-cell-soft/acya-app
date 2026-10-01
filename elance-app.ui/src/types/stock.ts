import { Site } from './settings';

export enum TransferStatus {
  Pending = 1,
  Confirmed = 2,
  Rejected = 3,
  Cancelled = 4,
  Delivered = 5,
  Failed = 6
}

export const TransferStatus_FR = {
  [TransferStatus.Pending]: 'En attente',
  [TransferStatus.Confirmed]: 'Confirmé',
  [TransferStatus.Rejected]: 'Rejeté',
  [TransferStatus.Cancelled]: 'Annulé',
  [TransferStatus.Delivered]: 'Livré',
  [TransferStatus.Failed]: 'Échoué'
};

export interface Stock {
  id: number;
  quantity: number;
  minimumstock: number;
  updatedate: string;
  site: Site | null;
  merchandise: {
    id: number;
    packagereference: string;
    description: string;
    article: {
      id: number;
      reference: string;
      description: string;
      unit: string;
      categoryid: number;
      iswood: boolean;
      lengths?: string | null;
      thickness?: string | null;
      width?: string | null;
      category: {
        id: number;
        description: string;
      } | null;
    };
  };
  appuser: {
    person: {
      firstname: string;
      lastname: string;
    };
  } | null;
}

export interface StockCategoryGroup {
  categoryName: string;
  categoryId: number;
  stocks: Stock[];
  unitTotals: { unit: string; totalQuantity: number }[];
}

export interface StockTransferInfo {
  id: number;
  docSortie: string;
  docReception: string;
  originSiteAddress?: string;
  destinationSiteAddress?: string;
  origine?: string;
  destination?: string;
  originGov?: string;
  originAddress?: string;
  destinationGov?: string;
  destinationAddress?: string;
  transferDate: string;
  transporter: string;
  vehicleSerialNumber?: string;
  notes?: string;
  reference?: string;
  confirmationCode?: string;
  status: TransferStatus;
}

export interface StockTransferDetails {
  id: number;
  articleReference: string;
  articleDescription: string;
  description?: string;
  packageReference: string;
  refPaquet?: string;
  quantity: number;
  unit: string;
  confirmationCode?: string;
  vehicleSerialNumber?: string;
  transporter?: string;
  origine?: string;
  destination?: string;
  originGov?: string;
  originAddress?: string;
  destinationGov?: string;
  destinationAddress?: string;
  notes?: string;
  reference?: string;
  exitDocLengths?: any[];
}

export interface StockMovementTimeline {
  documentId: number;
  date: string;
  quantityDelta: number;
  quantityAfter: number;
  documentType: string;
  documentNumber: string | null;
  description: string | null;
  packageNumber: string | null;
  counterpartSiteName: string | null;
  isTransfer: boolean;
}

export interface StockMovementSummary {
  currentStock: number;
  totalIn: number;
  totalOut: number;
  unit: string | null;
}

export interface StockMovementReconciliation {
  computedQuantity: number;
  stockQuantity: number;
  isReconciled: boolean;
}
