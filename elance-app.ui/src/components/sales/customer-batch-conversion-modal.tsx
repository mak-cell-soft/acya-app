'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  DollarSign
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
import { useCustomers } from '@/hooks/use-customers';
import { useSites } from '@/hooks/use-enterprise';
import { useAppVariables } from '@/hooks/use-app-variables';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerBatchConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerBatchConversionModal({
  isOpen,
  onClose,
  onSuccess
}: CustomerBatchConversionModalProps) {
  const { data: customers } = useCustomers('Customer');
  const { data: sites } = useSites();
  const { data: stampTaxesData } = useAppVariables('Taxe');
  const { data: rsTaxesData } = useAppVariables('RS');

  // Selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [nonInvoicedBls, setNonInvoicedBls] = useState<Document[]>([]);
  const [loadingBls, setLoadingBls] = useState(false);

  // Selected BL checkboxes
  const [selectedBlIds, setSelectedBlIds] = useState<number[]>([]);

  // Form parameters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Tax Variables (Stamp & RS)
  const [stampTaxId, setStampTaxId] = useState<string>('');
  const [rsTaxId, setRsTaxId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Filter AppVariables for taxes
  const stampTaxes = stampTaxesData?.filter((v) => !v.isdeleted) || [];
  const rsTaxes = rsTaxesData?.filter((v) => !v.isdeleted) || [];

  // When customer changes, load their non-invoiced BLs
  useEffect(() => {
    if (selectedCustomerId) {
      setLoadingBls(true);
      setSelectedBlIds([]);
      // Call service to get non-invoiced BLs
      documentService
        .getByTypeDocsFiltered({
          typeDoc: DocumentTypes.customerDeliveryNote,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
        .then((data: Document[]) => {
          // Filter BLs belonging to selected customer and having billingStatus = NotBilled
          const filtered = (data || []).filter(
            (doc: Document) =>
              doc.counterpart?.id === parseInt(selectedCustomerId) &&
              doc.billingstatus === BillingStatus.NotBilled &&
              doc.docstatus === DocStatus.Validated &&
              !doc.isinvoiced
          );
          setNonInvoicedBls(filtered);
        })
        .catch((err) => {
          console.error('Failed to load uninvoiced BLs:', err);
          toast.error('Erreur lors du chargement des bons de livraison.');
        })
        .finally(() => {
          setLoadingBls(false);
        });
    } else {
      setNonInvoicedBls([]);
      setSelectedBlIds([]);
    }
  }, [selectedCustomerId]);

  // Pre-fill active site default
  useEffect(() => {
    if (sites && sites.length > 0) {
      const activeSite = sites.find((s) => s.isForsale) || sites[0];
      if (activeSite) setSelectedSiteId(activeSite.id.toString());
    }
  }, [sites]);

  // Pre-fill default taxes (0.600 stamp and 1.5% withholding tax)
  useEffect(() => {
    if (stampTaxes.length > 0) {
      const defaultStamp = stampTaxes.find((t) => parseFloat(t.value || '0') === 1.0 || parseFloat(t.value || '0') === 0.6) || stampTaxes[0];
      if (defaultStamp) setStampTaxId(defaultStamp.id.toString());
    }
    if (rsTaxes.length > 0) {
      const defaultRs = rsTaxes.find((t) => parseFloat(t.value || '0') === 1.5 || parseFloat(t.value || '0') === 1.0) || rsTaxes[0];
      if (defaultRs) setRsTaxId(defaultRs.id.toString());
    }
  }, [stampTaxesData, rsTaxesData]);

  const toggleSelectBl = (id: number) => {
    setSelectedBlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBlIds.length === nonInvoicedBls.length) {
      setSelectedBlIds([]);
    } else {
      setSelectedBlIds(nonInvoicedBls.map((b) => b.id));
    }
  };

  // Compute live aggregates of selected BLs
  const selectedBlObjects = nonInvoicedBls.filter((b) => selectedBlIds.includes(b.id));
  const rawHtSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_ht_net_doc + curr.total_discount_doc || 0), 0);
  const discountSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_discount_doc || 0), 0);
  const netHtSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
  const taxSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_tva_doc || 0), 0);
  const baseTtcSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_net_ttc || 0), 0);

  const activeStamp = stampTaxes.find((t) => t.id === parseInt(stampTaxId));
  const activeRs = rsTaxes.find((t) => t.id === parseInt(rsTaxId));

  const stampAmount = activeStamp ? parseFloat(activeStamp.value || '0') : 0;
  const rsRate = activeRs ? parseFloat(activeRs.value || '0') : 0;
  const computedRsAmount = netHtSum * (rsRate / 100);
  const finalNetPayable = baseTtcSum + stampAmount - computedRsAmount;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.warning('Veuillez sélectionner un client.');
      return;
    }
    if (selectedBlIds.length === 0) {
      toast.warning('Veuillez sélectionner au moins un bon de livraison à facturer.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedCustObj = customers?.find((c) => c.id === parseInt(selectedCustomerId));

      // Build target DocumentDto for the Invoice
      const invoiceDoc: any = {
        id: 0,
        type: DocumentTypes.customerInvoice,
        counterpart_id: parseInt(selectedCustomerId),
        counterpart: selectedCustObj,
        creationdate: new Date().toISOString(),
        sales_site_id: parseInt(selectedSiteId),
        docstatus: DocStatus.Validated,
        billingstatus: BillingStatus.Billed,
        description: description || `Facturation groupée des BLs: ${selectedBlObjects.map(b => b.docnumber).join(', ')}`,
        currencycode: 'TND',
        changerate: 1.0,
        taxeId: stampTaxId ? parseInt(stampTaxId) : null,
        holdingTaxId: rsTaxId ? parseInt(rsTaxId) : null,
        updatedbyid: 1, // Connected auditor user id default
      };

      const payload = {
        invoiceDoc,
        docChildrenIds: selectedBlIds
      };

      await documentService.createInvoice(payload);
      toast.success('Facture groupée générée avec succès.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create batch invoice:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la génération de la facture.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-4xl bg-white rounded-[24px] shadow-2xl overflow-hidden border border-sand-100 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-forest-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-sand-400">
                Facturation Groupée
              </span>
              <h2 className="text-xl font-serif text-sand-100">
                Générer Facture depuis Bons de Livraison
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-sand-300 hover:bg-forest-900 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#fcfbfa]">
            {/* Left Column: Client & BL selection (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Select Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Client Destinataire</label>
                <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white">
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((cust) => (
                      <SelectItem key={cust.id} value={cust.id.toString()}>
                        {cust.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Notes Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-forest-950">Bons de livraison non-facturés</h3>
                  {nonInvoicedBls.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSelectAll}
                      className="text-xs text-forest-800 font-bold hover:bg-forest-50"
                    >
                      {selectedBlIds.length === nonInvoicedBls.length
                        ? 'Tout désélectionner'
                        : 'Sélectionner tout'}
                    </Button>
                  )}
                </div>

                <div className="border border-sand-200/80 rounded-[20px] overflow-hidden bg-white shadow-xs min-h-[250px] max-h-[350px] overflow-y-auto">
                  {loadingBls ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest-600"></div>
                      <p className="text-xs text-sand-400 font-medium">Chargement des BLs...</p>
                    </div>
                  ) : selectedCustomerId ? (
                    nonInvoicedBls.length > 0 ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-sand-50/50 border-b border-sand-200 text-sand-400 font-bold uppercase tracking-wider">
                            <th className="w-12 px-4 py-3 text-center">Sélection</th>
                            <th className="px-4 py-3">Document</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Montant TTC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sand-100 text-sand-800">
                          {nonInvoicedBls.map((bl) => {
                            const isChecked = selectedBlIds.includes(bl.id);
                            return (
                              <tr
                                key={bl.id}
                                onClick={() => toggleSelectBl(bl.id)}
                                className="hover:bg-sand-50/50 cursor-pointer transition-colors"
                              >
                                <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectBl(bl.id)}
                                    className="text-forest-750 focus:outline-none"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-forest-800" />
                                    ) : (
                                      <Square className="w-4 h-4 text-sand-300" />
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-3 font-bold text-sand-900">{bl.docnumber}</td>
                                <td className="px-4 py-3 text-sand-500">
                                  {new Date(bl.creationdate!).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold">
                                  {(bl.total_net_ttc || 0).toLocaleString(
                                    'fr-FR',
                                    { minimumFractionDigits: 3 }
                                  )}{' '}
                                  DT
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-20 text-sand-400">
                        Aucun bon de livraison non-facturé validé pour ce client.
                      </div>
                    )
                  ) : (
                    <div className="text-center py-20 text-sand-400">
                      Sélectionnez d&apos;abord un client pour voir ses bons de livraison.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Invoice config & financial summary (5 cols) */}
            <div className="lg:col-span-5 space-y-6 border-l border-sand-100 pl-6">
              <h3 className="font-serif font-bold text-base text-forest-950 border-b border-sand-100 pb-1.5">
                Paramètres de la Facture
              </h3>

              {/* Select site */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider font-sans">
                  Dépôt de facturation
                </label>
                <Select value={selectedSiteId} onValueChange={(val) => setSelectedSiteId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs">
                    <SelectValue placeholder="Choisir le dépôt" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.gov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Stamp Tax */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">
                  Timbre Fiscal
                </label>
                <Select value={stampTaxId} onValueChange={(val) => setStampTaxId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    {stampTaxes.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({parseFloat(t.value || '0')?.toFixed(3)} DT)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Retenue à la source (RS) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">
                  Retenue à la Source (RS)
                </label>
                <Select value={rsTaxId} onValueChange={(val) => setRsTaxId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    {rsTaxes.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({t.value}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Observations</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-sand-200 rounded-xl text-xs"
                  placeholder="Observations imprimées sur la facture"
                />
              </div>

              {/* Calculations board */}
              <Card className="rounded-[20px] border-sand-200 shadow-xs bg-white p-5 space-y-3 font-mono text-xs">
                <h4 className="font-serif font-bold text-sm text-forest-950 border-b border-sand-50 pb-1.5">
                  Synthèse Financière
                </h4>
                <div className="space-y-2 text-sand-600">
                  <div className="flex justify-between">
                    <span>Sous-total HT:</span>
                    <span>{netHtSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA Cumulative:</span>
                    <span>{taxSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                  </div>
                  {stampAmount > 0 && (
                    <div className="flex justify-between text-sand-700">
                      <span>Timbre Fiscal:</span>
                      <span>+{stampAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                  )}
                  {computedRsAmount > 0 && (
                    <div className="flex justify-between text-purple-800">
                      <span>Retenue Source ({rsRate}%):</span>
                      <span>-{computedRsAmount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                  )}
                  <Separator className="bg-sand-100 my-1" />
                  <div className="flex justify-between items-center text-forest-950 font-serif text-sm pt-1">
                    <span className="font-bold">Net à Payer (TTC):</span>
                    <span className="text-base font-bold font-mono text-forest-800">
                      {finalNetPayable.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-sand-50 border-t border-sand-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-sand-300 text-sand-700 rounded-xl hover:bg-sand-100 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedBlIds.length === 0}
              onClick={handleConvert}
              className="bg-forest-950 hover:bg-forest-900 text-white rounded-xl shadow-md min-w-[150px] text-xs font-bold"
            >
              {submitting ? 'Génération...' : `Générer Facture (${selectedBlIds.length} BL)`}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
