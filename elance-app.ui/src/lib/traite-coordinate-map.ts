import { TraitePixelMap } from '@/types/traite-calibration';

/**
 * Scanned Template Dimensions (Source of Truth for Visual Geometry)
 */
export const TEMPLATE_WIDTH_PX = 820;
export const TEMPLATE_HEIGHT_PX = 536;
export const TEMPLATE_ASPECT_RATIO = TEMPLATE_WIDTH_PX / TEMPLATE_HEIGHT_PX; // ~1.52985

/**
 * Confirmed Physical Paper Geometry (Measured Paper Dimensions)
 */
export const CONFIRMED_PHYSICAL_WIDTH_MM = 176.5;
export const CONFIRMED_PHYSICAL_HEIGHT_MM = 115.2;
export const CONFIRMED_PHYSICAL_ASPECT_RATIO = CONFIRMED_PHYSICAL_WIDTH_MM / CONFIRMED_PHYSICAL_HEIGHT_MM; // ~1.532118

/**
 * Baseline pixel coordinate map for the 16 final dynamic fields on the 820x536 scanned template.
 * Preserved strictly in canonical 820x536 template coordinate system.
 */
export const INITIAL_TRAITE_PIXEL_MAP: TraitePixelMap = {
  echeanceCorps: {
    templateX: 225,
    templateY: 75,
    templateWidth: 148,
    templateHeight: 22,
    label: '1. Échéance (Corps)',
    sampleValue: '31/12/2026',
    category: 'corps',
  },
  echeanceTalon: {
    templateX: 268,
    templateY: 272,
    templateWidth: 120,
    templateHeight: 25,
    label: '2. Échéance (Talon)',
    sampleValue: '31/12/2026',
    category: 'talon',
  },
  montantCorps: {
    templateX: 613,
    templateY: 118,
    templateWidth: 180,
    templateHeight: 24,
    label: '3. Montant (Corps)',
    sampleValue: '# 12 345,678 TND #',
    category: 'corps',
  },
  montantSecond: {
    templateX: 615,
    templateY: 188,
    templateWidth: 179,
    templateHeight: 23,
    label: '4. Montant Second (Talon/Cadre)',
    sampleValue: '# 12 345,678 #',
    category: 'talon',
  },
  lieuCreationCorps: {
    templateX: 397,
    templateY: 57,
    templateWidth: 123,
    templateHeight: 20,
    label: '5. Lieu de création (Corps)',
    sampleValue: 'Tunis',
    category: 'corps',
  },
  dateCreationCorps: {
    templateX: 399,
    templateY: 80,
    templateWidth: 122,
    templateHeight: 22,
    label: '6. Date de création (Corps)',
    sampleValue: '13/08/2026',
    category: 'corps',
  },
  ribTireCorps: {
    templateX: 225,
    templateY: 119,
    templateWidth: 344,
    templateHeight: 25,
    label: '7. RIB/RIP du tiré (Corps)',
    sampleValue: '08 001 1234567890123 45',
    category: 'corps',
  },
  ordrePaiement: {
    templateX: 233,
    templateY: 202,
    templateWidth: 350,
    templateHeight: 24,
    label: '8. Ordre de paiement / bénéficiaire',
    sampleValue: 'SOCIETE SOCOFEB SARL',
    category: 'corps',
  },
  montantLettres: {
    templateX: 22,
    templateY: 231,
    templateWidth: 768,
    templateHeight: 26,
    label: '9. Montant en lettres',
    sampleValue: '# DOUZE MILLE TROIS CENT QUARANTE-CINQ DINARS ET 678 MILLIMES #',
    category: 'corps',
  },
  valeurEn: {
    templateX: 410,
    templateY: 309,
    templateWidth: 81,
    templateHeight: 17,
    label: '10. Valeur en...',
    sampleValue: 'TND 12 345,678',
    category: 'talon',
  },
  nomAdresseTire: {
    templateX: 355,
    templateY: 349,
    templateWidth: 175,
    templateHeight: 83,
    label: '11. Nom et adresse du tiré',
    sampleValue: 'ACYA STE - Zone Industrielle Charguia, Tunis',
    category: 'talon',
  },
  domiciliation: {
    templateX: 545,
    templateY: 324,
    templateWidth: 252,
    templateHeight: 49,
    label: '12. Domiciliation bancaire',
    sampleValue: 'BIAT - Agence Avenue Habib Bourguiba, Tunis',
    category: 'talon',
  },
  ribTireTalon: {
    templateX: 13,
    templateY: 323,
    templateWidth: 324,
    templateHeight: 21,
    label: '13. RIB du tiré (Talon)',
    sampleValue: '08 001 1234567890123 45',
    category: 'talon',
  },
  lieuCreationTalon: {
    templateX: 13,
    templateY: 275,
    templateWidth: 121,
    templateHeight: 25,
    label: '14. Lieu de création (Talon - À)',
    sampleValue: 'Tunis',
    category: 'talon',
  },
  dateCreationTalon: {
    templateX: 144,
    templateY: 273,
    templateWidth: 114,
    templateHeight: 26,
    label: '15. Date de création (Talon - Le)',
    sampleValue: '13/08/2026',
    category: 'talon',
  },
  aval: {
    templateX: 183,
    templateY: 379,
    templateWidth: 157,
    templateHeight: 60,
    label: '16. Aval (Cautionnement)',
    sampleValue: 'Bon pour aval pour le compte du tiré',
    category: 'talon',
  },
};
