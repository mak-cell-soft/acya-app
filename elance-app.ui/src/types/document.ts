import { Article, AppVariable } from './article';
import { Customer } from './customer';
import { Site } from './settings';

/**
 * Enums representing backend document types.
 * Map exactly to C# enum DocumentTypes.
 */
export enum DocumentTypes {
  supplierOrder = 1,          // Commande Fournisseur
  supplierReceipt = 2,        // Bon de réception Fournisseur
  supplierInvoice = 3,        // Facture Fournisseur
  customerOrder = 4,          // Bon de commande Client (sans impact stock)
  customerDeliveryNote = 5,   // Bon de Livraison Client (Bon de Livraison)
  customerInvoice = 6,        // Facture Client
  stockTransfer = 7,          // Transfert stock
  supplierInvoiceReturn = 8,  // Avoir Fournisseur
  customerInvoiceReturn = 9,  // Retour Client
  inventory = 10,             // Inventaire
  customerQuote = 11          // Devis Client (sans impact stock)
}

/**
 * French translations for DocumentTypes.
 */
export enum DocTypes_FR {
  supplierOrder = 'Commande Fournisseur',
  supplierReceipt = 'Réception Fournisseur',
  supplierInvoice = 'Facture Fournisseur',
  customerQuote = 'Devis Client',
  customerOrder = 'Bon de Commande Client',
  customerDeliveryNote = 'Bon de Livraison',
  customerInvoice = 'Facture Client',
  stockTransfer = 'Transfert stock',
  customerInvoiceReturn = 'Retour Client',
  supplierInvoiceReturn = 'Avoir Fournisseur',
  inventory = 'Inventaire',
  Payment = 'Paiement',
  RS = 'Retenue à la source',
  customerPayment = 'Paiement Client',
  supplierPayment = 'Paiement Fournisseur',
  customerRS = 'Retenue à la source Client',
  supplierRS = 'Retenue à la source Fournisseur'
}

/**
 * Document workflow status.
 * Maps exactly to C# enum DocStatus.
 */
export enum DocStatus {
  Delivered = 1,
  Abandoned = 2,
  Created = 3,
  Deleted = 4,
  NotDelivered = 5,
  NotConfirmed = 6,
  Confirmed = 7,
  Completed = 8,
  Pending = 9,
  Sent = 10,
  PartiallyDelivered = 11,
  Validated = 12,
  Submitted = 13,
  PendingApproval = 14,
  Approved = 15,
  Rejected = 16
}

export enum DocStatus_FR {
  Delivered = 'Livrée',
  Abandoned = 'Annulé',
  Created = 'Créé',
  Deleted = 'Supprimé',
  NotDelivered = 'Non Livré',
  NotConfirmed = 'Non Confirmé',
  Confirmed = 'Confirmé',
  Pending = 'En attente',
  Sent = 'Envoyé',
  PartiallyDelivered = 'Partiellement livré',
  Validated = 'Validé',
  Completed = 'Terminé',
  Submitted = 'Soumis',
  PendingApproval = 'En attente d\'approbation',
  Approved = 'Approuvé',
  Rejected = 'Rejeté'
}

export enum BillingStatus {
  NotBilled = 1,
  Billed = 2,
  PartiallyBilled = 3
}

export enum LineType {
  Merchandise = 1,
  TransportFee = 2
}

/**
 * ListOfLength details for wood merchandise.
 */
export interface ListOfLength {
  id: number;
  nbpieces: number;
  length: AppVariable; // Type: AppVariable with nature = 'Length'
  quantity: number;    // Calculated: pieces * length * thickness * width
  availablePieces: number; // Current remaining pieces in stock
}

/**
 * Represents a single merchandise item or transporter fee row in the document.
 * Maps to backend Merchandise class.
 */
export interface Merchandise {
  id: number;
  packagereference: string;
  description: string;
  creationdate: string | Date;
  updatedate: string | Date;
  updatedbyid: number;
  quantity: number;
  quantity_delivered?: number;
  quantity_remaining?: number;
  unit_price_ht: number;
  cost_ht: number;
  discount_percentage: number;
  cost_discount_value: number;
  cost_net_ht: number;
  tva_value: number;
  cost_ttc: number;
  documentid: number;
  isinvoicible: boolean;
  allownegativstock: boolean;
  article: Article | null;
  lisoflengths: ListOfLength[];
  ismergedwith: boolean;
  idmergedmerchandise?: number;
  isdeleted: boolean;
  line_type: LineType;
  transporter_id?: number | null;
  transporter_name?: string;
}

/**
 * Represents a full Document payload sent to / received from the backend.
 * Maps to backend Document class.
 */
export interface Document {
  id: number;
  type: DocumentTypes;
  stocktransactiontype: number; // TransactionType: e.g. 1 = Retrieve, 2 = Store
  docnumber: string;
  description: string;
  supplierReference: string;
  isinvoiced: boolean;
  merchandises: Merchandise[];
  total_ht_net_doc: number;
  total_discount_doc: number;
  total_tva_doc: number;
  total_net_ttc: number;
  total_net_payable?: number;
  total_paid?: number;
  total_credit_notes?: number;
  remaining_balance?: number;
  currency?: string;
  exchangeRate?: number;
  taxe?: (AppVariable & { taxvalue: number }) | null;
  holdingtax?: HoldingTax;
  withholdingtax: boolean;
  counterpart: Customer; // maps to Customer in target app (since counterpart type is Customer)
  sales_site: Site;
  creationdate: string | Date;
  updatedate: string | Date;
  updatedbyid: number;
  isdeleted: boolean;
  regulationid: number;
  editing: boolean;
  docstatus: DocStatus;
  billingstatus: BillingStatus;
  isPaid: boolean;
  isservice: boolean;
  deliveryNoteDocNumbers?: string[];
  transporter?: (Customer & { fullname?: string }) | null;
  parentdocuments?: Document[];
  childdocuments?: Document[];
}

/**
 * Filter model for date-based document filtering (matches Angular typeDocsToFilter)
 */
export interface TypeDocsFilter {
  typeDoc: DocumentTypes;
  month: number;   // 1–12
  year: number;
  day?: number;
}

/**
 * Invoice-specific: Stamp Tax + Retenue à la source
 */
export interface HoldingTax {
  id?: number;
  description: string;
  reference?: string;
  taxpercentage: number;
  taxvalue: number;
  newamountdocvalue: number;
  issigned: boolean;
  isdeleted: boolean;
  updatedbyid: number;
  documentid?: number;
  creationdate?: string | Date;
  updatedate?: string | Date;
}

