export interface FieldTemplateCoordinate {
  templateX: number;
  templateY: number;
  templateWidth: number;
  templateHeight: number;
  label: string;
  sampleValue: string;
  category: 'corps' | 'talon';
}

export type TraiteFieldKey =
  | 'signatureTire'
  | 'echeance'
  | 'ribTire'
  | 'ordrePaiement'
  | 'montant'
  | 'montantLettres'
  | 'tireur'
  | 'lieuCreation'
  | 'dateCreation'
  | 'nomCedant'
  | 'ribTireTalon'
  | 'codeEtablissement'
  | 'codeAgence'
  | 'numCompte'
  | 'cle'
  | 'valeurEn'
  | 'nomAdresseTire'
  | 'domiciliation'
  | 'signatureTireur';

export type TraitePixelMap = Record<TraiteFieldKey, FieldTemplateCoordinate>;

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
}
