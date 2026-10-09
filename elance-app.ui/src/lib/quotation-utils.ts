/**
 * Utilities and constants for Quotation Validity Period and Commercial Conditions.
 */

export const DEFAULT_VALIDITY_DURATION = 15;
export const DEFAULT_VALIDITY_UNIT = 'days';
export const DEFAULT_COMMERCIAL_CONDITIONS = 'Dans la limite du stock disponible.';

export interface ValidityUnitOption {
  key: 'days' | 'months';
  label: string;
}

export const VALIDITY_UNITS: ValidityUnitOption[] = [
  { key: 'days', label: 'Jours' },
  { key: 'months', label: 'Mois' },
];

/**
 * Generates the French validity sentence dynamically from duration and unit.
 * Handles singular and plural rules accurately:
 * - 1 jour vs X jours
 * - 1 mois vs X mois
 */
export function generateValiditySentence(duration: number | string, unit: string = 'days'): string {
  const parsed = typeof duration === 'number' ? duration : parseInt(String(duration), 10);
  const safeDuration = (!isNaN(parsed) && parsed > 0) ? parsed : DEFAULT_VALIDITY_DURATION;
  const normalized = (unit || 'days').trim().toLowerCase();

  if (normalized === 'months' || normalized === 'mois') {
    return safeDuration === 1 ? 'Devis valide 1 mois.' : `Devis valide ${safeDuration} mois.`;
  }

  // Default to days / jours
  return safeDuration === 1 ? 'Devis valide 1 jour.' : `Devis valide ${safeDuration} jours.`;
}

/**
 * Validates validity duration input value.
 * Returns an error string in French, or null if valid.
 */
export function validateValidityDuration(duration: number | string | undefined | null): string | null {
  if (duration === undefined || duration === null || String(duration).trim() === '') {
    return 'La durée de validité est obligatoire.';
  }

  const num = Number(duration);
  if (isNaN(num)) {
    return 'La durée doit être un nombre valide.';
  }

  if (!Number.isInteger(num)) {
    return 'La durée doit être un nombre entier.';
  }

  if (num <= 0) {
    return 'La durée doit être un entier strictement positif (supérieur à 0).';
  }

  return null;
}
