'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { documentService } from '@/services/components/document.service';
import { useAppVariables } from '@/hooks/use-app-variables';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SupplierReceiptToInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedReceipts: Document[];
}

export function SupplierReceiptToInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  selectedReceipts
}: SupplierReceiptToInvoiceModalProps) {
  const { user } = useAuthStore();
  const { data: stampTaxesData } = useAppVariables('Taxe');

  // Form parameters
  const [supplierReference, setSupplierReference] = useState<string>('');
  const [stampTaxId, setStampTaxId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Filter AppVariables for active taxes
  const stampTaxes = stampTaxesData?.filter((v) => !v.isdeleted) || [];

  // Pre-fill default stamp tax (e.g. 1.000 TND or 0.600 TND)
  useEffect(() => {
    if (stampTaxes.length > 0) {
      const defaultStamp = stampTaxes.find((t) => t.isdefault === true) || stampTaxes[0];
      if (defaultStamp) setStampTaxId(defaultStamp.id.toString());
    }
  }, [stampTaxesData]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSupplierReference('');
      if (stampTaxes.length > 0) {
        const defaultStamp = stampTaxes.find((t) => t.isdefault === true) || stampTaxes[0];
        if (defaultStamp) setStampTaxId(defaultStamp.id.toString());
      }
    }
  }, [isOpen]);

  if (!isOpen || selectedReceipts.length === 0) return null;

  // Retrieve supplier name from first receipt
  const supplierName =
    selectedReceipts[0]?.counterpart?.name ||
    `${selectedReceipts[0]?.counterpart?.firstname || ''} ${selectedReceipts[0]?.counterpart?.lastname || ''}`.trim() ||
    'Fournisseur inconnu';

  // Compute live aggregates of selected receipts
  const netHtSum = selectedReceipts.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
  const discountSum = selectedReceipts.reduce((acc, curr) => acc + (curr.total_discount_doc || 0), 0);
  const taxSum = selectedReceipts.reduce((acc, curr) => acc + (curr.total_tva_doc || 0), 0);
  const baseTtcSum = selectedReceipts.reduce((acc, curr) => acc + (curr.total_net_ttc || 0), 0);

  const activeStamp = stampTaxes.find((t) => t.id === parseInt(stampTaxId));
  const selectedStampLabel = activeStamp
    ? `${activeStamp.name} (${parseFloat(activeStamp.value || '0')?.toFixed(3)} TND)`
    : 'Choisir un droit de timbre...';
  const stampAmount = activeStamp ? parseFloat(activeStamp.value || '0') : 0;
  const finalNetPayable = baseTtcSum + stampAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierReference.trim()) {
      toast.warning('Veuillez saisir la référence de la facture fournisseur.');
      return;
    }

    setSubmitting(true);

    try {
      // Build target DocumentDto for the Invoice
      const invoiceDoc: any = {
        id: 0,
        type: DocumentTypes.supplierInvoice,
        counterpart_id: selectedReceipts[0].counterpart?.id,
        counterpart: selectedReceipts[0].counterpart,
        creationdate: new Date().toISOString(),
        updatedate: new Date().toISOString(),
        sales_site_id: selectedReceipts[0].sales_site?.id || null,
        sales_site: selectedReceipts[0].sales_site || null,
        docstatus: DocStatus.Validated,
        billingstatus: BillingStatus.Billed,
        supplierReference: supplierReference.trim(),
        description: `Facture fournisseur générée depuis BRs: ${selectedReceipts.map((r) => r.docnumber).join(', ')}`,
        currencycode: 'TND',
        changerate: 1.0,
        taxeId: stampTaxId ? parseInt(stampTaxId) : null,
        taxe: activeStamp
          ? { id: activeStamp.id, name: activeStamp.name, value: activeStamp.value }
          : null,
        total_ht_net_doc: netHtSum,
        total_discount_doc: discountSum,
        total_tva_doc: taxSum,
        total_net_ttc: finalNetPayable,
        total_net_payable: finalNetPayable,
        updatedbyid: parseInt(user?.id || '1'),
        isinvoiced: false,
        isPaid: false,
        withholdingtax: false
      };

      const payload = {
        invoiceDoc,
        docChildrenIds: selectedReceipts.map((r) => r.id)
      };

      const response = await documentService.createInvoice(payload);
      toast.success(`Facture fournisseur ${response?.DocRef || ''} créée avec succès.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create supplier invoice:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la génération de la facture.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-4xl bg-white border border-sand-150 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-amber-900 to-amber-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300">
                Comptabilisation Factures
              </span>
              <h2 className="text-xl font-serif text-amber-50">
                Facturer des Bons de Réception : {supplierName}
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-amber-200 hover:bg-amber-800 hover:text-white w-8 h-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#fdfdfd]">
            {/* Left Column: Reference & Receipts table */}
            <div className="lg:col-span-7 space-y-6">
              {/* Supplier Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Référence Facture Fournisseur
                </label>
                <Input
                  value={supplierReference}
                  onChange={(e) => setSupplierReference(e.target.value)}
                  placeholder="Saisir le numéro de la facture reçue (ex: FACT-2024-123)"
                  className="border-sand-200 rounded-xl bg-white h-10 text-xs font-semibold focus-visible:ring-amber-600"
                  required
                />
                <p className="text-[10px] text-sand-400 font-medium italic">
                  Référence du document physique reçu du fournisseur
                </p>
              </div>

              {/* Selected receipts */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm text-sand-800">
                  {selectedReceipts.length} documents de réception sélectionnés
                </h3>
                <div className="border border-sand-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-sand-50 border-b border-sand-150 text-sand-400 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5">N° Document</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5 text-right">Total HT</th>
                        <th className="px-4 py-2.5 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100 text-sand-700">
                      {selectedReceipts.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-sand-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-sand-900">{r.docnumber}</td>
                          <td className="px-4 py-3">
                            {r.updatedate ? new Date(r.updatedate).toLocaleDateString('fr-FR') : '--'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {fmt(r.total_ht_net_doc || 0)} DT
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-900">
                            {fmt(r.total_net_ttc || 0)} DT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Taxes & calculations panel */}
            <div className="lg:col-span-5 space-y-5 border-l border-sand-150 pl-6">
              <h3 className="font-serif font-bold text-sm text-sand-800 border-b border-sand-100 pb-1.5">
                Timbre &amp; Synthèse Financière
              </h3>

              {/* Select Stamp Tax */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-amber-600" /> Timbre Fiscal
                </label>
                <Select value={stampTaxId} onValueChange={(val) => setStampTaxId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs font-semibold h-10 focus:ring-amber-600 w-full">
                    <SelectValue placeholder="Choisir un droit de timbre...">
                      {selectedStampLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stampTaxes.map((t) => {
                      const label = `${t.name} (${parseFloat(t.value || '0')?.toFixed(3)} TND)`;
                      return (
                        <SelectItem key={t.id} value={t.id.toString()} label={label} className="text-xs">
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Aggregates Card */}
              <Card className="rounded-2xl border-sand-200 shadow-xs bg-white p-5 space-y-3.5 font-mono text-xs">
                <h4 className="font-serif font-bold text-xs text-sand-850 border-b border-sand-50 pb-1">
                  Totaux Combinés
                </h4>
                <div className="space-y-2.5 text-sand-600">
                  <div className="flex justify-between">
                    <span>Sous-total HT Net:</span>
                    <span className="font-semibold text-sand-900">{fmt(netHtSum)} DT</span>
                  </div>
                  {discountSum > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise Cumulative:</span>
                      <span>-{fmt(discountSum)} DT</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>TVA Cumulative:</span>
                    <span className="font-semibold text-sand-900">{fmt(taxSum)} DT</span>
                  </div>
                  {stampAmount > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Timbre Fiscal:</span>
                      <span>+{fmt(stampAmount)} DT</span>
                    </div>
                  )}
                  <Separator className="bg-sand-150 my-1" />
                  <div className="flex justify-between items-center text-sand-900 font-serif text-xs pt-1">
                    <span className="font-bold">TOTAL FACTURÉ TTC:</span>
                    <span className="text-base font-bold font-mono text-amber-800">
                      {fmt(finalNetPayable)} DT
                    </span>
                  </div>
                </div>
              </Card>

              {/* Irreversibility notice */}
              <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-900 leading-snug">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold">Confirmer la facturation</p>
                  <p className="text-amber-800 text-[11px]">
                    Cette action créera une facture fournisseur définitive et associera les bons de réception choisis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-sand-50/50 border-t border-sand-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="border border-sand-200 text-sand-700 hover:bg-sand-100 font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={submitting || !supplierReference.trim()}
              onClick={handleSubmit}
              className="bg-amber-900 hover:bg-amber-950 text-white shadow-md px-6 h-10 font-bold text-xs gap-2 flex items-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Enregistrer la Facture ({selectedReceipts.length} BR)
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

