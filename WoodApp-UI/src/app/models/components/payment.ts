
export class Payment {
    id: number = 0;
    paymentId: number = 0; // Added to match backend DTO
    documentid: number = 0;
    customerid: number = 0;
    paymentdate!: Date;
    amount: number = 0;
    paymentmethod: string = '';
    reference: string = '';
    notes: string = '';
    createdat!: Date;
    createdby: string = '';
    updatedat!: Date;
    updatedbyid: number = 0;
    isdeleted: boolean = false;
    instrument?: PaymentInstrumentDto;
}

export interface PaymentInstrumentDto {
    id: number;
    paymentId: number;
    type: string;
    instrumentNumber: string;
    bank: string;
    owner: string;
    issueDate?: Date;
    dueDate?: Date;
    expirationDate?: Date;
    isPaidAtBank: boolean;
    paidAtBankDate?: Date;
    bankSettlementStatus: string;
}

export interface SupplierEcheanceDto {
    dueDate: Date;
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
    dueDate: Date;
    isPaidAtBank: boolean;
}


export interface DashboardPaymentDto {
    paymentId: number;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    reference: string;
    notes: string;
    customerName: string;
    invoiceNumber: string;
    deliveryNoteNumber: string;
    createdAt: Date;
}
