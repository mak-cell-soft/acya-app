'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/use-auth-store';
import { useSites } from '@/hooks/use-enterprise';
import { useTransporters } from '@/hooks/use-transporters';
import { useArticles } from '@/hooks/use-articles';
import { stockService } from '@/services/components/stock.service';
import { Article } from '@/types/article';
import { Transporter } from '@/types/settings';
import { ListOfLength } from '@/types/document';
import { toast } from 'sonner';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { StockTransferInfo, StockTransferDetails } from '@/types/stock';
import { 
  ArrowLeft, 
  Trash2, 
  TreeDeciduous, 
  Truck, 
  Calendar,
  Layers, 
  PlusCircle, 
  Check, 
  AlertCircle,
  FileText,
  Boxes,
  Loader2,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Row data type in transfer form
interface TransferRow {
  id: string;
  selectedArticle: Article | null;
  articleSearchInput: string;
  filteredArticles: Article[];
  packagereference: string;
  quantity: number;
  listLengths: ListOfLength[];
  stock_quantity: number; // Available stock at origin depot
  isWoodArticle: boolean;
  allownegativstock: boolean;
  isArticleDropdownOpen: boolean;
  merchandiseId: number; // Store merchandiseId for stock transfer validation
}

function NewStockTransferContent() {
  const router = useRouter();
  const { user } = useAuthStore();

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Core Data Hooks
  const { data: allSites = [], isLoading: isLoadingSites } = useSites();
  const { data: allTransporters = [], isLoading: isLoadingTransporters } = useTransporters();
  const { data: allArticles = [], isLoading: isLoadingArticles } = useArticles();

  // Header state
  const [originSiteId, setOriginSiteId] = useState<string>('');
  const [destinationSiteId, setDestinationSiteId] = useState<string>('');
  const [transporterId, setTransporterId] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState<string>('');
  
  // Grid lines state
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Length dialog state
  const [lengthsDialogOpen, setLengthsDialogOpen] = useState<boolean>(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lengthsArticle, setLengthsArticle] = useState<Article | null>(null);
  const [lengthsCurrent, setLengthsCurrent] = useState<ListOfLength[]>([]);
  const [lengthsStockDetails, setLengthsStockDetails] = useState<any[]>([]);

  // States for printing after successful registration
  const [printTransfer, setPrintTransfer] = useState<StockTransferInfo | null>(null);
  const [printDetails, setPrintDetails] = useState<StockTransferDetails[] | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  // Set default origin site based on user defaultSiteId once sites are loaded
  useEffect(() => {
    if (allSites.length > 0 && !originSiteId) {
      const defaultSiteId = user?.defaultSiteId;
      const defaultSite = allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      setOriginSiteId(defaultSite.id.toString());
    }
  }, [allSites, user?.defaultSiteId, originSiteId]);

  // Handle origin site change: reset lines to avoid stock mismatch
  const handleOriginSiteChange = (val: string) => {
    setOriginSiteId(val);
    setRows([]); // clear existing items since they are site-specific
    toast.info('Dépôt origine modifié. La grille d\'articles a été réinitialisée.');
  };

  // Add a blank merchandise transfer line
  const addRow = () => {
    const newRow: TransferRow = {
      id: Math.random().toString(36).substring(2, 9),
      selectedArticle: null,
      articleSearchInput: '',
      filteredArticles: allArticles,
      packagereference: '',
      quantity: 0,
      listLengths: [],
      stock_quantity: 0,
      isWoodArticle: false,
      allownegativstock: false,
      isArticleDropdownOpen: false,
      merchandiseId: 0,
    };
    setRows([...rows, newRow]);
  };

  // Remove a line
  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  // Article selection change inside a specific row
  const handleArticleSelect = async (rowId: string, article: Article) => {
    const isWood = article.categoryid === 1; // Bois category = 1

    // Fetch active stock balance on origin site if site is selected
    let availableQty = 0;
    let allowNegativeStock = false;
    let merchandiseId = 0;
    try {
      const originSite = allSites.find(s => s.id.toString() === originSiteId);
      if (originSite) {
        // Retrieve stock details for chosen article using site ID
        const siteStocks = await stockService.getBySite({ id: originSite.id });
        // NOTE: Backend StockQuantityDto uses PascalCase by default (.NET serialization).
        // We handle both casings here to be safe against serializer configuration changes.
        const matchingStock = siteStocks.find((s: any) =>
          (s.ArticleId ?? s.articleId) === article.id
        );
        if (matchingStock) {
          availableQty = matchingStock.StockQuantity ?? matchingStock.stockQuantity ?? 0;
          allowNegativeStock = matchingStock.AllowNegativeStock ?? matchingStock.allowNegativeStock ?? false;
          merchandiseId = matchingStock.MerchandiseId ?? matchingStock.merchandiseId ?? 0;
        }
      }
    } catch (err) {
      console.error('Failed to load origin site stock:', err);
    }

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            selectedArticle: article,
            articleSearchInput: article.reference,
            isWoodArticle: isWood,
            allownegativstock: allowNegativeStock,
            stock_quantity: availableQty,
            packagereference: isWood ? '' : 'Standart', // Wood requires package ref. Rule 7 says 'Standart' default if not wood.
            quantity: 0,
            listLengths: [],
            isArticleDropdownOpen: false,
            merchandiseId: merchandiseId
          };
        }
        return row;
      })
    );
  };

  const handleArticleSearchChange = (rowId: string, searchInput: string) => {
    const q = searchInput.toLowerCase();
    const filtered = allArticles.filter(art => 
      art.reference.toLowerCase().includes(q) || 
      (art.description || '').toLowerCase().includes(q)
    );

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            articleSearchInput: searchInput,
            filteredArticles: filtered,
            isArticleDropdownOpen: true
          };
        }
        return row;
      })
    );
  };

  const handlePackageChange = (rowId: string, val: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, packagereference: val };
        }
        return row;
      })
    );
  };

  const handleQuantityChange = (rowId: string, val: number) => {
    const cleanVal = val < 0 ? 0 : val;
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, quantity: cleanVal };
        }
        return row;
      })
    );
  };

  // Open lengths modal dialog
  // NOTE: Asynchronously loads stock remaining pieces per length before displaying the modal
  const openLengthsModal = async (row: TransferRow) => {
    if (!row.selectedArticle) return;
    
    // Find active merchandiseId from origin stock details if available
    let merchandiseId = 0;
    try {
      const originSite = allSites.find(s => s.id.toString() === originSiteId);
      if (originSite) {
        const siteStocks = await stockService.getBySite({ id: originSite.id });
        // NOTE: Handle both PascalCase (.NET default) and camelCase serialization.
        const matchingStock = siteStocks.find((s: any) =>
          (s.ArticleId ?? s.articleId) === row.selectedArticle?.id
        );
        if (matchingStock) {
          merchandiseId = matchingStock.MerchandiseId ?? matchingStock.merchandiseId ?? 0;
        }
      }
    } catch (e) {
      console.error('Error matching merchandise ID for lengths request:', e);
    }

    const woodParams = {
      merchandiseRef: row.selectedArticle.reference,
      salesSiteId: parseInt(originSiteId),
      merchandiseId: merchandiseId
    };

    try {
      // Call service to load detailed lengths from stock
      const details = await stockService.getWoodStockWithLengthDetails(woodParams);
      // Map it to LengthStockDetail layout expected by WoodLengthsDialog
      const mappedDetails = (details || []).map((d: any) => ({
        id: d.id ?? d.Id,
        lengthId: d.lengthId ?? d.LengthId,
        lengthName: d.lengthName ?? d.LengthName,
        remainingPieces: d.remainingPieces ?? d.RemainingPieces
      }));
      setLengthsStockDetails(mappedDetails);
    } catch (err) {
      console.error('Failed to load wood stock details by length:', err);
      setLengthsStockDetails([]);
    }

    setActiveRowId(row.id);
    setLengthsArticle(row.selectedArticle);
    setLengthsCurrent(row.listLengths);
    setLengthsDialogOpen(true);
  };

  const handleSaveLengths = (lengths: ListOfLength[], totalVolume: number) => {
    if (!activeRowId) return;
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === activeRowId) {
          return {
            ...row,
            listLengths: lengths,
            quantity: totalVolume
          };
        }
        return row;
      })
    );
    setActiveRowId(null);
  };

  // Main Submit Validation
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!originSiteId || isNaN(parseInt(originSiteId))) {
      toast.error("Veuillez sélectionner un dépôt d'origine valide.");
      return;
    }
    
    if (!destinationSiteId || isNaN(parseInt(destinationSiteId))) {
      toast.error("Veuillez sélectionner un dépôt de destination valide.");
      return;
    }

    if (originSiteId === destinationSiteId) {
      toast.error("Les dépôts d'origine et de destination ne peuvent pas être identiques.");
      return;
    }

    if (!transporterId || isNaN(parseInt(transporterId))) {
      toast.error("Veuillez sélectionner un transporteur valide.");
      return;
    }

    if (rows.length === 0) {
      toast.error('Veuillez ajouter au moins une ligne d\'article à transférer.');
      return;
    }

    // Validate quantities and stock availability before submitting
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.selectedArticle) {
        toast.error(`Veuillez sélectionner un article pour la ligne ${i + 1}.`);
        return;
      }
      if (row.quantity <= 0) {
        toast.error(`Veuillez spécifier une quantité supérieure à 0 pour la ligne ${i + 1}.`);
        return;
      }

      // Origin stock validation unless negative stock is explicitly allowed
      if (row.quantity > row.stock_quantity && !row.allownegativstock) {
        toast.error(`Quantité demandée (${row.quantity}) supérieure au stock disponible (${row.stock_quantity}) pour la ligne ${i + 1}.`);
        return;
      }

      // Validate merchandiseId presence to avoid backend validation error (id == 0)
      if (!row.merchandiseId || row.merchandiseId === 0) {
        toast.error(`L'article ${row.selectedArticle.reference} n'a pas de stock initial dans ce dépôt (merchandiseId introuvable).`);
        return;
      }

      if (row.isWoodArticle && row.listLengths.length === 0) {
        toast.error(`Veuillez spécifier les longueurs pour l'article Bois à la ligne ${i + 1}.`);
        return;
      }
    }

    setShowConfirmSubmit(true);
  };

  const executeSubmit = async () => {
    setShowConfirmSubmit(false);
    try {
      setLoading(true);

      // Build C# StockTransferDto payload
      const merchandisesItems = rows.map((row) => {
        const item: any = {
          article: row.selectedArticle || { id: 0, reference: '' },
          unit_price_ht: 0,
          cost_ht: 0,
          quantity: row.quantity,
          lisoflengths: row.listLengths || [],
          discount_percentage: 0,
          cost_discount_value: 0,
          cost_net_ht: 0,
          tva_value: 0,
          cost_ttc: 0,

          id: row.merchandiseId || 0,
          packagereference: row.packagereference?.trim() || 'Standart',
          description: row.selectedArticle?.description || `${row.selectedArticle?.reference} - Transfert inter-sites`,
          creationdate: new Date().toISOString(),
          updatedate: new Date().toISOString(),
          updatedbyid: parseInt(user?.id?.toString() || '1'),
          documentid: 0,
          isinvoicible: false,
          allownegativstock: row.allownegativstock || false,
          ismergedwith: false,
          isdeleted: false,
        };

        return item;
      });

      const payload: any = {
        originSiteId: parseInt(originSiteId),
        destinationSiteId: parseInt(destinationSiteId),
        transporterId: parseInt(transporterId),
        merchandisesItems,
        transferDate: new Date(transferDate).toISOString(),
        reference: `TR-${new Date().toISOString().substring(2, 7).replace('-', '')}`,
        notes: notes.trim(),
        updatedById: parseInt(user?.id?.toString() || '1'),
      };

      const result = await stockService.transferStock(payload);
      toast.success(`Le Bon de Sortie ${result.ExitDocumentNumber || ''} a été créé avec succès.`);
      
      // Construct transfer and details for printing
      const transferInfo: StockTransferInfo = {
        // Fallback for casing variations from the C# API response serialization
        id: result.transferId || result.TransferId || result.id || 0,
        docSortie: result.exitDocumentNumber || result.ExitDocumentNumber || '',
        docReception: '',
        originSiteAddress: allSites.find(s => s.id.toString() === originSiteId)?.address || '',
        destinationSiteAddress: allSites.find(s => s.id.toString() === destinationSiteId)?.address || '',
        origine: allSites.find(s => s.id.toString() === originSiteId)?.gov || '',
        destination: allSites.find(s => s.id.toString() === destinationSiteId)?.gov || '',
        transferDate: new Date(transferDate).toISOString(),
        transporter: allTransporters.find(t => t.id.toString() === transporterId)?.fullname || 'Non spécifié',
        status: 1 // Pending
      };
      
      // Inject the confirmationCode to the transfer metadata for immediate display
      (transferInfo as any).confirmationCode = result.confirmationCode || result.ConfirmationCode || '';

      // Populate transferDetails. Maintain dual property mappings (description/articleDescription and refPaquet/packageReference)
      // to satisfy both database-loaded history records and newly created transfer prints.
      const transferDetails: StockTransferDetails[] = rows.map((row, idx) => ({
        id: idx,
        articleReference: row.selectedArticle?.reference || '',
        articleDescription: row.selectedArticle?.description || '',
        description: row.selectedArticle?.description || '',
        packageReference: row.packagereference || 'Standard',
        refPaquet: row.packagereference || 'Standard',
        quantity: row.quantity,
        unit: row.selectedArticle?.unit || 'PCS',
        confirmationCode: result.confirmationCode || result.ConfirmationCode || '',
        exitDocLengths: row.listLengths // Include wood lengths specifications
      } as any));

      setPrintTransfer(transferInfo);
      setPrintDetails(transferDetails);
      setShowPrintDialog(true);
    } catch (err: any) {
      console.error('Stock transfer creation failed:', err);
      toast.error(err.response?.data || 'Erreur lors du traitement du transfert de stock.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintClose = () => {
    setShowPrintDialog(false);
    setPrintTransfer(null);
    setPrintDetails(null);
    router.push('/stock?tab=transfers');
  };

  // Header display summaries
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.items += 1;
        acc.volume += r.isWoodArticle ? r.quantity : 0;
        acc.units += !r.isWoodArticle ? r.quantity : 0;
        return acc;
      },
      { items: 0, volume: 0, units: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and go back link */}
      <div className="flex items-center justify-between border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/stock?tab=transfers')}
            className="h-10 w-10 p-0 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-850"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
              Nouveau Bon de Sortie
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5 leading-normal">
              Initialiser un transfert logistique entre dépôts dépendant du réseau d\'entreprise.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Logistics and Destination Config card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm">
            <CardHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
              <CardTitle className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" /> Paramètres d'Expédition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              {/* Origin Site Selection */}
              <div className="space-y-2">
                <Label htmlFor="origin-site" className="text-[10px] uppercase font-bold text-stone-500">Dépôt Origine *</Label>
                <Select value={originSiteId} onValueChange={(val) => handleOriginSiteChange(val || '')}>
                  <SelectTrigger id="origin-site" className="h-11 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold">
                    {/* // NOTE: Overriding SelectValue children explicitly to display human-readable name instead of numeric ID.
                        // This resolves the classic asynchronous loading glitch in Radix Select where value triggers display the raw ID string
                        // when options are populated post-render. */}
                    <SelectValue placeholder="Sélectionner...">
                      {allSites.find(s => s.id.toString() === originSiteId) 
                        ? `${allSites.find(s => s.id.toString() === originSiteId)?.gov} - ${allSites.find(s => s.id.toString() === originSiteId)?.address}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl">
                    {allSites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()} className="text-xs font-medium">
                        {site.gov} - {site.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination Site Selection */}
              <div className="space-y-2">
                <Label htmlFor="dest-site" className="text-[10px] uppercase font-bold text-stone-500">Dépôt Destination *</Label>
                <Select value={destinationSiteId} onValueChange={(val) => setDestinationSiteId(val || '')}>
                  <SelectTrigger id="dest-site" className="h-11 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold">
                    {/* // NOTE: Using custom child display mapping for destination select to ensure human-friendly labels are rendered immediately. */}
                    <SelectValue placeholder="Sélectionner...">
                      {allSites.find(s => s.id.toString() === destinationSiteId) 
                        ? `${allSites.find(s => s.id.toString() === destinationSiteId)?.gov} - ${allSites.find(s => s.id.toString() === destinationSiteId)?.address}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl">
                    {allSites.map((site) => (
                      <SelectItem 
                        key={site.id} 
                        value={site.id.toString()} 
                        disabled={site.id.toString() === originSiteId}
                        className="text-xs font-medium"
                      >
                        {site.gov} - {site.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {originSiteId && destinationSiteId && originSiteId === destinationSiteId && (
                  <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Les dépôts doivent être distincts.
                  </span>
                )}
              </div>

              {/* Transporter Selection */}
              <div className="space-y-2">
                <Label htmlFor="transporter" className="text-[10px] uppercase font-bold text-stone-500">Transporteur *</Label>
                <Select value={transporterId} onValueChange={(val) => setTransporterId(val || '')}>
                  <SelectTrigger id="transporter" className="h-11 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold">
                    {/* // NOTE: Mapping transporter information dynamically to display name and vehicle serial number without falling back to ID. */}
                    <SelectValue placeholder="Sélectionner...">
                      {(() => {
                        const tr = allTransporters.find(t => t.id.toString() === transporterId);
                        if (!tr) return undefined;
                        const carDetails = tr.car && typeof tr.car === 'object' 
                          ? `${(tr.car as any).brand || ''} ${(tr.car as any).serialnumber || ''}`.trim() 
                          : (tr.car || 'Sans matricule');
                        return `${tr.fullname} (${carDetails})`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl">
                    {allTransporters.map((tr) => (
                      <SelectItem key={tr.id} value={tr.id.toString()} className="text-xs font-medium">
                        {tr.fullname} ({tr.car && typeof tr.car === 'object' ? `${(tr.car as any).brand || ''} ${(tr.car as any).serialnumber || ''}`.trim() : tr.car || 'Sans matricule'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transfer Date */}
              <div className="space-y-2">
                <Label htmlFor="transfer-date" className="text-[10px] uppercase font-bold text-stone-500">Date d'Expédition *</Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="transfer-date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="h-11 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold pl-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] uppercase font-bold text-stone-500">Instructions / Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Notes logistiques (ex: Livraison urgente, chauffeur désigné...)"
                  className="flex min-h-[80px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:ring-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-800 dark:bg-stone-950 dark:ring-offset-stone-950 dark:placeholder:text-stone-400 dark:focus-visible:ring-stone-300"
                />
              </div>

            </CardContent>
          </Card>

          {/* Dynamic Totals Summary card */}
          <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-2xl shadow-md p-5 space-y-4">
            <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-widest">
              Résumé Logistique
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Total Lignes:</span>
                <span className="font-bold text-stone-900 dark:text-stone-50">{totals.items} articles</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Volume Total Bois:</span>
                <span className="font-bold text-amber-600 font-mono">{totals.volume.toFixed(3)} M³</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Quantité Autres Articles:</span>
                <span className="font-bold text-stone-900 dark:text-stone-50 font-mono">{totals.units.toLocaleString()} PCS</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-semibold text-xs uppercase tracking-wider gap-2 shadow-sm transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer le Transfert
            </Button>
          </Card>
        </div>

        {/* Transfer Merchandise Grid items */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm">
            <CardHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-amber-500" /> Articles à Transférer
                </CardTitle>
                <CardDescription className="text-[10px] text-stone-400 lowercase mt-0.5">
                  sélectionnez les paquets ou articles et associez les volumes correspondants.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                className="h-9 px-3 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 rounded-lg gap-1.5 font-semibold text-[10px] uppercase tracking-wider transition-all"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Ajouter Ligne
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="p-12 text-center text-stone-400 italic text-xs">
                  Aucun article. Cliquez sur "Ajouter Ligne" pour ajouter des marchandises à transférer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                        <th className="p-4 w-60">Référence Article</th>
                        <th className="p-4 w-40">Colis / Paquet</th>
                        <th className="p-4 w-28 text-right">Stock Dispo</th>
                        <th className="p-4 w-32 text-right">Quantité</th>
                        <th className="p-4 w-28 text-center">Spéc.</th>
                        <th className="p-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="border-b border-stone-100 dark:border-stone-850 hover:bg-stone-50/20">
                          
                          {/* Article Selection Dropdown */}
                          {/* // NOTE: Replaced standard absolute dropdown with Portal-based Popover to resolve clipping issue.
                              // Since the table wrapper uses overflow-x-auto, any absolute-positioned element inside table cells gets clipped/hidden 
                              // if its height goes beyond the parent card height. Popover renders in a portal at document root, completely bypassing this constraint. */}
                          <td className="p-3.5">
                            <Popover 
                              open={row.isArticleDropdownOpen} 
                              onOpenChange={(open) => {
                                setRows(prev => prev.map(r => r.id === row.id ? { ...r, isArticleDropdownOpen: open } : r));
                              }}
                            >
                              <PopoverTrigger asChild>
                                <div className="relative">
                                  <Input
                                    value={row.articleSearchInput}
                                    onChange={(e) => handleArticleSearchChange(row.id, e.target.value)}
                                    placeholder="Rechercher article..."
                                    className="bg-stone-50/50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 rounded-lg text-xs font-semibold"
                                    onFocus={() => {
                                      setRows(prev => prev.map(r => r.id === row.id ? { ...r, isArticleDropdownOpen: true } : r));
                                    }}
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent 
                                align="start"
                                className="w-[var(--radix-popover-trigger-width)] max-h-52 overflow-y-auto bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 shadow-2xl rounded-xl z-50 p-1.5 divide-y divide-stone-100 dark:divide-stone-900"
                                onOpenAutoFocus={(e) => e.preventDefault()}
                              >
                                {row.filteredArticles.slice(0, 10).map((art) => (
                                  <button
                                    key={art.id}
                                    type="button"
                                    onClick={() => handleArticleSelect(row.id, art)}
                                    className="w-full text-left p-2.5 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors flex items-center justify-between rounded-lg"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100 block truncate">{art.reference}</span>
                                      <span className="text-[10px] text-stone-400 block truncate max-w-[220px]">{art.description}</span>
                                    </div>
                                    <Badge className="text-[9px] uppercase font-bold bg-stone-100 text-stone-650 dark:bg-stone-900 ml-2 shrink-0">
                                      {art.unit}
                                    </Badge>
                                  </button>
                                ))}
                                {row.filteredArticles.length === 0 && (
                                  <div className="p-4 text-center text-[10px] text-stone-400 italic">
                                    Aucun article trouvé
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </td>

                          {/* Package Reference Input */}
                          <td className="p-3.5">
                            <Input
                              value={row.packagereference}
                              onChange={(e) => handlePackageChange(row.id, e.target.value)}
                              placeholder={row.isWoodArticle ? "Colis requis *" : "Standard"}
                              disabled={!row.selectedArticle}
                              className={`bg-stone-50/50 dark:bg-stone-950/40 font-mono text-xs rounded-lg ${
                                row.isWoodArticle && !row.packagereference 
                                  ? 'border-amber-300 focus:border-amber-500 bg-amber-50/20' 
                                  : 'border-stone-200 dark:border-stone-800'
                              }`}
                            />
                          </td>

                          {/* Available Stock Display */}
                          <td className="p-3.5 text-right font-mono font-bold text-stone-600 dark:text-stone-300">
                            {row.selectedArticle ? (
                              <span>
                                {formatQuantity(row.stock_quantity, row.selectedArticle.unit)}
                                <span className="text-[10px] text-stone-400 font-sans font-medium ml-1">{row.selectedArticle.unit}</span>
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* Quantity Input */}
                          <td className="p-3.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={row.quantity || ''}
                              onChange={(e) => handleQuantityChange(row.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              disabled={!row.selectedArticle || row.isWoodArticle} // Wood volume locked, set via lengths modal!
                              className="bg-stone-50/50 dark:bg-stone-950/40 text-right font-mono font-bold text-xs border-stone-200 dark:border-stone-800 rounded-lg"
                            />
                          </td>

                          {/* Specification configuration (Wood only) */}
                          <td className="p-3.5 text-center">
                            {row.isWoodArticle ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openLengthsModal(row)}
                                className="h-8 px-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/40 dark:text-amber-400 dark:bg-amber-955 rounded-lg text-[10px] uppercase font-bold"
                              >
                                <TreeDeciduous className="h-3.5 w-3.5 mr-1" />
                                Longueurs
                              </Button>
                            ) : (
                              <span className="text-[10px] text-stone-400 font-medium">Standard</span>
                            )}
                          </td>

                          {/* Remove button */}
                          <td className="p-3.5 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeRow(row.id)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 text-stone-450 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </form>

      {/* Dynamic Wood Lengths Specification Dialog */}
      {lengthsArticle && (
        <WoodLengthsDialog
          isOpen={lengthsDialogOpen}
          onClose={() => setLengthsDialogOpen(false)}
          article={lengthsArticle}
          currentLengths={lengthsCurrent}
          availableStockDetails={lengthsStockDetails}
          isPurchase={rows.find(r => r.id === activeRowId)?.allownegativstock ?? false}
          onSave={handleSaveLengths}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent className="rounded-[24px] border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 max-w-md p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-full flex items-center justify-center mb-2">
              <Check className="h-8 w-8 stroke-[2.5]" />
            </div>
            
            <AlertDialogTitle className="text-2xl font-bold text-stone-900 dark:text-stone-50">
              Confirmer le Transfert
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-stone-500 dark:text-stone-400 text-[13px] leading-relaxed px-4">
              Vous êtes sur le point d'enregistrer ce bon de transfert. Les stocks du dépôt origine seront décrémentés et le dépôt de destination recevra ces marchandises.
              <br/><br/>
              Confirmez-vous cette opération logistique ?
            </AlertDialogDescription>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 w-full">
            <AlertDialogCancel className="h-12 flex-1 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 m-0">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeSubmit}
              className="h-12 flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-[11px] font-bold uppercase tracking-wider m-0"
            >
              Confirmer et Valider
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Option Dialog */}
      <PrintVariantDialog
        isOpen={showPrintDialog}
        onClose={handlePrintClose}
        transfer={printTransfer}
        transferDetails={printDetails}
        docType="transfer"
      />
    </div>
  );
}

export default function NewStockTransferPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="py-24 flex flex-col justify-center items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-xs uppercase tracking-widest text-stone-400 font-bold">Chargement de la page...</span>
        </div>
      }>
        <NewStockTransferContent />
      </Suspense>
    </DashboardLayout>
  );
}

