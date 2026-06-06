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
import { useAuthStore } from '@/store/use-auth-store';
import { useSites } from '@/hooks/use-enterprise';
import { useArticles } from '@/hooks/use-articles';
import { stockService } from '@/services/components/stock.service';
import { merchandiseService } from '@/services/components/merchandise.service';
import { useCreateInventory } from '@/hooks/use-inventory';
import { Article } from '@/types/article';
import { ListOfLength, Document, DocumentTypes, DocStatus, BillingStatus } from '@/types/document';
import { toast } from 'sonner';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { 
  ArrowLeft, 
  Trash2, 
  TreeDeciduous, 
  Layers, 
  PlusCircle, 
  Check, 
  Boxes,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface StockItem {
  packageReference: string;
  stockQuantity: number;
}

interface InventoryRow {
  id: string;
  selectedArticle: Article | null;
  articleSearchInput: string;
  filteredArticles: Article[];
  packagereference: string;
  quantity: number;
  listLengths: ListOfLength[];
  stock_quantity: number; // Available stock at origin depot
  availableStocks: StockItem[]; 
  isWoodArticle: boolean;
  isArticleDropdownOpen: boolean;
  isGeneratingRef: boolean;
  isCustomPackage: boolean;
}

function NewInventoryContent() {
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

  const { data: allSites = [] } = useSites();
  const { data: allArticles = [] } = useArticles();
  const { mutate: createInventory, isPending: isSaving } = useCreateInventory();

  const [siteId, setSiteId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [rows, setRows] = useState<InventoryRow[]>([]);
  
  // Dialog state
  const [lengthsDialogOpen, setLengthsDialogOpen] = useState<boolean>(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lengthsArticle, setLengthsArticle] = useState<Article | null>(null);
  const [lengthsCurrent, setLengthsCurrent] = useState<ListOfLength[]>([]);

  useEffect(() => {
    if (allSites.length > 0 && !siteId) {
      const defaultSiteId = user?.defaultSiteId;
      const defaultSite = allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      setSiteId(defaultSite.id.toString());
    }
  }, [allSites, user?.defaultSiteId, siteId]);

  const handleSiteChange = (val: string) => {
    if (rows.length > 0 && val !== siteId) {
      if (confirm('Changer de dépôt effacera les articles déjà ajoutés. Confirmer ?')) {
        setSiteId(val);
        setRows([]);
      }
    } else {
      setSiteId(val);
    }
  };

  const addRow = () => {
    const newRow: InventoryRow = {
      id: Math.random().toString(36).substring(2, 9),
      selectedArticle: null,
      articleSearchInput: '',
      filteredArticles: allArticles,
      packagereference: '',
      quantity: 0,
      listLengths: [],
      stock_quantity: 0,
      availableStocks: [],
      isWoodArticle: false,
      isArticleDropdownOpen: false,
      isGeneratingRef: false,
      isCustomPackage: false,
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleArticleSelect = async (rowId: string, article: Article) => {
    const isWood = article.categoryid === 1;

    let availableStocks: StockItem[] = [];
    try {
      if (siteId) {
        const siteStocks = await stockService.getBySite({ id: parseInt(siteId) });
        const matches = siteStocks.filter((s: any) => s.articleId === article.id);
        availableStocks = matches.map((s: any) => ({
          packageReference: s.packageReference || 'Standard',
          stockQuantity: s.stockQuantity || 0
        }));
      }
    } catch (err) {
      console.error('Failed to load stock:', err);
    }

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          const isCustomPackage = availableStocks.length === 0;
          return {
            ...row,
            selectedArticle: article,
            articleSearchInput: article.reference,
            isWoodArticle: isWood,
            availableStocks,
            packagereference: isCustomPackage ? (isWood ? '' : 'Standard') : availableStocks[0]?.packageReference,
            stock_quantity: isCustomPackage ? 0 : availableStocks[0]?.stockQuantity || 0,
            quantity: 0,
            listLengths: [],
            isArticleDropdownOpen: false,
            isCustomPackage,
            isGeneratingRef: false
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

  const handlePackageChange = (rowId: string, val: string | null) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, packagereference: val || '' };
        }
        return row;
      })
    );
  };

  const handleStockQuantityChange = (rowId: string, qty: number) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, stock_quantity: qty };
        }
        return row;
      })
    );
  };

  const handleSetCustomPackage = (rowId: string, isCustom: boolean) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, isCustomPackage: isCustom };
        }
        return row;
      })
    );
  };

  const handleGenerateReference = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row || !row.selectedArticle) return;

    setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, isGeneratingRef: true } : r));
    try {
      const ref = await merchandiseService.getMerchandiseReferenceAsString(row.selectedArticle.id);
      let finalRef = ref;
      
      const parts = ref.split('-');
      if (parts.length >= 3) {
        const baseWithDate = parts.slice(0, -1).join('-');
        let maxIncrement = parseInt(parts[parts.length - 1], 10) || 1;
        
        rows.forEach(r => {
          if (r.packagereference) {
            const cleanPackRef = r.packagereference.replace(/"/g, '').trim();
            const rParts = cleanPackRef.split('-');
            if (rParts.length >= 3) {
              const rBaseWithDate = rParts.slice(0, -1).join('-');
              if (rBaseWithDate === baseWithDate) {
                const rInc = parseInt(rParts[rParts.length - 1], 10);
                if (!isNaN(rInc) && rInc >= maxIncrement) {
                  maxIncrement = rInc + 1;
                }
              }
            }
          }
        });
        finalRef = `${baseWithDate}-${maxIncrement}`;
      }

      setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, packagereference: finalRef, stock_quantity: 0 } : r));
      toast.success(`Référence générée : ${finalRef}`);
    } catch (err) {
      console.error('Error generating reference:', err);
      toast.error('Échec de génération du code colis.');
    } finally {
      setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, isGeneratingRef: false } : r));
    }
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

  const openLengthsModal = (row: InventoryRow) => {
    if (!row.selectedArticle) return;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!siteId || isNaN(parseInt(siteId))) {
      toast.error("Veuillez sélectionner un dépôt.");
      return;
    }

    if (rows.length === 0) {
      toast.error('Veuillez ajouter au moins un article à inventorier.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.selectedArticle) {
        toast.error(`Sélectionnez un article pour la ligne ${i + 1}.`);
        return;
      }
      if (row.quantity === undefined || row.quantity === null || (row.quantity as unknown) === '') {
        toast.error(`Veuillez saisir une quantité pour la ligne ${i + 1}.`);
        return;
      }
      if (row.quantity < 0) {
        toast.error(`La quantité doit être positive pour la ligne ${i + 1}.`);
        return;
      }
      if (row.isWoodArticle && !row.packagereference) {
        toast.error(`La référence colis est requise pour l'article Bois à la ligne ${i + 1}.`);
        return;
      }
    }

    const doc: Partial<Document> = {
      type: DocumentTypes.inventory,
      stocktransactiontype: 0,
      description: notes.trim(),
      sales_site: allSites.find(s => s.id.toString() === siteId),
      updatedbyid: parseInt(user?.id?.toString() || '1'),
      creationdate: new Date(),
      updatedate: new Date(),
      docnumber: '',
      supplierReference: '',
      total_ht_net_doc: 0,
      total_net_ttc: 0,
      total_tva_doc: 0,
      total_discount_doc: 0,
      isinvoiced: false,
      withholdingtax: false,
      isdeleted: false,
      isPaid: false,
      isservice: false,
      docstatus: DocStatus.Created, 
      billingstatus: BillingStatus.NotBilled,
      merchandises: rows.map(r => ({
        article: r.selectedArticle,
        quantity: r.quantity,
        packagereference: r.isWoodArticle ? r.packagereference : 'Standard',
        lisoflengths: r.listLengths,
        unit_price_ht: 0,
        cost_ht: 0,
        discount_percentage: 0,
        cost_discount_value: 0,
        cost_net_ht: 0,
        tva_value: 0,
        cost_ttc: 0,
      })) as any,
    };

    createInventory(doc, {
      onSuccess: () => {
        router.push('/inventory');
      }
    });
  };

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
      <div className="flex items-center justify-between border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/inventory')}
            className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
              Nouvel Inventaire
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5 leading-normal">
              Saisir les quantités physiques constatées au dépôt.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm">
            <CardHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
              <CardTitle className="text-sm font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" /> Paramètres d'Inventaire
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              <div className="space-y-2">
                <Label htmlFor="site" className="text-[10px] uppercase font-bold text-stone-500">Dépôt *</Label>
                <Select value={siteId} onValueChange={(val) => handleSiteChange(val || '')}>
                  <SelectTrigger id="site" className="h-11 bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:ring-corp-blue-500/20 focus:border-corp-blue-500">
                    <SelectValue placeholder="Sélectionner...">
                      {allSites.find(s => s.id.toString() === siteId) 
                        ? `${allSites.find(s => s.id.toString() === siteId)?.gov} - ${allSites.find(s => s.id.toString() === siteId)?.address}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                    {allSites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()} className="text-xs font-medium">
                        {site.gov} - {site.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] uppercase font-bold text-stone-500">Notes d'inventaire</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Responsable comptage, zone spécifique..."
                  className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:ring-corp-blue-500/20 focus:bg-white focus-visible:outline-none focus-visible:border-corp-blue-500 focus-visible:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                />
              </div>

            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-2xl shadow-md p-5 space-y-4">
            <h3 className="text-xs font-serif font-bold text-stone-800 dark:text-stone-200 uppercase tracking-widest">
              Résumé
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Lignes d'inventaire:</span>
                <span className="font-bold text-stone-900 dark:text-stone-50">{totals.items}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Volume Total Bois:</span>
                <span className="font-bold text-amber-600 font-mono">{totals.volume.toFixed(3)} M³</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800 text-stone-500">
                <span>Autres Articles:</span>
                <span className="font-bold text-stone-900 dark:text-stone-50 font-mono">{totals.units.toLocaleString()} PCS</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full h-11 bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-lg font-semibold text-xs uppercase tracking-wider gap-2 shadow-sm transition-all"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer l'Inventaire
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm overflow-visible">
            <CardHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-amber-500" /> Saisie des Comptages
                </CardTitle>
                <CardDescription className="text-[10px] text-stone-400 lowercase mt-0.5">
                  ajoutez les articles comptés et leurs quantités réelles.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                className="h-9 px-3 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg gap-1.5 font-semibold text-[10px] uppercase tracking-wider transition-all"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Ajouter Ligne
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="p-12 text-center text-stone-400 font-serif italic text-xs">
                  Aucune ligne. Cliquez sur "Ajouter Ligne".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                        <th className="p-4 w-[280px]">Article</th>
                        <th className="p-4 w-36">Colis</th>
                        <th className="p-4 w-28 text-right">Stock (Info)</th>
                        <th className="p-4 w-32 text-right">Compté</th>
                        <th className="p-4 w-28 text-center">Spéc.</th>
                        <th className="p-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.id} className="border-b border-stone-100 dark:border-stone-850 hover:bg-stone-50/20">
                          
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
                                    className="h-11 bg-slate-50/50 border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-corp-blue-500 focus:ring-corp-blue-500/20"
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
                                    Aucun article
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </td>

                          <td className="p-3.5">
                            {row.availableStocks.length > 0 && !row.isCustomPackage ? (
                              <div className="flex gap-1 items-center">
                                <Select
                                  value={row.packagereference}
                                  onValueChange={(val) => {
                                    if (val === '__NEW__') {
                                      handleSetCustomPackage(row.id, true);
                                      handlePackageChange(row.id, row.isWoodArticle ? '' : 'Standard');
                                      handleStockQuantityChange(row.id, 0);
                                    } else {
                                      const stock = row.availableStocks.find(s => s.packageReference === val);
                                      handlePackageChange(row.id, val as string);
                                      handleStockQuantityChange(row.id, stock?.stockQuantity || 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[180px] h-11 text-xs bg-slate-50/50 border-slate-200 rounded-lg focus:bg-white focus:border-corp-blue-500 focus:ring-corp-blue-500/20">
                                    <SelectValue placeholder="Choisir un colis" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {row.availableStocks.map(s => (
                                      <SelectItem key={s.packageReference} value={s.packageReference}>
                                        {s.packageReference} (En stock: {s.stockQuantity})
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="__NEW__" className="text-blue-600 font-semibold">
                                      <div className="flex items-center gap-2">
                                        <PlusCircle className="h-3 w-3" /> Nouveau colis...
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <Input
                                  value={row.packagereference}
                                  onChange={(e) => handlePackageChange(row.id, e.target.value)}
                                  placeholder={row.isWoodArticle ? "N° Colis *" : "Standard"}
                                  disabled={!row.selectedArticle}
                                  className={`bg-slate-50/50 font-mono text-xs rounded-lg h-11 w-[120px] focus:bg-white focus:border-corp-blue-500 focus:ring-corp-blue-500/20 ${
                                    row.isWoodArticle && !row.packagereference 
                                      ? 'border-amber-300 focus:border-amber-500 bg-amber-50/20' 
                                      : 'border-slate-200'
                                  }`}
                                />
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => handleGenerateReference(row.id)}
                                  disabled={row.isGeneratingRef || !row.selectedArticle}
                                  title="Générer code colis"
                                >
                                  <RefreshCw className={`h-4 w-4 ${row.isGeneratingRef ? 'animate-spin' : ''}`} />
                                </Button>
                                {row.availableStocks.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 text-stone-500"
                                    onClick={() => {
                                      handleSetCustomPackage(row.id, false);
                                      const defaultStock = row.availableStocks[0];
                                      handlePackageChange(row.id, defaultStock.packageReference);
                                      handleStockQuantityChange(row.id, defaultStock.stockQuantity);
                                    }}
                                    title="Retour à la liste"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-stone-600 dark:text-stone-300 opacity-60">
                            {row.selectedArticle ? (
                              <span>
                                {formatQuantity(row.stock_quantity, row.selectedArticle.unit)}
                                <span className="text-[10px] text-stone-400 font-sans font-medium ml-1">{row.selectedArticle.unit}</span>
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={row.quantity || ''}
                              onChange={(e) => handleQuantityChange(row.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              disabled={!row.selectedArticle || row.isWoodArticle}
                              className="h-11 bg-slate-50/50 text-right font-mono font-bold text-xs border-slate-200 rounded-lg focus:bg-white focus:border-corp-blue-500 focus:ring-corp-blue-500/20"
                            />
                          </td>

                          <td className="p-3.5 text-center">
                            {row.isWoodArticle && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openLengthsModal(row)}
                                className={`h-11 px-3 rounded-lg gap-1.5 font-bold text-[10px] uppercase tracking-wider border-slate-200 shadow-sm transition-all ${
                                  row.listLengths.length > 0 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                <TreeDeciduous className="h-3.5 w-3.5" />
                                {row.listLengths.length > 0 ? `${row.listLengths.length} Long.` : 'Saisir'}
                              </Button>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeRow(row.id)}
                              className="h-8 w-8 p-0 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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

      {/* Wood Lengths Dialog */}
      {lengthsArticle && lengthsDialogOpen && (
        <WoodLengthsDialog
          isOpen={lengthsDialogOpen}
          onClose={() => setLengthsDialogOpen(false)}
          onSave={handleSaveLengths}
          article={lengthsArticle}
          currentLengths={lengthsCurrent}
          availableStockDetails={[]}
          isPurchase={true} // Allows setting stock beyond current DB availability for inventory
        />
      )}
    </div>
  );
}

export default function NewInventoryPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="py-24 flex flex-col justify-center items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Chargement...</span>
        </div>
      }>
        <NewInventoryContent />
      </Suspense>
    </DashboardLayout>
  );
}

