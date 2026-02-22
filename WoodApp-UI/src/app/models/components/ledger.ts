export interface LedgerEntry {
    id: number;
    transactionDate: Date;
    type: string;
    relatedId?: number;
    debit: number;
    credit: number;
    description?: string;
    runningBalance: number;
}

export interface AccountStatement {
    counterPartId: number;
    counterPartName?: string;
    openingBalance: number;
    balanceBeforePeriod: number;
    transactions: LedgerEntry[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
}
