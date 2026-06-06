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
  // WHY: Only stamp tax is fetched from AppVariables. RS is now a free % input.
  const { data: stampTaxesData } = useAppVariables('Taxe');

  // Selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  // WHY: Manual discount is now input as a percentage with an option to round the Net à Payer (TTC) amount.
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isRounded, setIsRounded] = useState<boolean>(false);

  // Helper to format date in local YYYY-MM-DD format
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Selected date for Facturation Groupée
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  // Synchronize search input when customer is selected or changed
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

  // Filter customers by search query
  const filteredCustomers = (customers || []).filter((cust) => {
    const name = (cust.name || `${cust.firstname || ''} ${cust.lastname || ''}`).toLowerCase();
    const query = customerSearchQuery.toLowerCase();
    return name.includes(query);
  });

  const [nonInvoicedBls, setNonInvoicedBls] = useState<Document[]>([]);
  const [loadingBls, setLoadingBls] = useState(false);

  // Selected BL checkboxes
  const [selectedBlIds, setSelectedBlIds] = useState<number[]>([]);

  // Form parameters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Tax Variables — Stamp only (RS is handled in a dedicated interface)
  const [stampTaxId, setStampTaxId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Filter AppVariables for stamp taxes
  const stampTaxes = stampTaxesData?.filter((v) => !v.isdeleted) || [];

  // Fetch non-invoiced BLs for the selected date when it changes or modal opens
  // NOTE: In 'Facturation Groupée', we fetch all BLs of that day across all customers.
  useEffect(() => {
    if (isOpen && selectedDate) {
      setLoadingBls(true);
      setSelectedBlIds([]);
      // Reset manual discount and rounding option when changing date
      setDiscountPercent(0);
      setIsRounded(false);
      documentService
        .getByType(DocumentTypes.customerDeliveryNote)
        .then((data: Document[]) => {
          // Filter BLs created on the selected date that are not yet invoiced
          // We display BLs in any status (Created or Validated) having BillingStatus.NotBilled
          const filtered = (data || []).filter((doc: Document) => {
            if (!doc.creationdate) return false;
            // WHY: creationdate is typed as string | Date — new Date() accepts both, so we normalize
            // before extracting the date portion, satisfying TypeScript without a type assertion.
            const docDateStr = new Date(doc.creationdate).toISOString().split('T')[0];
            return (
              docDateStr === selectedDate &&
              doc.billingstatus === BillingStatus.NotBilled &&
              !doc.isinvoiced &&
              !doc.isdeleted
            );
          });
          setNonInvoicedBls(filtered);
        })
        .catch((err) => {
          console.error('Failed to load uninvoiced BLs for selected day:', err);
          toast.error('Erreur lors du chargement des bons de livraison.');
        })
        .finally(() => {
          setLoadingBls(false);
        });
    } else {
      setNonInvoicedBls([]);
      setSelectedBlIds([]);
    }
  }, [isOpen, selectedDate]);

  // Reset discount and other config on customer change
  useEffect(() => {
    setDiscountPercent(0);
    setIsRounded(false);
  }, [selectedCustomerId]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setDiscountPercent(0);
      setIsRounded(false);
      setSelectedBlIds([]);
      setSelectedDate(getLocalDateString());
      setDescription('');
    }
  }, [isOpen]);

  // Pre-fill active site default
  useEffect(() => {
    if (sites && sites.length > 0) {
      const activeSite = sites.find((s) => s.isForsale) || sites[0];
      if (activeSite) setSelectedSiteId(activeSite.id.toString());
    }
  }, [sites]);

  // Pre-fill default stamp tax (0.600 DT)
  useEffect(() => {
    if (stampTaxes.length > 0) {
      const defaultStamp =
        stampTaxes.find((t) => parseFloat(t.value || '0') === 1.0 || parseFloat(t.value || '0') === 0.6) ||
        stampTaxes[0];
      if (defaultStamp) setStampTaxId(defaultStamp.id.toString());
    }
  }, [stampTaxesData]);

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

  // Apply manual discount as percentage of Net HT Sum
  // WHY: To allow user custom overrides/discounts on grouped billing before final submission.
  const computedDiscount = netHtSum * (discountPercent / 100);
  const finalNetHtSum = Math.max(0, netHtSum - computedDiscount);
  const finalDiscountSum = discountSum + computedDiscount;
  const finalBaseTtcSum = Math.max(0, baseTtcSum - computedDiscount);

  const activeStamp = stampTaxes.find((t) => t.id === parseInt(stampTaxId));
  const stampAmount = activeStamp ? parseFloat(activeStamp.value || '0') : 0;
  // WHY: Net payable before rounding = TTC after manual discount + stamp. RS is not applied here.
  const rawNetPayable = Math.max(0, finalBaseTtcSum + stampAmount);

  // Rounding logic: rounds Net à Payer (TTC) to the nearest integer (dinar) if option is checked.
  const finalNetPayable = isRounded ? Math.round(rawNetPayable) : rawNetPayable;
  const roundingAdjustment = finalNetPayable - rawNetPayable;

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

      // Build target DocumentDto for the Invoice
      // WHY: We computed final totals on the fly using child delivery note aggregates minus manual discount.
      // We pass taxes, withholding tax structure, and enable the isService flag to skip line duplication.
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
        description: description || `Facturation groupée des BLs: ${selectedBlObjects.map(b => b.docnumber).join(', ')}`,
        currencycode: 'TND',
        changerate: 1.0,
        taxeId: stampTaxId ? parseInt(stampTaxId) : null,
        taxe: activeStamp ? { id: activeStamp.id } : null,
        // WHY: RS (Retenue à la Source) is handled in a dedicated interface — not set here.
        holdingTaxId: null,
        withholdingtax: false,
        holdingtax: null,
        isservice: true, // Set true to skip merchandise line duplication on grouped invoices.
        updatedbyid: 1,
        total_ht_net_doc: parseFloat(finalNetHtSum.toFixed(3)),
        total_discount_doc: parseFloat(finalDiscountSum.toFixed(3)),
        total_tva_doc: parseFloat(taxSum.toFixed(3)),
        total_net_ttc: parseFloat((finalBaseTtcSum + stampAmount).toFixed(3)),
        total_net_payable: parseFloat(finalNetPayable.toFixed(3)),
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

  /**
   * NOTE: Extracted the nested ternary operation from the JSX block into this independent helper method.
   * 
   * WHY:
   * 1. Readability & Maintainability: Nested ternaries inside JSX code quickly become hard to read, 
   *    indent, and debug. Separating the rendering logic clarifies the conditional flow.
   * 2. Clean Code Standards: Satisfies modern code guidelines (e.g. ESLint no-nested-ternary)
   *    by replacing complex conditional statements with structured early-returns.
   * 3. Clear State Separation: Separates the three logical UI states of the BL list:
   *    - Loading State: Shows a spinner spinner during async data fetching.
   *    - Selection Prompt State: Prompts the user to select a customer if none is active.
   *    - Results State: Displays a table of uninvoiced delivery notes, or a "no results" message if empty.
   */
  const renderDeliveryNotesContent = () => {
    // 1. If we are currently fetching data from the API, show a loading spinner
    if (loadingBls) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest-600"></div>
          <p className="text-xs text-sand-400 font-medium">Chargement des BLs...</p>
        </div>
      );
    }

    // 2. If there are no uninvoiced delivery notes for the selected day, notify the user
    if (nonInvoicedBls.length === 0) {
      return (
        <div className="text-center py-20 text-sand-400">
          Aucun bon de livraison non-facturé pour cette journée.
        </div>
      );
    }

    // 3. Otherwise, render the list of uninvoiced delivery notes in an interactive table
    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-sand-50/50 border-b border-sand-200 text-sand-400 font-bold uppercase tracking-wider">
            <th className="w-12 px-4 py-3 text-center">Sélection</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Montant TTC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-100 text-sand-800">
          {nonInvoicedBls.map((bl) => {
            const isChecked = selectedBlIds.includes(bl.id);
            const clientName = bl.counterpart 
              ? (bl.counterpart.name || `${bl.counterpart.firstname || ''} ${bl.counterpart.lastname || ''}`.trim() || 'Client sans nom') 
              : 'Client inconnu';
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
                <td className="px-4 py-3 font-medium text-sand-700">{clientName}</td>
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
          className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-sand-100 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-forest-950 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-sand-400">
                Facturation Groupée
              </span>
              <h2 className="text-xl font-serif text-sand-100">
                Générer Facture Groupée de la Journée
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-sand-300 hover:bg-forest-900 hover:text-white "
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#fcfbfa]">
            {/* Left Column: Date, Client & BL selection (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Select Day */}
              {/* WHY: Facturation Groupée requires selecting a day to retrieve all uninvoiced delivery notes for that date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Journée de Facturation</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 rounded-xl border-sand-200 focus:ring-forest-800 bg-white text-xs font-medium text-sand-800"
                />
              </div>

              {/* Select Customer */}
              {/* WHY: The user chooses a customer to assign/affect to the generated service invoice */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">Client Destinataire</label>
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
                    placeholder="Choisir ou rechercher le client à facturer..."
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
                              isSelected
                                ? "bg-forest-800 text-white"
                                : "text-sand-800 hover:bg-sand-50"
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
                  {renderDeliveryNotesContent()}
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
                  {/* 
                    NOTE: Added w-full because the base SelectTrigger component defaults to w-fit, 
                    and we want it to fill the full width of this form column.
                  */}
                  <SelectTrigger className="border-sand-200 rounded-xl bg-white text-xs w-full">
                    <SelectValue placeholder="Choisir le dépôt">
                      {/* 
                        NOTE: Displaying both the governorate (.gov) and the address (.address) 
                        to distinguish between multiple depots located in the same governorate.
                      */}
                      {selectedSiteId && sites ? (() => {
                        const s = sites.find((s) => s.id.toString() === selectedSiteId);
                        return s ? `${s.gov} - ${s.address}` : undefined;
                      })() : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {/* 
                          NOTE: Appending the address helps the user identify the correct 
                          sales/billing site since some governorates host multiple depots.
                        */}
                        {s.gov} - {s.address}
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
                  {/* 
                    NOTE: Added w-full because the base SelectTrigger component defaults to w-fit, 
                    and we want it to fill the full width of this form column.
                  */}
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

              {/* Remise (%) & Option Arrondi */}
              {/* WHY: Allows the user to specify a discount rate and/or choose to round the final net payable (TTC). */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block font-sans">
                    Remise (%)
                  </label>
                  <div className="relative font-sans">
                    <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discountPercent || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDiscountPercent(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                      }}
                      placeholder="0.0%"
                      className="pl-9 text-right font-mono h-10 rounded-xl border-sand-200 focus:ring-forest-800 bg-white text-xs font-medium text-sand-800"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="round-ttc-option"
                    checked={isRounded}
                    onChange={(e) => setIsRounded(e.target.checked)}
                    className="rounded border-sand-300 text-forest-800 focus:ring-forest-800 h-4 w-4 accent-forest-800 cursor-pointer"
                  />
                  <label htmlFor="round-ttc-option" className="text-xs font-bold text-sand-700 cursor-pointer select-none">
                    Arrondir le Net à Payer (TTC)
                  </label>
                </div>
              </div>

              {/* Invoice notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-sand-500 uppercase tracking-wider block font-sans">Observations</label>
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
                  {discountPercent > 0 && (
                    <>
                      <div className="flex justify-between text-rose-600">
                        <span>Remise ({discountPercent}%):</span>
                        <span>-{computedDiscount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                      </div>
                      <div className="flex justify-between text-sand-800 font-bold">
                        <span>Net HT:</span>
                        <span>{finalNetHtSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                      </div>
                    </>
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
                  {isRounded && Math.abs(roundingAdjustment) > 0.0001 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Ajustement Arrondi:</span>
                      <span>
                        {roundingAdjustment > 0 ? '+' : ''}
                        {roundingAdjustment.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                      </span>
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
              className="border-sand-300 text-sand-700 hover:bg-sand-100 text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedBlIds.length === 0}
              onClick={handleConvert}
              className="bg-forest-950 hover:bg-forest-900 text-white shadow-md min-w-[150px] text-xs font-bold"
            >
              {submitting ? 'Génération...' : `Générer Facture (${selectedBlIds.length} BL)`}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

