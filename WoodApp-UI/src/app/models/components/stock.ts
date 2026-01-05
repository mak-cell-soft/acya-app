import { get } from "https";
import { AppUser } from "./appuser";
import { Merchandise } from "./merchandise";
import { Site } from "./sites";
import { set } from "date-fns";

export class Stock {
    id: number = 0;
    /**
     * Remaining Quantity
     */
    quantity: number = 0;
    creationdate!: Date;
    updatedate!: Date;
    type!: TransactionType;

    merchandise!: Merchandise | null;
    site!: Site | null;
    appuser!: AppUser | null;
}

// export class TransactionStock {
//     id: number = 0;
//     stockId: number = 0;
//     type: TransactionType = TransactionType.Add;
//     /**
//      * Add Or Retrieve Quantity
//      */
//     quantity: number = 0;
//     date!: Date;
// }

export enum TransactionType {
    Add = 1,
    Retrieve = 2,
    None = 3
}

/**
 * Specialized class to get data from
 * back-end with special LINQ Query
 */
export class StockQuantity {
    articleId: number = 0;
    stockId: number = 0;
    merchandiseId: number = 0;
    articleReference: string = '';
    packageReference: string = '';
    //merchandiseQuantity: number = 0;
    siteId: number = 0;
    stockQuantity: number = 0;
    MerchandiseDescription: string = '';
    isInvoicible: boolean = false;
    allowNegativeStock: boolean = false;
    isMergedWith: boolean = false;
}

export class WoodParams {
    merchandiseRef: string | null = null;
    merchandiseId: number = 0;
    salesSiteId: number = 0;
}

export class StockWithLengthDetails {
    LengthId: number = 0;
    LengthName: string | null = null;
    RemainingPieces: number = 0;
}
