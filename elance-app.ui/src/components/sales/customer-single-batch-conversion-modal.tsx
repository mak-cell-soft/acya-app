'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowRight,
  Layers,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  Calendar,
  Lock
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

// Props for the client-specific batch conversion modal
interface CustomerSingleBatchConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerSingleBatchConversionModal({
  isOpen,
  onClose,
  onSuccess
}: CustomerSingleBatchConversionModalProps) {
  // Query custom React hooks to load system dependencies
  const { data: customers } = useCustomers('Customer');
  const { data: sites } = useSites();
  const { data: stampTaxesData } = useAppVariables('Taxe');
  // NOTE: Retenue à la Source (RS) was removed per user request as it is not needed for single-client batch invoicing.
  // We no longer query or use rsTaxesData in this component.

  // Customer selection states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Helper: Retrieve start date of the current month in YYYY-MM-DD
  const getStartOfMonthString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Helper: Retrieve end date of the current month in YYYY-MM-DD
  const getEndOfMonthString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const monthStr = String(month).padStart(2, '0');
    return `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  };

  // Date range filters
  const [startDate, setStartDate] = useState<string>(getStartOfMonthString());
  const [endDate, setEndDate] = useState<string>(getEndOfMonthString());

  // Delivery Notes states
  const [nonInvoicedBls, setNonInvoicedBls] = useState<Document[]>([]);
  const [loadingBls, setLoadingBls] = useState(false);
  const [selectedBlIds, setSelectedBlIds] = useState<number[]>([]);

  // Invoice parameters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [stampTaxId, setStampTaxId] = useState<string>('');
  // NOTE: rsTaxId state is removed as RS selection is no longer required.
  const [submitting, setSubmitting] = useState(false);

  // Filter out soft-deleted taxes from configuration
  const stampTaxes = stampTaxesData?.filter((v) => !v.isdeleted) || [];
  // NOTE: rsTaxes configuration is removed as Retenue à la Source is no longer selected.

  // Synchronize customer search text input when selecting a customer ID
  useEffect(() => {
    if (selectedCustomerId && customers) {
      const c = customers.find((c) => c.id.toString() === selectedCustomerId);
      if (c) {
        const fullName = c.name || `${c.firstname || ''} ${c.lastname || ''}`.trim() || 'Client sans nom';
        setCustomerSearchQuery(fullName);
      }
    } else if (!selectedCustomerId) {
      setCustomerSearchQuery('');
    }
  }, [selectedCustomerId, customers]);

  // Filter customers list by matching search input query
  const filteredCustomers = (customers || []).filter((cust) => {
    const name = (cust.name || `${cust.firstname || ''} ${cust.lastname || ''}`).toLowerCase();
    const query = customerSearchQuery.toLowerCase();
    return name.includes(query);
  });

  // Fetch Delivery Notes (BLs) matching selected customer and date range filter
  // NOTE: Unlike Facturation Groupée, here we strictly filter by the pre-selected customer ID.
  useEffect(() => {
    if (isOpen && selectedCustomerId && startDate && endDate) {
      setLoadingBls(true);
      setSelectedBlIds([]);
      documentService
        .getByType(DocumentTypes.customerDeliveryNote)
        .then((data: Document[]) => {
          const filtered = (data || []).filter((doc: Document) => {
            if (!doc.creationdate) return false;
            // WHY: creationdate is typed as string | Date — new Date() accepts both, normalizing before split.
            const docDateStr = new Date(doc.creationdate).toISOString().split('T')[0];
            const isSameCustomer = doc.counterpart?.id?.toString() === selectedCustomerId;
            const notInvoiced = doc.billingstatus === BillingStatus.NotBilled && !doc.isinvoiced;
            const withinRange = docDateStr >= startDate && docDateStr <= endDate;
            return isSameCustomer && notInvoiced && withinRange && !doc.isdeleted;
          });
          // Sort descending (latest first) to make it easy to view
          filtered.sort((a, b) => (b.docnumber || '').localeCompare(a.docnumber || ''));
          setNonInvoicedBls(filtered);
        })
        .catch((err) => {
          console.error('Failed to load client BLs:', err);
          toast.error('Erreur lors du chargement des bons de livraison.');
        })
        .finally(() => {
          setLoadingBls(false);
        });
    } else {
      setNonInvoicedBls([]);
      setSelectedBlIds([]);
    }
  }, [isOpen, selectedCustomerId, startDate, endDate]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setSelectedBlIds([]);
      setStartDate(getStartOfMonthString());
      setEndDate(getEndOfMonthString());
      setDescription('');
    }
  }, [isOpen]);

  // Pre-fill active default site/depot
  useEffect(() => {
    if (sites && sites.length > 0) {
      const activeSite = sites.find((s) => s.isForsale) || sites[0];
      if (activeSite) setSelectedSiteId(activeSite.id.toString());
    }
  }, [sites]);

  // Pre-fill default taxes (0.600 stamp)
  // WHY: Retenue à la Source (RS) logic is removed per requirements; we only pre-fill stamp taxes.
  useEffect(() => {
    if (stampTaxes.length > 0) {
      const defaultStamp = stampTaxes.find((t) => parseFloat(t.value || '0') === 1.0 || parseFloat(t.value || '0') === 0.6) || stampTaxes[0];
      if (defaultStamp) setStampTaxId(defaultStamp.id.toString());
    }
  }, [stampTaxesData]);

  // Toggle selection check on a single BL
  const toggleSelectBl = (id: number) => {
    setSelectedBlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select/deselect all rows
  const handleSelectAll = () => {
    if (selectedBlIds.length === nonInvoicedBls.length) {
      setSelectedBlIds([]);
    } else {
      setSelectedBlIds(nonInvoicedBls.map((b) => b.id));
    }
  };

  // Compute live totals of selected BLs (No manual discount field allowed)
  const selectedBlObjects = nonInvoicedBls.filter((b) => selectedBlIds.includes(b.id));
  const rawHtSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_ht_net_doc + curr.total_discount_doc || 0), 0);
  const discountSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_discount_doc || 0), 0);
  const netHtSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
  const taxSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_tva_doc || 0), 0);
  const baseTtcSum = selectedBlObjects.reduce((acc, curr) => acc + (curr.total_net_ttc || 0), 0);

  const activeStamp = stampTaxes.find((t) => t.id === parseInt(stampTaxId));

  const stampAmount = activeStamp ? parseFloat(activeStamp.value || '0') : 0;
  // WHY: RS is removed from client batch conversion. Net payable calculation is simplified to TTC + stamp.
  const finalNetPayable = Math.max(0, baseTtcSum + stampAmount);

  // Submit and create standard invoice via API
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
      const selectedSiteObj = sites?.find((s) => s.id.toString() === selectedSiteId);

      // C#/API Contract: Standard invoice (isservice = false) skips client discount fields but respects stamp tax & RS.
      // We pass the parent Invoice document containing calculated sums, and the children BL ids list.
      const invoiceDoc: any = {
        id: 0,
        type: DocumentTypes.customerInvoice,
        counterpart_id: parseInt(selectedCustomerId),
        counterpart: selectedCustObj,
        creationdate: new Date().toISOString(),
        sales_site_id: parseInt(selectedSiteId),
        sales_site: selectedSiteObj ? { id: selectedSiteObj.id } : null,
        docstatus: DocStatus.Validated,
        billingstatus: BillingStatus.Billed,
        description: description || `Facturation client des BLs: ${selectedBlObjects.map(b => b.docnumber).join(', ')}`,
        currencycode: 'TND',
        changerate: 1.0,
        taxeId: stampTaxId ? parseInt(stampTaxId) : null,
        taxe: activeStamp ? { id: activeStamp.id } : null,
        // Flag C#/API contract assumptions: The API accepts null holdingTaxId and withholdingtax=false for no withholding tax.
        holdingTaxId: null,
        withholdingtax: false,
        holdingtax: null,
        isservice: false, // Set to false for standard invoicing (Facturation pour un Client)
        updatedbyid: 1,
        total_ht_net_doc: parseFloat(netHtSum.toFixed(3)),
        total_discount_doc: parseFloat(discountSum.toFixed(3)),
        total_tva_doc: parseFloat(taxSum.toFixed(3)),
        total_net_ttc: parseFloat((baseTtcSum + stampAmount).toFixed(3)), // Net TTC
        total_net_payable: parseFloat(finalNetPayable.toFixed(3)),
      }

      const payload = {
        invoiceDoc,
        docChildrenIds: selectedBlIds
      };

      // Call Backend REST API Controller: DocumentController.CreateInvoice
      await documentService.createInvoice(payload);
      toast.success('Facture client générée avec succès.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create customer batch invoice:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la génération de la facture.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper rendering the BL table or loading states
  const renderDeliveryNotesContent = () => {
    if (!selectedCustomerId) {
      return (
        <div className="text-center py-20 text-sand-400 italic">
          Veuillez sélectionner un client pour afficher ses bons de livraison non-facturés.
        </div>
      );
    }

    if (loadingBls) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest-600"></div>
          <p className="text-xs text-sand-400 font-medium">Chargement des BLs...</p>
        </div>
      );
    }

    if (nonInvoicedBls.length === 0) {
      return (
        <div className="text-center py-20 text-sand-400">
          Aucun bon de livraison non-facturé pour ce client dans la période sélectionnée.
        </div>
      );
    }

    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-sand-50/50 border-b border-sand-200 text-sand-400 font-bold uppercase tracking-wider">
            <th className="w-12 px-4 py-3 text-center">Sélection</th>
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Date de création</th>
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
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop glassmorphism overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal content container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-4xl bg-white rounded-[24px] shadow-2xl overflow-hidden border border-sand-100 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header styling matching the primary Forest design guidelines */}
          <div className="px-6 py-5 bg-forest-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-sand-400">
                Facturation pour un Client
              </span>
              <h2 className="text-xl font-serif text-sand-100">
                Générer Facture Client (Regroupement)
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

          {/* Body structure with spatial grid layouts */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#fcfbfa]">
            {/* Left Column: Customer & Date filters, Delivery Notes (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Customer Selector Search dropdown */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Client à facturer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                  <Input
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                      if (!e.target.value) {
                        setSelectedCustomerId('');
                      }
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="Rechercher et sélectionner le client..."
                    className="pl-9 pr-8 h-10 rounded-xl border-sand-200 focus:ring-forest-800 bg-white text-xs font-medium text-sand-800"
                  />
                  {(selectedCustomerId || customerSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchQuery('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-sand-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isCustomerDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsCustomerDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto z-20 rounded-xl border border-sand-200 bg-white shadow-lg p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredCustomers.map((cust) => {
                        const fullName = cust.name || `${cust.firstname || ''} ${cust.lastname || ''}`.trim() || 'Client sans nom';
                        const isSelected = selectedCustomerId === cust.id.toString();
                        return (
                          <button
                            key={cust.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                              isSelected ? "bg-forest-800 text-white" : "text-sand-800 hover:bg-sand-50"
                            )}
                            onClick={() => {
                              setSelectedCustomerId(cust.id.toString());
                              setCustomerSearchQuery(fullName);
                              setIsCustomerDropdownOpen(false);
                            }}
                          >
                            <span>{fullName}</span>
                            {cust.phonenumberone && (
                              <span className={cn(
                                "text-[10px]",
                                isSelected ? "text-forest-200" : "text-sand-400"
                              )}>
                                {cust.phonenumberone}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {filteredCustomers.length === 0 && (
                        <div className="text-center py-4 text-xs text-sand-400 italic">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Date Range selectors (Start and End dates) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Date de début</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl border-sand-200 focus:ring-forest-800 bg-white text-xs font-medium text-sand-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Date de fin</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl border-sand-200 focus:ring-forest-800 bg-white text-xs font-medium text-sand-800"
                  />
                </div>
              </div>

              {/* Uninvoiced BL list table */}
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
                  {renderDeliveryNotesContent()}
                </div>
              </div>
            </div>

            {/* Right Column: Invoice properties & calculations (5 cols) */}
            <div className="lg:col-span-5 space-y-6 border-l border-sand-100 pl-6">
              <h3 className="font-serif font-bold text-base text-forest-950 border-b border-sand-100 pb-1.5">
                Paramètres de la Facture
              </h3>

              {/* Sales site/depot selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">
                  Dépôt de facturation
                </label>
                <Select value={selectedSiteId} onValueChange={(val) => setSelectedSiteId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs w-full">
                    <SelectValue placeholder="Choisir le dépôt">
                      {selectedSiteId && sites ? (() => {
                        const s = sites.find((s) => s.id.toString() === selectedSiteId);
                        return s ? `${s.gov} - ${s.address}` : undefined;
                      })() : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.gov} - {s.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stamp tax dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider">
                  Timbre Fiscal
                </label>
                <Select value={stampTaxId} onValueChange={(val) => setStampTaxId(val || '')}>
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs w-full">
                    <SelectValue placeholder="Aucun">
                      {stampTaxId && stampTaxes ? (() => {
                        const t = stampTaxes.find((t) => t.id.toString() === stampTaxId);
                        return t ? `${t.name} (${parseFloat(t.value || '0')?.toFixed(3)} DT)` : undefined;
                      })() : undefined}
                    </SelectValue>
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

              {/* NOTE: Withholding tax RS dropdown has been removed per requirements. */}

              {/* Notes observations */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Observations</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-sand-200 rounded-xl text-xs"
                  placeholder="Observations imprimées sur la facture"
                />
              </div>

              {/* Calculations summary panel */}
              <Card className="rounded-[20px] border-sand-200 shadow-xs bg-white p-5 space-y-3 font-mono text-xs">
                <h4 className="font-serif font-bold text-sm text-forest-950 border-b border-sand-50 pb-1.5">
                  Synthèse Financière
                </h4>
                <div className="space-y-2 text-sand-600">
                  <div className="flex justify-between">
                    <span>Sous-total HT:</span>
                    <span>{netHtSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                  </div>
                  {discountSum > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Remise BLs:</span>
                      <span>-{discountSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                    </div>
                  )}
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
                  {/* NOTE: Retenue Source calculation line was removed here since RS option was removed. */}
                  <Separator className="bg-sand-100 my-1" />
                  <div className="flex justify-between items-center text-forest-950 font-serif text-sm pt-1">
                    <span className="font-bold">Net à Payer (TTC):</span>
                    <span className="text-base font-bold font-mono text-forest-800">
                      {finalNetPayable.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                      {' '}DT
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Action buttons footer */}
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
