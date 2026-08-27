import React, { useMemo } from 'react';
import { Enterprise } from '@/types/settings';
import {
  CONFIRMED_PHYSICAL_WIDTH_MM,
  CONFIRMED_PHYSICAL_HEIGHT_MM,
  INITIAL_TRAITE_PIXEL_MAP,
} from '@/lib/traite-coordinate-map';
import {
  convertFullPixelMapToPhysical,
  mapBusinessDataToPixelMap,
} from '@/lib/traite-coordinate-converter';
import { TraiteBusinessData } from '@/types/traite-calibration';

/** Data needed to render a Tunisian Lettre de Change. */
export interface TraiteData {
  instrumentNumber: string;
  amount: number;
  dueDate: string;        // ISO string
  creationDate: string;   // ISO string
  lieuCreation: string;   // e.g. "Tunis"
  lieuCreationAr: string; // e.g. "تونس"
  supplierName: string;
  rib: string;            // 20-digit RIB (no spaces)
  bankAgency: string;
  bankDesignation: string;
}

interface Props {
  data: TraiteData;
  enterprise: Enterprise;
  businessData?: TraiteBusinessData;
  customPixelMap?: typeof INITIAL_TRAITE_PIXEL_MAP;
}

export function TraiteLettreDeChange({ data, enterprise, businessData, customPixelMap }: Props) {
  const printBusinessData: TraiteBusinessData = useMemo(() => {
    if (businessData) return businessData;

    const defaultNomAdresse = enterprise.siegeAddress
      ? `${enterprise.name || 'ACYA'} — ${enterprise.siegeAddress}`
      : enterprise.name || 'ACYA';

    const defaultDomiciliation = `${data.bankDesignation || ''}${data.bankAgency ? ' - ' + data.bankAgency : ''}`.trim();

    return {
      montant: data.amount,
      montantLettres: '',
      echeance: data.dueDate,
      ordrePaiement: data.supplierName,
      lieuCreation: data.lieuCreation,
      dateCreation: data.creationDate,
      ribTire: data.rib,
      nomAdresseTire: defaultNomAdresse,
      domiciliation: defaultDomiciliation,
      valeurEn: 'Dinars',
      aval: '',
      instrumentNumber: data.instrumentNumber,
    };
  }, [data, enterprise, businessData]);

  const physMap = useMemo(() => {
    const baseMap = customPixelMap || INITIAL_TRAITE_PIXEL_MAP;
    const populatedPixelMap = mapBusinessDataToPixelMap(baseMap, printBusinessData);
    return convertFullPixelMapToPhysical(populatedPixelMap, {
      widthMm: CONFIRMED_PHYSICAL_WIDTH_MM,
      heightMm: CONFIRMED_PHYSICAL_HEIGHT_MM,
    });
  }, [customPixelMap, printBusinessData]);

  return (
    <div
      className="traite-container"
      style={{
        position: 'relative',
        width: `${CONFIRMED_PHYSICAL_WIDTH_MM}mm`,
        height: `${CONFIRMED_PHYSICAL_HEIGHT_MM}mm`,
        overflow: 'hidden',
      }}
    >
      {/* ── SCREEN PREVIEW GUIDE ── */}
      <div
        className="mock-element bg-slate-900 text-white flex justify-between items-center px-2 py-0.5 text-[9px] font-bold"
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: `${CONFIRMED_PHYSICAL_WIDTH_MM}mm`,
          height: '5mm',
        }}
      >
        <span>République Tunisienne — Lettre de Change / Traite</span>
        <span>{CONFIRMED_PHYSICAL_WIDTH_MM} × {CONFIRMED_PHYSICAL_HEIGHT_MM} mm</span>
      </div>

      {/* ── PRINT VALUES: Absolutely positioned at converted physical millimeter coordinates ── */}
      {(Object.keys(physMap) as (keyof typeof physMap)[]).map((fieldKey) => {
        const field = physMap[fieldKey];
        if (!field || !field.sampleValue) return null;

        return (
          <div
            key={fieldKey}
            className="print-value"
            style={{
              position: 'absolute',
              left: `${field.x}mm`,
              top: `${field.y}mm`,
              width: `${field.width}mm`,
              height: `${field.height}mm`,
              overflow: 'hidden',
            }}
          >
            {field.sampleValue}
          </div>
        );
      })}
    </div>
  );
}
