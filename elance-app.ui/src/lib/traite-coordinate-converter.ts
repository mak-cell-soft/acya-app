import {
  FieldTemplateCoordinate,
  PhysicalDimensions,
  TraiteFieldKey,
  TraitePixelMap,
} from '@/types/traite-calibration';
import { TEMPLATE_HEIGHT_PX, TEMPLATE_WIDTH_PX, TEMPLATE_ASPECT_RATIO } from './traite-coordinate-map';

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
 * Centralized conversion function: Converts a single pixel template coordinate into physical millimeters.
 *
 * Formula:
 * physicalX = (templateX / TEMPLATE_WIDTH_PX) * widthMm
 * physicalY = (templateY / TEMPLATE_HEIGHT_PX) * heightMm
 */
export function templateToPhysical(
  coord: FieldTemplateCoordinate,
  dimensions: PhysicalDimensions
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
  dimensions: PhysicalDimensions
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
export function validateAspectRatio(dimensions: PhysicalDimensions): {
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
    isAligned: differencePercent <= 2.0, // aligned within 2% margin
  };
}

/**
 * Generates formatted JSON export string for the calibrated template pixel coordinate map.
 */
export function exportPixelMapAsJSON(pixelMap: TraitePixelMap): string {
  const cleanMap: Record<string, { templateX: number; templateY: number; templateWidth: number; templateHeight: number; centerX: number; centerY: number }> = {};

  (Object.keys(pixelMap) as TraiteFieldKey[]).forEach((key) => {
    const item = pixelMap[key];
    cleanMap[key] = {
      templateX: item.templateX,
      templateY: item.templateY,
      templateWidth: item.templateWidth,
      templateHeight: item.templateHeight,
      centerX: item.templateX + Math.round(item.templateWidth / 2),
      centerY: item.templateY + Math.round(item.templateHeight / 2),
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
