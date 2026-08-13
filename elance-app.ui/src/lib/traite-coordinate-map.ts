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
export const CONFIRMED_PHYSICAL_WIDTH_MM = 280;
export const CONFIRMED_PHYSICAL_HEIGHT_MM = 183;
export const CONFIRMED_PHYSICAL_ASPECT_RATIO = CONFIRMED_PHYSICAL_WIDTH_MM / CONFIRMED_PHYSICAL_HEIGHT_MM; // ~1.53005

/**
 * Baseline pixel coordinate map for the 16 final dynamic fields on the 820x536 scanned template.
 * 13 existing approved coordinates are preserved exactly.
 * 3 new fields (echeanceTalon, montantSecond, aval) are marked as NEEDS CALIBRATION.
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
    templateX: 13,
    templateY: 455,
    templateWidth: 140,
    templateHeight: 22,
    label: '2. Échéance (Talon)',
    sampleValue: '31/12/2026',
    category: 'talon',
    needsCalibration: true,
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
    templateX: 275,
    templateY: 273,
    templateWidth: 130,
    templateHeight: 24,
    label: '4. Montant Second (Talon/Cadre)',
    sampleValue: '# 12 345,678 #',
    category: 'talon',
    needsCalibration: true,
  },
  lieuCreationCorps: {
    templateX: 402,
    templateY: 57,
    templateWidth: 110,
    templateHeight: 22,
    label: '5. Lieu de création (Corps)',
    sampleValue: 'Tunis',
    category: 'corps',
  },
  dateCreationCorps: {
    templateX: 404,
    templateY: 78,
    templateWidth: 110,
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
    templateY: 311,
    templateWidth: 82,
    templateHeight: 19,
    label: '10. Valeur en...',
    sampleValue: 'TND 12 345,678',
    category: 'talon',
  },
  nomAdresseTire: {
    templateX: 357,
    templateY: 349,
    templateWidth: 173,
    templateHeight: 88,
    label: '11. Nom et adresse du tiré',
    sampleValue: 'ACYA STE - Zone Industrielle Charguia, Tunis',
    category: 'talon',
  },
  domiciliation: {
    templateX: 550,
    templateY: 327,
    templateWidth: 245,
    templateHeight: 44,
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
    templateHeight: 24,
    label: '15. Date de création (Talon - Le)',
    sampleValue: '13/08/2026',
    category: 'talon',
  },
  aval: {
    templateX: 550,
    templateY: 450,
    templateWidth: 240,
    templateHeight: 45,
    label: '16. Aval (Cautionnement)',
    sampleValue: 'Bon pour aval pour le compte du tiré',
    category: 'talon',
    needsCalibration: true,
  },
};
