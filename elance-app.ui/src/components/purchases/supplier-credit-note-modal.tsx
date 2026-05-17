'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SupplierCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Parent Invoice to attach the credit note to */
  parentInvoice: Document | null;
}

export function SupplierCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
  parentInvoice
}: SupplierCreditNoteModalProps) {
  const { user } = useAuthStore();

  const [description, setDescription] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [amountHT, setAmountHT] = useState<number>(0);
  const [amountTVA, setAmountTVA] = useState<number>(0);
  const [amountTTC, setAmountTTC] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // When parentInvoice changes or percentage changes, recalculate values
  useEffect(() => {
    if (!isOpen || !parentInvoice) return;

    const invoiceHT = parentInvoice.total_ht_net_doc || 0;
    const computedHT = (invoiceHT * discountPercentage) / 100;
    
    // Determine TVA rate from parent invoice
    const tvaRate = invoiceHT > 0 ? (parentInvoice.total_tva_doc || 0) / invoiceHT : 0.19;
    const computedTVA = computedHT * tvaRate;
    const computedTTC = computedHT + computedTVA;

    setAmountHT(computedHT);
    setAmountTVA(computedTVA);
    setAmountTTC(computedTTC);

    const desc = `Avoir de la Facture numéro ${parentInvoice.docnumber} sur Achat au comptant ${discountPercentage}%`;
    setDescription(desc);
  }, [isOpen, parentInvoice, discountPercentage]);

  // Handle manual HT input changes
  const handleManualHTChange = (val: number) => {
    setAmountHT(val);
    const invoiceHT = parentInvoice?.total_ht_net_doc || 0;
    if (invoiceHT > 0) {
      const percentage = parseFloat(((val / invoiceHT) * 100).toFixed(2)) || 0;
      setDiscountPercentage(percentage);
    }
    
    const tvaRate = invoiceHT > 0 ? (parentInvoice?.total_tva_doc || 0) / invoiceHT : 0.19;
    const computedTVA = val * tvaRate;
    const computedTTC = val + computedTVA;
    
    setAmountTVA(computedTVA);
    setAmountTTC(computedTTC);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDiscountPercentage(0);
      setAmountHT(0);
      setAmountTVA(0);
      setAmountTTC(0);
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen || !parentInvoice) return null;

  const supplierName =
    parentInvoice.counterpart?.name ||
    `${parentInvoice.counterpart?.firstname || ''} ${parentInvoice.counterpart?.lastname || ''}`.trim() ||
    'Fournisseur inconnu';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountHT <= 0) {
      toast.warning("Le montant de l'avoir doit être supérieur à 0.");
      return;
    }
    if (!description.trim()) {
      toast.warning('Veuillez saisir une description pour cet avoir.');
      return;
    }

    setSubmitting(true);

    try {
      const creditNote: any = {
        id: 0,
        type: DocumentTypes.supplierInvoiceReturn,
        docnumber: '',
        description: description.trim(),
        isinvoiced: true,
        isservice: true,
        counterpart: parentInvoice.counterpart,
        total_ht_net_doc: amountHT,
        total_tva_doc: amountTVA,
        total_net_ttc: amountTTC,
        total_net_payable: amountTTC,
        updatedbyid: parseInt(user?.id || '1'),
        creationdate: new Date().toISOString(),
        updatedate: new Date().toISOString(),
        docstatus: DocStatus.Created,
        billingstatus: BillingStatus.NotBilled,
        isdeleted: false,
        merchandises: [],
        sales_site: parentInvoice.sales_site || null,
        sales_site_id: parentInvoice.sales_site.id || null
      };

      await documentService.createCreditNote(parentInvoice.id, creditNote);
      toast.success('Avoir créé avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create credit note:', err);
      toast.error(err.response?.data?.message || "Erreur lors de la création de l'avoir.");
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
          className="relative w-full max-w-lg bg-white border border-sand-150 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-900 to-amber-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300">
                Avoirs Fournisseurs
              </span>
              <h2 className="text-base font-serif text-amber-50">
                Créer un Avoir : Facture {parentInvoice.docnumber}
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-amber-200 hover:bg-amber-800 hover:text-white rounded-full w-8 h-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto bg-[#fdfdfd]">
            {/* Context Invoice details */}
            <Card className="border-sand-200 bg-sand-50/50 rounded-2xl overflow-hidden">
              <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs font-sans text-sand-600">
                <div>
                  <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5">
                    Fournisseur
                  </span>
                  <span className="font-bold text-sand-800 text-[13px]">{supplierName}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5">
                    TTC Facture
                  </span>
                  <span className="font-mono font-bold text-amber-900 text-[13px]">{fmt(parentInvoice.total_net_ttc || 0)} DT</span>
                </div>
              </CardContent>
            </Card>

            {/* Inputs Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Discount Percentage */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-600" /> Pourcentage de l&apos;Avoir (%)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    className="border-sand-200 rounded-xl pr-12 text-xs font-semibold h-10 focus-visible:ring-amber-600 font-mono"
                  />
                  <span className="absolute right-4 text-xs font-bold text-sand-400 font-sans">%</span>
                </div>
              </div>

              {/* Amount HT Manual */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" /> Montant HT
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={amountHT}
                    onChange={(e) => handleManualHTChange(parseFloat(e.target.value) || 0)}
                    className="border-sand-200 rounded-xl pr-12 text-xs font-semibold h-10 focus-visible:ring-amber-600 font-mono"
                  />
                  <span className="absolute right-4 text-xs font-bold text-sand-400 font-sans">TND</span>
                </div>
              </div>

              {/* Observations / auto-generated description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Observations / Raison de l&apos;avoir
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Saisir la description"
                  className="border-sand-200 rounded-xl text-xs font-semibold h-10 focus-visible:ring-amber-600"
                  required
                />
              </div>

              {/* Computations Cards */}
              <Card className="rounded-2xl border-sand-200 shadow-xs bg-white p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-sand-500">Montant HT Avoir:</span>
                  <span className="font-semibold text-sand-800">{fmt(amountHT)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-500">TVA ({fmt((parentInvoice.total_ht_net_doc > 0 ? (parentInvoice.total_tva_doc || 0) / parentInvoice.total_ht_net_doc : 0.19) * 100)}%):</span>
                  <span className="font-semibold text-sand-800">{fmt(amountTVA)} DT</span>
                </div>
                <Separator className="bg-sand-150 my-1" />
                <div className="flex justify-between items-center text-sand-900 font-serif text-xs pt-1">
                  <span className="font-bold">TOTAL AVOIR TTC:</span>
                  <span className="text-[13px] font-bold font-mono text-amber-800">
                    {fmt(amountTTC)} DT
                  </span>
                </div>
              </Card>

              {/* Irreversibility note */}
              <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 leading-snug">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span className="text-[11px] text-amber-850">
                  Cette action créera un avoir fournisseur validé directement lié à cette facture et recalculera les restes à payer.
                </span>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-sand-50/50 border-t border-sand-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="border border-sand-200 text-sand-700 rounded-xl hover:bg-sand-100 font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={submitting || amountHT <= 0}
              onClick={handleSubmit}
              className="bg-amber-900 hover:bg-amber-950 text-white rounded-xl shadow-md px-6 h-10 font-bold text-xs gap-2 flex items-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Créer l&apos;Avoir
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
