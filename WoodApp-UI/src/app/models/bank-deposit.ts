export interface BankDeposit {
    id: number;
    bankId: number;
    bankName?: string;
    depositDate: Date;
    depositType: string;
    amountHT: number;
    feeHT: number;
    taxRate: number;
    feeWithTax: number;
    netAmount: number;
    reference?: string;
    notes?: string;
    salesSiteName?: string;
}

export interface BankBalance {
    bankId: number;
    bankName: string;
    rib?: string;
    initialBalance: number;
    totalDeposits: number;
    totalFees: number;
    currentBalance: number;
}
