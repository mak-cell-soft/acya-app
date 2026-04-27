import { Article } from "./article";
import { CounterPart } from "./counterpart";
import { Document } from "./document";

export interface SalesPriceHistory {
    id: number;
    idarticle: number;
    idcounterpart: number;
    pricevalue: number;
    transactiondate: Date;
    iddocument: number;
    docnumber: string;
    creationdate: Date;
    
    article?: Article;
    customer?: CounterPart;
    document?: Document;
    counterpartname?: string;
    updatedby_name?: string;
}
