'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSites } from '@/hooks/use-enterprise';
import { useArticles } from '@/hooks/use-articles';
import { useAuthStore } from '@/store/use-auth-store';
import { stockMovementTimelineService } from '@/services/components/stock-movement-timeline.service';
import { stockService } from '@/services/components/stock.service';
import { StockMovementTimeline, StockMovementSummary } from '@/types/stock';
import { Article } from '@/types/article';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Building,
  Layers, 
  Loader2,
  CheckCircle,
  Truck,
  PlusCircle,
  PackageCheck,
  PackageX,
  Shuffle
} from 'lucide-react';
import { toast } from 'sonner';

export function StockTimelinePanel() {
  const { user } = useAuthStore();
  const { data: allSites = [] } = useSites();
  const { data: allArticles = [] } = useArticles();

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Filters State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [usePackageSearch, setUsePackageSearch] = useState<boolean>(false);
  const [packageCode, setPackageCode] = useState<string>('');
  
  // Article autocomplete select state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleSearch, setArticleSearch] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);
  const [siteMerchandises, setSiteMerchandises] = useState<any[]>([]);
  const [selectedMerchandiseId, setSelectedMerchandiseId] = useState<number | null>(null);

  // Date range
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Set default site on load
  useEffect(() => {
    if (allSites.length > 0 && !selectedSiteId) {
      const defaultSiteId = user?.defaultSiteId;
      const defaultSite = allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      setSelectedSiteId(defaultSite.id.toString());
    }
  }, [allSites, user?.defaultSiteId, selectedSiteId]);

  // Load site merchandises when site changes to find the matching merchandise.id
  useEffect(() => {
    const fetchSiteStocks = async () => {
      if (!selectedSiteId) return;
      try {
        const stocks = await stockService.getBySite({ id: parseInt(selectedSiteId) });
        setSiteMerchandises(stocks);
      } catch (err) {
        console.error('Failed to load site stocks:', err);
      }
    };
    fetchSiteStocks();
  }, [selectedSiteId]);

  // Find exact merchandise ID matching selected article
  useEffect(() => {
    if (selectedArticle && siteMerchandises.length > 0) {
      const match = siteMerchandises.find(
        (m: any) => m.merchandise?.article?.id === selectedArticle.id
      );
      if (match) {
        setSelectedMerchandiseId(match.merchandise?.id || null);
      } else {
        setSelectedMerchandiseId(null);
      }
    } else {
      setSelectedMerchandiseId(null);
    }
  }, [selectedArticle, siteMerchandises]);

  const detectedUnit = useMemo(() => {
    if (usePackageSearch) {
      const match = siteMerchandises.find(
        (m: any) => m.merchandise?.packagereference?.toLowerCase() === packageCode.trim().toLowerCase()
      );
      return match?.merchandise?.article?.unit || null;
    } else {
      return selectedArticle?.unit || null;
    }
  }, [usePackageSearch, packageCode, selectedArticle, siteMerchandises]);

  // Filtered articles list for search autocomplete
  const filteredArticles = useMemo(() => {
    if (!articleSearch.trim()) return allArticles;
    const q = articleSearch.toLowerCase();
    return allArticles.filter(art => 
      art.reference.toLowerCase().includes(q) || 
      (art.description || '').toLowerCase().includes(q)
    );
  }, [allArticles, articleSearch]);

  // Active Query parameters for timeline API
  const queryParams = useMemo(() => {
    return {
      siteId: selectedSiteId ? parseInt(selectedSiteId) : null,
      merchandiseId: selectedMerchandiseId,
      packageCode: packageCode.trim(),
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined
    };
  }, [selectedSiteId, selectedMerchandiseId, packageCode, fromDate, toDate]);

  // Fetch timeline data using react-query
  const { data: timelineData = [], isLoading: isLoadingTimeline, refetch } = useQuery<StockMovementTimeline[]>({
    queryKey: ['stock-timeline', queryParams, usePackageSearch],
    queryFn: async () => {
      if (!queryParams.siteId) return [];

      if (usePackageSearch) {
        if (!queryParams.packageCode) return [];
        return stockMovementTimelineService.getTimelineByPackage(
          queryParams.packageCode,
          queryParams.siteId,
          queryParams.from,
          queryParams.to
        );
      } else {
        if (!queryParams.merchandiseId) return [];
        return stockMovementTimelineService.getTimeline(
          queryParams.merchandiseId,
          queryParams.siteId,
          queryParams.from,
          queryParams.to
        );
      }
    },
    enabled: !!queryParams.siteId && (usePackageSearch ? !!queryParams.packageCode : !!queryParams.merchandiseId)
  });

  // Fetch Reconciliation summary
  const { data: summaryData = null, isLoading: isLoadingSummary } = useQuery<StockMovementSummary>({
    queryKey: ['stock-timeline-summary', queryParams.merchandiseId, queryParams.siteId],
    queryFn: () => {
      if (!queryParams.merchandiseId || !queryParams.siteId) return Promise.reject();
      return stockMovementTimelineService.getSummary(queryParams.merchandiseId, queryParams.siteId);
    },
    enabled: !usePackageSearch && !!queryParams.merchandiseId && !!queryParams.siteId
  });

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    setArticleSearch(article.reference);
    setIsArticleDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic parameters Filter card */}
      <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm">
        <CardHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
          <CardTitle className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-widest flex items-center gap-2">
            <History className="h-4 w-4 text-amber-500" /> Options de Traçabilité
          </CardTitle>
          <CardDescription className="text-[10px] text-stone-400 lowercase mt-0.5">
            cibler les mouvements d'un article spécifique, d'un colis ou d'un dépôt logistique.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Site selection */}
          <div className="md:col-span-3 space-y-2">
            <Label htmlFor="timeline-site" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Site / Dépôt *</Label>
            <Select value={selectedSiteId} onValueChange={(val) => setSelectedSiteId(val || '')}>
              <SelectTrigger id="timeline-site" className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Sélectionner le dépôt..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-stone-950 border-stone-250 dark:border-stone-850 rounded-xl">
                {allSites.map((site) => (
                  <SelectItem key={site.id} value={site.id.toString()} className="text-xs font-medium">
                    {site.gov} - {site.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle search type */}
          <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
            <Label htmlFor="search-mode" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider mb-2">Filtre par Colis</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="search-mode"
                checked={usePackageSearch}
                onCheckedChange={(val) => {
                  setUsePackageSearch(val);
                  setSelectedArticle(null);
                  setArticleSearch('');
                  setPackageCode('');
                }}
              />
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                {usePackageSearch ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>

          {/* Main search selector */}
          <div className="md:col-span-4 space-y-2 relative">
            {usePackageSearch ? (
              <>
                <Label htmlFor="package-input" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Référence Colis *</Label>
                <Input
                  id="package-input"
                  value={packageCode}
                  onChange={(e) => setPackageCode(e.target.value)}
                  placeholder="Ex: CO-2026-X01..."
                  className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-mono font-bold"
                />
              </>
            ) : (
              <>
                <Label htmlFor="article-select-input" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Sélection Article *</Label>
                <Input
                  id="article-select-input"
                  value={articleSearch}
                  onChange={(e) => {
                    setArticleSearch(e.target.value);
                    setIsArticleDropdownOpen(true);
                  }}
                  onFocus={() => setIsArticleDropdownOpen(true)}
                  placeholder="Sélectionner ou chercher..."
                  className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold"
                />

                {/* Dropdown panel */}
                {isArticleDropdownOpen && filteredArticles.length > 0 && (
                  <div className="absolute left-0 right-0 top-[72px] mt-1 max-h-52 overflow-y-auto bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 shadow-2xl rounded-xl z-50 divide-y divide-stone-100 dark:divide-stone-900">
                    {filteredArticles.slice(0, 10).map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleArticleSelect(art)}
                        className="w-full text-left p-3 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">{art.reference}</span>
                          <span className="text-[10px] text-stone-400 block truncate max-w-[200px]">{art.description}</span>
                        </div>
                        <Badge className="text-[9px] uppercase bg-stone-100 text-stone-600 dark:bg-stone-905 font-bold">
                          {art.unit}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* From/To Dates */}
          <div className="md:col-span-3 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Intervalle Temporel</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-[10px] font-semibold p-2"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-[10px] font-semibold p-2"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Main Results / Timeline UI */}
      {(!queryParams.siteId || (!usePackageSearch && !selectedArticle) || (usePackageSearch && !packageCode)) ? (
        <div className="py-16 text-center text-stone-400 font-serif italic text-xs border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
          Sélectionnez un dépôt et {usePackageSearch ? 'indiquez un numéro de colis' : 'choisissez un article'} pour consulter le journal des mouvements.
        </div>
      ) : isLoadingTimeline ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="h-7 w-7 animate-spin text-stone-900 dark:text-stone-100" />
        </div>
      ) : timelineData.length === 0 ? (
        <div className="py-16 text-center text-stone-400 font-serif italic text-xs border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
          Aucun mouvement de stock enregistré sur cette période pour ce filtre.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main vertical timeline */}
          <div className="lg:col-span-8 space-y-6 relative pl-6 border-l border-stone-200 dark:border-stone-800 ml-4 py-2">
            
            {timelineData.map((movement, idx) => {
              const isIn = movement.quantityDelta > 0;
              const isTransfer = movement.isTransfer;

              return (
                <div key={movement.id} className="relative group animate-in fade-in slide-in-from-left duration-300">
                  
                  {/* Outer circle status node on vertical line */}
                  <span className={`absolute -left-[35px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center border-2 bg-white dark:bg-stone-950 shadow-sm ${
                    isTransfer 
                      ? 'border-blue-500 text-blue-500' 
                      : isIn 
                        ? 'border-emerald-500 text-emerald-500' 
                        : 'border-rose-500 text-rose-500'
                  }`}>
                    {isTransfer ? (
                      <Shuffle className="h-3 w-3" />
                    ) : isIn ? (
                      <ArrowDownLeft className="h-3 w-3" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3" />
                    )}
                  </span>

                  {/* Card transaction */}
                  <Card className="bg-white dark:bg-stone-900/20 border-stone-200/50 dark:border-stone-850 rounded-xl hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-50 text-xs">
                            {movement.documentRef || 'Sans réf.'}
                          </span>
                          <Badge className={`text-[8px] font-bold uppercase tracking-wider ${
                            isTransfer 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-955' 
                              : isIn 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-955' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-955'
                          }`}>
                            {movement.documentType || (isTransfer ? 'Transfert' : isIn ? 'Entrée' : 'Sortie')}
                          </Badge>
                        </div>
                        
                        <div className="text-[10px] text-stone-400 flex flex-wrap gap-2 items-center leading-normal">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(movement.date).toLocaleString('fr-FR')}</span>
                          <span>•</span>
                          <span>Par: {movement.updatedBy || 'Système'}</span>
                        </div>
                      </div>

                      {/* Quantities delta */}
                      <div className="text-right space-y-0.5">
                        <div className={`font-mono font-bold text-xs ${
                          isTransfer 
                            ? 'text-blue-600' 
                            : isIn 
                              ? 'text-emerald-600' 
                              : 'text-rose-600'
                        }`}>
                          {isIn ? '+' : ''}{formatQuantity(movement.quantityDelta, detectedUnit)}
                        </div>
                        <div className="text-[9px] text-stone-400 font-mono">
                          Stock final: {formatQuantity(movement.quantityAfter, detectedUnit)}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                </div>
              );
            })}

          </div>

          {/* Right Reconciliation panel (Summary stats) */}
          <div className="lg:col-span-4 space-y-6">
            {!usePackageSearch && summaryData && (
              <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm p-5 space-y-5">
                <h3 className="text-xs font-serif font-bold text-stone-850 dark:text-stone-250 uppercase tracking-widest border-b border-stone-200/40 pb-2">
                  Reconciliation Quantité
                </h3>

                <div className="space-y-4">
                  
                  {/* Total Entry */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-stone-450 tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="h-4 w-4 text-emerald-500" /> Cumul Entrées
                    </span>
                    <span className="font-mono font-bold text-stone-850 dark:text-stone-100 text-xs">
                      {formatQuantity(summaryData.totalIn, summaryData.unit)} {summaryData.unit}
                    </span>
                  </div>

                  {/* Total Exit */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-stone-450 tracking-wider flex items-center gap-1.5">
                      <PackageX className="h-4 w-4 text-rose-500" /> Cumul Sorties
                    </span>
                    <span className="font-mono font-bold text-stone-850 dark:text-stone-100 text-xs">
                      {formatQuantity(summaryData.totalOut, summaryData.unit)} {summaryData.unit}
                    </span>
                  </div>

                  {/* Stock Actuel */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50">
                      Balance Active
                    </span>
                    <Badge className="bg-stone-900 text-white dark:bg-stone-50 dark:text-stone-900 font-mono text-xs font-bold px-2 py-0.5">
                      {formatQuantity(summaryData.currentBalance, summaryData.unit)} {summaryData.unit}
                    </Badge>
                  </div>

                </div>

                <div className="text-[9px] text-stone-400 leading-relaxed bg-white dark:bg-stone-950/40 p-3 rounded-lg border border-stone-200/40 dark:border-stone-850">
                  Cette balance cumule l'intégralité des réceptions d'achats, transferts validés et factures de vente émis sur ce dépôt pour ce lot/article.
                </div>
              </Card>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
