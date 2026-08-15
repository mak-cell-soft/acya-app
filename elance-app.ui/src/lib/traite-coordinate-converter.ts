import {
  FieldTemplateCoordinate,
  PhysicalDimensions,
  TraiteFieldKey,
  TraitePixelMap,
  TraiteBusinessData,
} from '@/types/traite-calibration';
import {
  TEMPLATE_HEIGHT_PX,
  TEMPLATE_WIDTH_PX,
  TEMPLATE_ASPECT_RATIO,
  CONFIRMED_PHYSICAL_WIDTH_MM,
  CONFIRMED_PHYSICAL_HEIGHT_MM,
} from './traite-coordinate-map';
import { numberToFrenchWords } from '@/lib/number-to-words';

export interface PhysicalFieldCoordinate {
  x: number;          // in mm from top-left
  y: number;          // in mm from top-left
  width: number;      // in mm
  height: number;     // in mm
  centerX: number;    // in mm
  centerY: number;    // in mm
  label: string;
  sampleValue: string;
}

export type PhysicalTraiteFieldMap = Record<TraiteFieldKey, PhysicalFieldCoordinate>;

/**
 * Maps high-level business data (printData) to the 16 physical rendering fields.
 * Duplicated physical fields (e.g. echeanceCorps + echeanceTalon) are populated
 * automatically from single business inputs.
 */
export function mapBusinessDataToPixelMap(
  pixelMap: TraitePixelMap,
  data: TraiteBusinessData
): TraitePixelMap {
  const montantFormatted = `# ${data.montant.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND #`;
  const montantSimple = `# ${data.montant.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} #`;
  const amountInWords = data.montantLettres || `# ${numberToFrenchWords(data.montant)} #`;

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return {
    ...pixelMap,
    echeanceCorps: { ...pixelMap.echeanceCorps, sampleValue: formatDate(data.echeance) },
    echeanceTalon: { ...pixelMap.echeanceTalon, sampleValue: formatDate(data.echeance) },
    montantCorps: { ...pixelMap.montantCorps, sampleValue: montantFormatted },
    montantSecond: { ...pixelMap.montantSecond, sampleValue: montantSimple },
    lieuCreationCorps: { ...pixelMap.lieuCreationCorps, sampleValue: data.lieuCreation },
    dateCreationCorps: { ...pixelMap.dateCreationCorps, sampleValue: formatDate(data.dateCreation) },
    ribTireCorps: { ...pixelMap.ribTireCorps, sampleValue: data.ribTire },
    ordrePaiement: { ...pixelMap.ordrePaiement, sampleValue: data.ordrePaiement },
    montantLettres: { ...pixelMap.montantLettres, sampleValue: amountInWords },
    valeurEn: { ...pixelMap.valeurEn, sampleValue: data.valeurEn || 'MARCHANDISES' },
    nomAdresseTire: { ...pixelMap.nomAdresseTire, sampleValue: data.nomAdresseTire },
    domiciliation: { ...pixelMap.domiciliation, sampleValue: data.domiciliation },
    ribTireTalon: { ...pixelMap.ribTireTalon, sampleValue: data.ribTire },
    lieuCreationTalon: { ...pixelMap.lieuCreationTalon, sampleValue: data.lieuCreation },
    dateCreationTalon: { ...pixelMap.dateCreationTalon, sampleValue: formatDate(data.dateCreation) },
    aval: { ...pixelMap.aval, sampleValue: data.aval || '[Pas d\'aval]' },
  };
}

/**
 * Centralized conversion function: Converts a single pixel template coordinate into physical millimeters.
 *
 * Formula:
 * physicalX = (templateX / 820) * 176.5
 * physicalY = (templateY / 536) * 115.2
 * physicalWidth = (templateWidth / 820) * 176.5
 * physicalHeight = (templateHeight / 536) * 115.2
 */
export function templateToPhysical(
  coord: FieldTemplateCoordinate,
  dimensions: PhysicalDimensions = { widthMm: CONFIRMED_PHYSICAL_WIDTH_MM, heightMm: CONFIRMED_PHYSICAL_HEIGHT_MM }
): PhysicalFieldCoordinate {
  const x = (coord.templateX / TEMPLATE_WIDTH_PX) * dimensions.widthMm;
  const y = (coord.templateY / TEMPLATE_HEIGHT_PX) * dimensions.heightMm;
  const width = (coord.templateWidth / TEMPLATE_WIDTH_PX) * dimensions.widthMm;
  const height = (coord.templateHeight / TEMPLATE_HEIGHT_PX) * dimensions.heightMm;

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
    centerX: Number((x + width / 2).toFixed(2)),
    centerY: Number((y + height / 2).toFixed(2)),
    label: coord.label,
    sampleValue: coord.sampleValue,
  };
}

/**
 * Converts an entire TraitePixelMap into physical millimeter coordinates based on supplied physical paper dimensions.
 */
export function convertFullPixelMapToPhysical(
  pixelMap: TraitePixelMap,
  dimensions: PhysicalDimensions = { widthMm: CONFIRMED_PHYSICAL_WIDTH_MM, heightMm: CONFIRMED_PHYSICAL_HEIGHT_MM }
): PhysicalTraiteFieldMap {
  const result: Partial<PhysicalTraiteFieldMap> = {};

  (Object.keys(pixelMap) as TraiteFieldKey[]).forEach((key) => {
    result[key] = templateToPhysical(pixelMap[key], dimensions);
  });

  return result as PhysicalTraiteFieldMap;
}

/**
 * Compares the aspect ratio of supplied physical dimensions against the scanned template aspect ratio (1.52985).
 */
export function validateAspectRatio(dimensions: PhysicalDimensions = { widthMm: CONFIRMED_PHYSICAL_WIDTH_MM, heightMm: CONFIRMED_PHYSICAL_HEIGHT_MM }): {
  physicalAspectRatio: number;
  templateAspectRatio: number;
  differencePercent: number;
  isAligned: boolean;
} {
  const physicalAspectRatio = dimensions.widthMm / dimensions.heightMm;
  const differencePercent = Math.abs(
    ((physicalAspectRatio - TEMPLATE_ASPECT_RATIO) / TEMPLATE_ASPECT_RATIO) * 100
  );

  return {
    physicalAspectRatio: Number(physicalAspectRatio.toFixed(4)),
    templateAspectRatio: Number(TEMPLATE_ASPECT_RATIO.toFixed(4)),
    differencePercent: Number(differencePercent.toFixed(2)),
    isAligned: differencePercent <= 2.0,
  };
}

/**
 * Generates clean JSON export containing ONLY the required fields with templateX, templateY, templateWidth, templateHeight, centerX, centerY.
 */
export function exportPixelMapAsJSON(pixelMap: TraitePixelMap): string {
  const cleanMap: Record<
    string,
    {
      templateX: number;
      templateY: number;
      templateWidth: number;
      templateHeight: number;
      centerX: number;
      centerY: number;
      label: string;
    }
  > = {};

  (Object.keys(pixelMap) as TraiteFieldKey[]).forEach((key) => {
    const item = pixelMap[key];
    const centerX = item.templateX + Math.round(item.templateWidth / 2);
    const centerY = item.templateY + Math.round(item.templateHeight / 2);

    cleanMap[key] = {
      templateX: item.templateX,
      templateY: item.templateY,
      templateWidth: item.templateWidth,
      templateHeight: item.templateHeight,
      centerX,
      centerY,
      label: item.label,
    };
  });

  return JSON.stringify(cleanMap, null, 2);
}

/**
 * Generates TypeScript code snippet export.
 */
export function exportPixelMapAsTypeScript(pixelMap: TraitePixelMap): string {
  return `export const CALIBRATED_TRAITE_PIXEL_MAP = ${exportPixelMapAsJSON(pixelMap)} as const;`;
}
