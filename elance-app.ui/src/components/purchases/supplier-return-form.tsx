'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  ArrowLeft,
  Plus,
  Trash2,
  TreeDeciduous,
  Truck,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  X,
  Search,
  RotateCcw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Edit,
  Package,
  Layers as LayersIcon
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useTransporters } from '@/hooks/use-transporters';
import { useArticles } from '@/hooks/use-articles';
import { useSites } from '@/hooks/use-enterprise';
import { useAppVariables } from '@/hooks/use-app-variables';
import { documentService } from '@/services/components/document.service';
import { articleService } from '@/services/components/article.service';
import { stockService } from '@/services/components/stock.service';
import { DocumentTypes, DocStatus, BillingStatus, LineType, ListOfLength } from '@/types/document';
import { Article } from '@/types/article';
import { Supplier } from '@/types/customer';
import { Transporter } from '@/types/settings';
import { toast } from 'sonner';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { WoodBdLengthsDialog } from '@/components/sales/wood-bd-lengths-dialog';
import { GlassSurfaceDialog } from '@/components/shared/glass-surface-dialog';
import { motion } from 'framer-motion';

/**
 * Interface representing a line in the merchandise return grid.
 * Why: mirrors the C# DocumentMerchandise entity contract.
 */
interface ReturnMerchandRow {
  selectedArticle: Article | null;
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
  isGlassArticle?: boolean;
  glassInputs?: { nbpieces: number; height: number; width: number };
  packagereference: string;
  isinvoicible: boolean;
  allownegativstock: boolean;
  tva_percentage: number;
  availableStock?: number;
}

interface SupplierReturnFormProps {
  editDocumentId?: number;
}

export function SupplierReturnForm({ editDocumentId }: SupplierReturnFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasPermission } = usePermissionGuard();

  // Permission verification: require canAdd or canUpdate for purchases
  useEffect(() => {
    const requiredPermission = editDocumentId ? 'canUpdate' : 'canAdd';
    if (!hasPermission('purchases', requiredPermission)) {
      toast.error("Vous n'avez pas la permission d'effectuer cette opération sur les achats.");
      router.replace('/purchases');
    }
  }, [editDocumentId, hasPermission, router]);

  // Source document detection for conversions / credit note creation
  const sourceIdFromParams = parseInt(
    searchParams.get('sourceId') ||
    searchParams.get('fromReceiptId') ||
    searchParams.get('fromInvoiceId') ||
    '0'
  );
  const [sourceDocumentId] = useState<number>(sourceIdFromParams);

  // Core Data Hooks
  const { data: allSuppliers = [], isLoading: isLoadingSuppliers } = useSuppliers();
  const { data: allTransporters = [] } = useTransporters();
  const { data: allArticles = [], isLoading: isLoadingArticles } = useArticles();
  const { data: allSites = [] } = useSites();
  const { data: allTvas = [] } = useAppVariables('Tva');

  // Form State: Entête
  const [selectedSite, setSelectedSite] = useState<any | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierReference, setSupplierReference] = useState<string>('');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [docCurrency, setDocCurrency] = useState<string>('TND');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [editingDocNumber, setEditingDocNumber] = useState<string>('');

  // Rows and Submitting State
  const [rows, setRows] = useState<ReturnMerchandRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [siteStocks, setSiteStocks] = useState<any[]>([]);

  // Dialog State for Wood and Glass articles
  const [woodDialogState, setWoodDialogState] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    article: Article | null;
    currentLengths: ListOfLength[];
  }>({
    isOpen: false,
    rowIndex: null,
    article: null,
    currentLengths: []
  });

  const [woodBdDialogState, setWoodBdDialogState] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    article: Article | null;
    currentLengths: ListOfLength[];
  }>({
    isOpen: false,
    rowIndex: null,
    article: null,
    currentLengths: []
  });

  const [glassDialogState, setGlassDialogState] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    article: Article | null;
    inputs: { nbpieces: number; height: number; width: number };
  }>({
    isOpen: false,
    rowIndex: null,
    article: null,
    inputs: { nbpieces: 1, height: 0, width: 0 }
  });

  // Assign user's default site on initialization
  useEffect(() => {
    if (allSites.length > 0 && !selectedSite) {
      const defaultSiteId = user?.defaultSiteId;
      const defaultSite = allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      setSelectedSite(defaultSite);
    }
  }, [allSites, user?.defaultSiteId, selectedSite]);

  // Load stocks for the selected site to provide live inventory warnings
  useEffect(() => {
    if (!selectedSite?.id) return;
    stockService.getBySite(selectedSite)
      .then(res => {
        setSiteStocks(res || []);
      })
      .catch(err => {
        console.error('Error loading site stocks:', err);
      });
  }, [selectedSite]);

  // Load edit document if editDocumentId provided
  useEffect(() => {
    if (!editDocumentId || editDocumentId <= 0 || allArticles.length === 0) return;
    setIsLoading(true);

    documentService.getById(editDocumentId)
      .then((doc: any) => {
        if (!doc) return;
        setEditingDocNumber(doc.docnumber || '');
        setSupplierReference(doc.supplierReference || '');
        if (doc.creationdate) {
          setDocDate(new Date(doc.creationdate).toISOString().substring(0, 10));
        }
        if (doc.currency) setDocCurrency(doc.currency);
        if (doc.exchangeRate) setExchangeRate(doc.exchangeRate);

        if (doc.counterpart) {
          const matched = allSuppliers.find(s => s.id === doc.counterpart.id);
          setSelectedSupplier(matched || doc.counterpart);
        }

        if (doc.salesSite) {
          setSelectedSite(doc.salesSite);
        }

        if (doc.documentMerchandises && doc.documentMerchandises.length > 0) {
          const mappedRows: ReturnMerchandRow[] = doc.documentMerchandises.map((dm: any) => {
            const m = dm.merchandise || {};
            const art = m.articles || null;
            const isWood = !!art?.iswood;
            const isGlass = art?.unit?.toUpperCase() === 'M2';

            return {
              selectedArticle: art,
              articleSearchInput: art ? `${art.reference} - ${art.description || ''}` : '',
              filteredArticles: allArticles,
              unit_price_ht: dm.unit_price_ht || 0,
              quantity: dm.quantity || 0,
              listLengths: dm.lisoflengths || [],
              selldiscountpercentage: dm.discount_percentage || 0,
              sellcostprice_discountValue: dm.cost_discount_value || 0,
              sellcostprice_net_ht: dm.cost_net_ht || 0,
              sellcostprice_taxValue: dm.tva_value || 0,
              totalWithTax: dm.cost_ttc || 0,
              line_type: dm.line_type || LineType.Merchandise,
              description: dm.description || '',
              isWoodArticle: isWood,
              isGlassArticle: isGlass,
              glassInputs: { nbpieces: 1, height: dm.quantity || 0, width: 1 },
              packagereference: m.packageReference || '',
              isinvoicible: m.isInvoiceable ?? true,
              allownegativstock: m.allowNegativStock ?? false,
              tva_percentage: dm.tva_value > 0 && dm.cost_net_ht > 0
                ? Math.round((dm.tva_value / dm.cost_net_ht) * 100)
                : (art?.tva?.taxpercentage || 19)
            };
          });
          setRows(mappedRows);
        }
      })
      .catch(err => {
        console.error('Failed to load edit return document:', err);
        toast.error('Impossible de charger le document de retour.');
      })
      .finally(() => setIsLoading(false));
  }, [editDocumentId, allArticles, allSuppliers]);

  // Pre-fill from source document (Receipt or Invoice) if navigating from return actions
  useEffect(() => {
    if (!sourceDocumentId || sourceDocumentId <= 0 || allArticles.length === 0 || editDocumentId) return;
    setIsLoading(true);

    documentService.getById(sourceDocumentId)
      .then((doc: any) => {
        if (!doc) return;

        // Pre-fill counterpart
        if (doc.counterPart) {
          const match = allSuppliers.find(s => s.id === doc.counterPart.id);
          setSelectedSupplier(match || doc.counterPart);
        }

        // Pre-fill reference and currency
        setSupplierReference(doc.docNumber ? `Retour s/ ${doc.docNumber}` : '');
        if (doc.salesSite) setSelectedSite(doc.salesSite);
        if (doc.currency) setDocCurrency(doc.currency);
        if (doc.exchangeRate) setExchangeRate(doc.exchangeRate);

        // Map merchandises from the parent document
        const sourceMerchandises = doc.documentMerchandises || [];
        if (sourceMerchandises.length > 0) {
          const initialRows: ReturnMerchandRow[] = sourceMerchandises.map((dm: any) => {
            const m = dm.merchandise || {};
            const art = m.articles || null;
            const isWood = !!art?.iswood;
            const isGlass = art?.unit?.toUpperCase() === 'M2';

            return {
              selectedArticle: art,
              articleSearchInput: art ? `${art.reference} - ${art.description || ''}` : '',
              filteredArticles: allArticles,
              unit_price_ht: dm.unit_price_ht || 0,
              quantity: dm.quantity || 1, // Positive quantity for return
              listLengths: dm.lisoflengths || [],
              selldiscountpercentage: dm.discount_percentage || 0,
              sellcostprice_discountValue: dm.cost_discount_value || 0,
              sellcostprice_net_ht: dm.cost_net_ht || 0,
              sellcostprice_taxValue: dm.tva_value || 0,
              totalWithTax: dm.cost_ttc || 0,
              line_type: dm.line_type || LineType.Merchandise,
              description: dm.description || '',
              isWoodArticle: isWood,
              isGlassArticle: isGlass,
              glassInputs: { nbpieces: 1, height: dm.quantity || 0, width: 1 },
              packagereference: m.packageReference || '',
              isinvoicible: m.isInvoiceable ?? true,
              allownegativstock: m.allowNegativStock ?? false,
              tva_percentage: dm.tva_value > 0 && dm.cost_net_ht > 0
                ? Math.round((dm.tva_value / dm.cost_net_ht) * 100)
                : (art?.tva?.taxpercentage || 19)
            };
          });
          setRows(initialRows);
          toast.info(`Marchandises pré-chargées depuis le document ${doc.docNumber}.`);
        }
      })
      .catch(err => {
        console.error('Error fetching parent document for return:', err);
        toast.error('Impossible de charger le document parent.');
      })
      .finally(() => setIsLoading(false));
  }, [sourceDocumentId, allArticles, allSuppliers, editDocumentId]);

  // Recalculate line totals whenever price, quantity, discount or TVA changes
  const calculateRowTotals = (row: ReturnMerchandRow): ReturnMerchandRow => {
    const rawTotal = row.unit_price_ht * row.quantity;
    const discountVal = (rawTotal * row.selldiscountpercentage) / 100;
    const netHt = rawTotal - discountVal;
    const tvaVal = (netHt * row.tva_percentage) / 100;
    const ttc = netHt + tvaVal;

    return {
      ...row,
      sellcostprice_discountValue: parseFloat(discountVal.toFixed(3)),
      sellcostprice_net_ht: parseFloat(netHt.toFixed(3)),
      sellcostprice_taxValue: parseFloat(tvaVal.toFixed(3)),
      totalWithTax: parseFloat(ttc.toFixed(3))
    };
  };

  // Add a new empty row to the return grid
  const addMerchandiseRow = () => {
    const newRow: ReturnMerchandRow = {
      selectedArticle: null,
      articleSearchInput: '',
      filteredArticles: allArticles,
      unit_price_ht: 0,
      quantity: 1,
      listLengths: [],
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      line_type: LineType.Merchandise,
      description: '',
      isWoodArticle: false,
      isGlassArticle: false,
      packagereference: '',
      isinvoicible: true,
      allownegativstock: false,
      tva_percentage: 19
    };
    setRows(prev => [...prev, newRow]);
  };

  // Remove a row from the grid
  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Handle article selection on a specific row
  const handleSelectArticle = (index: number, article: Article) => {
    const isWood = !!article.iswood;
    const isGlass = article.unit?.toUpperCase() === 'M2';
    const tvaObj = allTvas.find(t => t.id === article.tvaid);
    const tvaRate = tvaObj ? parseFloat(tvaObj.value || '19') : 19;

    setRows(prev => {
      const updated = [...prev];
      const targetRow = {
        ...updated[index],
        selectedArticle: article,
        articleSearchInput: `${article.reference} - ${article.description || ''}`,
        filteredArticles: allArticles,
        isWoodArticle: isWood,
        isGlassArticle: isGlass,
        tva_percentage: tvaRate,
        description: article.description || '',
        packagereference: article.categoryid === 1 ? '' : 'Standard',
        allownegativstock: false,
        unit_price_ht: article.lastpurchaseprice_ttc ? Number(article.lastpurchaseprice_ttc) : 0
      };

      // Match stock for the selected article at this site
      const matchedStock = siteStocks.find(s => s.articleId === article.id);
      if (matchedStock) {
        targetRow.availableStock = matchedStock.stockQuantity;
        targetRow.allownegativstock = !!matchedStock.allowNegativeStock;
      }

      updated[index] = calculateRowTotals(targetRow);
      return updated;
    });
  };

  // Update a field on a specific row
  const updateRowField = (index: number, field: keyof ReturnMerchandRow, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };
      updated[index] = calculateRowTotals(target);
      return updated;
    });
  };

  // Aggregate Document Totals
  const totals = useMemo(() => {
    let rawHT = 0;
    let discount = 0;
    let netHT = 0;
    let tva = 0;
    let ttc = 0;

    rows.forEach(r => {
      rawHT += r.unit_price_ht * r.quantity;
      discount += r.sellcostprice_discountValue;
      netHT += r.sellcostprice_net_ht;
      tva += r.sellcostprice_taxValue;
      ttc += r.totalWithTax;
    });

    return {
      rawHT: parseFloat(rawHT.toFixed(3)),
      discount: parseFloat(discount.toFixed(3)),
      netHT: parseFloat(netHT.toFixed(3)),
      tva: parseFloat(tva.toFixed(3)),
      ttc: parseFloat(ttc.toFixed(3))
    };
  }, [rows]);

  // Form Submission
  const handleSubmit = async () => {
    if (!selectedSupplier) {
      toast.error('Veuillez sélectionner un fournisseur.');
      return;
    }

    if (!selectedSite) {
      toast.error('Veuillez sélectionner un dépôt.');
      return;
    }

    if (rows.length === 0) {
      toast.error('Veuillez ajouter au moins une marchandise à retourner.');
      return;
    }

    // Validate quantities are positive and not zero
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.selectedArticle && !r.description) {
        toast.error(`La ligne ${i + 1} n'a aucun article sélectionné.`);
        return;
      }
      if (r.quantity <= 0) {
        toast.error(`La quantité à la ligne ${i + 1} doit être strictement positive.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Map frontend rows to backend Merchandise DTO structure
      // NOTE: We store positive quantities; documentType controls the inventory direction.
      const merchandisesPayload = rows.map(r => ({
        id: 0,
        unit_price_ht: r.unit_price_ht,
        cost_ht: parseFloat((r.unit_price_ht * r.quantity).toFixed(3)),
        quantity: Math.abs(r.quantity), // Always strictly positive
        discount_percentage: r.selldiscountpercentage,
        cost_discount_value: r.sellcostprice_discountValue,
        cost_net_ht: r.sellcostprice_net_ht,
        tva_value: r.sellcostprice_taxValue,
        cost_ttc: r.totalWithTax,
        line_type: r.line_type,
        description: r.description || '',
        creationdate: new Date(docDate),
        updatedate: new Date(),
        updatedbyid: parseInt(user?.id || '0'),
        documentid: editDocumentId || 0,
        isdeleted: false,
        article: r.selectedArticle,
        lisoflengths: r.listLengths,
        packagereference: r.packagereference.trim() || (r.selectedArticle?.categoryid === 1 ? '' : 'Standard'),
        isinvoicible: r.isinvoicible,
        allownegativstock: r.allownegativstock,
        ismergedwith: false
      }));

      // Construct C# Document DTO payload
      // Type = 12 (supplierMerchandiseReturn)
      // StockTransactionType = 2 (Retrieve / exit stock)
      // isservice = false (ensures inventory deduction)
      const documentPayload: any = {
        id: editDocumentId || 0,
        type: DocumentTypes.supplierMerchandiseReturn,
        stocktransactiontype: 2, // Stock exit
        docnumber: editingDocNumber || '',
        description: `Retour Marchandise Fournisseur via Portail Élancé`,
        supplierReference: supplierReference,
        isinvoiced: false,
        merchandises: merchandisesPayload,
        total_ht_net_doc: totals.netHT,
        total_discount_doc: totals.discount,
        total_tva_doc: totals.tva,
        total_net_ttc: totals.ttc,
        total_net_payable: totals.ttc,
        withholdingtax: false,
        counterpart: selectedSupplier,
        sales_site: selectedSite,
        creationdate: new Date(docDate),
        updatedate: new Date(),
        updatedbyid: parseInt(user?.id || '0'),
        isdeleted: false,
        regulationid: 0,
        editing: false,
        docstatus: DocStatus.Created,
        isservice: false, // Critical: must be false to trigger inventory exit
        isPaid: false,
        billingstatus: BillingStatus.NotBilled,
        currency: docCurrency,
        exchangeRate: exchangeRate
      };

      console.log('Submitting Supplier Return payload:', documentPayload);

      let res;
      if (editDocumentId && editDocumentId > 0) {
        res = await documentService.update(editDocumentId, documentPayload);
        toast.success('Retour fournisseur mis à jour avec succès !');
      } else if (sourceDocumentId > 0) {
        // Link to parent receipt/invoice: creates credit note relationship & updates parent TotalCreditNotes
        res = await documentService.createCreditNote(sourceDocumentId, documentPayload);
        toast.success(`Retour fournisseur créé avec succès (Réf: ${res?.docRef || ''}) !`);
      } else {
        res = await documentService.add(documentPayload);
        toast.success(`Retour fournisseur créé avec succès (Réf: ${res?.docRef || ''}) !`);
      }

      // Invalidate queries so purchases lists and stocks reflect the new document
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['stocks'] });

      router.push('/purchases');
    } catch (err: any) {
      console.error('Error submitting supplier return:', err);
      const msg = err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde du retour fournisseur.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-500">
        {/* Navigation header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-950/10 text-amber-900 rounded-lg">
                  <RotateCcw className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase font-mono">
                  Achats &amp; Retours
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {editDocumentId ? 'Modifier Retour Fournisseur' : 'Nouveau Retour Marchandise Fournisseur'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Déduction automatique des stocks et minoration du solde fournisseur.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/purchases')}
              className="rounded-xl border-slate-200 font-semibold text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs shadow-md shadow-amber-900/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editDocumentId ? 'Mettre à jour' : 'Valider le Retour'}</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Notice Alert */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-start gap-3 text-amber-900">
          <Info className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Mouvement de Stock Sortant &amp; Débit Fournisseur</p>
            <p className="text-amber-800/90 leading-relaxed">
              Ce document enregistre un retour physique de marchandises vers votre fournisseur. Les quantités saisies doivent être positives et sortiront de votre stock sur le dépôt sélectionné. Le solde du compte fournisseur sera automatiquement réduit du montant TTC du retour.
            </p>
          </div>
        </div>

        {/* Card 1: Entête & Paramètres */}
        <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white overflow-visible">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-800" /> Informations Générales
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Fournisseur destinataire, dépôt source et références documentaires.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fournisseur Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700">Fournisseur *</label>
                <div className="relative">
                  <Input
                    placeholder="Sélectionner ou chercher..."
                    value={selectedSupplier ? selectedSupplier.name : supplierSearchQuery}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value);
                      if (selectedSupplier) setSelectedSupplier(null);
                      setIsSupplierDropdownOpen(true);
                    }}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                  {selectedSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplier(null);
                        setSupplierSearchQuery('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isSupplierDropdownOpen && !selectedSupplier && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg divide-y divide-slate-100">
                    {allSuppliers
                      .filter(s => (s.name || '').toLowerCase().includes(supplierSearchQuery.toLowerCase()))
                      .map(sup => (
                        <div
                          key={sup.id}
                          onClick={() => {
                            setSelectedSupplier(sup);
                            setIsSupplierDropdownOpen(false);
                          }}
                          className="p-2.5 text-xs text-slate-700 hover:bg-amber-50/60 cursor-pointer font-medium"
                        >
                          {sup.name}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Dépôt Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Dépôt Source (Stock Sortant) *</label>
                <Select
                  value={selectedSite?.id?.toString()}
                  onValueChange={(val) => {
                    const found = allSites.find(s => s.id.toString() === val);
                    setSelectedSite(found || null);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium">
                    <SelectValue placeholder="Choisir le dépôt" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {allSites.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                        {`${s.gov} - ${s.address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Réf Document / Réf Fournisseur */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Référence / Origine</label>
                <Input
                  placeholder="Ex: Réf BR ou Facture..."
                  value={supplierReference}
                  onChange={(e) => setSupplierReference(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Date du Retour</label>
                <Input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Lignes d'articles à retourner */}
        <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-800" /> Marchandises Retournées
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Articles et colis à restituer au fournisseur (quantités positives).
              </CardDescription>
            </div>

            <Button
              onClick={addMerchandiseRow}
              size="sm"
              className="rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une Ligne
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <th className="p-4 w-10 text-center">#</th>
                    <th className="p-4 min-w-[280px]">Article / Réf</th>
                    <th className="p-4 min-w-[120px]">Colis</th>
                    <th className="p-4 min-w-[100px] text-center">Stock Dépôt</th>
                    <th className="p-4 min-w-[110px] text-right">Prix Unit HT</th>
                    <th className="p-4 min-w-[90px] text-center">Quantité</th>
                    <th className="p-4 min-w-[80px] text-center">Remise %</th>
                    <th className="p-4 min-w-[70px] text-center">TVA %</th>
                    <th className="p-4 min-w-[110px] text-right">Total HT Net</th>
                    <th className="p-4 min-w-[110px] text-right">Total TTC</th>
                    <th className="p-4 w-12 text-center"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-slate-400 italic">
                        Aucune ligne de marchandise saisie. Cliquez sur &quot;Ajouter une Ligne&quot; pour commencer.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const stockAvailable = row.availableStock;
                      const hasStockWarning = stockAvailable !== undefined && stockAvailable < row.quantity && !row.allownegativstock;

                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center font-mono text-slate-400 font-bold">
                            {index + 1}
                          </td>

                          {/* Article Selection */}
                          <td className="p-4">
                            <Select
                              value={row.selectedArticle?.id?.toString()}
                              onValueChange={(val) => {
                                const found = allArticles.find(a => a.id.toString() === val);
                                if (found) handleSelectArticle(index, found);
                              }}
                            >
                              <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs">
                                <SelectValue placeholder="Sélectionner un article..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 max-h-60">
                                {allArticles.map(a => (
                                  <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                                    <span className="font-mono font-bold text-slate-800">{a.reference}</span> - {a.description || ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Longueurs Wood Button */}
                            {row.isWoodArticle && (
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setWoodDialogState({
                                      isOpen: true,
                                      rowIndex: index,
                                      article: row.selectedArticle,
                                      currentLengths: row.listLengths
                                    });
                                  }}
                                  className="h-7 text-[11px] rounded-lg border-amber-300 bg-amber-50/60 text-amber-900 font-bold hover:bg-amber-100"
                                >
                                  <TreeDeciduous className="w-3.5 h-3.5 mr-1" />
                                  Longueurs ({row.listLengths.length})
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* Package Reference */}
                          <td className="p-4">
                            <Input
                              placeholder="Standard ou Réf Colis"
                              value={row.packagereference}
                              onChange={(e) => updateRowField(index, 'packagereference', e.target.value)}
                              className="h-9 rounded-xl border-slate-200 text-xs font-mono"
                            />
                          </td>

                          {/* Live Site Stock Badge */}
                          <td className="p-4 text-center">
                            {stockAvailable !== undefined ? (
                              <Badge
                                className={cn(
                                  'rounded-full font-mono text-[10px] px-2 py-0.5',
                                  hasStockWarning
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {stockAvailable.toFixed(2)}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>

                          {/* Prix Unitaire HT */}
                          <td className="p-4 text-right">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={row.unit_price_ht || ''}
                              onChange={(e) => updateRowField(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                              className="h-9 rounded-xl border-slate-200 text-xs font-mono text-right w-24 ml-auto"
                            />
                          </td>

                          {/* Quantité */}
                          <td className="p-4 text-center">
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.quantity || ''}
                              onChange={(e) => updateRowField(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className={cn(
                                'h-9 rounded-xl text-xs font-mono text-center w-20 mx-auto font-bold',
                                hasStockWarning
                                  ? 'border-rose-400 bg-rose-50/40 text-rose-900'
                                  : 'border-slate-200'
                              )}
                            />
                          </td>

                          {/* Remise % */}
                          <td className="p-4 text-center">
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={row.selldiscountpercentage || ''}
                              onChange={(e) => updateRowField(index, 'selldiscountpercentage', parseFloat(e.target.value) || 0)}
                              className="h-9 rounded-xl border-slate-200 text-xs font-mono text-center w-16 mx-auto"
                            />
                          </td>

                          {/* TVA % */}
                          <td className="p-4 text-center font-mono text-slate-700 font-semibold">
                            {row.tva_percentage}%
                          </td>

                          {/* Total HT Net */}
                          <td className="p-4 text-right font-mono font-bold text-slate-800">
                            {row.sellcostprice_net_ht.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                          </td>

                          {/* Total TTC */}
                          <td className="p-4 text-right font-mono font-bold text-amber-900">
                            {row.totalWithTax.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(index)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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

        {/* Card 3: Récapitulatif Financier */}
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
          <div className="flex-1 p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Note Logistique
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Une fois validé, ce retour sera visible dans le journal des achats sous l&apos;onglet <strong>Retours Fournisseurs</strong>. Le stock sera automatiquement décrémenté et audité dans l&apos;historique des mouvements de stock.
            </p>
          </div>

          <Card className="w-full lg:w-96 rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-3">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Total Brut HT</span>
              <span className="font-mono font-bold text-slate-700">
                {totals.rawHT.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
              </span>
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-xs text-amber-600 font-medium">
                <span>Remise Globale</span>
                <span className="font-mono font-bold">
                  -{totals.discount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Total Net HT</span>
              <span className="font-mono font-bold text-slate-800">
                {totals.netHT.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
              </span>
            </div>

            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Total TVA</span>
              <span className="font-mono font-bold text-slate-700">
                {totals.tva.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-slate-900">Total TTC (Débit)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-extrabold text-amber-900">
                  {totals.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs font-bold text-amber-900/60 font-mono">DT</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Wood Lengths Dialog */}
      {woodDialogState.isOpen && woodDialogState.rowIndex !== null && woodDialogState.article && (
        <WoodLengthsDialog
          isOpen={woodDialogState.isOpen}
          onClose={() => setWoodDialogState(prev => ({ ...prev, isOpen: false }))}
          article={woodDialogState.article}
          currentLengths={woodDialogState.currentLengths}
          availableStockDetails={[]}
          isPurchase={true} // Allow any lengths during returns
          onSave={(updatedLengths, totalPieces) => {
            const idx = woodDialogState.rowIndex!;
            updateRowField(idx, 'listLengths', updatedLengths);
            if (totalPieces > 0) {
              updateRowField(idx, 'quantity', totalPieces);
            }
            setWoodDialogState(prev => ({ ...prev, isOpen: false }));
          }}
        />
      )}
    </DashboardLayout>
  );
}
