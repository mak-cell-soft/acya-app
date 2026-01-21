import { AppVariable } from "../configuration/appvariable";
import { AppUser } from "./appuser";
import { CounterPart } from "./counterpart";
import { HoldingTaxe } from "./holdingtax";
import { Merchandise } from "./merchandise";
import { Site } from "./sites";
import { TransactionType } from "./stock";

export class Document {
    id: number = 0;
    type!: DocumentTypes;
    stocktransactiontype!: TransactionType;
    docnumber: string = '';
    description: string = '';
    supplierReference!: string;
    /**
     * Is Document invoiced
     */
    isinvoiced: boolean = false;
    merchandises!: Merchandise[];
    /**
    * Total Prices Calculculated of the given Document
    */
    total_ht_net_doc: number = 0;
    total_discount_doc: number = 0;
    total_tva_doc: number = 0;
    total_net_ttc: number = 0;

    /**
    * Taxe : Droit de Timbre
    */
    taxe!: AppVariable;

    /**
     * Holding taxe : Retenue à la source
     */
    holdingtax!: HoldingTaxe;
    withholdingtax: boolean = false;
    counterpart!: CounterPart;

    sales_site!: Site;

    creationdate!: Date;
    updatedate!: Date;
    updatedbyid: number = 0;
    appuser!: AppUser;
    isdeleted: boolean = false;

    /**
     * Regulation of the Document
     * Payment
     */
    regulationid: number = 0;
    editing: boolean = false;
    docstatus!: DocStatus;
    billingstatus: BillingStatus = 1;
}

export class typeDocsToFilter {
    day: number = 0;
    month: number = 0;
    year: number = 0;
    typeDoc!: DocumentTypes;
}

export enum DocumentTypes {
    supplierOrder = 1, // Commande Fournisseur
    supplierReceipt = 2, // Bon de réception Fournisseur
    supplierInvoice = 3, // Facture Fournisseur
    customerOrder = 4, // Commande Client
    customerDeliveryNote = 5, // Bon de Livraison Client
    customerInvoice = 6, // Facture Client
    stockTransfer = 7
}

export enum DocTypes_FR {
    supplierOrder = 'Commande Fournisseur',
    supplierReceipt = 'Réception Fournisseur',
    supplierInvoice = 'Facture Fournisseur',
    customerOrder = 'Commande Client',
    customerDeliveryNote = 'Bon de Livraison',
    customerInvoice = 'Facture Client',
    stockTransfer = 'Transfert stock'
}

export enum DocStatus {
    Delivered = 1,
    Abandoned = 2,
    Created = 3,
    Deleted = 4,
    NotDelivered = 5,
    NotConfirmed = 6,
    Confirmed = 7,
    Completed = 8
}


export enum DocStatus_FR {
    Delivered = 'Livrée',
    Abandoned = 'Annulé',
    Created = 'Crée',
    Deleted = 'Supprimé',
    NotDelivered = 'non Livré',
    NotConfirmed = 'Non Confirmé',
    Confirmed = 'Confirmé'
}

export enum BillingStatus {
    NotBilled = 1,
    Billed = 2,
    PartiallyBilled = 3
}

export enum PaymentInstrumentType {
    CHEQUE = 'CHEQUE',
    TRAITE = 'TRAITE'
}

export enum PaymentState {
    CONFIRMED = 'CONFIRMED', // Confirmé
    EN_COURS = 'EN_COURS', // En cours
    CHECKED = 'CHECKED', // Vérifié
    DENIED = 'DENIED' // Refusé
}

export interface PaymentInstrument {
    type: PaymentInstrumentType; // Enum: 'CHEQUE' | 'TRAITE'
    number: string; // Check/Draft number
    owner: string; // Owner name
    porter: string; // Client ID (bearer)
    bank: string; // Bank name
    paymentDate: Date; // Payment date
    dueDate: Date; // Due date
    expirationDate: Date; // Expiration date
    amount: number; // Payment amount
    state: PaymentState; // Enum: 'CONFIRMED' | 'EN_COURS' | 'CHECKED' | 'DENIED'
}
