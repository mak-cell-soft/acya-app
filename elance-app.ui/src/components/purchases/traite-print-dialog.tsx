'use client';

import React, { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Loader2, Printer, Crosshair } from 'lucide-react';
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Return today as a yyyy-MM-dd string (value compatible with <input type="date" />). */
function toDateInputValue(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Ensure an ISO-like string is kept as-is, or convert a Date. */
function toIso(value: string | Date): string {
  if (typeof value === 'string') return value;
  return value.toISOString();
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

  // ── Derive supplier display name ─────────────────────────────
  const supplierName = useMemo(() => {
    if (!supplier) return '';
    return (
      supplier.name ||
      `${supplier.firstname || ''} ${supplier.lastname || ''}`.trim()
    );
  }, [supplier]);

  // ── Form state — pre-fill from traite ────────────────────────
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
  const [printing, setPrinting] = useState(false);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

  // ── Derived values ───────────────────────────────────────────
  const selectedBank = useMemo(
    () => banks.find((b) => b.id.toString() === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const selectedGovernorAt = useMemo(
    () => GOVERNORATS.find((g) => g.fr === selectedGov) ?? GOVERNORATS[22], // Tunis default
    [selectedGov]
  );

  const parsedAmount = useMemo(
    () => parseFloat(amount.replace(',', '.')) || 0,
    [amount]
  );

  // ── Print handler ────────────────────────────────────────────
  const handlePrint = () => {
    if (!selectedBank || !enterprise) return;
    setPrinting(true);

    try {
      const traiteData: TraiteData = {
        instrumentNumber: traite.instrument?.instrumentNumber ?? traite.reference ?? '—',
        amount: parsedAmount,
        dueDate: toIso(dueDate),
        creationDate: toIso(creationDate),
        lieuCreation: selectedGovernorAt.fr,
        lieuCreationAr: selectedGovernorAt.ar,
        supplierName,
        rib: selectedBank.rib ?? '',
        bankAgency: selectedBank.agency ?? '',
        bankDesignation: selectedBank.designation ?? '',
      };

      const contentHtml = renderToStaticMarkup(
        <TraiteLettreDeChange data={traiteData} enterprise={enterprise} />
      );

      const styleCss = getTraitePrintStyles(offsetX, offsetY);

      // Render in isolated iframe to avoid Next.js style contamination
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

      // Brief pause lets fonts & styles settle before print dialog
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
      <DialogContent className="max-w-[95vw] sm:max-w-[560px] p-0 overflow-hidden border-corp-blue-100 rounded-2xl">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-corp-blue-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-corp-blue-500" />
            Impression Traite
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm font-medium">
            Vérifiez et complétez les informations avant impression.
            Traite N°{' '}
            <span className="font-mono font-bold text-corp-blue-700">
              {traite.instrument?.instrumentNumber ?? traite.reference ?? '—'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">

          {/* ── Section 1: Données de la traite ──────────────── */}
          <fieldset className="border border-slate-100 rounded-xl p-4 space-y-4">
            <legend className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Données de la Traite
            </legend>

            <div className="grid grid-cols-2 gap-4">
              {/* Montant */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Montant (TND) · المبلغ
                </Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 rounded-xl border-corp-blue-100 font-mono font-semibold text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600"
                  placeholder="0.000"
                />
              </div>

              {/* Echéance */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Echéance · حلول الأجل
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600"
                />
              </div>
            </div>

            {/* Payer à l'ordre de — read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Payer à l&apos;ordre de · دفعوا لأمر
              </Label>
              <Input
                value={supplierName}
                readOnly
                className="h-10 rounded-xl border-slate-100 bg-slate-50 text-sm font-semibold text-slate-600 cursor-not-allowed"
              />
            </div>
          </fieldset>

          {/* ── Section 2: Lieu et date de création ──────────── */}
          <fieldset className="border border-slate-100 rounded-xl p-4 space-y-4">
            <legend className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Lieu et Date de Création · مكان وتاريخ الاحداث
            </legend>

            <div className="grid grid-cols-2 gap-4">
              {/* Gouvernorat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Lieu de création · مكان الاحداث
                </Label>
                <Select value={selectedGov} onValueChange={(v) => v && setSelectedGov(v)}>
                  <SelectTrigger className="h-10 rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600">
                    <SelectValue placeholder="Gouvernorat..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-corp-blue-100 max-h-60">
                    {GOVERNORATS.map((g) => (
                      <SelectItem key={g.fr} value={g.fr} className="text-sm font-medium">
                        {g.fr} — {g.ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date de création */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Date de création · تاريخ الاحداث
                </Label>
                <Input
                  type="date"
                  value={creationDate}
                  onChange={(e) => setCreationDate(e.target.value)}
                  className="h-10 rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Section 3: Banque de l'entreprise (Tiré) ─────── */}
          <fieldset className="border border-slate-100 rounded-xl p-4 space-y-4">
            <legend className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Banque de l&apos;Entreprise — Tiré · المسحوب عليه
            </legend>

            {/* Bank selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Compte bancaire
              </Label>
              <Select value={selectedBankId} onValueChange={(v) => v && setSelectedBankId(v)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600">
                  <SelectValue placeholder="Sélectionnez une banque..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-corp-blue-100">
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-sm font-medium">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold">{b.reference} — {b.designation}</span>
                        <span className="text-xs text-slate-500 font-mono">{b.rib}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RIB display (read-only) */}
            {selectedBank && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  RIB · المعرف البنكي
                </p>
                <p className="font-mono font-bold text-slate-700 tracking-widest text-sm">
                  {selectedBank.rib}
                </p>
                {selectedBank.agency && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {selectedBank.agency}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* ── Section 4: Ajustement de l'alignement (Calibration) ── */}
          <fieldset className="border border-slate-100 rounded-xl p-4 space-y-4">
            <legend className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Calibration de l&apos;Impression (mm)
            </legend>

            <div className="grid grid-cols-2 gap-4">
              {/* Offset X */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Décalage horizontal (X)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-500 font-medium">mm</span>
                </div>
              </div>

              {/* Offset Y */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Décalage vertical (Y)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl border-corp-blue-100 text-sm focus:ring-corp-blue-600/20 focus:border-corp-blue-600"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-500 font-medium">mm</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
              * Ajustez ces valeurs si le texte imprimé est légèrement décalé par rapport aux cases du document physique. Positif = vers le bas/droite, négatif = vers le haut/gauche.
            </p>
          </fieldset>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={() => setIsCalibrationOpen(true)}
            className="h-10 px-4 rounded-xl font-bold border-corp-blue-200 text-corp-blue-700 hover:bg-corp-blue-50 gap-2 text-xs"
          >
            <Crosshair className="w-4 h-4 text-corp-blue-600" />
            Inspecteur & Calibration
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={printing}
              className="h-10 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePrint}
              disabled={printing || !selectedBankId}
              className="h-10 px-5 rounded-xl font-bold bg-corp-blue-600 hover:bg-corp-blue-700 text-white shadow-sm gap-2 disabled:opacity-50 transition-all"
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

      {/* Traite Visual Calibration Inspector Dialog */}
      <TraiteCalibrationDialog
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
      />
    </Dialog>
  );
}
