import React from 'react';
import { Enterprise } from '@/types/settings';
import { numberToFrenchWords } from '@/lib/number-to-words';

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
}

// ── RIB helpers ────────────────────────────────────────────────────────────
function cleanRib(rib: string): string {
  return rib.replace(/\s/g, '');
}

function parseRib(rib: string) {
  const r = cleanRib(rib).padEnd(20, ' ');
  return {
    codeEtab:  r.slice(0, 2),
    codeAgence: r.slice(2, 5),
    numCompte:  r.slice(5, 18),
    cle:        r.slice(18, 20),
  };
}

// ── Date helpers ───────────────────────────────────────────────────────────
function formatDateFr(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TraiteLettreDeChange({ data, enterprise }: Props) {
  const amountInWords = numberToFrenchWords(data.amount);
  const amountFormatted = data.amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  const rib = parseRib(data.rib);

  return (
    <div className="traite-container" style={{ position: 'relative', width: '297mm', height: '210mm', overflow: 'hidden' }}>
      
      {/* ── SCREEN ONLY LAYOUT: Decorative replica of Bill of Change ── */}
      <div className="mock-element bg-red-800 text-white flex justify-between items-center px-4 py-2 text-xs font-bold" style={{ position: 'absolute', top: '0', left: '0', width: '297mm', height: '8mm' }}>
        <span>République Tunisienne</span>
        <span>Lettre de Change · Lettre de Change of Tunisia · التونسية · كمبيالة</span>
      </div>

      {/* Screen mock grid guides */}
      <div className="mock-element border border-red-200/50" style={{ position: 'absolute', top: '8mm', left: '0', width: '297mm', height: '87mm' }} />
      <div className="mock-element border-b border-dashed border-red-500 text-center text-[8px] text-red-500 py-0.5" style={{ position: 'absolute', top: '95mm', left: '0', width: '297mm', height: '5mm' }}>
        ✂ — — — — — — — — — — — — — — — — — — — — — — — — — ✂
      </div>
      <div className="mock-element border border-red-200/50" style={{ position: 'absolute', top: '100mm', left: '0', width: '297mm', height: '95mm' }} />

      {/* Mock boxes and titles */}
      <div className="mock-element border border-slate-350 p-1 text-[7px]" style={{ position: 'absolute', top: '20mm', left: '210mm', width: '77mm', height: '12mm' }}>
        Montant / المبلغ
      </div>
      <div className="mock-element border border-slate-350 p-1 text-[7px]" style={{ position: 'absolute', top: '60mm', left: '210mm', width: '77mm', height: '12mm' }}>
        Montant / المبلغ
      </div>
      
      {/* Labels for fields to match locations */}
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '12mm', left: '76mm' }}>Echéance / حلول الأجل</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '12mm', left: '140mm' }}>A / في</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '22mm', left: '140mm' }}>Le / بتاريخ</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '40mm', left: '76mm' }}>RIB ou RIP du Tiré / المعرف البنكي أو البريدي للمسحوب عليه</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '60mm', left: '10mm' }}>Tireur / الساحب</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '60mm', left: '76mm' }}>Payer à l&apos;ordre de / إدفعوا لأمر</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '76mm', left: '10mm' }}>Montant en lettres / المبلغ بلسان القلم</span>

      {/* Talon (Lower part) mock guides */}
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '112mm', left: '10mm' }}>Lieu / مكان</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '112mm', left: '58mm' }}>Le / بتاريخ</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '112mm', left: '106mm' }}>Echéance / حلول الأجل</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '112mm', left: '162mm' }}>Nom du cédant / اسم المحيل</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '133mm', left: '10mm' }}>RIB ou RIP du Tiré</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '133mm', left: '120mm' }}>Valeur en / القيمة بـ</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '133mm', left: '162mm' }}>Domiciliation / اسم وعنوان الفرع</span>
      <span className="mock-element text-[8px] font-bold text-red-900" style={{ position: 'absolute', top: '153mm', left: '123mm' }}>Nom et adresse du Tiré</span>
      
      {/* ── PRINT VALUES: Absolutely positioned at precise physical paper boxes ── */}
      
      {/* Upper part values */}
      <div className="print-value" style={{ left: '76mm', top: '15mm', width: '50mm' }}>
        {formatDateFr(data.dueDate)}
      </div>
      <div className="print-value font-semibold" style={{ left: '145mm', top: '11mm', width: '40mm' }}>
        {data.lieuCreation}
      </div>
      <div className="print-value" style={{ left: '145mm', top: '25mm', width: '40mm' }}>
        {formatDateFr(data.creationDate)}
      </div>
      <div className="print-value font-bold text-right" style={{ left: '210mm', top: '24mm', width: '70mm', fontSize: '11.5pt' }}>
        {amountFormatted} TND
      </div>
      
      <div className="print-value tracking-widest font-mono" style={{ left: '95mm', top: '44mm', width: '100mm', letterSpacing: '1px' }}>
        {data.rib}
      </div>
      
      <div className="print-value font-semibold" style={{ left: '10mm', top: '65mm', width: '60mm' }}>
        {enterprise.name}
      </div>
      <div className="print-value font-bold" style={{ left: '76mm', top: '65mm', width: '120mm' }}>
        {data.supplierName}
      </div>
      <div className="print-value font-bold text-right" style={{ left: '210mm', top: '64mm', width: '70mm', fontSize: '11.5pt' }}>
        {amountFormatted} TND
      </div>
      
      <div className="print-value font-semibold" style={{ left: '10mm', top: '81mm', width: '265mm', textTransform: 'uppercase', fontSize: '9.5pt' }}>
        # {amountInWords} #
      </div>

      {/* Talon (Lower part) values */}
      <div className="print-value font-semibold" style={{ left: '10mm', top: '116mm', width: '45mm' }}>
        {data.lieuCreation}
      </div>
      <div className="print-value" style={{ left: '58mm', top: '116mm', width: '45mm' }}>
        {formatDateFr(data.creationDate)}
      </div>
      <div className="print-value" style={{ left: '106mm', top: '116mm', width: '50mm' }}>
        {formatDateFr(data.dueDate)}
      </div>
      <div className="print-value font-semibold" style={{ left: '162mm', top: '116mm', width: '100mm' }}>
        {data.supplierName}
      </div>
      
      <div className="print-value font-mono tracking-widest" style={{ left: '15mm', top: '138mm', width: '100mm', letterSpacing: '0.8px' }}>
        {data.rib}
      </div>
      <div className="print-value font-semibold" style={{ left: '120mm', top: '138mm', width: '30mm' }}>
        TND
      </div>
      <div className="print-value font-bold" style={{ left: '120mm', top: '144mm', width: '30mm' }}>
        {amountFormatted}
      </div>
      <div className="print-value font-semibold" style={{ left: '165mm', top: '138mm', width: '115mm', lineHeight: '1.4' }}>
        {data.bankDesignation} {data.bankAgency ? ` - ${data.bankAgency}` : ''}
      </div>

      {/* Decomposed RIB boxes */}
      <div className="print-value font-mono text-center" style={{ left: '10mm', top: '160mm', width: '14mm', letterSpacing: '1px' }}>
        {rib.codeEtab}
      </div>
      <div className="print-value font-mono text-center" style={{ left: '26mm', top: '160mm', width: '19mm', letterSpacing: '1px' }}>
        {rib.codeAgence}
      </div>
      <div className="print-value font-mono text-center" style={{ left: '47mm', top: '160mm', width: '61mm', letterSpacing: '1px' }}>
        {rib.numCompte}
      </div>
      <div className="print-value font-mono text-center" style={{ left: '110mm', top: '160mm', width: '10mm', letterSpacing: '1px' }}>
        {rib.cle}
      </div>

      <div className="print-value font-semibold" style={{ left: '125mm', top: '160mm', width: '150mm', lineHeight: '1.4' }}>
        {enterprise.name} - {enterprise.siegeAddress}
      </div>

      {/* Barcode code bars mock */}
      <div className="mock-element flex items-center justify-between px-6 bg-slate-100 text-[9px] border-t border-slate-300" style={{ position: 'absolute', bottom: '0', left: '0', width: '297mm', height: '10mm' }}>
        <span>!! {data.instrumentNumber.padStart(12, '0')} !!</span>
        <span style={{ fontSize: '20pt', letterSpacing: '2px', fontFamily: 'Courier New' }}>
          {'|' + '| '.repeat(20) + '|'}
        </span>
        <span>&lt;{data.instrumentNumber.padStart(12, '0')}&gt;</span>
      </div>
    </div>
  );
}
