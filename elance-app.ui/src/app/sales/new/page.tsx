'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  ArrowLeft,
  Plus,
  Trash2,
  TreeDeciduous,
  Truck,
  PlusCircle,
  Percent,
  CheckCircle2,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Info,
  X,
  Search,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { useCustomers, useUpdateCustomer } from '@/hooks/use-customers';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { useTransporters } from '@/hooks/use-transporters';
import { useArticles } from '@/hooks/use-articles';
import { useSites } from '@/hooks/use-enterprise';
import { useAppVariables } from '@/hooks/use-app-variables';
import { documentService } from '@/services/components/document.service';
import { pricingGridService } from '@/services/components/pricing-grid.service';
import { stockService } from '@/services/components/stock.service';
import { exchangeRateService } from '@/services/components/exchange-rate.service';
import { DocumentTypes, DocStatus, BillingStatus, LineType, ListOfLength } from '@/types/document';
import { Article } from '@/types/article';
import { Customer } from '@/types/customer';
import { Transporter, Site } from '@/types/settings';
import { toast } from 'sonner';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interface representing a row in our dynamic merchandise grid
 */
interface MerchandRow {
  selectedArticle: Article | null;
  selectedStock: any | null;
  articleSearchInput: string;
  filteredArticles: Article[];
  unit_price_ht: number;
  quantity: number;
  listLengths: ListOfLength[];
  selldiscountpercentage: number;
  sellcostprice_discountValue: number;
  sellcostprice_net_ht: number;
  sellcostprice_taxValue: number;
  totalWithTax: number;
  line_type: LineType;
  description: string;
  isWoodArticle: boolean;
  isNegotiated: boolean;
  transporter_id?: number | null;
  transporter_name?: string;
}

function NewSalesDocumentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceDocumentId = parseInt(searchParams.get('sourceId') || '0');

  // Connected User details
  const { user } = useAuthStore();

  // 1. Data hooks
  const { data: allCustomers = [], isLoading: isLoadingCustomers } = useCustomers('Customer');
  const { data: allTransporters = [], isLoading: isLoadingTransporters } = useTransporters();
  const { data: allArticles = [], isLoading: isLoadingArticles } = useArticles();
  const { data: allSites = [] } = useSites();
  const { data: allTvas = [] } = useAppVariables('Tva');

  // 2. Active Site Selection
  // Finds corresponding Site object based on logged-in user default site ID
  const activeUserSite = useMemo(() => {
    if (!allSites.length) return null;
    const defaultSiteId = user?.defaultSiteId;
    return allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
  }, [allSites, user?.defaultSiteId]);

  // 3. Page Level state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const updateCustomer = useUpdateCustomer();

  const handleUpdateCustomer = (data: any) => {
    if (!selectedCustomer) return;
    updateCustomer.mutate(
      { id: selectedCustomer.id, data: data },
      {
        onSuccess: () => {
          setIsCustomerFormOpen(false);
          setSelectedCustomer(prev => prev ? { ...prev, ...data } : null);
          toast.success('Informations du client mises à jour avec succès.');
        },
        onError: () => {
          toast.error('Erreur lors de la mise à jour des informations.');
        }
      }
    );
  };

  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [transporterSearchQuery, setTransporterSearchQuery] = useState('');
  const [isTransporterDropdownOpen, setIsTransporterDropdownOpen] = useState(false);
  const [customerReference, setCustomerReference] = useState<string>('');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [docCurrency, setDocCurrency] = useState<string>('TND');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);

  // Dynamic rows of merchandise
  const [rows, setRows] = useState<MerchandRow[]>([]);
  const [negotiatedDiscounts, setNegotiatedDiscounts] = useState<Map<string, number>>(new Map());

  // Wood lengths dialog state
  const [woodDialogState, setWoodDialogState] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    article: Article | null;
    currentLengths: ListOfLength[];
    availableStockDetails: any[];
  }>({
    isOpen: false,
    rowIndex: null,
    article: null,
    currentLengths: [],
    availableStockDetails: []
  });

  // Article autocomplete dropdown index
  const [activeRowArticleDropdown, setActiveRowArticleDropdown] = useState<number | null>(null);

  // Row deletion confirmation dialog state
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    articleName: string;
  }>({
    isOpen: false,
    rowIndex: null,
    articleName: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [siteStocks, setSiteStocks] = useState<any[]>([]);

  // Rounding / extra discount adjustments
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [manualNetTTC, setManualNetTTC] = useState<string>('');

  // Derived lists for client and transporter autocompletion
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery.trim()) {
      return allCustomers;
    }
    const q = customerSearchQuery.toLowerCase();
    return allCustomers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const firstname = (c.firstname || '').toLowerCase();
      const lastname = (c.lastname || '').toLowerCase();
      const phone = (c.phonenumberone || '').toLowerCase();
      const taxReg = (c.taxregistrationnumber || '').toLowerCase();
      return name.includes(q) || firstname.includes(q) || lastname.includes(q) || phone.includes(q) || taxReg.includes(q);
    });
  }, [allCustomers, customerSearchQuery]);

  const filteredTransportersList = useMemo(() => {
    if (!transporterSearchQuery.trim()) {
      return allTransporters;
    }
    const q = transporterSearchQuery.toLowerCase();
    return allTransporters.filter(t => {
      const name = (t.fullname || '').toLowerCase();
      const car = typeof t.car === 'object' && t.car !== null ? ((t.car as any).serialnumber || '').toLowerCase() : (t.car || '').toLowerCase();
      return name.includes(q) || car.includes(q);
    });
  }, [allTransporters, transporterSearchQuery]);

  // Sync search inputs when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      const fullName = selectedCustomer.name || (selectedCustomer.firstname + ' ' + selectedCustomer.lastname);
      setCustomerSearchQuery(fullName);
    } else {
      setCustomerSearchQuery('');
    }
  }, [selectedCustomer]);

  // Sync search inputs when selected transporter changes
  useEffect(() => {
    if (selectedTransporter) {
      const displayName = selectedTransporter.fullname || '';
      setTransporterSearchQuery(displayName);
    } else {
      setTransporterSearchQuery('');
    }
  }, [selectedTransporter]);

  // Multi-currency exchange rate lookup
  const handleCurrencyChange = async (newCurrency: string | null) => {
    const currency = newCurrency || 'TND';
    setDocCurrency(currency);
    if (currency === 'TND') {
      setExchangeRate(1.0);
    } else {
      try {
        const rate = await exchangeRateService.getExchangeRate(currency, 'TND');
        if (rate) {
          setExchangeRate(parseFloat(rate) || 1.0);
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
        toast.warning('Impossible de récupérer le taux de change.');
      }
    }
  };

  // 4. Fetch stock list for the active sales site
  useEffect(() => {
    if (!activeUserSite) return;
    setIsStockLoading(true);
    stockService.getBySite(activeUserSite)
      .then(res => {
        setSiteStocks(res || []);
      })
      .catch(err => {
        console.error('Error loading stocks for active site:', err);
        toast.error('Erreur lors du chargement du stock du site.');
      })
      .finally(() => setIsStockLoading(false));
  }, [activeUserSite]);

  // 5. Fetch negotiated prices grid when customer selection changes
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setNegotiatedDiscounts(new Map());
      return;
    }

    pricingGridService.getLookup(selectedCustomer.id)
      .then(lookups => {
        const discountMap = new Map<string, number>();
        (lookups || []).forEach((l: any) => {
          discountMap.set(l.merchandiseid.toString(), l.discountrate);
          if (l.articleid) {
            discountMap.set(`article_${l.articleid}`, l.discountrate);
          }
        });
        setNegotiatedDiscounts(discountMap);

        // Apply pricing changes to already configured rows immediately
        setRows(prevRows => 
          prevRows.map(row => applyNegotiatedDiscountToRow(row, discountMap))
        );
      })
      .catch(err => {
        console.error('Error fetching negotiated prices:', err);
      });
  }, [selectedCustomer]);

  // Helper helper function to assign discounts
  const applyNegotiatedDiscountToRow = (
    row: MerchandRow, 
    discountsMap: Map<string, number>
  ): MerchandRow => {
    if (!row.selectedArticle) return row;

    let discountRate = 0;
    const articleIdKey = `article_${row.selectedArticle.id}`;
    
    if (discountsMap.has(articleIdKey)) {
      discountRate = discountsMap.get(articleIdKey) || 0;
      row.isNegotiated = true;
    } else if (row.selectedStock && discountsMap.has(row.selectedStock.merchandiseId.toString())) {
      discountRate = discountsMap.get(row.selectedStock.merchandiseId.toString()) || 0;
      row.isNegotiated = true;
    } else {
      if (row.isNegotiated) {
        row.selldiscountpercentage = 0;
        row.isNegotiated = false;
      }
      return calculateRowCalculations(row);
    }

    row.selldiscountpercentage = discountRate;
    return calculateRowCalculations(row);
  };

  // 6. Recalculate row math values
  const calculateRowCalculations = (row: MerchandRow): MerchandRow => {
    if (row.line_type === LineType.TransportFee) {
      const gross = (row.quantity || 0) * (row.unit_price_ht || 0);
      const discountVal = gross * ((row.selldiscountpercentage || 0) / 100);
      row.sellcostprice_net_ht = parseFloat((gross - discountVal).toFixed(3));
      row.sellcostprice_discountValue = parseFloat(discountVal.toFixed(3));
      
      // Transport lines default to standard 19% TVA
      row.sellcostprice_taxValue = parseFloat((row.sellcostprice_net_ht * 0.19).toFixed(3));
      row.totalWithTax = parseFloat((row.sellcostprice_net_ht * 1.19).toFixed(3));
    } else if (row.selectedArticle) {
      const gross = (row.quantity || 0) * (row.unit_price_ht || 0);
      const discountVal = gross * ((row.selldiscountpercentage || 0) / 100);
      row.sellcostprice_net_ht = parseFloat((gross - discountVal).toFixed(3));
      row.sellcostprice_discountValue = parseFloat(discountVal.toFixed(3));

      // Retrieve VAT rate safely
      let tvaRate = 0;
      const tvaObj = row.selectedArticle.tva;
      if (tvaObj?.value) {
        if (typeof tvaObj.value === 'string') {
          tvaRate = parseFloat(tvaObj.value.replace('%', '').trim());
        } else {
          tvaRate = Number(tvaObj.value);
        }
      }
      
      row.sellcostprice_taxValue = parseFloat((row.sellcostprice_net_ht * (tvaRate / 100)).toFixed(3));
      row.totalWithTax = parseFloat((row.sellcostprice_net_ht * (1 + (tvaRate / 100))).toFixed(3));
    } else {
      row.sellcostprice_net_ht = 0;
      row.sellcostprice_discountValue = 0;
      row.sellcostprice_taxValue = 0;
      row.totalWithTax = 0;
    }
    return row;
  };

  // 7. Dynamic Totals Summary
  const naturalTotals = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc.grossHT += (row.quantity || 0) * (row.unit_price_ht || 0);
      acc.discount += row.sellcostprice_discountValue || 0;
      acc.netHT += row.sellcostprice_net_ht || 0;
      acc.tva += row.sellcostprice_taxValue || 0;
      acc.ttc += row.totalWithTax || 0;
      return acc;
    }, { grossHT: 0, discount: 0, netHT: 0, tva: 0, ttc: 0 });
  }, [rows]);

  // Synchronise final price if rounding adjustment is added
  const finalPayableTTC = useMemo(() => {
    const naturalTTC = parseFloat(naturalTotals.ttc.toFixed(3));
    return parseFloat((naturalTTC - extraDiscount).toFixed(3));
  }, [naturalTotals.ttc, extraDiscount]);

  const finalDiscountValue = useMemo(() => {
    const naturalRemise = parseFloat(naturalTotals.discount.toFixed(3));
    return parseFloat((naturalRemise + extraDiscount).toFixed(3));
  }, [naturalTotals.discount, extraDiscount]);

  // Triggered when user enters manual Net TTC Final value for rounding differences
  const handleFinalPriceChange = (value: string) => {
    setManualNetTTC(value);
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      setExtraDiscount(0);
      return;
    }
    const diff = parseFloat((naturalTotals.ttc - parsed).toFixed(3));
    setExtraDiscount(diff);
  };

  // Sync manual input with automatic totals if no rounding has occurred yet
  useEffect(() => {
    if (!manualNetTTC) {
      setManualNetTTC(naturalTotals.ttc.toFixed(3));
    }
  }, [naturalTotals.ttc]);

  // 8. Dynamic Row additions & changes
  const addMerchandiseRow = () => {
    const newRow: MerchandRow = {
      selectedArticle: null,
      selectedStock: null,
      articleSearchInput: '',
      filteredArticles: allArticles,
      unit_price_ht: 0,
      quantity: 0,
      listLengths: [],
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      line_type: LineType.Merchandise,
      description: '',
      isWoodArticle: false,
      isNegotiated: false
    };
    setRows([...rows, newRow]);
  };

  const addTransportFeeRow = () => {
    const newRow: MerchandRow = {
      selectedArticle: null,
      selectedStock: null,
      articleSearchInput: '',
      filteredArticles: [],
      unit_price_ht: 0,
      quantity: 1,
      listLengths: [],
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      line_type: LineType.TransportFee,
      description: 'Frais de transport',
      isWoodArticle: false,
      isNegotiated: false
    };

    if (selectedTransporter) {
      newRow.transporter_id = selectedTransporter.id;
      newRow.transporter_name = selectedTransporter.fullname;
    }
    
    setRows([...rows, newRow]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleDeleteClick = (index: number) => {
    const row = rows[index];
    const name = row.selectedArticle 
      ? `${row.selectedArticle.reference} - ${row.selectedArticle.description}`
      : row.description || `Ligne ${index + 1}`;
    setDeleteConfirmState({
      isOpen: true,
      rowIndex: index,
      articleName: name
    });
  };

  const confirmDeleteRow = () => {
    if (deleteConfirmState.rowIndex !== null) {
      removeRow(deleteConfirmState.rowIndex);
    }
    setDeleteConfirmState({ isOpen: false, rowIndex: null, articleName: '' });
  };

  const handleRowFieldChange = (index: number, field: keyof MerchandRow, value: any) => {
    setRows(prevRows => {
      const updated = [...prevRows];
      const row = updated[index];
      
      (row as any)[field] = value;

      // Handle specific dependencies when Article changes
      if (field === 'selectedArticle') {
        const article = value as Article | null;
        if (article) {
          row.isWoodArticle = article.iswood;
          row.unit_price_ht = article.sellprice_ht;
          row.description = article.description;
          row.articleSearchInput = `${article.reference} - ${article.description}`;
          row.filteredArticles = allArticles;
          
          // Match matching stocks in our cached state for active site
          const matches = siteStocks.filter(s => s.articleId === article.id);
          row.selectedStock = matches.length === 1 ? matches[0] : null;

          // Apply pre-negotiated discount rates if present
          const rowWithDiscount = applyNegotiatedDiscountToRow(row, negotiatedDiscounts);
          return prevRows.map((r, i) => i === index ? rowWithDiscount : r);
        } else {
          row.isWoodArticle = false;
          row.selectedStock = null;
          row.articleSearchInput = '';
          row.filteredArticles = allArticles;
          row.unit_price_ht = 0;
          row.quantity = 0;
          row.listLengths = [];
          row.isNegotiated = false;
          row.selldiscountpercentage = 0;
        }
      }

      if (field === 'articleSearchInput') {
        const text = value as string;
        if (!text.trim()) {
          row.filteredArticles = allArticles;
        } else {
          const q = text.toLowerCase();
          row.filteredArticles = allArticles.filter(art => {
            const ref = (art.reference || '').toLowerCase();
            const desc = (art.description || '').toLowerCase();
            return ref.includes(q) || desc.includes(q);
          });
        }
      }

      const calculated = calculateRowCalculations(row);
      return prevRows.map((r, i) => i === index ? calculated : r);
    });
  };

  // 9. Autocomplete customer selection
  const handleCustomerSelection = (value: string | null) => {
    if (!value) return;
    const customer = allCustomers.find(c => c.id.toString() === value);
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  // Sync transporter to transport rows when transporter selection manually changes
  const handleTransporterSelection = (value: string | null) => {
    if (!value) return;
    const transporter = allTransporters.find(t => t.id.toString() === value);
    if (transporter) {
      setSelectedTransporter(transporter);
      
      setRows(prevRows => 
        prevRows.map(row => {
          if (row.line_type === LineType.TransportFee) {
            row.transporter_id = transporter.id;
            row.transporter_name = transporter.fullname;
          }
          return row;
        })
      );
    }
  };

  // 10. Wood length Dialog triggers
  const openWoodLengths = (index: number) => {
    const row = rows[index];
    if (!row.selectedArticle) return;

    // Get specific stock details for lengths
    const woodParams = {
      merchandiseRef: row.selectedArticle.reference,
      salesSiteId: activeUserSite?.id || 1,
      merchandiseId: row.selectedStock?.merchandiseId || row.selectedArticle.id || 0
    };

    setIsLoading(true);
    stockService.getWoodStockWithLengthDetails(woodParams)
      .then(details => {
        setWoodDialogState({
          isOpen: true,
          rowIndex: index,
          article: row.selectedArticle,
          currentLengths: row.listLengths || [],
          availableStockDetails: details || []
        });
      })
      .catch(err => {
        console.error('Error fetching length stocks details:', err);
        // Fallback to empty stocks
        setWoodDialogState({
          isOpen: true,
          rowIndex: index,
          article: row.selectedArticle,
          currentLengths: row.listLengths || [],
          availableStockDetails: []
        });
      })
      .finally(() => setIsLoading(false));
  };

  const saveWoodLengths = (lengths: ListOfLength[], totalVolume: number) => {
    const index = woodDialogState.rowIndex;
    if (index === null) return;

    setRows(prevRows => {
      const updated = [...prevRows];
      const row = updated[index];
      row.listLengths = lengths;
      row.quantity = parseFloat(totalVolume.toFixed(3));
      
      const calculated = calculateRowCalculations(row);
      return prevRows.map((r, i) => i === index ? calculated : r);
    });
  };

  // 11. Form Validation & Submission
  const validateForm = () => {
    if (!selectedCustomer) {
      toast.error('Veuillez sélectionner un client.');
      return false;
    }
    if (!selectedTransporter) {
      toast.error('Veuillez sélectionner un transporteur.');
      return false;
    }
    if (rows.length === 0) {
      toast.error('Le document doit contenir au moins une ligne de marchandise.');
      return false;
    }
    
    // Check row-level values
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.line_type === LineType.Merchandise && !row.selectedArticle) {
        toast.error(`La ligne ${i + 1} ne contient aucun article.`);
        return false;
      }
      if (row.quantity <= 0) {
        toast.error(`La quantité de la ligne ${i + 1} doit être supérieure à 0.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      // Map rows structure exactly to C# Merchandise backend model structure
      const merchandisesPayload = rows.map(r => {
        const item: any = {
          id: r.selectedStock?.merchandiseId || 0,
          unit_price_ht: r.unit_price_ht,
          cost_ht: parseFloat(((r.unit_price_ht || 0) * (r.quantity || 0)).toFixed(3)),
          quantity: r.quantity,
          discount_percentage: r.selldiscountpercentage,
          cost_discount_value: r.sellcostprice_discountValue,
          cost_net_ht: r.sellcostprice_net_ht,
          tva_value: r.sellcostprice_taxValue,
          cost_ttc: r.totalWithTax,
          line_type: r.line_type,
          description: r.description || '',
          creationdate: new Date(),
          updatedate: new Date(),
          updatedbyid: parseInt(user?.id || '0'),
          documentid: 0,
          isdeleted: false
        };

        if (r.line_type === LineType.TransportFee) {
          item.transporter_id = r.transporter_id;
          item.article = null;
        } else {
          item.article = r.selectedArticle;
          item.lisoflengths = r.listLengths;
          item.packagereference = r.selectedStock?.packageReference || '';
          item.isinvoicible = r.selectedStock?.isInvoicible ?? true;
          item.allownegativstock = r.selectedStock?.allowNegativeStock ?? false;
          item.ismergedwith = r.selectedStock?.isMergedWith ?? false;
        }
        return item;
      });

      // Construct C# Document DTO payload
      const documentPayload: any = {
        id: 0,
        type: DocumentTypes.customerDeliveryNote, // Bon de Livraison = Type 5
        stocktransactiontype: 1, // Retrieve = Type 1 exit stock
        docnumber: '',
        description: `Bon de Livraison via Portail Élancé`,
        supplierReference: customerReference || '',
        isinvoiced: false,
        merchandises: merchandisesPayload,
        total_ht_net_doc: parseFloat(naturalTotals.netHT.toFixed(3)),
        total_discount_doc: parseFloat(finalDiscountValue.toFixed(3)),
        total_tva_doc: parseFloat(naturalTotals.tva.toFixed(3)),
        total_net_ttc: parseFloat(finalPayableTTC.toFixed(3)),
        withholdingtax: false,
        counterpart: selectedCustomer,
        sales_site: activeUserSite,
        creationdate: new Date(docDate),
        updatedate: new Date(),
        updatedbyid: parseInt(user?.id || '0'),
        isdeleted: false,
        regulationid: 0,
        editing: false,
        docstatus: DocStatus.Created, // Status: Created = Type 3
        isservice: false,
        isPaid: false,
        billingstatus: BillingStatus.NotBilled,
        currency: docCurrency,
        exchangeRate: exchangeRate
      };

      console.log('Sending Document payload to backend:', documentPayload);

      // Execute conversion or creation API call
      let result;
      if (sourceDocumentId > 0) {
        result = await documentService.convert(sourceDocumentId, documentPayload);
      } else {
        result = await documentService.add(documentPayload);
      }

      toast.success('Bon de Livraison créé avec succès !');
      router.push('/sales');
    } catch (err: any) {
      console.error('Error submitting document:', err);
      if (err.response?.status === 409) {
        toast.error('Un document avec la même référence existe déjà.');
      } else {
        toast.error("La création du document a échoué. Veuillez vérifier l'état du stock.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-forest-50 pb-5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 shadow-sm"
              onClick={() => router.push('/sales')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-forest-900 tracking-tight">Nouveau Bon de Livraison</h1>
              <p className="text-sand-400 font-medium text-xs">Portail de création des bons de livraison et suivi logistique.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeUserSite && (
              <Badge className="bg-forest-900/10 hover:bg-forest-900/20 text-forest-800 border border-forest-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Site actif : {activeUserSite.gov} - {activeUserSite.address}
              </Badge>
            )}
          </div>
        </div>

        {/* 1. Main configuration panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-forest-900/5 border-b border-forest-50 p-5">
              <CardTitle className="text-sm font-heading font-bold text-forest-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-forest-600" /> Informations du Document
              </CardTitle>
              <CardDescription className="text-xs text-sand-400">Configurez le client, le transporteur et les données de facturation.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Customer Selector */}
              <div className="space-y-2 relative">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Client *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                  <Input 
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="Sélectionner ou saisir le nom du client..."
                    className="pl-9 pr-8 h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(null);
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
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto z-20 rounded-xl border border-forest-100 bg-white/95 backdrop-blur-md shadow-2xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredCustomersList.map(cust => {
                        const fullName = cust.name || (cust.firstname + ' ' + cust.lastname);
                        return (
                          <button
                            key={cust.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                              selectedCustomer?.id === cust.id 
                                ? "bg-forest-600 text-white" 
                                : "text-forest-900 hover:bg-forest-50"
                            )}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearchQuery(fullName);
                              setIsCustomerDropdownOpen(false);
                              // Auto-select linked transporter
                              const defaultTransp = (cust as any).transporter;
                              if (defaultTransp) {
                                setSelectedTransporter(defaultTransp);
                              }
                            }}
                          >
                            <span>{fullName}</span>
                            <span className={cn(
                              "text-[0.65rem] font-medium",
                              selectedCustomer?.id === cust.id ? "text-forest-200" : "text-sand-400"
                            )}>
                              {cust.phonenumberone || 'Sans tel'}
                            </span>
                          </button>
                        );
                      })}
                      {filteredCustomersList.length === 0 && (
                        <div className="text-center py-4 text-xs text-sand-400 italic">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Transporter Selector */}
              <div className="space-y-2 relative">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Transporteur</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                  <Input 
                    value={transporterSearchQuery}
                    onChange={(e) => {
                      setTransporterSearchQuery(e.target.value);
                      setIsTransporterDropdownOpen(true);
                    }}
                    onFocus={() => setIsTransporterDropdownOpen(true)}
                    placeholder="Sélectionner ou saisir le transporteur..."
                    className="pl-9 pr-8 h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900"
                  />
                  {selectedTransporter && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTransporter(null);
                        setTransporterSearchQuery('');
                        setIsTransporterDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-sand-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isTransporterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsTransporterDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto z-20 rounded-xl border border-forest-100 bg-white/95 backdrop-blur-md shadow-2xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredTransportersList.map(trans => {
                        const fullName = trans.fullname || '';
                        const carDetails = typeof trans.car === 'object' && trans.car !== null ? ((trans.car as any).serialnumber || '') : (trans.car || '');
                        return (
                          <button
                            key={trans.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                              selectedTransporter?.id === trans.id 
                                ? "bg-forest-600 text-white" 
                                : "text-forest-900 hover:bg-forest-50"
                            )}
                            onClick={() => {
                              setSelectedTransporter(trans);
                              setTransporterSearchQuery(fullName);
                              setIsTransporterDropdownOpen(false);
                              
                              // Sync to rows
                              setRows(prevRows => 
                                prevRows.map(row => {
                                  if (row.line_type === LineType.TransportFee) {
                                    row.transporter_id = trans.id;
                                    row.transporter_name = trans.fullname;
                                  }
                                  return row;
                                })
                              );
                            }}
                          >
                            <span>{fullName}</span>
                            {carDetails && (
                              <span className={cn(
                                "text-[0.65rem] font-medium",
                                selectedTransporter?.id === trans.id ? "text-forest-200" : "text-sand-400"
                              )}>
                                {carDetails}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {filteredTransportersList.length === 0 && (
                        <div className="text-center py-4 text-xs text-sand-400 italic">
                          Aucun transporteur trouvé
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Référence Client / Externe</label>
                <Input
                  className="h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900"
                  placeholder="Ex: BC-1234"
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Date du Document *</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                  <Input
                    type="date"
                    className="h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Devise *</label>
                <Select onValueChange={handleCurrencyChange} value={docCurrency}>
                  <SelectTrigger className="h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900">
                    <SelectValue placeholder="TND" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-forest-50 font-bold text-xs">
                    <SelectItem value="TND" className="font-bold text-xs">TND - Dinar Tunisien</SelectItem>
                    <SelectItem value="EUR" className="font-bold text-xs">EUR - Euro</SelectItem>
                    <SelectItem value="USD" className="font-bold text-xs">USD - Dollar US</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Exchange Rate */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block">Taux de change *</label>
                <Input
                  type="number"
                  step="0.000001"
                  className="h-11 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/50 text-xs font-bold text-forest-900"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                  disabled={docCurrency === 'TND'}
                />
              </div>

            </CardContent>
          </Card>

          {/* Quick Stats sidebar info */}
          <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm flex flex-col justify-between">
            <CardHeader className="bg-forest-900/5 border-b border-forest-50 p-5">
              <CardTitle className="text-sm font-heading font-bold text-forest-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-forest-600" /> Détails Partenaire
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 space-y-4 text-xs">
              {selectedCustomer ? (
                <div className="space-y-3 font-medium">
                  <div className="bg-forest-50/50 p-3 rounded-xl border border-forest-100/50 relative group">
                    <button
                      type="button"
                      onClick={() => setIsCustomerFormOpen(true)}
                      className="absolute right-3 top-3 p-1.5 rounded-lg text-forest-600 hover:text-forest-900 hover:bg-forest-100/70 transition-all cursor-pointer"
                      title="Modifier les informations du client"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[0.6rem] font-bold text-sand-400 uppercase tracking-wider block">Nom Client</span>
                    <span className="font-bold text-forest-900 text-sm pr-8">{selectedCustomer.name || (selectedCustomer.firstname + ' ' + selectedCustomer.lastname)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[0.6rem] font-bold text-sand-400 uppercase block">Téléphone</span>
                      <span className="font-bold text-forest-800">{selectedCustomer.phonenumberone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[0.6rem] font-bold text-sand-400 uppercase block">Code Fiscal</span>
                      <span className="font-bold text-forest-800">{selectedCustomer.description || '—'}</span>
                    </div>
                  </div>
                  
                  {/* Transporter Details */}
                  {selectedTransporter && (
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-start gap-3 mt-3 animate-in slide-in-from-top-2 duration-300">
                      <Truck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-wider block">Transporteur</span>
                        <span className="font-bold text-forest-900 text-xs block">
                          {selectedTransporter.fullname || ''}
                        </span>
                        {selectedTransporter.car && (
                          <span className="text-[0.65rem] font-medium text-sand-500 block mt-0.5">
                            Véhicule / Matricule : <span className="font-bold text-forest-800">{typeof selectedTransporter.car === 'object' && selectedTransporter.car !== null ? ((selectedTransporter.car as any).serialnumber || '') : selectedTransporter.car}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-sand-400 italic">
                  Sélectionnez un client pour voir ses informations logistiques et grille tarifaire.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 2. Merchandise lines grid */}
        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-heading font-bold text-forest-900">Lignes du Document</CardTitle>
              <CardDescription className="text-xs text-sand-400 mt-0.5">Saisissez les articles et frais logistiques constituant le bon de livraison.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold"
                onClick={addTransportFeeRow}
              >
                <Truck className="w-4 h-4 mr-2" /> Frais Logistique
              </Button>
              <Button
                className="h-10 rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold shadow-md shadow-forest-600/20"
                onClick={addMerchandiseRow}
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter Ligne
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[1100px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-12 text-center">N°</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-96">Article / Description</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-24 text-right">Prix Unit HT</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-28 text-center">Quantité</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-24 text-center">Remise (%)</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-20 text-center">TVA</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-32 text-right">Total HT Net</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-32 text-right">Total TTC</th>
                    <th className="p-4 font-bold text-sand-400 uppercase tracking-widest w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-sand-400 font-medium italic">
                        Aucune ligne saisie. Cliquez sur "+ Ajouter Ligne" ou "+ Frais Logistique" pour commencer.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const isFee = row.line_type === LineType.TransportFee;
                      let tvaRate = 0;
                      if (isFee) {
                        tvaRate = 19;
                      } else if (row.selectedArticle) {
                        const tvaObj = row.selectedArticle.tva;
                        if (tvaObj?.value) {
                          if (typeof tvaObj.value === 'string') {
                            tvaRate = parseFloat(tvaObj.value.replace('%', '').trim());
                          } else {
                            tvaRate = Number(tvaObj.value);
                          }
                        }
                      }

                      return (
                        <tr key={index} className="group hover:bg-forest-50/20 transition-all duration-200">
                          
                          {/* Row Index */}
                          <td className="p-4 text-center font-bold text-sand-400">
                            {index + 1}
                          </td>

                          {/* Article Selection */}
                          <td className="p-4 min-w-[340px]">
                            {isFee ? (
                              <div className="space-y-1.5">
                                <Input
                                  className="h-10 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/40 font-bold text-forest-900"
                                  value={row.description}
                                  onChange={(e) => handleRowFieldChange(index, 'description', e.target.value)}
                                  placeholder="Désignation logistique..."
                                />
                                {row.transporter_name && (
                                  <span className="text-[0.65rem] font-bold text-forest-600 bg-forest-50 border border-forest-100 rounded-md px-2 py-0.5 inline-block">
                                    Lié à : {row.transporter_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <Popover
                                  open={activeRowArticleDropdown === index}
                                  onOpenChange={(open) => {
                                    if (!open) setActiveRowArticleDropdown(null);
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <div className="relative">
                                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                                      <Input
                                        value={row.articleSearchInput || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          handleRowFieldChange(index, 'articleSearchInput', val);
                                          setActiveRowArticleDropdown(index);
                                        }}
                                        onFocus={() => {
                                          setActiveRowArticleDropdown(index);
                                        }}
                                        placeholder="Rechercher réf. ou désignation..."
                                        className="pl-9 pr-8 h-10 rounded-xl border-forest-50 focus:ring-forest-600 bg-sand-50/40 text-xs font-bold text-forest-900"
                                      />
                                      {(row.selectedArticle || row.articleSearchInput) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleRowFieldChange(index, 'selectedArticle', null);
                                            setActiveRowArticleDropdown(null);
                                          }}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-sand-400 hover:text-red-500 transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align="start"
                                    className="w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto z-50 rounded-xl border border-forest-100 bg-white/95 backdrop-blur-md shadow-2xl p-1.5 space-y-0.5"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                  >
                                    {row.filteredArticles.map(art => {
                                      const isSelected = row.selectedArticle?.id === art.id;
                                      return (
                                        <button
                                          key={art.id}
                                          type="button"
                                          className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                            isSelected
                                              ? "bg-forest-600 text-white"
                                              : "text-forest-900 hover:bg-forest-50"
                                          )}
                                          onClick={() => {
                                            handleRowFieldChange(index, 'selectedArticle', art);
                                            setActiveRowArticleDropdown(null);
                                          }}
                                        >
                                          <Layers className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-white" : "text-forest-500")} />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold truncate">{art.reference}</div>
                                            <div className={cn("text-[0.65rem] truncate", isSelected ? "text-forest-200" : "text-sand-400")}>
                                              {art.description}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                    {row.filteredArticles.length === 0 && (
                                      <div className="text-center py-4 text-xs text-sand-400 italic">
                                        Aucun article trouvé
                                      </div>
                                    )}
                                  </PopoverContent>
                                </Popover>

                                {row.isNegotiated && (
                                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 font-bold text-[0.6rem] px-2 py-0.5 rounded">
                                    Tarif négocié appliqué
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Price Unit HT */}
                          <td className="p-4 max-w-28">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-10 rounded-xl text-right font-bold border-forest-50 focus:ring-forest-600 bg-sand-50/40 text-forest-900 w-24 ml-auto"
                              value={row.unit_price_ht || ''}
                              onChange={(e) => handleRowFieldChange(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                              placeholder="0.000"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="p-4 text-center">
                            {row.isWoodArticle ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="h-10 px-3 flex items-center justify-center font-bold text-forest-900 bg-forest-50 rounded-xl border border-forest-100 min-w-20">
                                  {row.quantity.toFixed(3)} M³
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl border-forest-100 text-forest-600 hover:bg-forest-100"
                                  onClick={() => openWoodLengths(index)}
                                >
                                  <PlusCircle className="w-4 h-4 text-forest-600" />
                                </Button>
                              </div>
                            ) : (
                              <Input
                                type="number"
                                className="h-10 rounded-xl text-center font-bold border-forest-50 focus:ring-forest-600 bg-sand-50/40 text-forest-900 max-w-28 mx-auto"
                                value={row.quantity || ''}
                                onChange={(e) => handleRowFieldChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                              />
                            )}
                          </td>

                          {/* Discount rate % */}
                          <td className="p-4">
                            <div className="relative max-w-20 mx-auto">
                              <Input
                                type="number"
                                className="h-10 rounded-xl text-center font-bold border-forest-50 focus:ring-forest-600 bg-sand-50/40 text-forest-900 pr-5"
                                value={row.selldiscountpercentage || ''}
                                onChange={(e) => handleRowFieldChange(index, 'selldiscountpercentage', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                              />
                              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-300 pointer-events-none" />
                            </div>
                          </td>

                          {/* TVA */}
                          <td className="p-4 text-center">
                            <Badge className="bg-forest-50 text-forest-700 border border-forest-100 font-bold px-2 py-0.5 rounded text-[0.65rem]">
                              {tvaRate}%
                            </Badge>
                          </td>

                          {/* Total net HT */}
                          <td className="p-4 text-right font-bold text-forest-900">
                            {row.sellcostprice_net_ht.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-[0.65rem] text-sand-400 font-normal">TND</span>
                          </td>

                          {/* Total TTC */}
                          <td className="p-4 text-right font-bold text-forest-900">
                            {row.totalWithTax.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-[0.65rem] text-sand-400 font-normal">TND</span>
                          </td>

                          {/* Remove button */}
                          <td className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-sand-400 hover:text-rose-600 hover:bg-rose-50/50"
                              onClick={() => handleDeleteClick(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Summary totals & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Legend and explanation notes */}
          <div className="space-y-4 text-xs text-sand-400 font-medium">
            <div className="bg-sand-50/50 border border-forest-50 p-5 rounded-[24px]">
              <span className="font-bold text-forest-900 flex items-center gap-1.5 mb-2">
                <Info className="w-4 h-4 text-forest-600" /> Instructions d'utilisation
              </span>
              <ul className="list-disc pl-5 space-y-1.5 text-[0.75rem]">
                <li>Les articles de type <b>Bois</b> ne permettent pas la saisie directe de la quantité. Cliquez sur le bouton <PlusCircle className="w-3.5 h-3.5 text-forest-600 inline" /> pour spécifier le nombre de pièces par longueur.</li>
                <li>Si des règles de tarification spécifiques ou des prix d'achats préférentiels existent pour le client, ils seront automatiquement appliqués en tant que <b>Tarifs négociés</b>.</li>
                <li>Les frais de transport default à un taux de 19% de TVA et sont automatiquement associés au transporteur principal.</li>
              </ul>
            </div>
          </div>

          {/* Pricing Summary Card */}
          <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-forest-900/5 border-b border-forest-50 p-5">
              <CardTitle className="text-sm font-heading font-bold text-forest-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-forest-600" /> Synthèse Financière (TND)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="flex items-center justify-between text-xs border-b border-forest-50/50 pb-2.5">
                <span className="text-sand-400 font-bold">Total Brut HT</span>
                <span className="font-bold text-forest-900">{naturalTotals.grossHT.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-forest-50/50 pb-2.5">
                <span className="text-sand-400 font-bold">Total Remise commerciale</span>
                <span className="font-bold text-rose-600">-{finalDiscountValue.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-forest-50/50 pb-2.5">
                <span className="text-sand-400 font-bold">Total TVA (Taxes collectées)</span>
                <span className="font-bold text-forest-900">{naturalTotals.tva.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-forest-50/50 pb-2.5">
                <span className="text-sand-400 font-bold">Total Net TTC calculé</span>
                <span className="font-bold text-forest-900">{naturalTotals.ttc.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND</span>
              </div>

              {/* Editable Grand Total TTC (Rounding differences support) */}
              <div className="bg-forest-900/5 p-4 rounded-xl border border-forest-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <label className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block mb-0.5">Montant TTC Final Payable *</label>
                  <span className="text-xs text-sand-400 font-medium">Saisissez une valeur ajustée pour forcer une remise d'arrondi.</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    className="h-11 rounded-lg text-right font-heading font-bold text-forest-950 border-forest-200 focus:ring-forest-600 bg-white max-w-44 pr-10 text-sm shadow-sm"
                    value={manualNetTTC}
                    onChange={(e) => handleFinalPriceChange(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sand-400 pointer-events-none">TND</span>
                </div>
              </div>

              {extraDiscount !== 0 && (
                <div className="text-right text-[0.65rem] font-bold text-amber-600">
                  Ajustement de rounding appliqué : {extraDiscount > 0 ? `Remise additionnelle de ${extraDiscount.toFixed(3)} TND` : `Majoration additionnelle de ${Math.abs(extraDiscount).toFixed(3)} TND`}
                </div>
              )}

              {/* Actions panel */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-forest-100">
                <Button
                  variant="outline"
                  className="rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold h-11"
                  onClick={() => router.push('/sales')}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  className="rounded-xl bg-forest-600 hover:bg-forest-800 text-white font-bold h-11 px-6 shadow-lg shadow-forest-600/20"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Création en cours...' : 'Enregistrer le Document'}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Wood Lengths Entry Modal Dialog */}
      {woodDialogState.article && (
        <WoodLengthsDialog
          isOpen={woodDialogState.isOpen}
          onClose={() => setWoodDialogState(prev => ({ ...prev, isOpen: false }))}
          article={woodDialogState.article}
          currentLengths={woodDialogState.currentLengths}
          availableStockDetails={woodDialogState.availableStockDetails}
          onSave={saveWoodLengths}
        />
      )}

      {/* Edit Customer Dialog */}
      {selectedCustomer && (
        <CustomerFormDialog
          isOpen={isCustomerFormOpen}
          onClose={() => setIsCustomerFormOpen(false)}
          onSave={handleUpdateCustomer}
          editCustomer={selectedCustomer}
          isLoading={updateCustomer.isPending}
        />
      )}

      {/* Delete Row Confirmation Dialog */}
      <AlertDialog 
        open={deleteConfirmState.isOpen} 
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
        }}
      >
        <AlertDialogContent className="rounded-[24px] border-forest-100 bg-white/95 backdrop-blur-md shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-heading font-bold text-forest-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-sand-500 font-medium mt-2 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer la ligne <span className="font-bold text-forest-800">{deleteConfirmState.articleName}</span> ? Cette action retirera l'article de ce document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold px-4 py-2 text-xs">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRow}
              className="rounded-xl bg-rose-600 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-rose-600/20"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
}

export default function NewSalesDocumentPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-sand-50/50"><div className="text-center font-heading font-bold text-forest-800">Chargement...</div></div>}>
      <NewSalesDocumentPageContent />
    </React.Suspense>
  );
}
