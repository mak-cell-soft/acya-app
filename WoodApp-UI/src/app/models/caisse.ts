export interface CaisseMovement {
    id: number;
    salesSiteId: number;
    salesSiteName?: string;
    movementDate: Date;
    type: string;
    reason: string;
    amount: number;
    reference?: string;
    notes?: string;
    bankDepositId?: number;
    paymentId?: number | null;  // null = mouvement manuel (supprimable), sinon = encaissement lié à une vente
}

export interface CaisseBalance {
    salesSiteId: number;
    salesSiteName: string;
    totalEntrees: number;
    totalSorties: number;
    currentBalance: number;
    lastMovementDate?: Date;
}
