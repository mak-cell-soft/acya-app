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

  const sumBase = Object.values(breakdown).reduce((sum, item) => sum + item.base, 0);
  const sumValue = Object.values(breakdown).reduce((sum, item) => sum + item.value, 0);
  const docNetHT = document.total_ht_net_doc || 0;
  const docTVA = document.total_tva_doc || 0;

  if (docNetHT > 0 && sumBase > 0 && Math.abs(sumBase - docNetHT) > 0.001) {
    const ratioHT = docNetHT / sumBase;
    const ratioTVA = sumValue > 0 ? (docTVA / sumValue) : 0;

    Object.keys(breakdown).forEach((rate) => {
      breakdown[rate].base = parseFloat((breakdown[rate].base * ratioHT).toFixed(3));
      if (ratioTVA > 0) {
        breakdown[rate].value = parseFloat((breakdown[rate].value * ratioTVA).toFixed(3));
      } else {
        const rateVal = parseFloat(rate) / 100;
        breakdown[rate].value = parseFloat((breakdown[rate].base * rateVal).toFixed(3));
      }
    });
  }

  return Object.keys(breakdown).map((rate) => {
    return {
      base: breakdown[rate].base,
      percentage: rate + '%',
      value: breakdown[rate].value,
    };
  });
}

export interface ParsedPassagerInfo {
  name: string;
  cin: string;
  address: string;
}

export function parsePassagerInfo(document: Document | null | undefined): ParsedPassagerInfo | null {
  if (!document) return null;

  const cp = document.counterpart;
  const isPassagerCP =
    cp?.notes === 'SYSTEM_PASSAGER' ||
    cp?.prefix === 'PASS' ||
    cp?.name === 'Client Passager' ||
    (cp?.firstname === 'Client' && cp?.lastname === 'Passager');

  const desc = document.description || '';
  const supplierRef = document.supplierReference || '';

  const hasPassagerInDesc = desc.includes('Client Passager:');

  if (!isPassagerCP && !hasPassagerInDesc) {
    return null;
  }

  let name = '';
  let cin = '';
  let address = '';

  const passagerMatch = desc.match(/Client Passager:\s*([^(]+)/i);
  if (passagerMatch && passagerMatch[1]) {
    name = passagerMatch[1].trim();
  }

  const cinMatch = desc.match(/CIN:\s*([^,)]+)/i);
  if (cinMatch && cinMatch[1]) {
    cin = cinMatch[1].trim();
  } else if (supplierRef.startsWith('PASS-')) {
    cin = supplierRef.replace(/^PASS-/i, '').trim();
  }

  const addrMatch = desc.match(/Adresse:\s*([^)]+)/i);
  if (addrMatch && addrMatch[1]) {
    address = addrMatch[1].trim();
  }

  if (!name && !cin && !address) {
    return null;
  }

  return {
    name: name || 'Client Passager',
    cin,
    address,
  };
}

/**
 * Helper to retrieve client details from the counterpart model or passager description
 */
export function getClientName(document: Document | null | undefined): string {
  const passager = parsePassagerInfo(document);
  if (passager && passager.name) {
    return passager.name;
  }

  const cp = document?.counterpart;
  if (!cp) return '';
  return cp.name || `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || 'Client sans nom';
}

export function getCustomerRealAddress(document: Document | null | undefined): string {
  if (!document) return '';
  const passager = parsePassagerInfo(document);
  if (passager && passager.address) {
    return passager.address;
  }
  return document.counterpart?.address || '';
}

export function getCustomDeliveryAddress(document: Document | null | undefined): string {
  if (!document) return '';
  const supplierRef = (document.supplierReference || (document as any)?.supplierreference || '').trim();
  if (
    supplierRef && 
    !supplierRef.startsWith('PASS-') && 
    !supplierRef.match(/^BL-?\d+/i) && 
    !supplierRef.match(/^FAC-?\d+/i)
  ) {
    return supplierRef;
  }
  return '';
}

export function getClientAddress(document: Document | null | undefined): string {
  return getCustomDeliveryAddress(document) || getCustomerRealAddress(document);
}

export function getTvaCode(document: Document | null | undefined): string {
  const passager = parsePassagerInfo(document);
  if (passager && passager.cin) {
    return `CIN: ${passager.cin}`;
  }

  return document?.counterpart?.taxregistrationnumber || '';
}

export function getCustomerCin(document: Document | null | undefined): string {
  return document?.counterpart?.identitycardnumber || '';
}

export function getAccountNumber(document: Document | null | undefined): string {
  const passager = parsePassagerInfo(document);
  if (passager && passager.cin) {
    return `PASS-${passager.cin}`;
  }
  return document?.counterpart?.id?.toString() || '';
}

/**
 * Converts a numeric amount to French words (Dinars et Millimes tunisiens).
 * e.g. 125.450 -> "Cent vingt-cinq dinars et quatre cent cinquante millimes"
 */
export function numberToWordsFR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) {
    return 'Zéro dinar';
  }

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    let res = '';
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h === 1) res += 'cent ';
    else if (h > 1) res += units[h] + ' cent' + (r === 0 ? 's ' : ' ');

    if (r > 0) {
      if (r < 10) res += units[r];
      else if (r < 20) res += teens[r - 10];
      else if (r < 70) {
        const t = Math.floor(r / 10);
        const u = r % 10;
        res += tens[t] + (u === 1 ? ' et un' : u > 0 ? '-' + units[u] : '');
      } else if (r < 80) {
        const u = r - 60;
        res += 'soixante' + (u === 11 ? ' et onze' : '-' + teens[u - 10]);
      } else if (r < 90) {
        const u = r - 80;
        res += 'quatre-vingt' + (u > 0 ? '-' + units[u] : 's');
      } else {
        const u = r - 80;
        res += 'quatre-vingt-' + teens[u - 10];
      }
    }

    return res.trim();
  }

  function convertNumber(num: number): string {
    if (num === 0) return 'zéro';
    let res = '';
    const millions = Math.floor(num / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = Math.floor(num % 1000);

    if (millions === 1) res += 'un million ';
    else if (millions > 1) res += convertGroup(millions) + ' millions ';

    if (thousands === 1) res += 'mille ';
    else if (thousands > 1) res += convertGroup(thousands) + ' mille ';

    if (remainder > 0) res += convertGroup(remainder);

    return res.trim();
  }

  const dinars = Math.floor(Math.abs(amount));
  const millimes = Math.round((Math.abs(amount) - dinars) * 1000);

  let result = '';
  if (dinars > 0) {
    result += convertNumber(dinars) + (dinars > 1 ? ' dinars' : ' dinar');
  }

  if (millimes > 0) {
    if (result.length > 0) result += ' et ';
    result += convertNumber(millimes) + (millimes > 1 ? ' millimes' : ' millime');
  }

  if (!result) return 'Zéro dinar';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

