export interface PricingGrid {
    id: number;
    counterpartid: number;
    merchandiseid?: number;
    articleid?: number; // Linked Article ID
    merchandisename?: string;
    merchandisereference?: string;
    discountrate: number;
    validfrom?: Date | string;
    validuntil?: Date | string;
    isactive: boolean;
    notes?: string;
    updatedbyid?: number;
}

export interface PricingGridLookup {
    merchandiseid: number;
    discountrate: number;
}
