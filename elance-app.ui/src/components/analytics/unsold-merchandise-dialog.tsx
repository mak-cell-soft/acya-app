'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  FileSpreadsheet,
  Info,
  PackageX,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/shared/table-pagination';
import { useUnsoldMerchandise } from '@/hooks/use-analytics-kpis';
import { useSites } from '@/hooks/use-enterprise';
import { useCategories } from '@/hooks/use-categories';
import { analyticsService } from '@/services/components/analytics.service';
import {
  UnsoldMerchandiseInactivityPeriod,
  UnsoldMerchandiseInactivityType,
  UnsoldMerchandiseItemDto,
  UnsoldMerchandiseParams,
  UnsoldMerchandiseSortBy,
  UnsoldMerchandiseValuationSource,
} from '@/types/analytics';
import { cn } from '@/lib/utils';

interface UnsoldMerchandiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMonths: UnsoldMerchandiseInactivityPeriod;
  initialSiteId?: number;
  initialOnlyWithStock: boolean;
  initialExcludeNewArticles: boolean;
}

const formatDT = (value: number): string =>
  new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
    .format(value || 0)
    .replace('TND', 'DT');

const formatQty = (qty: number, isWood: boolean, unit: string): string => {
  const isM3 = isWood || unit.toUpperCase() === 'M3';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: isM3 ? 3 : 0,
    maximumFractionDigits: 3,
  }).format(qty || 0);
};

const formatDateFr = (iso: string | null): string => {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getValuationSourceLabel = (source: UnsoldMerchandiseValuationSource): string => {
  switch (source) {
    case 'LastPurchaseDoc':
      return 'Dernier achat (BR/FF)';
    case 'ArticleLastPurchasePrice':
      return 'Prix achat TTC → HT';
    default:
      return 'Coût manquant';
  }
};

const sanitizeCsvCell = (raw: string | number | boolean | null | undefined): string => {
  const str = String(raw ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function UnsoldMerchandiseDialog({
  open,
  onOpenChange,
  initialMonths,
  initialSiteId,
  initialOnlyWithStock,
  initialExcludeNewArticles,
}: UnsoldMerchandiseDialogProps) {
  const [months, setMonths] = useState<UnsoldMerchandiseInactivityPeriod>(initialMonths);
  const [siteId, setSiteId] = useState<number | undefined>(initialSiteId);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [subCategoryId, setSubCategoryId] = useState<number | undefined>(undefined);
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(initialOnlyWithStock);
  const [excludeNewArticles, setExcludeNewArticles] = useState<boolean>(initialExcludeNewArticles);
  const [inactivityType, setInactivityType] = useState<UnsoldMerchandiseInactivityType | undefined>(undefined);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<UnsoldMerchandiseSortBy>('stockValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: sites } = useSites({ enabled: open });
  const { data: categories } = useCategories();

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.isdeleted),
    [categories]
  );

  const availableSubCategories = useMemo(() => {
    if (!categoryId) {
      return activeCategories.flatMap((c) => (c.firstchildren ?? []).filter((sc) => !sc.isdeleted));
    }
    const cat = activeCategories.find((c) => c.id === categoryId);
    return (cat?.firstchildren ?? []).filter((sc) => !sc.isdeleted);
  }, [activeCategories, categoryId]);

  const queryParams: UnsoldMerchandiseParams = useMemo(
    () => ({
      months,
      siteId,
      categoryId,
      subCategoryId,
      onlyWithStock,
      excludeNewArticles,
      gracePeriodDays: 30,
      inactivityType,
      search: debouncedSearch || undefined,
      sortBy,
      sortDirection,
      page,
      pageSize,
    }),
    [
      months,
      siteId,
      categoryId,
      subCategoryId,
      onlyWithStock,
      excludeNewArticles,
      inactivityType,
      debouncedSearch,
      sortBy,
      sortDirection,
      page,
      pageSize,
    ]
  );

  const { data, isLoading, isFetching, isError } = useUnsoldMerchandise(queryParams, {
    enabled: open,
  });

  const buildExportRows = (items: UnsoldMerchandiseItemDto[]) =>
    items.map((item) => ({
      'Référence': item.reference,
      'Désignation': item.description,
      'Catégorie': item.categoryName,
      'Sous-Catégorie': item.subCategoryName,
      'Stock Actuel': item.currentStock,
      'Unité': item.unit,
      'Disponibilité Stock':
        item.stockAvailability === 'InStock'
          ? 'En stock'
          : item.stockAvailability === 'NegativeStock'
          ? 'Stock négatif'
          : 'Stock nul',
      'Coût Unitaire HT Estimé (DT)': item.estimatedUnitCostHT,
      'Valeur Stock HT Estimée (DT)': item.estimatedStockValueHT,
      'Valeur Vente Potentielle HT (DT)': item.potentialSellingValueHT,
      'Source Valorisation': getValuationSourceLabel(item.valuationSource),
      'Coût Manquant': item.isMissingCost ? 'Oui' : 'Non',
      'Dernière Vente': formatDateFr(item.lastSaleDate),
      'Jours Sans Vente': item.daysSinceLastSale ?? 'Jamais vendu',
      'Classification': item.inactivityClassification === 'NeverSold' ? 'Jamais vendu' : 'Sans vente récente',
      'Date Création': formatDateFr(item.creationDate),
      'Nouvel Article (<30j)': item.isNewlyCreated ? 'Oui' : 'Non',
    }));

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const fullData = await analyticsService.getUnsoldMerchandise({
        ...queryParams,
        page: 1,
        exportAll: true,
      });

      if (!fullData.items.length) {
        toast.info('Aucun article à exporter pour les filtres sélectionnés.');
        return;
      }

      const rows = buildExportRows(fullData.items);
      const dateTag = new Date().toISOString().split('T')[0];
      const fileBase = `articles-sans-ventes-${months}m-${dateTag}`;

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Articles Sans Ventes');
        XLSX.writeFile(wb, `${fileBase}.xlsx`);
        toast.success(`Export Excel généré (${fullData.items.length} articles).`);
      } else {
        const headers = Object.keys(rows[0]);
        const csvLines = [
          headers.map((h) => sanitizeCsvCell(h)).join(';'),
          ...rows.map((r) =>
            headers.map((h) => sanitizeCsvCell(r[h as keyof typeof r])).join(';')
          ),
        ];
        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileBase}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Export CSV généré (${fullData.items.length} articles).`);
      }
    } catch {
      toast.error("Erreur lors de l'exportation des articles sans ventes.");
    } finally {
      setIsExporting(false);
    }
  };

  const summary = data?.summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200 bg-white">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-corp-blue-600" />
                Analyse Détaillée — Articles sans ventes ({months} mois)
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explorez l&apos;ensemble du stock dormant filtré, vérifiez la source de valorisation et exportez le jeu de données complet.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={isExporting || isLoading}
                className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 active:scale-[0.96] transition-transform"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => handleExport('xlsx')}
                disabled={isExporting || isLoading}
                className="rounded-xl text-xs font-semibold gap-1.5 bg-corp-blue-600 hover:bg-corp-blue-700 text-white active:scale-[0.96] transition-transform"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Compact Summary Strip */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Résultats filtrés</p>
                <p className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {summary.unsoldCount}
                  <span className="text-xs font-normal text-slate-500 ml-1">({summary.unsoldPercentage}%)</span>
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Stock Dormant HT (est.)</p>
                <p className="text-lg font-bold text-amber-900 font-mono tabular-nums mt-0.5">
                  {formatDT(summary.estimatedDormantStockValueHT)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Vente Potentielle HT</p>
                <p className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {formatDT(summary.potentialSellingValueHT)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Volume Bois Dormant</p>
                <p className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {formatQty(summary.woodStockVolumeM3, true, 'M3')} <span className="text-xs font-medium text-slate-500">m³</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Coûts manquants</p>
                <p className={cn(
                  'text-lg font-bold font-mono tabular-nums mt-0.5',
                  summary.missingCostCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                )}>
                  {summary.missingCostCount}
                </p>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Référence ou désignation..."
                  className="pl-9 h-9 rounded-lg bg-white border-slate-200 text-xs sm:text-sm"
                />
              </div>

              {/* Site selector (dynamic from useSites) */}
              <select
                value={siteId ?? ''}
                onChange={(e) => {
                  setSiteId(e.target.value ? Number(e.target.value) : undefined);
                  setPage(1);
                }}
                aria-label="Filtrer par site"
                className="h-9 rounded-lg bg-white border border-slate-200 px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Tous les sites</option>
                {(sites ?? [])
                  .filter((s) => !s.isdeleted)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.gov ? `${s.gov} — ${s.address}` : s.address || `Site #${s.id}`}
                    </option>
                  ))}
              </select>

              {/* Category */}
              <select
                value={categoryId ?? ''}
                onChange={(e) => {
                  const nextCat = e.target.value ? Number(e.target.value) : undefined;
                  setCategoryId(nextCat);
                  setSubCategoryId(undefined);
                  setPage(1);
                }}
                aria-label="Filtrer par catégorie"
                className="h-9 rounded-lg bg-white border border-slate-200 px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Toutes les catégories</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description || c.reference}
                  </option>
                ))}
              </select>

              {/* SubCategory */}
              <select
                value={subCategoryId ?? ''}
                onChange={(e) => {
                  setSubCategoryId(e.target.value ? Number(e.target.value) : undefined);
                  setPage(1);
                }}
                aria-label="Filtrer par sous-catégorie"
                className="h-9 rounded-lg bg-white border border-slate-200 px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Toutes les sous-catégories</option>
                {availableSubCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.description || sc.reference}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/70">
              <div className="flex flex-wrap items-center gap-3">
                {/* 3 / 6 / 12 mois */}
                <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg">
                  {([3, 6, 12] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMonths(m);
                        setPage(1);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                        months === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {m} mois
                    </button>
                  ))}
                </div>

                {/* Inactivity type pills */}
                <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg">
                  {[
                    { value: undefined, label: 'Tous' },
                    { value: 'NeverSold' as const, label: 'Jamais vendus' },
                    { value: 'NoRecentSales' as const, label: 'Sans vente récente' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setInactivityType(opt.value);
                        setPage(1);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                        inactivityType === opt.value
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <Switch
                    checked={!onlyWithStock}
                    onCheckedChange={(checked) => {
                      setOnlyWithStock(!checked);
                      setPage(1);
                    }}
                  />
                  Inclure stock = 0
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <Switch
                    checked={!excludeNewArticles}
                    onCheckedChange={(checked) => {
                      setExcludeNewArticles(!checked);
                      setPage(1);
                    }}
                  />
                  Inclure nouveaux (&lt;30j)
                </label>
              </div>

              {/* Sort controls */}
              <div className="flex items-center gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as UnsoldMerchandiseSortBy);
                    setPage(1);
                  }}
                  aria-label="Trier par"
                  className="h-8 rounded-lg bg-white border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="stockValue">Trier : Valeur Stock HT</option>
                  <option value="potentialSellValue">Trier : Vente Potentielle HT</option>
                  <option value="daysSinceLastSale">Trier : Jours sans vente</option>
                  <option value="lastSaleDate">Trier : Dernière vente</option>
                  <option value="currentStock">Trier : Stock actuel</option>
                  <option value="creationDate">Trier : Date création</option>
                  <option value="reference">Trier : Référence</option>
                  <option value="designation">Trier : Désignation</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-200 bg-white"
                  onClick={() => {
                    setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
                    setPage(1);
                  }}
                  title={sortDirection === 'desc' ? 'Ordre décroissant' : 'Ordre croissant'}
                >
                  {sortDirection === 'desc' ? (
                    <ArrowDown className="h-3.5 w-3.5 text-slate-700" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-3.5 py-2.5 text-xs text-blue-900">
            <Info className="h-4 w-4 text-corp-blue-600 shrink-0 mt-0.5" />
            <span>
              {data?.valuationDisclaimer ??
                "Valeurs financières estimées à titre indicatif (dernier coût d'achat HT ou dernier prix d'achat TTC converti en HT) — ne constituent pas une valorisation comptable certifiée."}
            </span>
          </div>

          {/* Error state */}
          {isError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Impossible de charger la liste détaillée des articles sans ventes.</span>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500">
              <PackageX className="h-9 w-9 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Aucun article trouvé</p>
              <p className="text-xs text-slate-500 mt-1">
                Modifiez la période d&apos;inactivité ou les filtres pour élargir l&apos;analyse.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-xl border border-slate-200 overflow-hidden transition-opacity',
                isFetching ? 'opacity-70' : 'opacity-100'
              )}
            >
              <div className="overflow-x-auto max-h-[46vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-3 font-semibold">Article</th>
                      <th className="py-3 px-3 font-semibold">Catégorie / Sous-cat.</th>
                      <th className="py-3 px-3 font-semibold text-right">Stock</th>
                      <th className="py-3 px-3 font-semibold text-right">Valeur Achat HT (est.)</th>
                      <th className="py-3 px-3 font-semibold text-right">Vente Pot. HT</th>
                      <th className="py-3 px-3 font-semibold">Valorisation</th>
                      <th className="py-3 px-3 font-semibold">Dernière Vente</th>
                      <th className="py-3 px-3 font-semibold">Statut</th>
                      <th className="py-3 px-3 font-semibold">Création</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.items.map((item) => (
                      <tr key={item.articleId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 max-w-[230px]">
                          <div className="font-mono font-bold text-slate-900 truncate">{item.reference}</div>
                          <div className="text-slate-600 truncate" title={item.description}>
                            {item.description}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[170px]">
                          <div className="font-medium text-slate-800 truncate">{item.subCategoryName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{item.categoryName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 tabular-nums">
                            {formatQty(item.currentStock, item.isWood, item.unit)}{' '}
                            <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                          </div>
                          {item.stockAvailability !== 'InStock' && (
                            <span
                              className={cn(
                                'inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5',
                                item.stockAvailability === 'NegativeStock'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {item.stockAvailability === 'NegativeStock' ? 'Stock négatif' : 'Stock = 0'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatDT(item.estimatedStockValueHT)}
                          </div>
                          {!item.isMissingCost && (
                            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {formatDT(item.estimatedUnitCostHT)} / {item.unit}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-700 tabular-nums">
                          {formatDT(item.potentialSellingValueHT)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.isMissingCost ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="h-3 w-3" />
                              Coût manquant
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                              {getValuationSourceLabel(item.valuationSource)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{formatDateFr(item.lastSaleDate)}</div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {item.daysSinceLastSale !== null ? `${item.daysSinceLastSale} j` : 'Aucune vente'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                item.inactivityClassification === 'NeverSold'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {item.inactivityClassification === 'NeverSold' ? 'Jamais vendu' : 'Sans vente récente'}
                            </span>
                            {item.isNewlyCreated && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                                Nouveau (&lt;30j)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                          <div>{formatDateFr(item.creationDate)}</div>
                          <div className="text-[10px] text-slate-400 font-mono tabular-nums">{item.articleAgeDays} j</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={data.page}
                totalItems={data.totalItemsCount}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
