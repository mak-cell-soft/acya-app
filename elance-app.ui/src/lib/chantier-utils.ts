import { Customer } from '@/types/customer';

/**
 * Safely format a Customer or partial counterpart object for Chantier display,
 * preserving the application's established naming convention:
 * 1. Both company and person available: "Company (First Last)"
 * 2. Only company available: "Company"
 * 3. Only person available: "First Last" (with prefix like "Mr First Last" if prefix exists)
 * 4. Never returns undefined, null, or "undefined undefined".
 */
export function formatChantierClientName(c: {
  prefix?: string | null;
  name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
} | null | undefined): string {
  if (!c) return '';

  const companyName = (c.name || '').trim();
  const contactFirstName = (c.firstname || '').trim();
  const contactLastName = (c.lastname || '').trim();
  const contactName = [contactFirstName, contactLastName].filter(Boolean).join(' ').trim();

  if (companyName && contactName) {
    return `${companyName} (${contactName})`;
  }
  if (companyName) {
    return companyName;
  }
  if (contactName) {
    const prefix = (c.prefix || '').trim();
    return prefix ? `${prefix} ${contactName}` : contactName;
  }
  return '';
}

/**
 * Formats a customer option label for Chantier selectors (<select> dropdowns).
 * Always includes readable name, plus optional tax registration number (MF).
 * Guarantees never returning empty string, undefined, or null.
 */
export function formatChantierClientOptionLabel(
  c: Customer,
  fallbackId?: number
): string {
  const name = formatChantierClientName(c);
  const displayName = name || (fallbackId ? `Client #${fallbackId}` : `Client #${c.id}`);
  const mf = (c.taxregistrationnumber || '').trim();
  return mf ? `${displayName} (${mf})` : displayName;
}

/**
 * Safely resolves the display name for a Chantier client:
 * 1. Checks if the chantier has clientCounterPartId. If null or undefined, returns ''.
 * 2. If customers list is provided and contains the counterpart, uses formatChantierClientName.
 * 3. Otherwise falls back to chantier.clientName if valid.
 * 4. Never returns "undefined", "null", or "undefined undefined".
 */
export function resolveChantierClientDisplay(
  chantier: {
    clientCounterPartId?: number | null;
    clientName?: string | null;
  } | null | undefined,
  customers?: Customer[]
): string {
  if (!chantier || !chantier.clientCounterPartId) {
    return '';
  }

  // 1. Check in customers list
  if (customers && customers.length > 0) {
    const matched = customers.find((c) => c.id === chantier.clientCounterPartId);
    if (matched) {
      const formatted = formatChantierClientName(matched);
      if (formatted) return formatted;
    }
  }

  // 2. Fall back to clientName returned from API DTO if clean and valid
  const rawName = (chantier.clientName || '').trim();
  if (
    rawName &&
    rawName.toLowerCase() !== 'null' &&
    rawName.toLowerCase() !== 'undefined' &&
    rawName.toLowerCase() !== 'inconnu' &&
    rawName.toLowerCase() !== 'undefined undefined'
  ) {
    return rawName;
  }

  return '';
}

/**
 * Checks if a customer matches a search query across:
 * - formatted display name
 * - company/business name (name)
 * - first name (firstname)
 * - last name (lastname)
 * - tax registration number (taxregistrationnumber / matricule fiscal)
 * - phone number (phonenumberone / phonenumbertwo)
 * - identity card number (identitycardnumber / CIN)
 */
export function matchesChantierCustomerSearch(
  c: Customer,
  query: string
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const displayName = formatChantierClientName(c).toLowerCase();
  const rawName = (c.name || '').toLowerCase();
  const firstName = (c.firstname || '').toLowerCase();
  const lastName = (c.lastname || '').toLowerCase();
  const mf = (c.taxregistrationnumber || '').toLowerCase();
  const phone1 = (c.phonenumberone || '').toLowerCase();
  const phone2 = (c.phonenumbertwo || '').toLowerCase();
  const cin = (c.identitycardnumber || '').toLowerCase();

  return (
    displayName.includes(q) ||
    rawName.includes(q) ||
    firstName.includes(q) ||
    lastName.includes(q) ||
    mf.includes(q) ||
    phone1.includes(q) ||
    phone2.includes(q) ||
    cin.includes(q)
  );
}

/**
 * Standard color palette for Chantier phases.
 * Kept exactly identical to the preset colors in the Phase modal.
 */
export const PHASE_COLOR_PRESETS: readonly string[] = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

/**
 * Deterministically selects an appropriate color for a newly created phase:
 * 1. Reads the colors used by existing active (non-deleted) phases of the Chantier.
 * 2. Chooses the first color in the palette that is NOT currently used.
 * 3. If all palette colors are already in use, falls back to the least-used color,
 *    breaking ties deterministically in palette order.
 * 4. Safely ignores null, undefined, or empty colors on existing phases.
 * 5. Case-insensitive comparison so '#2563eb' matches '#2563EB'.
 */
export function getAutomaticPhaseColor(
  existingPhases?: Array<{ color?: string | null; isDeleted?: boolean } | null> | null,
  palette: readonly string[] = PHASE_COLOR_PRESETS
): string {
  if (!palette || palette.length === 0) {
    return '#2563eb';
  }

  if (!existingPhases || existingPhases.length === 0) {
    return palette[0];
  }

  // Count usage of each normalized color among non-deleted phases
  const colorUsageCount = new Map<string, number>();
  for (const color of palette) {
    colorUsageCount.set(color.toLowerCase(), 0);
  }

  for (const phase of existingPhases) {
    if (!phase || phase.isDeleted) continue;
    const rawColor = (phase.color || '').trim().toLowerCase();
    if (!rawColor) continue;
    if (colorUsageCount.has(rawColor)) {
      colorUsageCount.set(rawColor, (colorUsageCount.get(rawColor) || 0) + 1);
    }
  }

  // 1. Return the first unused color in palette order
  for (const color of palette) {
    if ((colorUsageCount.get(color.toLowerCase()) || 0) === 0) {
      return color;
    }
  }

  // 2. All palette colors are used at least once: pick the least used (tie-break by palette order)
  let minCount = Infinity;
  let chosenColor = palette[0];

  for (const color of palette) {
    const count = colorUsageCount.get(color.toLowerCase()) || 0;
    if (count < minCount) {
      minCount = count;
      chosenColor = color;
    }
  }

  return chosenColor;
}
