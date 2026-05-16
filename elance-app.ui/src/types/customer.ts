export type CounterPartType = 'Customer' | 'Supplier' | 'Both' | 'Transporter';

export interface Customer {
  id: number;
  guid?: string;
  type: CounterPartType;
  prefix: string;
  name: string;
  description: string;
  firstname: string;
  lastname: string;
  identitycardnumber: string;
  email: string;
  taxregistrationnumber: string;
  patentecode: string;
  address: string;
  gouvernorate: string;
  maximumdiscount: number;
  maximumsalesbar: number;
  notes: string;
  phonenumberone: string;
  phonenumbertwo: string;
  creationdate: string | Date;
  updatedate: string | Date;
  jobtitle: string;
  bankname: string;
  bankaccountnumber: string;
  isactive: boolean;
  isdeleted: boolean;
  updatedbyid: number;
  openingbalance: number;
  isTypeBoth: boolean;
}

export interface PricingGrid {
  id: number;
  counterpartid: number;
  merchandiseid?: number;
  articleid?: number;
  merchandisename?: string;
  merchandisereference?: string;
  discountrate: number;
  validfrom?: string | Date;
  validuntil?: string | Date;
  isactive: boolean;
  notes?: string;
  updatedbyid?: number;
}

export interface LedgerEntry {
  id: number;
  transactionDate: string | Date;
  type: string;
  relatedId?: number;
  debit: number;
  credit: number;
  description?: string;
  runningBalance: number;
  isPaid?: boolean;
  relatedDeliveryNoteRefs?: string[];
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

// --- Constants ---

export const SOCIETY_PREFIXES = [
  { id: 'STE', name: 'Société' },
  { id: 'ENT', name: 'Entreprise' },
  { id: 'ASS', name: 'Association' },
  { id: 'PERS', name: 'Pers. Physique' },
  { id: 'AUT', name: 'Autre' }
];

export const CUSTOMER_PREFIXES = [
  { id: 'MRS', name: 'Monsieur' },
  { id: 'MME', name: 'Madame' }
];

export const FULL_PREFIXES = [...SOCIETY_PREFIXES, ...CUSTOMER_PREFIXES];

export const CUSTOMER_ACTIVITIES = [
  { key: 1, value: 'Ameublement et Agencement' },
  { key: 2, value: 'Particulier Ameublement' },
  { key: 3, value: 'Menuiserie' },
  { key: 4, value: 'Divers Traveaux Ameublement' },
  { key: 5, value: 'Construction Immobilière' },
  { key: 6, value: 'Activité Industrielle' },
  { key: 7, value: 'Société de Vente' },
  { key: 8, value: 'Quincaillerie' }
];

export const GOUVERNORATES_TN = [
  { key: 1, value: 'Ariana' },
  { key: 2, value: 'Béja' },
  { key: 3, value: 'Ben Arous' },
  { key: 4, value: 'Bizerte' },
  { key: 5, value: 'Gabès' },
  { key: 6, value: 'Gafsa' },
  { key: 7, value: 'Jendouba' },
  { key: 8, value: 'Kairouan' },
  { key: 9, value: 'Kasserine' },
  { key: 10, value: 'Kébili' },
  { key: 11, value: 'Le Kef' },
  { key: 12, value: 'Mahdia' },
  { key: 13, value: 'La Manouba' },
  { key: 14, value: 'Médenine' },
  { key: 15, value: 'Monastir' },
  { key: 16, value: 'Nabeul' },
  { key: 17, value: 'Sfax' },
  { key: 18, value: 'Sidi Bouzid' },
  { key: 19, value: 'Siliana' },
  { key: 20, value: 'Sousse' },
  { key: 21, value: 'Tataouine' },
  { key: 22, value: 'Tozeur' },
  { key: 23, value: 'Tunis' },
  { key: 24, value: 'Zaghouan' }
];

export const BANKS_TN = [
  { id: 1, value: 'ATB' },
  { id: 2, value: 'BH' },
  { id: 3, value: 'BIAT' },
  { id: 4, value: 'BNA' },
  { id: 5, value: 'BT' },
  { id: 6, value: 'STB' },
  { id: 7, value: 'UIB' },
  { id: 8, value: 'UBCI' },
  { id: 9, value: 'Attijari' },
  { id: 10, value: 'Amen Bank' },
  { id: 11, value: 'Banque Zitouna' },
  { id: 12, value: 'Al Baraka' },
  { id: 13, value: 'Poste Tunisienne' },
  { id: 14, value: 'Autre' }
];

export const SUPPLIER_CATEGORIES = [
  { id: 1, value: 'Vente Gros Bois et Dérivés' },
  { id: 2, value: 'Vente Gros Matériaux de Construction' },
  { id: 3, value: 'Industrie Bois et Ameublement' },
  { id: 4, value: 'Vente Accessoires Industrie' }
];

export type Supplier = Customer;
