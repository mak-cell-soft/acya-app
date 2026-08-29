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
    templateX: 235,
    templateY: 75,
    templateWidth: 205,
    templateHeight: 24,
    label: '1. Échéance (Corps)',
    sampleValue: '31/12/2026',
    category: 'corps',
  },
  echeanceTalon: {
    templateX: 325,
    templateY: 278,
    templateWidth: 135,
    templateHeight: 22,
    label: '2. Échéance (Talon)',
    sampleValue: '31/12/2026',
    category: 'talon',
  },
  montantCorps: {
    templateX: 630,
    templateY: 122,
    templateWidth: 165,
    templateHeight: 24,
    label: '3. Montant (Corps)',
    sampleValue: '# 12 345,678 #',
    category: 'corps',
  },
  montantSecond: {
    templateX: 630,
    templateY: 192,
    templateWidth: 165,
    templateHeight: 23,
    label: '4. Montant Second (Talon/Cadre)',
    sampleValue: '# 12 345,678 #',
    category: 'talon',
  },
  lieuCreationCorps: {
    templateX: 475,
    templateY: 48,
    templateWidth: 80,
    templateHeight: 20,
    label: '5. Lieu de création (Corps)',
    sampleValue: 'Tunis',
    category: 'corps',
  },
  dateCreationCorps: {
    templateX: 485,
    templateY: 75,
    templateWidth: 85,
    templateHeight: 20,
    label: '6. Date de création (Corps)',
    sampleValue: '13/08/2026',
    category: 'corps',
  },
  ribTireCorps: {
    templateX: 225,
    templateY: 142,
    templateWidth: 340,
    templateHeight: 28,
    label: '7. RIB/RIP du tiré (Corps)',
    sampleValue: '08 001 1234567890123 45',
    category: 'corps',
  },
  ordrePaiement: {
    templateX: 355,
    templateY: 195,
    templateWidth: 340,
    templateHeight: 24,
    label: '8. Ordre de paiement / bénéficiaire',
    sampleValue: 'SOCIETE SOCOFEB SARL',
    category: 'corps',
  },
  montantLettres: {
    templateX: 140,
    templateY: 236,
    templateWidth: 580,
    templateHeight: 24,
    label: '9. Montant en lettres',
    sampleValue: '# DOUZE MILLE TROIS CENT QUARANTE-CINQ DINARS ET 678 MILLIMES #',
    category: 'corps',
  },
  valeurEn: {
    templateX: 430,
    templateY: 308,
    templateWidth: 95,
    templateHeight: 18,
    label: '10. Valeur en...',
    sampleValue: 'Dinars',
    category: 'talon',
  },
  nomAdresseTire: {
    templateX: 360,
    templateY: 358,
    templateWidth: 165,
    templateHeight: 75,
    label: '11. Nom et adresse du tiré',
    sampleValue: 'ACYA STE - Zone Industrielle Charguia, Tunis',
    category: 'talon',
  },
  domiciliation: {
    templateX: 550,
    templateY: 332,
    templateWidth: 240,
    templateHeight: 95,
    label: '12. Domiciliation bancaire',
    sampleValue: 'BIAT - Agence Avenue Habib Bourguiba, Tunis',
    category: 'talon',
  },
  ribTireTalon: {
    templateX: 13,
    templateY: 332,
    templateWidth: 325,
    templateHeight: 22,
    label: '13. RIB du tiré (Talon)',
    sampleValue: '08 001 1234567890123 45',
    category: 'talon',
  },
  lieuCreationTalon: {
    templateX: 15,
    templateY: 278,
    templateWidth: 140,
    templateHeight: 22,
    label: '14. Lieu de création (Talon - À)',
    sampleValue: 'Tunis',
    category: 'talon',
  },
  dateCreationTalon: {
    templateX: 175,
    templateY: 278,
    templateWidth: 135,
    templateHeight: 22,
    label: '15. Date de création (Talon - Le)',
    sampleValue: '13/08/2026',
    category: 'talon',
  },
  aval: {
    templateX: 180,
    templateY: 388,
    templateWidth: 155,
    templateHeight: 50,
    label: '16. Aval (Cautionnement)',
    sampleValue: 'Bon pour aval pour le compte du tiré',
    category: 'talon',
  },
};
