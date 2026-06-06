'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSites } from '@/hooks/use-enterprise';
import { useArticles } from '@/hooks/use-articles';
import { useAuthStore } from '@/store/use-auth-store';
import { stockMovementTimelineService } from '@/services/components/stock-movement-timeline.service';
import { stockService } from '@/services/components/stock.service';
import { merchandiseService } from '@/services/components/merchandise.service';
import { StockMovementTimeline, StockMovementSummary, StockMovementReconciliation } from '@/types/stock';
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
  Shuffle,
  AlertTriangle,
  RefreshCw,
  Search,
  Package,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export function StockTimelinePanel() {
  const { user } = useAuthStore();
  const { data: allSites = [] } = useSites();
  const { data: allArticles = [] } = useArticles();

  // Fetch all merchandises to build article package trees
  const { data: allMerchandises = [], isLoading: isLoadingMerchandises } = useQuery<any[]>({
    queryKey: ['all-merchandises'],
    queryFn: () => merchandiseService.getAll(),
    staleTime: 60000 // 1 minute cache
  });

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

  // Selected package option ('standard' | merchandiseId string)
  const [selectedPkgOption, setSelectedPkgOption] = useState<string>('standard');

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

  // Reset package option when article changes
  useEffect(() => {
    setSelectedPkgOption('standard');
  }, [selectedArticle]);

  // Filter merchandises associated with selected article
  const availableMerchandises = useMemo(() => {
    if (!selectedArticle) return [];
    return allMerchandises.filter((m: any) => {
      const artId = m.articleId ?? m.article?.id;
      return artId === selectedArticle.id;
    });
  }, [selectedArticle, allMerchandises]);

  // Resolve standard merchandise record (PackageReference Standard/Standart/empty/null)
  const standardMerchandise = useMemo(() => {
    return availableMerchandises.find((m: any) => {
      const ref = (m.packagereference ?? m.packageReference ?? '').replace(/"/g, '').trim().toLowerCase();
      return !ref || ref === 'standard' || ref === 'standart';
    }) || availableMerchandises.find((m: any) => {
      const ref = (m.packagereference ?? m.packageReference ?? '').replace(/"/g, '').trim();
      return !ref;
    }) || availableMerchandises[0] || null;
  }, [availableMerchandises]);

  // Resolve specific packages
  const packageMerchandises = useMemo(() => {
    return availableMerchandises.filter((m: any) => {
      const ref = (m.packagereference ?? m.packageReference ?? '').replace(/"/g, '').trim().toLowerCase();
      return ref && ref !== 'standard' && ref !== 'standart';
    });
  }, [availableMerchandises]);

  // Active merchandise ID to query
  const activeMerchandiseId = useMemo(() => {
    if (!selectedArticle) return null;
    if (selectedPkgOption === 'standard') {
      return standardMerchandise?.id || null;
    }
    return parseInt(selectedPkgOption) || null;
  }, [selectedArticle, selectedPkgOption, standardMerchandise]);

  const detectedUnit = useMemo(() => {
    if (usePackageSearch) {
      const searchVal = packageCode.replace(/"/g, '').trim().toLowerCase();
      const match = allMerchandises.find(
        (m: any) => (m.packagereference ?? m.packageReference ?? '').replace(/"/g, '').trim().toLowerCase() === searchVal
      );
      return match?.article?.unit ?? match?.articles?.unit ?? null;
    } else {
      return selectedArticle?.unit || null;
    }
  }, [usePackageSearch, packageCode, selectedArticle, allMerchandises]);

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
      merchandiseId: activeMerchandiseId,
      packageCode: packageCode.replace(/"/g, '').trim(),
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined
    };
  }, [selectedSiteId, activeMerchandiseId, packageCode, fromDate, toDate]);

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

  // Fetch Reconciliation status
  const { data: reconciliationData = null, isLoading: isLoadingReconciliation, refetch: refetchReconciliation } = useQuery<StockMovementReconciliation>({
    queryKey: ['stock-timeline-reconciliation', queryParams.merchandiseId, queryParams.siteId],
    queryFn: () => {
      if (!queryParams.merchandiseId || !queryParams.siteId) return Promise.reject();
      return stockMovementTimelineService.reconcile(queryParams.merchandiseId, queryParams.siteId);
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
      
      {/* Autocomplete Click-outside Backdrop */}
      {isArticleDropdownOpen && (
        <div 
          className="fixed inset-0 z-40 cursor-default" 
          onClick={() => setIsArticleDropdownOpen(false)} 
        />
      )}

      {/* Dynamic parameters Filter card */}
      <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm relative z-50">
        <CardHeader className="border-b border-stone-200/45 dark:border-stone-800/45 pb-4">
          <CardTitle className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-widest flex items-center gap-2">
            <History className="h-4 w-4 text-amber-500" /> Options de Traçabilité
          </CardTitle>
          <CardDescription className="text-[10px] text-stone-400 lowercase mt-0.5">
            cibler les mouvements d'un article spécifique, d'un colis ou d'un dépôt logistique.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          
          {/* Row 1 Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Site selection */}
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="timeline-site" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Site / Dépôt *</Label>
              <Select value={selectedSiteId} onValueChange={(val) => setSelectedSiteId(val || '')}>
                <SelectTrigger id="timeline-site" className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold">
                  {/* // NOTE: Overriding SelectValue children explicitly to display human-readable name instead of numeric ID.
                      // This resolves the classic asynchronous loading glitch in Radix Select where value triggers display the raw ID string
                      // when options are populated post-render. */}
                  <SelectValue placeholder="Sélectionner le dépôt...">
                    {allSites.find(s => s.id.toString() === selectedSiteId)
                      ? `${allSites.find(s => s.id.toString() === selectedSiteId)?.gov} - ${allSites.find(s => s.id.toString() === selectedSiteId)?.address}`
                      : undefined}
                  </SelectValue>
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
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="search-mode" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Recherche par Colis</Label>
              {/* // NOTE: Wrapping the Switch in a bordered container with background and padding
                  // to mimic standard input controls (like selects and text inputs) for layout symmetry.
                  // Hover effects and smooth transitions enhance the visual feedback. */}
              <div className="flex items-center space-x-3 h-10 px-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-xl shadow-sm hover:border-stone-300 dark:hover:border-stone-750 transition-all duration-200">
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
                {/* // NOTE: Using standard HTML Label linked to the Switch ID so the entire empty area 
                    // within the custom container is clickable, improving tactile usability.
                    // Text is uppercase to align with the premium form-design requirements. */}
                <Label
                  htmlFor="search-mode"
                  className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 select-none cursor-pointer flex-1 h-full flex items-center"
                >
                  {usePackageSearch ? 'RECHERCHE COLIS ACTIVE' : 'FILTRE PAR ARTICLE'}
                </Label>
              </div>
            </div>

            {/* Main search selector */}
            <div className="md:col-span-6 space-y-2 relative z-50">
              {usePackageSearch ? (
                <>
                  <Label htmlFor="package-input" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Référence Colis *</Label>
                  <div className="relative">
                    <Input
                      id="package-input"
                      value={packageCode}
                      onChange={(e) => setPackageCode(e.target.value)}
                      placeholder="Ex: CO-2026-X01 ou standard..."
                      className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-mono font-bold pr-10"
                    />
                    <Search className="absolute right-3 top-3 h-4 w-4 text-stone-400" />
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="article-select-input" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Sélection Article *</Label>
                  <div className="relative">
                    <Input
                      id="article-select-input"
                      value={articleSearch}
                      onChange={(e) => {
                        setArticleSearch(e.target.value);
                        setIsArticleDropdownOpen(true);
                      }}
                      onFocus={() => setIsArticleDropdownOpen(true)}
                      placeholder="Taper la référence de l'article..."
                      className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold pr-10"
                    />
                    <Search className="absolute right-3 top-3 h-4 w-4 text-stone-400" />
                  </div>

                  {/* Dropdown panel */}
                  {isArticleDropdownOpen && filteredArticles.length > 0 && (
                    <div className="absolute left-0 right-0 top-[72px] mt-1 max-h-52 overflow-y-auto bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 shadow-2xl rounded-xl z-[999] divide-y divide-stone-100 dark:divide-stone-900">
                      {filteredArticles.slice(0, 10).map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => handleArticleSelect(art)}
                          className="w-full text-left p-3 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">{art.reference}</span>
                            <span className="text-[10px] text-stone-400 block truncate max-w-[300px]">{art.description}</span>
                          </div>
                          <Badge className="text-[9px] uppercase bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 font-bold">
                            {art.unit}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Row 2 Filters (Dynamic Package selector and dates) */}
          {(!usePackageSearch && selectedArticle) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-stone-200/40 dark:border-stone-800/40 animate-in slide-in-from-top-2 duration-200">
              
              {/* Package reference selection */}
              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="package-select" className="text-[10px] uppercase font-bold text-stone-450 tracking-wider flex items-center gap-1">
                  <Package className="h-3 w-3 text-amber-500" /> Lot ou Package Référence
                </Label>
                <Select value={selectedPkgOption} onValueChange={(val) => setSelectedPkgOption(val || 'standard')}>
                  <SelectTrigger id="package-select" className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold">
                    {/* // NOTE: Overriding SelectValue children explicitly to display human-readable package reference/name instead of numeric ID.
                        // This resolves the classic asynchronous loading glitch in Radix Select where value triggers display the raw ID string
                        // when options are populated post-render. */}
                    <SelectValue placeholder="Standard (Article global)">
                      {selectedPkgOption === 'standard' ? 'Standard / Vrac' : (() => {
                        const m = packageMerchandises.find((m: any) => m.id.toString() === selectedPkgOption);
                        return m ? `Colis: ${(m.packagereference ?? m.packageReference ?? '').replace(/"/g, '')}` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-950 border-stone-250 dark:border-stone-850 rounded-xl">
                    <SelectItem value="standard" className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Standard / Vrac
                    </SelectItem>
                    {packageMerchandises.map((m: any) => (
                      <SelectItem key={m.id} value={m.id.toString()} className="text-xs font-mono font-medium">
                        Colis: {(m.packagereference ?? m.packageReference ?? '').replace(/"/g, '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="md:col-span-8 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Intervalle de dates</Label>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Fallback Dates if not using article search */}
          {usePackageSearch && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-stone-200/40 dark:border-stone-800/40">
              <div className="md:col-span-12 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Intervalle de dates</Label>
                <div className="flex gap-4">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-medium"
                  />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Main Results / Timeline UI */}
      {(!queryParams.siteId || (!usePackageSearch && !selectedArticle) || (usePackageSearch && !packageCode)) ? (
        <div className="py-20 text-center text-stone-450 dark:text-stone-500 font-serif italic text-xs border-2 border-dashed border-stone-200/60 dark:border-stone-800/60 rounded-2xl bg-stone-50/20 dark:bg-stone-950/10 flex flex-col items-center justify-center space-y-3">
          <Info className="h-8 w-8 text-stone-300 dark:text-stone-700 animate-pulse" />
          <span>Sélectionnez un dépôt et {usePackageSearch ? 'indiquez une référence de colis' : 'choisissez un article'} pour retracez le journal des mouvements de stock.</span>
        </div>
      ) : isLoadingTimeline ? (
        <div className="py-24 flex flex-col justify-center items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-stone-450">Chargement de la chronologie...</span>
        </div>
      ) : timelineData.length === 0 ? (
        <div className="py-20 text-center text-stone-450 dark:text-stone-500 font-serif italic text-xs border-2 border-dashed border-stone-200/60 dark:border-stone-800/60 rounded-2xl bg-stone-50/20 dark:bg-stone-950/10 flex flex-col items-center justify-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <span>Aucun mouvement de stock enregistré sur cette période pour ce lot ou article.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">
          
          {/* Main vertical timeline */}
          <div className="lg:col-span-8 space-y-8 relative pl-8 border-l-2 border-stone-200/80 dark:border-stone-800/80 ml-4 py-2">
            
            {timelineData.map((movement, idx) => {
              const isIn = movement.quantityDelta > 0;
              const isTransfer = movement.isTransfer;

              return (
                <div key={idx} className="relative group animate-in fade-in slide-in-from-left duration-300">
                  
                  {/* Outer circle status node on vertical line */}
                  <span className={`absolute -left-[49px] top-2 h-8 w-8 rounded-full flex items-center justify-center border-2 bg-white dark:bg-stone-950 shadow-md transition-all group-hover:scale-110 ${
                    isTransfer 
                      ? 'border-blue-500 text-blue-500' 
                      : isIn 
                        ? 'border-emerald-500 text-emerald-500' 
                        : 'border-rose-500 text-rose-500'
                  }`}>
                    {isTransfer ? (
                      <Shuffle className="h-3.5 w-3.5" />
                    ) : isIn ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </span>

                  {/* Card transaction */}
                  <Card className="bg-white dark:bg-stone-900/30 border-stone-200/60 dark:border-stone-850 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-50 text-xs">
                            {movement.documentNumber || 'Sans Référence'}
                          </span>
                          <Badge className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isTransfer 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-955' 
                              : isIn 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-955' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-955'
                          }`}>
                            {movement.documentType || (isTransfer ? 'Transfert' : isIn ? 'Entrée' : 'Sortie')}
                          </Badge>
                          {movement.packageNumber && (
                            <Badge className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 rounded-md">
                              Colis: {movement.packageNumber.replace(/"/g, '')}
                            </Badge>
                          )}
                        </div>

                        {movement.description && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-normal">
                            {movement.description}
                          </p>
                        )}
                        
                        <div className="text-[10px] text-stone-400 flex flex-wrap gap-x-3 gap-y-1 items-center leading-normal">
                          <span className="flex items-center gap-1 font-medium"><Calendar className="h-3.5 w-3.5 text-stone-350" /> {new Date(movement.date).toLocaleString('fr-FR')}</span>
                          {isTransfer && movement.counterpartSiteName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                <Truck className="h-3.5 w-3.5" /> Dépôt Partenaire: {movement.counterpartSiteName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantities delta */}
                      <div className="text-left md:text-right space-y-1 md:pl-4 border-t md:border-t-0 md:border-l border-stone-150 dark:border-stone-800 pt-3 md:pt-0 min-w-[120px]">
                        <div className={`font-mono font-bold text-sm ${
                          isTransfer 
                            ? 'text-blue-600' 
                            : isIn 
                              ? 'text-emerald-600' 
                              : 'text-rose-600'
                        }`}>
                          {isIn ? '+' : ''}{formatQuantity(movement.quantityDelta, detectedUnit)}
                        </div>
                        <div className="text-[9px] text-stone-450 dark:text-stone-400 font-mono">
                          Stock après: {formatQuantity(movement.quantityAfter, detectedUnit)} {detectedUnit}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                </div>
              );
            })}

          </div>

          {/* Right Reconciliation panel (Summary stats) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4">
            
            {/* Main Stock Summary Card */}
            {summaryData && (
              <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-stone-200/45 dark:border-stone-800/45 pb-3">
                  <h3 className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-500" /> Synthèse Flux
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-stone-400">
                    {usePackageSearch ? 'Colis' : selectedPkgOption === 'standard' ? 'Standard' : 'Spécifique'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Total Entry */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-stone-450 tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="h-4 w-4 text-emerald-500" /> Total Entrées
                    </span>
                    <span className="font-mono font-bold text-stone-850 dark:text-stone-100 text-xs">
                      {formatQuantity(summaryData.totalIn, summaryData.unit)} {summaryData.unit}
                    </span>
                  </div>

                  {/* Total Exit */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-stone-450 tracking-wider flex items-center gap-1.5">
                      <PackageX className="h-4 w-4 text-rose-500" /> Total Sorties
                    </span>
                    <span className="font-mono font-bold text-stone-850 dark:text-stone-100 text-xs">
                      {formatQuantity(summaryData.totalOut, summaryData.unit)} {summaryData.unit}
                    </span>
                  </div>

                  {/* Live DB Current Stock */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-1">
                      Balance en Stock
                    </span>
                    <Badge className="bg-stone-900 text-white dark:bg-stone-50 dark:text-stone-900 font-mono text-xs font-bold px-3 py-1 rounded-lg">
                      {formatQuantity(summaryData.currentStock, summaryData.unit)} {summaryData.unit}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* Reconciliation Audit Panel */}
            {!usePackageSearch && reconciliationData && (
              <Card className="bg-stone-50/50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200/45 dark:border-stone-800/45 pb-3">
                  <h3 className="text-xs font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500" /> Audit de Cohérence
                  </h3>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 text-stone-450 hover:text-stone-900 dark:hover:text-stone-50"
                    onClick={() => {
                      refetchReconciliation();
                      refetch();
                    }}
                    disabled={isLoadingReconciliation}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingReconciliation ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Calculé (Timeline) :</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {formatQuantity(reconciliationData.computedQuantity, detectedUnit)} {detectedUnit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Réel (Base de données) :</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {formatQuantity(reconciliationData.stockQuantity, detectedUnit)} {detectedUnit}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center">
                    {reconciliationData.isReconciled ? (
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs px-4 py-2 rounded-xl border border-emerald-250 dark:border-emerald-900 w-full justify-center font-bold">
                        <CheckCircle className="h-4 w-4" />
                        <span>VERIFICATION OK (COHÉRENCE)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-955 text-rose-700 dark:text-rose-300 text-xs px-4 py-2 rounded-xl border border-rose-250 dark:border-rose-900 w-full justify-center font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        <span>ÉCART DÉTECTÉ : {formatQuantity(Math.abs(reconciliationData.computedQuantity - reconciliationData.stockQuantity), detectedUnit)} {detectedUnit}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[9px] text-stone-400 leading-relaxed bg-white dark:bg-stone-950/40 p-3 rounded-xl border border-stone-200/40 dark:border-stone-850">
                  L'audit compare le stock final calculé par cumul séquentiel des mouvements avec le stock enregistré en temps réel.
                </p>
              </Card>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

