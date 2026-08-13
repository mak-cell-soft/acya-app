export interface FieldTemplateCoordinate {
  templateX: number;
  templateY: number;
  templateWidth: number;
  templateHeight: number;
  label: string;
  sampleValue: string;
  category: 'corps' | 'talon';
  needsCalibration?: boolean;
}

export type TraiteFieldKey =
  | 'echeanceCorps'
  | 'echeanceTalon'
  | 'montantCorps'
  | 'montantSecond'
  | 'lieuCreationCorps'
  | 'dateCreationCorps'
  | 'ribTireCorps'
  | 'ordrePaiement'
  | 'montantLettres'
  | 'valeurEn'
  | 'nomAdresseTire'
  | 'domiciliation'
  | 'ribTireTalon'
  | 'lieuCreationTalon'
  | 'dateCreationTalon'
  | 'aval';

export type TraitePixelMap = Record<TraiteFieldKey, FieldTemplateCoordinate>;

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
}

/**
 * Business-level print data collected from TraitePrintDialog.
 * Multi-destination physical fields are populated automatically from these business values.
 */
export interface TraiteBusinessData {
  montant: number;
  montantLettres?: string;
  echeance: string;           // ISO date yyyy-MM-dd
  ordrePaiement: string;      // Beneficiary / Supplier name
  lieuCreation: string;       // e.g. "Tunis"
  dateCreation: string;       // ISO date yyyy-MM-dd
  ribTire: string;            // 20-digit RIB
  nomAdresseTire: string;     // Enterprise name & address (Tiré)
  domiciliation: string;      // Bank designation & agency
  valeurEn: string;           // e.g. "MARCHANDISES"
  aval: string;               // Optional cautionnement
  instrumentNumber: string;   // Traite reference number
}
