'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Tag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Percent,
  Building,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { useAuthStore } from '@/store/use-auth-store';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useDocumentsByType } from '@/hooks/use-documents';
import { useSites } from '@/hooks/use-enterprise';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Interface representing the props needed for the modal dialog
interface SupplierCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Parent Invoice to attach the credit note to (can be null for standalone avoir) */
  parentInvoice: Document | null;
}

export function SupplierCreditNoteModal({
  isOpen,
  onClose,
  onSuccess,
  parentInvoice
}: SupplierCreditNoteModalProps) {
  // Retrieve the currently authenticated user session details
  const { user } = useAuthStore();

  // Load backend lookup tables using cached React Query hooks
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliers();
  const { data: allInvoices = [], isLoading: isLoadingInvoices } = useDocumentsByType(DocumentTypes.supplierInvoice);
  const { data: allSites = [] } = useSites();

  // Component Form State variables
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('none');
  const [description, setDescription] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [amountHT, setAmountHT] = useState<number>(0);
  const [amountHTInput, setAmountHTInput] = useState<string>('');
  const [amountTVA, setAmountTVA] = useState<number>(0);
  const [amountTTC, setAmountTTC] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isManualHT, setIsManualHT] = useState(false);

  // Synchronize modal state fields upon opening or when a pre-selected parentInvoice is passed
  useEffect(() => {
    if (isOpen) {
      if (parentInvoice) {
        setSelectedSupplierId(parentInvoice.counterpart?.id.toString() || '');
        setSelectedInvoiceId(parentInvoice.id.toString());
      } else {
        setSelectedSupplierId('');
        setSelectedInvoiceId('none');
      }
      
      // Reset numeric and string states
      setDiscountPercentage(0);
      setAmountHT(0);
      setAmountHTInput('0.000');
      setAmountTVA(0);
      setAmountTTC(0);
      setDescription('');
      setIsManualHT(false);
    }
  }, [isOpen, parentInvoice]);

  // Filter invoices belonging to the selected supplier
  // Filter out invoices that already have credit notes (total_credit_notes === 0)
  // Ensure we keep the currently edited parentInvoice selectable in case of edits
  const selectedSupplierInvoices = useMemo(() => {
    if (!selectedSupplierId) return [];
    return allInvoices.filter(
      (inv) =>
        inv.counterpart?.id === Number(selectedSupplierId) &&
        ((inv.total_credit_notes || 0) === 0 || inv.id === parentInvoice?.id)
    );
  }, [allInvoices, selectedSupplierId, parentInvoice]);

  // Retrieve the Document object of the selected parent invoice (if any)
  const selectedInvoiceObj = useMemo(() => {
    if (!selectedInvoiceId || selectedInvoiceId === 'none') return null;
    return selectedSupplierInvoices.find((inv) => inv.id.toString() === selectedInvoiceId) || null;
  }, [selectedInvoiceId, selectedSupplierInvoices]);

  // Recalculate observations description automatically when the parent invoice or discount percentage changes
  useEffect(() => {
    if (selectedInvoiceObj && !isManualHT) {
      const pct = parseFloat(discountPercentage.toFixed(2)) || 0;
      const desc = `Avoir de la Facture numéro ${selectedInvoiceObj.docnumber} sur Achat au comptant ${pct}%`;
      setDescription(desc);
    }
  }, [selectedInvoiceObj, discountPercentage, isManualHT]);

  // Recalculate totals dynamically when the discount percentage slider/input changes
  // NOTE: Tunisian Dinars (TND) require exactly 3 decimal places (millimes) accuracy.
  // We parse values to fixed 3 decimal places to avoid floating point precision errors.
  const handlePercentageChange = (pct: number) => {
    setDiscountPercentage(pct);
    setIsManualHT(false);

    if (selectedInvoiceObj) {
      const invoiceHT = selectedInvoiceObj.total_ht_net_doc || 0;
      const computedHT = parseFloat(((invoiceHT * pct) / 100).toFixed(3));
      
      // Compute TVA rate dynamically from parent invoice details
      const tvaRate = invoiceHT > 0 ? (selectedInvoiceObj.total_tva_doc || 0) / invoiceHT : 0.19;
      const computedTVA = parseFloat((computedHT * tvaRate).toFixed(3));
      const computedTTC = parseFloat((computedHT + computedTVA).toFixed(3));

      setAmountHT(computedHT);
      setAmountHTInput(computedHT.toFixed(3));
      setAmountTVA(computedTVA);
      setAmountTTC(computedTTC);
    }
  };

  // Recalculate totals dynamically when the user overrides the HT amount manually
  // NOTE: Round computed TVA and TTC values to exactly 3 decimal places (millimes)
  // to ensure consistency with Tunisian accounting rules.
  // We accept the raw string value from the input to prevent cursor jumps during typing.
  const handleManualHTChange = (valStr: string) => {
    setAmountHTInput(valStr);
    setIsManualHT(true);

    const val = parseFloat(valStr) || 0;
    setAmountHT(val);

    let tvaRate = 0.19; // Default fallback TVA rate (19%) for Tunisian tax structure on standalone/free avoirs
    
    if (selectedInvoiceObj) {
      const invoiceHT = selectedInvoiceObj.total_ht_net_doc || 0;
      if (invoiceHT > 0) {
        const percentage = parseFloat(((val / invoiceHT) * 100).toFixed(2)) || 0;
        setDiscountPercentage(percentage);
      }
      tvaRate = invoiceHT > 0 ? (selectedInvoiceObj.total_tva_doc || 0) / invoiceHT : 0.19;
    } else {
      // In standalone credit notes, discount percentage relative to a parent invoice is not applicable
      setDiscountPercentage(0);
    }

    const computedTVA = parseFloat((val * tvaRate).toFixed(3));
    const computedTTC = parseFloat((val + computedTVA).toFixed(3));

    setAmountTVA(computedTVA);
    setAmountTTC(computedTTC);
  };

  // Format the manual HT text field to exactly 3 decimal places when focus is lost.
  const handleHTBlur = () => {
    const val = parseFloat(amountHTInput) || 0;
    setAmountHTInput(val.toFixed(3));
  };

  // Reset form selections when counterpart supplier is changed
  // NOTE: Type parameter is widened to string | null to comply with Base UI Select trigger onValueChange props.
  const handleSupplierChange = (supplierId: string | null) => {
    handleSupplierReset(supplierId || '');
  };

  const handleSupplierReset = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setSelectedInvoiceId('none');
    setDiscountPercentage(0);
    setAmountHT(0);
    setAmountHTInput('0.000');
    setAmountTVA(0);
    setAmountTTC(0);
    setDescription('');
    setIsManualHT(false);
  };

  // Reset form selections when associated parent invoice is changed
  // NOTE: Type parameter is widened to string | null to comply with Base UI Select trigger onValueChange props.
  const handleInvoiceChange = (invoiceId: string | null) => {
    setSelectedInvoiceId(invoiceId || 'none');
    setDiscountPercentage(0);
    setAmountHT(0);
    setAmountHTInput('0.000');
    setAmountTVA(0);
    setAmountTTC(0);
    setDescription('');
    setIsManualHT(false);
  };

  if (!isOpen) return null;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.warning('Veuillez sélectionner un fournisseur.');
      return;
    }
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
      const selectedSupplier = suppliers.find((s: any) => s.id.toString() === selectedSupplierId);

      // Determine sales site: use the linked parent invoice site, 
      // fallback to user's default site, or first site available in list
      let finalSite = selectedInvoiceObj?.sales_site || null;
      if (!finalSite && allSites.length > 0) {
        const defaultSiteId = user?.defaultSiteId;
        finalSite = allSites.find((s: any) => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      }

      // Construct standard C#/PostgreSQL document payload representation
      const creditNotePayload: any = {
        id: 0,
        type: DocumentTypes.supplierInvoiceReturn,
        docnumber: '',
        description: description.trim(),
        isinvoiced: true,
        isservice: true,
        counterpart: selectedSupplier,
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
        sales_site: finalSite || null,
        sales_site_id: finalSite?.id || null
      };

      // Fork backend endpoint depending on relationship existence
      if (selectedInvoiceObj) {
        // Linked Avoir path: hits /Document/{parentId}/credit-note
        await documentService.createCreditNote(selectedInvoiceObj.id, creditNotePayload);
      } else {
        // Standalone/Free Avoir path: hits /Document
        await documentService.add(creditNotePayload);
      }

      toast.success('Avoir créé avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create supplier credit note:', err);
      toast.error(err.response?.data?.message || "Erreur lors de la création de l'avoir.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // Get display details for title/status
  const supplierName = selectedSupplierId
    ? (suppliers.find((s: any) => s.id.toString() === selectedSupplierId)?.name || 'Fournisseur')
    : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal Main container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-white border border-sand-150 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Elegant header banner */}
          <div className="px-6 py-5 bg-gradient-to-r from-amber-900 to-amber-950 text-white flex items-center justify-between shadow-md">
            <div className="space-y-0.5 animate-in slide-in-from-left duration-500">
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-amber-300 font-mono">
                Avoirs Fournisseurs
              </span>
              <h2 className="text-lg font-serif font-bold text-amber-50">
                {parentInvoice ? `Créer un Avoir : Réf ${parentInvoice.docnumber}` : 'Avoir Fournisseur Libre'}
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-amber-200 hover:bg-amber-800 hover:text-white rounded-full w-8 h-8 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Modal scrollable form body */}
          <div className="p-6 space-y-5 overflow-y-auto bg-[#fdfdfd]">
            
            {/* Form grid controls */}
            <div className="space-y-4">
              
              {/* Supplier Selection Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-sand-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <Building className="w-3.5 h-3.5 text-amber-700" /> Fournisseur
                </label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={handleSupplierChange}
                  disabled={!!parentInvoice}
                >
                  <SelectTrigger className="w-full border-sand-200 rounded-xl h-10 text-xs font-semibold focus:ring-amber-600 bg-white shadow-xs">
                    {/* // NOTE: Overriding SelectValue children explicitly to display human-readable supplier name instead of numeric ID.
                        // We use a function callback prop pattern which is dynamically re-run by Base UI when value state context updates,
                        // resolving the classic asynchronous loading glitch where trigger displays the raw numeric ID string before options mount. */}
                    <SelectValue placeholder="Choisir un fournisseur">
                      {(val) => {
                        if (!val) return undefined;
                        let sup = suppliers.find((s: any) => s.id.toString() === val.toString());
                        if (!sup && parentInvoice && parentInvoice.counterpart && parentInvoice.counterpart.id.toString() === val.toString()) {
                          sup = parentInvoice.counterpart;
                        }
                        return sup ? (sup.name || `${sup.firstname || ''} ${sup.lastname || ''}`.trim()) : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl max-h-[200px]">
                    {suppliers.map((sup: any) => (
                      <SelectItem key={sup.id} value={sup.id.toString()} className="text-xs font-medium cursor-pointer">
                        {sup.name || `${sup.firstname || ''} ${sup.lastname || ''}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Invoice Link Option */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-sand-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <Link2 className="w-3.5 h-3.5 text-amber-700" /> Facture d&apos;Achat associée (Optionnel)
                </label>
                <Select
                  value={selectedInvoiceId}
                  onValueChange={handleInvoiceChange}
                  disabled={!!parentInvoice || !selectedSupplierId}
                >
                  <SelectTrigger className="w-full border-sand-200 rounded-xl h-10 text-xs font-semibold focus:ring-amber-600 bg-white shadow-xs">
                    {/* // NOTE: Overriding SelectValue children explicitly to display human-readable invoice code/number and total instead of numeric ID.
                        // We use a function callback prop pattern which is dynamically re-run by Base UI when value state context updates,
                        // resolving the classic asynchronous loading glitch where trigger displays the raw numeric ID string before options mount. */}
                    <SelectValue placeholder="Choisir une facture">
                      {(val) => {
                        if (val === 'none') return 'Aucune (Avoir libre)';
                        if (!val) return undefined;
                        let inv = selectedSupplierInvoices.find((i: any) => i.id.toString() === val.toString());
                        if (!inv && parentInvoice && parentInvoice.id.toString() === val.toString()) {
                          inv = parentInvoice;
                        }
                        if (!inv) {
                          inv = allInvoices.find((i: any) => i.id.toString() === val.toString());
                        }
                        return inv ? `${inv.docnumber} — ${fmt(inv.total_net_ttc || 0)} TND` : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl max-h-[200px]">
                    <SelectItem value="none" className="text-xs font-medium cursor-pointer text-slate-500 italic">
                      Aucune (Avoir libre)
                    </SelectItem>
                    {selectedSupplierInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id.toString()} className="text-xs font-medium cursor-pointer font-mono">
                        {inv.docnumber} — {fmt(inv.total_net_ttc || 0)} TND
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Associated invoice summary details card */}
              <AnimatePresence mode="wait">
                {selectedInvoiceObj ? (
                  <motion.div
                    key="invoice-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <Card className="border-sand-200 bg-sand-50/50 rounded-2xl overflow-hidden shadow-xs border">
                      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans text-sand-600">
                        <div>
                          <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5 font-mono">
                            Date
                          </span>
                          <span className="font-bold text-sand-800 text-[11px]">
                            {selectedInvoiceObj.updatedate ? new Date(selectedInvoiceObj.updatedate).toLocaleDateString('fr-FR') : '--'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5 font-mono">
                            TVA (%)
                          </span>
                          <span className="font-bold text-sand-800 text-[11px] font-mono">
                            {fmt((selectedInvoiceObj.total_ht_net_doc > 0 ? (selectedInvoiceObj.total_tva_doc || 0) / selectedInvoiceObj.total_ht_net_doc : 0.19) * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5 font-mono">
                            Montant HT
                          </span>
                          <span className="font-bold text-sand-800 text-[11px] font-mono">
                            {fmt(selectedInvoiceObj.total_ht_net_doc || 0)} DT
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold block text-sand-400 uppercase tracking-wider text-[9px] mb-0.5 font-mono">
                            Total TTC
                          </span>
                          <span className="font-mono font-bold text-amber-900 text-[11px]">
                            {fmt(selectedInvoiceObj.total_net_ttc || 0)} DT
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  selectedSupplierId && (
                    <motion.div
                      key="standalone-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-[10px] bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-500 font-sans leading-relaxed border"
                    >
                      <span className="font-extrabold text-slate-700 block mb-1 uppercase tracking-wider text-[9px]">
                        Avoir Libre (Non lié)
                      </span>
                      Cet avoir financier est autonome et n&apos;est rattaché à aucune facture existante. Le taux de TVA par défaut de <strong className="font-bold text-slate-700 font-mono">19.000%</strong> sera automatiquement appliqué pour les calculs de TVA et TTC.
                    </motion.div>
                  )
                )}
              </AnimatePresence>

              {/* Dynamic Financial Input section */}
              {selectedSupplierId && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Discount percentage input - visible/active only when parent invoice is linked */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-sand-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Percent className="w-3.5 h-3.5 text-amber-700" /> Remise (%)
                      </label>
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={discountPercentage || ''}
                          onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                          disabled={!selectedInvoiceObj}
                          className="border-sand-200 rounded-xl pr-10 text-xs font-semibold h-10 focus-visible:ring-amber-600 font-mono shadow-xs bg-white"
                          placeholder={selectedInvoiceObj ? "Ex: 10" : "N/A"}
                        />
                        <span className="absolute right-4 text-xs font-extrabold text-sand-400 font-sans">%</span>
                      </div>
                    </div>

                    {/* Amount HT Manual Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-sand-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Receipt className="w-3.5 h-3.5 text-amber-700" /> Montant HT
                      </label>
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={amountHTInput}
                          onChange={(e) => handleManualHTChange(e.target.value)}
                          onBlur={handleHTBlur}
                          className="border-sand-200 rounded-xl pr-12 text-xs font-semibold h-10 focus-visible:ring-amber-600 font-mono shadow-xs bg-white"
                          placeholder="0.000"
                        />
                        <span className="absolute right-4 text-xs font-extrabold text-sand-400 font-sans">TND</span>
                      </div>
                    </div>

                  </div>

                  {/* Observations description / justification reason */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-sand-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Tag className="w-3.5 h-3.5 text-amber-700" /> Motif / Raison de l&apos;avoir
                    </label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Erreur de facturation, ristourne exceptionnelle..."
                      className="border-sand-200 rounded-xl text-xs font-semibold h-10 focus-visible:ring-amber-600 bg-white shadow-xs"
                      required
                    />
                  </div>

                  {/* Detailed breakdown totals card */}
                  <Card className="rounded-2xl border-sand-200 shadow-xs bg-white p-4 space-y-2.5 font-mono text-xs border">
                    <div className="flex justify-between">
                      <span className="text-sand-500">Montant HT Avoir:</span>
                      <span className="font-semibold text-sand-800">{fmt(amountHT)} DT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sand-500">
                        TVA ({fmt((selectedInvoiceObj?.total_ht_net_doc ? (selectedInvoiceObj.total_tva_doc || 0) / selectedInvoiceObj.total_ht_net_doc : 0.19) * 100)}%):
                      </span>
                      <span className="font-semibold text-sand-800">{fmt(amountTVA)} DT</span>
                    </div>
                    <Separator className="bg-sand-150 my-1" />
                    <div className="flex justify-between items-center text-sand-900 font-serif text-xs pt-1">
                      <span className="font-extrabold">TOTAL AVOIR TTC:</span>
                      <span className="text-sm font-bold font-mono text-amber-800">
                        {fmt(amountTTC)} DT
                      </span>
                    </div>
                  </Card>

                  {/* Operational safety warnings */}
                  <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-900 leading-snug">
                    <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-amber-850">
                      Ce document d&apos;avoir financier ne génère **aucun mouvement de stock**. Il s&apos;agit d&apos;une correction comptable directe qui viendra diminuer le solde payable de ce fournisseur.
                    </span>
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* Dialog Action Buttons footer */}
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
              disabled={submitting || amountHT <= 0 || !selectedSupplierId}
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
                  Enregistrer l&apos;Avoir
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
