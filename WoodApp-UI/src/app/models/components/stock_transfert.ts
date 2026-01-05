import { ListOfLength } from "./listoflength";
import { Merchandise } from "./merchandise";

export class StockTransfert {
    originSiteId: number = 0;
    destinationSiteId: number = 0;
    transporterId: number = 0;
    merchandisesItems: Merchandise[] = [];
    TransferDate!: Date;
    reference: string = '';
    notes: string = '';
    updatedById: number = 0;
}

export class StockTransferInfo {
    id: number = 0;
    docSortie: string = '';
    docReception: string = '';
    origine: string = '';
    destination: string = '';
    transferDate!: Date;
    transporter: string = '';
    refPaquet: string = '';
    status!: TransferStatus;
}

export class StockTransferDetails {
    id: number = 0;
    docSortie: string = '';
    docReception: string = '';
    origine: string = '';
    destination: string = '';
    transferDate!: Date;
    transporter: string = '';
    refPaquet: string = '';
    refMerchandise: string = '';
    description: string = '';
    quantity: number = 0;
    unit: string = '';
    exitDocLengths!: ListOfLength[];
}

export interface Notification {
    originSite: string;
    destinationSite: string;
    sendedAt: Date;
}

export enum TransferStatus {
    Pending = 1,
    Confirmed = 2,
    Rejected = 3,
    Cancelled = 4,
    Delivered = 5,
    Failed = 6
}

export enum TransferStatus_FR {
    Pending = 'En Attente',
    Confirmed = 'Confirmé',
    Rejected = 'Refusé',
    Cancelled = 'Annulé',
    Delivered = 'Livré',
    Failed = 'Echoué'
}