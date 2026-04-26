import { Document } from "./document";
import { LedgerEntry } from "./ledger";

export interface SupplierDashboard {
    currentBalance: number;
    totalPaid: number;
    pendingOrders: Document[];
    pendingReceipts: Document[];
    recentTransactions: LedgerEntry[];
}
