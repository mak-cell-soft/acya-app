'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Loader2, Printer, Crosshair, Building2, Banknote, Calendar, Info, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Payment } from '@/types/payment';
import { Enterprise, Bank } from '@/types/settings';
import { GOVERNORATS } from '@/constants/governorats';
import { TraiteLettreDeChange, TraiteData } from '@/components/print/traite-lettre-de-change';
import { getTraitePrintStyles } from '@/components/print/print-styles';
import { TraiteCalibrationDialog } from '@/components/purchases/traite-calibration-dialog';
import { TraiteBusinessData } from '@/types/traite-calibration';
import { numberToFrenchWords } from '@/lib/number-to-words';

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateInputValue(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function toIso(value: string | Date): string {
  if (typeof value === 'string') return value;
  return value.toISOString();
}

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Props ──────────────────────────────────────────────────────────────────

interface TraitePrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  traite: Payment;
  supplier: { name?: string; firstname?: string; lastname?: string } | null;
  enterprise: Enterprise;
  banks: Bank[];
}

// ── Component ──────────────────────────────────────────────────────────────

export function TraitePrintDialog({
  isOpen,
  onClose,
  traite,
  supplier,
  enterprise,
  banks,
}: TraitePrintDialogProps) {

  // ── Derive initial supplier display name ─────────────────────────────
  const initialSupplierName = useMemo(() => {
    if (!supplier) return '';
    return (
      supplier.name ||
      `${supplier.firstname || ''} ${supplier.lastname || ''}`.trim()
    );
  }, [supplier]);

  // ── Form State ───────────────────────────────────────────────────────
  const [amount, setAmount] = useState<string>(
    traite.amount?.toFixed(3) ?? ''
  );
  const [dueDate, setDueDate] = useState<string>(
    traite.instrument?.dueDate
      ? toDateInputValue(new Date(traite.instrument.dueDate))
      : toDateInputValue()
  );
  const [creationDate, setCreationDate] = useState<string>(toDateInputValue());
  const [selectedGov, setSelectedGov] = useState<string>('Tunis');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    banks.length > 0 ? banks[0].id.toString() : ''
  );
  const [ordrePaiement, setOrdrePaiement] = useState<string>(initialSupplierName);
  // Default currency value fixed to 'Dinars' for commercial bill (traite) valuation
  const [valeurEn, setValeurEn] = useState<string>('Dinars');
  const [aval, setAval] = useState<string>('');

  // Tiré enterprise name & address pre-fill
  const defaultNomAdresseTire = useMemo(() => {
    if (!enterprise) return '';
    const addr = enterprise.siegeAddress || '';
    return `${enterprise.name || 'ACYA'}${addr ? ' — ' + addr : ''}`.trim();
  }, [enterprise]);

  const [nomAdresseTire, setNomAdresseTire] = useState<string>(defaultNomAdresseTire);

  useEffect(() => {
    if (defaultNomAdresseTire && !nomAdresseTire) {
      setNomAdresseTire(defaultNomAdresseTire);
    }
  }, [defaultNomAdresseTire, nomAdresseTire]);

  const [printing, setPrinting] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

  // Selected Bank & Domiciliation
  const selectedBank = useMemo(
    () => banks.find((b) => b.id.toString() === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const defaultDomiciliation = useMemo(() => {
    if (!selectedBank) return '';
    const des = selectedBank.designation || selectedBank.reference || '';
    const ag = selectedBank.agency ? ` - ${selectedBank.agency}` : '';
    return `${des}${ag}`.trim();
  }, [selectedBank]);

  const [domiciliation, setDomiciliation] = useState<string>('');

  useEffect(() => {
    if (defaultDomiciliation) {
      setDomiciliation(defaultDomiciliation);
    }
  }, [defaultDomiciliation]);

  const selectedGovernorAt = useMemo(
    () => GOVERNORATS.find((g) => g.fr === selectedGov) ?? GOVERNORATS[22],
    [selectedGov]
  );

  const parsedAmount = useMemo(
    () => parseFloat(amount.replace(',', '.')) || 0,
    [amount]
  );

  // ── Construct Unified Business Print Data Model ──────────────────────
  const printData: TraiteBusinessData = useMemo(() => {
    return {
      montant: parsedAmount,
      montantLettres: parsedAmount > 0 ? `# ${numberToFrenchWords(parsedAmount)} #` : '',
      echeance: dueDate,
      ordrePaiement: ordrePaiement || initialSupplierName,
      lieuCreation: selectedGovernorAt.fr,
      dateCreation: creationDate,
      ribTire: selectedBank?.rib ?? '',
      nomAdresseTire: nomAdresseTire || defaultNomAdresseTire,
      domiciliation: domiciliation || defaultDomiciliation,
      valeurEn,
      aval,
      instrumentNumber: traite.instrument?.instrumentNumber ?? traite.reference ?? '—',
    };
  }, [
    parsedAmount,
    dueDate,
    ordrePaiement,
    initialSupplierName,
    selectedGovernorAt.fr,
    creationDate,
    selectedBank,
    nomAdresseTire,
    defaultNomAdresseTire,
    domiciliation,
    defaultDomiciliation,
    valeurEn,
    aval,
    traite,
  ]);

  // ── Form Validation ──────────────────────────────────────────────────
  const isValid = useMemo(() => {
    return (
      parsedAmount > 0 &&
      dueDate !== '' &&
      creationDate !== '' &&
      (ordrePaiement || initialSupplierName).trim() !== '' &&
      selectedBankId !== '' &&
      selectedBank !== null &&
      selectedBank.rib?.trim() !== ''
    );
  }, [parsedAmount, dueDate, creationDate, ordrePaiement, initialSupplierName, selectedBankId, selectedBank]);

  // ── Print Handler ────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!isValid || !selectedBank || !enterprise) return;
    setPrinting(true);

    try {
      const traiteData: TraiteData = {
        instrumentNumber: printData.instrumentNumber,
        amount: printData.montant,
        dueDate: toIso(printData.echeance),
        creationDate: toIso(printData.dateCreation),
        lieuCreation: printData.lieuCreation,
        lieuCreationAr: selectedGovernorAt.ar,
        supplierName: printData.ordrePaiement,
        rib: printData.ribTire,
        bankAgency: selectedBank.agency ?? '',
        bankDesignation: selectedBank.designation ?? '',
      };

      // WHY: Render Traite markup into static HTML for silent iframe printing
      const contentHtml = renderToStaticMarkup(
        <TraiteLettreDeChange data={traiteData} enterprise={enterprise} businessData={printData} />
      );

      // WHY: Fetch print CSS styles configured for A4 Portrait with (0,0) top-left origin
      const styleCss = getTraitePrintStyles(0, 0);

      const iframe = window.document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      window.document.body.appendChild(iframe);

      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) throw new Error('Cannot access iframe document.');

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Traite N° ${traiteData.instrumentNumber}</title>
    <style>${styleCss}</style>
  </head>
  <body>${contentHtml}</body>
</html>`);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print error:', e);
        }
        setTimeout(() => window.document.body.removeChild(iframe), 1000);
        setPrinting(false);
        onClose();
      }, 500);

    } catch (err) {
      console.error('Traite print failed:', err);
      setPrinting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Wide Horizontal ERP Modal: min(1400px, 95vw) */}
      <DialogContent className="max-w-[95vw] sm:max-w-[min(1400px,95vw)] w-[min(1400px,95vw)] h-auto max-h-[85vh] p-0 overflow-hidden border-corp-blue-100 rounded-3xl shadow-2xl flex flex-col bg-white antialiased z-[50]">

        {/* ── Compact Header ───────────────────────────────────────────────── */}
        <DialogHeader className="px-6 py-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-corp-blue-50 text-corp-blue-600 rounded-2xl border border-corp-blue-100/60 shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-corp-blue-900 flex items-center gap-2 tracking-tight text-wrap-balance">
                Impression Traite
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs font-medium">
                Vérifiez et complétez les données métier avant impression. Traite N°{' '}
                <span className="font-mono font-bold text-corp-blue-700 tabular-nums">
                  {printData.instrumentNumber}
                </span>
              </DialogDescription>
            </div>
          </div>

          {/* Header Action Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCalibrationOpen(true)}
              className="h-8 px-3 rounded-xl font-bold text-xs text-corp-blue-700 bg-corp-blue-50/80 hover:bg-corp-blue-100/80 border border-corp-blue-200/60 transition-all active:scale-[0.96] flex items-center gap-1.5 min-h-[36px]"
              title="Ouvrir l'inspecteur visuel avec les données réelles saisies"
            >
              <Crosshair className="w-3.5 h-3.5 text-corp-blue-600" />
              <span>Inspecteur Visuel</span>
            </Button>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body Area ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* ── LEFT COLUMN: Section 1 — Données de la Traite ────────────── */}
            <fieldset className="border border-slate-200/80 bg-slate-50/40 rounded-2xl p-4.5 space-y-4 shadow-2xs">
              <legend className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-corp-blue-600" />
                1. DONNÉES DE LA TRAITE · بيانات السند
              </legend>

              {/* Row 1: Montant + Échéance */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Montant (TND) · المبلغ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 rounded-xl border-corp-blue-100 font-mono font-bold text-sm tabular-nums focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                    placeholder="0.000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Échéance · حلول الأجل <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Payer à l'ordre de + Valeur en */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Payer à l&apos;ordre de · لفائدة الأمر <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={ordrePaiement}
                    onChange={(e) => setOrdrePaiement(e.target.value)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm font-bold text-slate-700 focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                    placeholder="Nom du bénéficiaire..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Valeur en... · القيمة
                  </Label>
                  {/* Currency valuation input defaulting to Dinars */}
                  <Input
                    type="text"
                    value={valeurEn}
                    onChange={(e) => setValeurEn(e.target.value)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium text-slate-700 focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                    placeholder="Dinars..."
                  />
                </div>
              </div>

              {/* Row 3: Montant en lettres (Full Width Generated) */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>MONTANT EN LETTRES (GÉNÉRÉ AUTOMATIQUEMENT)</span>
                  <span className="font-arabic font-normal text-slate-400">المبلغ بالحروف</span>
                </Label>
                <div className="bg-slate-100/90 border border-slate-200/80 rounded-xl p-3 text-xs font-mono font-bold text-slate-800 tracking-tight shadow-2xs select-none">
                  {printData.montantLettres || '# ZERO DINAR #' }
                </div>
              </div>
            </fieldset>

            {/* ── RIGHT COLUMN: Section 2 & Section 3 Stack ────────────────── */}
            <div className="space-y-5">

              {/* Section 2: Lieu et date de création */}
              <fieldset className="border border-slate-200/80 bg-slate-50/40 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
                <legend className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-corp-blue-600" />
                  2. LIEU ET DATE DE CRÉATION · مكان وتاريخ الإنشاء
                </legend>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Lieu de création · مكان الاحداث <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedGov} onValueChange={(v) => v && setSelectedGov(v)}>
                      <SelectTrigger className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs">
                        <SelectValue placeholder="Gouvernorat..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-corp-blue-100 max-h-60 shadow-xl">
                        {GOVERNORATS.map((g) => (
                          <SelectItem key={g.fr} value={g.fr} className="text-sm font-medium min-h-[38px]">
                            {g.fr} — {g.ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Date de création · تاريخ الاحداث <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={creationDate}
                      onChange={(e) => setCreationDate(e.target.value)}
                      className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Section 3: Tiré & Domiciliation bancaire */}
              <fieldset className="border border-slate-200/80 bg-slate-50/40 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
                <legend className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-corp-blue-600" />
                  3. TIRÉ & DOMICILIATION BANCAIRE · المسحوب عليه ومصرفه
                </legend>

                {/* Row 1: Compte bancaire + RIB Tiré (Read-only) */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Compte bancaire (Tiré) <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedBankId} onValueChange={(v) => v && setSelectedBankId(v)}>
                      <SelectTrigger className="h-10 w-full rounded-xl border-corp-blue-100 text-sm font-medium focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs">
                        {/* Display bank reference & designation in trigger to avoid rendering raw bank ID */}
                        <SelectValue placeholder="Sélectionnez une banque...">
                          {selectedBank ? `${selectedBank.reference}${selectedBank.designation ? ` — ${selectedBank.designation}` : ''}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-corp-blue-100 shadow-xl">
                        {banks.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()} className="text-sm font-medium min-h-[44px]">
                            <div className="flex flex-col text-left py-0.5">
                              <span className="font-semibold">{b.reference} — {b.designation}</span>
                              <span className="text-xs text-slate-500 font-mono tabular-nums">{b.rib}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      RIB Tiré (Corps & Talon)
                    </Label>
                    <Input
                      type="text"
                      value={selectedBank?.rib || '—'}
                      readOnly
                      className="h-10 rounded-xl border-slate-200/80 bg-slate-100/80 text-sm font-mono font-bold text-slate-700 cursor-not-allowed tabular-nums shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 2: Nom & Adresse du Tiré + Domiciliation bancaire */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Nom et adresse du tiré · اسم وعنوان المسحوب عليه
                    </Label>
                    <Input
                      type="text"
                      value={nomAdresseTire}
                      onChange={(e) => setNomAdresseTire(e.target.value)}
                      className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium text-slate-700 focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                      placeholder="SOCOFEB – Km 4 Route de Raoued – Ariana..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Domiciliation bancaire · التعيين البنكي
                    </Label>
                    <Input
                      type="text"
                      value={domiciliation}
                      onChange={(e) => setDomiciliation(e.target.value)}
                      className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium text-slate-700 focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                      placeholder="BANQUE NATIONALE AGRICOLE..."
                    />
                  </div>
                </div>

                {/* Row 3: Aval / Cautionnement */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Aval / Cautionnement · الضمان الاحتياطي</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </Label>
                  <Input
                    type="text"
                    value={aval}
                    onChange={(e) => setAval(e.target.value)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm font-medium text-slate-700 focus:ring-corp-blue-600/20 focus:border-corp-blue-600 bg-white shadow-2xs"
                    placeholder="Mention d'aval ou cautionnement..."
                  />
                </div>
              </fieldset>

            </div>

          </div>

          {/* ── Section 4: Compact Horizontal Print Summary Card (Récapitulatif) ── */}
          <div className="border border-corp-blue-100 bg-gradient-to-r from-corp-blue-50/50 via-slate-50/80 to-corp-blue-50/30 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-corp-blue-900 uppercase tracking-wider">
              <Info className="w-4 h-4 text-corp-blue-600" />
              <span>RÉCAPITULATIF DES DONNÉES À IMPRIMER</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 text-xs">
              <div className="space-y-0.5 bg-white/80 p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Montant</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {parsedAmount > 0 ? `${parsedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND` : '0.000 TND'}
                </span>
              </div>

              <div className="space-y-0.5 bg-white/80 p-2 rounded-xl border border-slate-100 shadow-2xs lg:col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Montant en Lettres</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {printData.montantLettres || '—'}
                </span>
              </div>

              <div className="space-y-0.5 bg-white/80 p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Échéance</span>
                <span className="font-medium text-slate-800 tabular-nums">
                  {formatDateDisplay(dueDate)}
                </span>
              </div>

              <div className="space-y-0.5 bg-white/80 p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">À l&apos;ordre de</span>
                <span className="font-bold text-slate-800 truncate block">
                  {ordrePaiement || initialSupplierName || '—'}
                </span>
              </div>

              <div className="space-y-0.5 bg-white/80 p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Lieu & Date</span>
                <span className="font-medium text-slate-800 truncate block">
                  {selectedGovernorAt.fr}, {formatDateDisplay(creationDate)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Fixed Footer ─────────────────────────────────────────────────── */}
        <DialogFooter className="m-0 mb-0 mx-0 mt-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 rounded-b-3xl shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCalibrationOpen(true)}
            className="h-10 px-4 rounded-xl font-bold border-corp-blue-200 text-corp-blue-700 hover:bg-corp-blue-50/80 transition-all active:scale-[0.96] gap-2 text-xs min-h-[40px]"
          >
            <Crosshair className="w-4 h-4 text-corp-blue-600" />
            Inspecteur Visuel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={printing}
              className="h-10 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100 transition-all active:scale-[0.96] min-h-[40px]"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={printing || !isValid}
              className="h-10 px-6 rounded-xl font-bold bg-corp-blue-600 hover:bg-corp-blue-700 text-white shadow-sm gap-2 disabled:opacity-50 transition-all active:scale-[0.96] min-h-[40px]"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Imprimer la Traite
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Traite Visual Inspector Dialog (Receives Live Form Print Data) */}
      <TraiteCalibrationDialog
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        liveData={printData}
      />
    </Dialog>
  );
}
