export interface Payment {
  id: number;
  paymentId: number;
  documentId: number;
  customerId: number; // Represents supplierId/customerId at API/DB layer
  paymentDate: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paymentMethod: 'ESPECE' | 'CHEQUE' | 'TRAITE' | 'VIREMENT' | 'CARTE';
  reference?: string;
  notes?: string;
  createdat?: string;
  createdby?: string;
  updatedat?: string;
  updatedbyid?: number;
  isdeleted?: boolean;
  instrument?: PaymentInstrumentDto;
}

export interface PaymentInstrumentDto {
  id: number;
  paymentId: number;
  type: string;
  instrumentNumber: string;
  bank: string;
  owner: string;
  porter?: string;
  issueDate?: string;
  dueDate?: string;
  expirationDate?: string;
  isPaidAtBank: boolean;
  paidAtBankDate?: string;
  bankSettlementStatus?: string;
}

export interface SupplierEcheanceDto {
  dueDate: string;
  totalAmount: number;
  instrumentCount: number;
  details: EcheanceDetailDto[];
}

export interface EcheanceDetailDto {
  paymentId: number;
  documentId: number;
  documentNumber: string;
  supplierName: string;
  instrumentNumber: string;
  bank: string;
  amount: number;
  dueDate: string;
  isPaidAtBank: boolean;
}

export interface DashboardPaymentDto {
  paymentId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  customerName: string;
  invoiceNumber: string;
  deliveryNoteNumber: string;
  createdAt: string;
}
