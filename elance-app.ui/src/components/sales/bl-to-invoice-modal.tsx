'use client';

/**
 * BLToInvoiceModal — Single BL → Invoice Conversion Modal
 *
 * Mirrors the Angular DocumentConversionModalComponent (single-document mode).
 * Calls POST /Document/createinvoice with { invoiceDoc, docChildrenIds: [bl.id] }
 * — the same stable endpoint used by batch conversions, avoiding the /convert 500 error.
 *
 * Color tokens used here are only from globals.css:
 *   corp-blue-50, corp-blue-100, corp-blue-600, corp-blue-800, corp-blue-900, corp-blue-950
 *   sand-50, sand-100, sand-400, sand-800
 *   timber-100, timber-400, timber-600
 *   white, black
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { documentService } from '@/services/components/document.service';
import { useAppVariables } from '@/hooks/use-app-variables';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

interface BLToInvoiceModalProps {
  /** The source BL document to convert — null means modal is closed */
  bl: Document | null;
  /** Called after a successful conversion — parent must refetch the list */
  onSuccess: () => void;
  /** Called when the modal should close without action */
  onClose: () => void;
}

export function BLToInvoiceModal({ bl, onSuccess, onClose }: BLToInvoiceModalProps) {
  const { user } = useAuthStore();

  // Stamp taxes (Taxe / Droit de timbre) from AppVariables
  const { data: stampTaxes = [] } = useAppVariables('Taxe');

  // Selected stamp tax id (string for Select)
  const [stampTaxId, setStampTaxId] = useState<string>('');

  // Conversion loading flag
  const [isConverting, setIsConverting] = useState(false);

  // Auto-select the default stamp tax once taxes load (mirrors Angular: finds isdefault === true)
  useEffect(() => {
    if (stampTaxes.length === 0) return;
    const defaultTax = stampTaxes.find((t) => t.isdefault === true);
    const pick = defaultTax ?? stampTaxes[0];
    setStampTaxId(String(pick.id));
  }, [stampTaxes]);

  // Don't render if no BL is selected
  if (!bl) return null;

  // ─── Financials ────────────────────────────────────────────────────────────
  const totalHT      = bl.total_ht_net_doc   ?? 0;
  const totalTVA     = bl.total_tva_doc       ?? 0;
  const totalDiscount= bl.total_discount_doc  ?? 0;
  const baseTTC      = bl.total_net_ttc       ?? 0;

  // Active stamp tax amount
  const activeStamp  = stampTaxes.find((t) => String(t.id) === stampTaxId);
  const stampAmount  = activeStamp ? parseFloat(activeStamp.value || '0') : 0;
  const totalTTC     = baseTTC + stampAmount;

  // Customer display name
  const customerName =
    bl.counterpart?.name ||
    `${bl.counterpart?.firstname || ''} ${bl.counterpart?.lastname || ''}`.trim() ||
    'Client inconnu';

  // ─── Conversion handler (mirrors Angular onConvert()) ─────────────────────
  const handleConvert = async () => {
    if (!stampTaxId) {
      toast.warning('Veuillez sélectionner un droit de timbre.');
      return;
    }

    setIsConverting(true);

    try {
      // Build invoice DTO from the BL — same approach as Angular: spread source doc then override
      const invoiceDoc: any = {
        ...bl,
        id: 0,                                       // backend generates new ID + docnumber
        type: DocumentTypes.customerInvoice,
        docnumber: '',                               // backend generates
        creationdate: new Date().toISOString(),
        updatedate: new Date().toISOString(),
        updatedbyid: parseInt(user?.id || '0'),
        docstatus: DocStatus.Confirmed,
        billingstatus: BillingStatus.NotBilled,
        isdeleted: false,
        // Stamp tax
        taxe: activeStamp
          ? { id: activeStamp.id, name: activeStamp.name, value: activeStamp.value }
          : null,
        taxeId: activeStamp ? activeStamp.id : null,
        // Recalculated totals with stamp
        total_ht_net_doc: totalHT,
        total_tva_doc: totalTVA,
        total_discount_doc: totalDiscount,
        total_net_ttc: totalTTC,
        total_net_payable: totalTTC,
        // Source BL reference stored in supplierReference → drives the "Origine BL" column
        supplierReference: bl.docnumber,
        isinvoiced: false,
        deliveryNoteDocNumbers: [],
      };

      // Payload mirrors Angular: { invoiceDoc, docChildrenIds: [bl.id] }
      const payload = {
        invoiceDoc,
        docChildrenIds: [bl.id],
      };

      await documentService.createInvoice(payload);

      toast.success(`BL ${bl.docnumber} converti en facture avec succès !`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Conversion error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Erreur lors de la conversion.';
      toast.error(typeof msg === 'string' ? msg : 'Erreur lors de la conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  // ─── Format helpers ────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // Label shown in each SelectItem: prefer name, fall back to value amount
  const taxLabel = (t: typeof stampTaxes[number]) => {
    const amount = parseFloat(t.value || '0');
    const displayName = t.name && t.name.trim() ? t.name : 'Droit de timbre';
    return `${displayName} — ${fmt(amount)} DT`;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal panel */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-corp-blue-100 z-10"
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-corp-blue-100 bg-corp-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corp-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-corp-blue-800" />
              </div>
              <div>
                <h2 className="text-base font-bold text-corp-blue-950 tracking-tight">
                  Convertir en Facture
                </h2>
                <p className="text-[11px] text-sand-400 font-medium">
                  Transformation d'un bon de livraison en facture client
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-sand-400 hover:text-corp-blue-950 hover:bg-corp-blue-100 transition-colors rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="px-7 py-6 space-y-5 bg-white">

            {/* Document source summary */}
            <div className="bg-corp-blue-50 border border-corp-blue-100 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] text-sand-400 font-bold uppercase tracking-widest">
                Document source
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold font-mono text-corp-blue-950">
                  {bl.docnumber}
                </span>
                <ArrowRight className="w-4 h-4 text-sand-400 shrink-0" />
                <Badge className="text-[10px] bg-corp-blue-100 text-corp-blue-800 border-0 font-bold px-2">
                  Bon de Livraison
                </Badge>
                <ArrowRight className="w-3 h-3 text-sand-400 shrink-0" />
                <Badge className="text-[10px] bg-timber-100 text-timber-600 border-0 font-bold px-2">
                  Facture Client
                </Badge>
              </div>
              <div className="text-[12px] text-sand-400 font-medium">
                Client :{' '}
                <span className="text-corp-blue-950 font-bold">{customerName}</span>
              </div>
            </div>

            {/* Financial summary — 3 cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total HT', value: totalHT, highlight: false },
                { label: 'TVA', value: totalTVA, highlight: false },
                { label: 'Total TTC', value: baseTTC, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-center',
                    highlight
                      ? 'bg-corp-blue-50 border-corp-blue-100'
                      : 'bg-white border-corp-blue-100'
                  )}
                >
                  <p className="text-[10px] text-sand-400 font-bold uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-bold font-mono',
                      highlight ? 'text-corp-blue-800' : 'text-corp-blue-950'
                    )}
                  >
                    {fmt(value)} DT
                  </p>
                </div>
              ))}
            </div>

            {/* Stamp tax selector */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-corp-blue-950 uppercase tracking-widest">
                <Landmark className="w-3.5 h-3.5 text-corp-blue-600" />
                Droit de timbre (Taxe)
              </label>

              <Select
                value={stampTaxId}
                onValueChange={(val) => setStampTaxId(val ?? '')}
              >
                <SelectTrigger className="h-10 text-sm font-medium border-corp-blue-100 rounded-xl bg-corp-blue-50 text-corp-blue-950">
                  <SelectValue placeholder="Sélectionner une taxe...">
                    {/* Show the formatted label for the selected value */}
                    {activeStamp ? taxLabel(activeStamp) : 'Sélectionner une taxe...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stampTaxes.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      className="text-sm text-corp-blue-950"
                    >
                      {taxLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Updated TTC with stamp */}
              {stampAmount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-timber-100 border border-timber-100 rounded-xl">
                  <span className="text-[11px] text-timber-600 font-bold">
                    Total TTC avec timbre
                  </span>
                  <span className="text-sm font-bold font-mono text-timber-600">
                    {fmt(totalTTC)} DT
                  </span>
                </div>
              )}
            </div>

            {/* Irreversibility warning */}
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-[12px] text-red-700 font-semibold leading-snug">
                  Voulez-vous transformer ce Bon de Livraison en Facture Client ?
                </p>
                <p className="text-[11px] text-red-400">
                  L'opération est irréversible et marquera le document original comme facturé.
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer actions ───────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-corp-blue-100 bg-corp-blue-50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
              className="h-10 px-5 border-corp-blue-100 bg-white text-corp-blue-900 hover:bg-corp-blue-100 font-semibold text-sm"
            >
              Annuler
            </Button>

            <Button
              onClick={handleConvert}
              disabled={isConverting || !stampTaxId}
              className="h-10 px-6 font-bold text-sm gap-2"
              style={{ backgroundColor: '#04100a', color: '#ffffff' }}
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Conversion en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmer la conversion
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

