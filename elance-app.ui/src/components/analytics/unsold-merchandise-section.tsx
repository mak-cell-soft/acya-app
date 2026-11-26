'use client';

import React, { useState, useSyncExternalStore } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Clock,
  Info,
  PackageX,
  SlidersHorizontal,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useUnsoldMerchandise } from '@/hooks/use-analytics-kpis';
import { useSites } from '@/hooks/use-enterprise';
import { UnsoldMerchandiseInactivityPeriod } from '@/types/analytics';
import { UnsoldMerchandiseDialog } from './unsold-merchandise-dialog';
import { cn } from '@/lib/utils';

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

const BAR_COLORS = [
  '#D97706',
  '#EA580C',
  '#DC2626',
  '#2563EB',
  '#4F46E5',
  '#0D9488',
  '#64748B',
  '#94A3B8',
];

const subscribeNoop = () => () => {};

export function UnsoldMerchandiseSection() {
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [months, setMonths] = useState<UnsoldMerchandiseInactivityPeriod>(6);
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(true);
  const [excludeNewArticles, setExcludeNewArticles] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const { data: sites } = useSites();
  const { data, isLoading, isFetching, isError } = useUnsoldMerchandise({
    months,
    siteId,
    onlyWithStock,
    excludeNewArticles,
    gracePeriodDays: 30,
    sortBy: 'stockValue',
    sortDirection: 'desc',
    page: 1,
    pageSize: 10,
  });

  const summary = data?.summary;
  const subCategoryChartData = (data?.bySubCategory ?? []).slice(0, 8);
  const nonWoodUnits = Object.entries(summary?.nonWoodStockQuantitiesByUnit ?? {});

  return (
    <>
      <Card className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
        <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <PackageX className="h-5 w-5 text-amber-600" />
                Articles sans ventes (Stock Dormant)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Marchandises actives sans activité commerciale qualifiée (BL ou facture directe) sur la période d&apos;inactivité choisie.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dynamic Site selector via useSites() */}
              <select
                value={siteId ?? ''}
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : undefined)}
                aria-label="Filtrer les articles sans ventes par site"
                className="h-9 rounded-xl bg-slate-50/80 border border-slate-200 px-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Tous les sites (Entreprise)</option>
                {(sites ?? [])
                  .filter((s) => !s.isdeleted)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.gov ? `${s.gov} — ${s.address}` : s.address || `Site #${s.id}`}
                    </option>
                  ))}
              </select>

              {/* 3 / 6 / 12 mois segmented control (consistent with Top Ventes) */}
              <div className="inline-flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
                {([3, 6, 12] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      months === m
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {m} mois
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 gap-1.5 active:scale-[0.96] transition-transform"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-corp-blue-600" />
                Analyse détaillée &amp; Export
              </Button>
            </div>
          </div>

          {/* Inline quick toggles */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
              <Switch
                checked={!onlyWithStock}
                onCheckedChange={(checked) => setOnlyWithStock(!checked)}
              />
              Inclure les articles à stock nul
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
              <Switch
                checked={!excludeNewArticles}
                onCheckedChange={(checked) => setExcludeNewArticles(!checked)}
              />
              Inclure les nouveaux articles (&lt;30 jours)
            </label>
            {isFetching && !isLoading && (
              <span className="text-[11px] font-medium text-corp-blue-600 ml-auto">
                Actualisation...
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 lg:p-7 pt-5 space-y-6">
          {/* Error Banner */}
          {isError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Impossible de charger l&apos;analyse des articles sans ventes. Veuillez réessayer.</span>
            </div>
          )}

          {/* KPI Summary Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
              ))}
            </div>
          ) : summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* KPI 1: Unsold count & % of active merchandise */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Articles sans ventes</span>
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                        {summary.unsoldCount}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-mono tabular-nums">
                        {summary.unsoldPercentage}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-mono tabular-nums">
                      sur {summary.totalActiveMerchandise} marchandises actives ·{' '}
                      <span className="text-rose-700 font-semibold">{summary.neverSoldCount} jamais vendus</span>
                    </p>
                  </div>
                </div>

                {/* KPI 2: Estimated Dormant Stock Value HT & Potential Selling Value HT */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900">Stock dormant estimé (HT)</span>
                    <Wallet className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl sm:text-2xl font-bold text-amber-950 font-mono tabular-nums">
                      {formatDT(summary.estimatedDormantStockValueHT)}
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-1.5 font-mono tabular-nums">
                      Vente potentielle HT : <span className="font-semibold">{formatDT(summary.potentialSellingValueHT)}</span>
                    </p>
                  </div>
                </div>

                {/* KPI 3: Stock presence, Grace period & Missing cost */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Répartition &amp; Qualité</span>
                    <Clock className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">En stock / Sans stock</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {summary.withStockCount} / {summary.withoutStockCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Nouveaux exclus (&lt;30j)</span>
                      <span className="font-mono font-semibold text-sky-700 tabular-nums">
                        {summary.newlyCreatedExcludedCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Coût d&apos;achat manquant</span>
                      <span
                        className={cn(
                          'font-mono font-semibold tabular-nums',
                          summary.missingCostCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                        )}
                      >
                        {summary.missingCostCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI 4: Wood volume (m³) separated from non-wood units */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Volume Bois Dormant</span>
                    <Boxes className="h-4 w-4 text-corp-blue-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                      {formatQty(summary.woodStockVolumeM3, true, 'M3')}{' '}
                      <span className="text-sm font-semibold text-slate-500">m³</span>
                    </div>
                    {nonWoodUnits.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {nonWoodUnits.slice(0, 3).map(([unit, qty]) => (
                          <span
                            key={unit}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-semibold text-slate-700 tabular-nums"
                          >
                            {formatQty(qty, false, unit)} {unit}
                          </span>
                        ))}
                        {nonWoodUnits.length > 3 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{nonWoodUnits.length - 3} unités
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1.5">Aucune autre unité dormante</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Estimate Disclaimer */}
              <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-3.5 py-2.5 text-xs text-blue-900">
                <Info className="h-4 w-4 text-corp-blue-600 shrink-0 mt-0.5" />
                <span>{data.valuationDisclaimer}</span>
              </div>

              {/* Main 2-column content: Subcategory Chart + Top 10 Unsold Merchandise */}
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Leading Subcategories by Estimated Dormant Stock Value HT */}
                <div className="lg:col-span-5 rounded-xl border border-slate-200 p-4 flex flex-col">
                  <div className="mb-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      Sous-catégories les plus immobilisées (HT est.)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Classement par valeur estimée du stock dormant sur {months} mois.
                    </p>
                  </div>

                  {subCategoryChartData.length === 0 ? (
                    <div className="h-[320px] flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                      Aucune sous-catégorie dormante pour ces critères.
                    </div>
                  ) : (
                    <div className="h-[320px] w-full">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <BarChart
                            data={subCategoryChartData}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: '#64748B' }}
                              tickFormatter={(v) =>
                                new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(Number(v))
                              }
                            />
                            <YAxis
                              type="category"
                              dataKey="subCategoryName"
                              width={115}
                              tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                            />
                            <Tooltip
                              cursor={{ fill: '#F8FAFC' }}
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0].payload as {
                                  subCategoryName: string;
                                  categoryName: string;
                                  estimatedStockValueHT: number;
                                  unsoldArticlesCount: number;
                                  neverSoldCount: number;
                                };
                                return (
                                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 text-xs min-w-[190px]">
                                    <p className="font-bold text-slate-900">{row.subCategoryName}</p>
                                    <p className="text-[11px] text-slate-500 mb-2">{row.categoryName}</p>
                                    <p className="font-mono font-bold text-amber-800 tabular-nums">
                                      {formatDT(row.estimatedStockValueHT)}
                                    </p>
                                    <p className="text-[11px] text-slate-600 mt-1 font-mono tabular-nums">
                                      {row.unsoldArticlesCount} articles ({row.neverSoldCount} jamais vendus)
                                    </p>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="estimatedStockValueHT" radius={[0, 6, 6, 0]} maxBarSize={26}>
                              {subCategoryChartData.map((entry, idx) => (
                                <Cell
                                  key={entry.subCategoryId}
                                  fill={BAR_COLORS[idx % BAR_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                          Chargement des données...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Top 10 Unsold Merchandise Table */}
                <div className="lg:col-span-7 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Top 10 des articles sans ventes
                      </h4>
                      <p className="text-xs text-slate-500">
                        Priorisés par valeur d&apos;achat estimée HT puis ancienneté d&apos;inactivité.
                      </p>
                    </div>
                    {data.totalItemsCount > 10 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogOpen(true)}
                        className="text-xs font-semibold text-corp-blue-600 hover:text-corp-blue-700"
                      >
                        Voir les {data.totalItemsCount} →
                      </Button>
                    )}
                  </div>

                  {data.items.length === 0 ? (
                    <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <PackageX className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">
                        Aucun article dormant détecté
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Toutes les marchandises correspondant aux filtres ont enregistré des ventes sur les {months} derniers mois.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Article</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Stock</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Valeur HT (est.)</th>
                            <th className="py-2.5 px-3 font-semibold">Dernière Vente</th>
                            <th className="py-2.5 px-3 font-semibold">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.items.map((item) => (
                            <tr key={item.articleId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 max-w-[220px]">
                                <div className="font-mono font-bold text-slate-900 truncate">
                                  {item.reference}
                                </div>
                                <div className="text-slate-600 truncate" title={item.description}>
                                  {item.description}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {item.categoryName} · {item.subCategoryName}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold text-slate-900 tabular-nums">
                                {formatQty(item.currentStock, item.isWood, item.unit)}{' '}
                                <span className="text-[11px] font-normal text-slate-500">
                                  {item.unit}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900 tabular-nums">
                                  {formatDT(item.estimatedStockValueHT)}
                                </div>
                                {item.isMissingCost && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    Coût manquant
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {formatDateFr(item.lastSaleDate)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                                  {item.daysSinceLastSale !== null
                                    ? `${item.daysSinceLastSale} j sans vente`
                                    : 'Jamais vendu'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                    item.inactivityClassification === 'NeverSold'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  )}
                                >
                                  {item.inactivityClassification === 'NeverSold'
                                    ? 'Jamais vendu'
                                    : 'Sans vente récente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {dialogOpen && (
        <UnsoldMerchandiseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialMonths={months}
          initialSiteId={siteId}
          initialOnlyWithStock={onlyWithStock}
          initialExcludeNewArticles={excludeNewArticles}
        />
      )}
    </>
  );
}
