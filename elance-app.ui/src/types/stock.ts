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
  originSiteAddress: string;
  destinationSiteAddress: string;
  origine?: string;
  destination?: string;
  transferDate: string;
  transporter: string;
  status: TransferStatus;
}

export interface StockTransferDetails {
  id: number;
  articleReference: string;
  articleDescription: string;
  packageReference: string;
  quantity: number;
  unit: string;
  confirmationCode?: string;
}

export interface StockMovementTimeline {
  id: number;
  date: string;
  quantityDelta: number;
  quantityAfter: number;
  documentRef: string;
  documentType: string;
  isTransfer: boolean;
  siteName: string;
  updatedBy: string;
}

export interface StockMovementSummary {
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  unit: string;
}
