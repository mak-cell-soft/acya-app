import { Document } from '@/types/document';

/**
 * Formats a date into the DD/MM/YY format (common in Tunisian business documents).
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Formats a number to 3 decimal places using a comma as a decimal separator (Tunisian format).
 * e.g. 153.250 -> 153,250
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0,000';
  return value.toFixed(3).replace('.', ',');
}

/**
 * Formats line quantities based on the unit of measure.
 * Wood measurements (M3, M2) require full 3-decimal precision.
 * Integer count units (PCS, Units) are printed as integers if they have no decimal part.
 */
export function formatQuantity(quantity: number | undefined, unit: string | undefined): string {
  if (quantity === undefined || quantity === null) return '0,000';
  
  const unitUpper = unit?.toUpperCase() || '';
  if (unitUpper === 'M2' || unitUpper === 'M3' || unitUpper === 'MÈTRE 3' || unitUpper === 'METRE 3') {
    return formatNumber(quantity);
  }

  // If it has no fractional part, display as a whole number
  if (quantity % 1 === 0) {
    return quantity.toString();
  }

  return formatNumber(quantity);
}

/**
 * Extracts the transporter's vehicle registration plate number.
 */
export function getVehicleInfo(document: Document | null | undefined): string {
  const t = document?.transporter || document?.counterpart?.transporter;
  if (!t) return '---';
  
  // Try various Matrical schemas from C# entity structure
  return (
    (t as any).vehicle?.serialNumber ||
    (t as any).vehicle?.serialnumber ||
    (t as any).vehiculematricule || 
    (t as any).car?.matricule || 
    (t as any).car?.serialnumber || 
    '---'
  );
}

/**
 * Extracts the transporter's full name.
 */
export function getTransporterName(document: Document | null | undefined): string {
  const t = document?.transporter || document?.counterpart?.transporter;
  if (!t) return '---';
  
  const firstName = t.firstname || (t as any).transpSurname || '';
  const lastName = t.lastname || (t as any).transpName || '';
  const name = `${firstName} ${lastName}`.trim();
  
  return name || t.fullname || '---';
}

/**
 * Groups merchandise lines by their TVA rates and aggregates the bases and values.
 * Returns an array of TVA groupings for display in the tax breakdown tables.
 */
export function getTvaBreakdown(document: Document | null | undefined): Array<{ base: number; percentage: string; value: number }> {
  if (!document || !document.merchandises) return [];

  const breakdown: { [key: string]: { base: number; value: number } } = {};

  document.merchandises.forEach((merch) => {
    // Avoid processing transport lines or empty entries differently than merchandise
    let tvaRateStr = '0';
    if (merch.article?.tva?.value) {
      tvaRateStr = merch.article.tva.value.toString().replace('%', '').trim();
    } else if ((merch.article as any)?.tvaValue) {
      tvaRateStr = (merch.article as any).tvaValue.toString().replace('%', '').trim();
    }

    const base = merch.cost_net_ht || 0;
    const tvaValue = merch.tva_value || 0;

    if (!breakdown[tvaRateStr]) {
      breakdown[tvaRateStr] = { base: 0, value: 0 };
    }

    breakdown[tvaRateStr].base += base;
    breakdown[tvaRateStr].value += tvaValue;
  });

  return Object.keys(breakdown).map((rate) => {
    return {
      base: breakdown[rate].base,
      percentage: rate + '%',
      value: breakdown[rate].value,
    };
  });
}

/**
 * Helper to retrieve client details from the counterpart model
 */
export function getClientName(document: Document | null | undefined): string {
  const cp = document?.counterpart;
  if (!cp) return '';
  return cp.name || `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || 'Client sans nom';
}

export function getClientAddress(document: Document | null | undefined): string {
  return document?.counterpart?.address || '';
}

export function getTvaCode(document: Document | null | undefined): string {
  return document?.counterpart?.taxregistrationnumber || '';
}

export function getAccountNumber(document: Document | null | undefined): string {
  return document?.counterpart?.id?.toString() || '';
}
