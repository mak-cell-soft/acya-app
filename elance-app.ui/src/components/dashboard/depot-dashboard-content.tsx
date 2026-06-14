'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useStockDashboardStats, useStockAlerts, useStockTransfers } from '@/hooks/use-stock';
import { useStockHealthBySubCategory } from '@/hooks/use-analytics-kpis';
import { useDocumentsByType } from '@/hooks/use-documents';
import { useDashboardPayments } from '@/hooks/use-dashboard-payments';
import { DocumentTypes } from '@/types/document';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PaymentDeepSearchCard } from '@/components/dashboard/payment-deep-search-card';

// UI components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/shared/table-pagination';

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'recharts';

// Icons
import {
  Warehouse,
  Package,
  AlertTriangle,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Plus,
  CreditCard,
  Clock,
  FileText,
  Loader2,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── ANIMATION PRESETS ──────────────────────────────────────────────────────────
// NOTE: Staggered fade-in for a polished first impression on mount.
// WHY: No 'ease' key — Framer Motion's default is already easeOut and the
//      string union type 'Easing' causes TS2322 when passing a raw string.
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { delay, duration: 0.45 },
});

// ── STOCK TRANSFER STATUS HELPERS ─────────────────────────────────────────────
// WHY: The backend sends raw string statuses; we map them to French labels
//      and semantic colours here rather than inline to keep JSX readable.
function transferStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    Pending:   { label: 'En attente',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    Confirmed: { label: 'Confirmé',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Rejected:  { label: 'Refusé',      className: 'bg-rose-50 text-rose-700 border-rose-200' },
    Completed: { label: 'Terminé',     className: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-slate-50 text-slate-500 border-slate-200' };
  return (
    <Badge variant="outline" className={cn('text-[0.65rem] font-bold px-2 py-0.5 rounded-lg border', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export function DepotDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Resolve the numeric site ID from the auth store
  const siteId = user?.defaultSiteId ? Number(user.defaultSiteId) : undefined;
  const siteName = user?.defaultSite || '';

  // ── SUBCATEGORY SELECTOR FOR STOCK HEALTH CHART ──
  const [selectedStockSubCatId, setSelectedStockSubCatId] = React.useState<number | undefined>(undefined);

  // ── DATA HOOKS ──────────────────────────────────────────────────────────────
  // WHY: All hooks are reused from the existing library — no new API endpoints needed.

  // 1. Stock KPI summary for this depot site
  const { data: stockStats, isLoading: isStatsLoading } = useStockDashboardStats(siteId);

  // 2. Per-subcategory stock health (bar chart — reused from sale dashboard)
  const { data: stockHealth, isLoading: isHealthLoading } = useStockHealthBySubCategory(siteId);

  // 3. Stock alert list (articles below minimum)
  const { data: stockAlerts = [], isLoading: isAlertsLoading } = useStockAlerts(siteId);

  // 4. Stock transfers for this depot (in & out)
  const { data: transfers = [], isLoading: isTransfersLoading } = useStockTransfers(siteId?.toString());

  // 5. Supplier receipts (type=2) for the 7-day receipt chart
  const { data: receipts = [], isLoading: isReceiptsLoading } = useDocumentsByType(DocumentTypes.supplierReceipt);

  // ── DERIVED DATA ─────────────────────────────────────────────────────────────

  // 7-day supplier receipt chart data
  const receiptChartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dayTotal = receipts
        .filter((r) => format(new Date(r.creationdate), 'yyyy-MM-dd') === dStr)
        .reduce((sum, r) => sum + (r.total_net_ttc || 0), 0);
      data.push({ name: format(d, 'EEE dd', { locale: fr }), total: dayTotal });
    }
    return data;
  }, [receipts]);

  // Today's receipts count
  const todayReceiptsCount = React.useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return receipts.filter((r) => format(new Date(r.creationdate), 'yyyy-MM-dd') === todayStr).length;
  }, [receipts]);

  // Pending transfers only (need attention)
  const pendingTransfers = React.useMemo(
    () => transfers.filter((t: any) => t.status === 'Pending' || t.status === 0),
    [transfers]
  );

  // ── KPI CARD DEFINITIONS ──────────────────────────────────────────────────
  // WHY: Amber/orange palette throughout to visually distinguish the depot
  //      dashboard from the blue-toned sale dashboard.
  const kpiCards = [
    {
      id: 'total-articles',
      label: 'Articles en stock',
      value: isStatsLoading ? '—' : String(stockStats?.totalItems ?? 0),
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      glow: 'shadow-amber-100',
    },
    {
      id: 'ruptures',
      label: 'Ruptures de stock',
      value: isStatsLoading ? '—' : String(stockStats?.outOfStockItems ?? 0),
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      glow: 'shadow-rose-100',
    },
    {
      id: 'alertes',
      label: 'Articles en alerte',
      value: isStatsLoading ? '—' : String(stockStats?.lowStockItems ?? 0),
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      glow: 'shadow-orange-100',
    },
    {
      id: 'receptions-today',
      label: 'Réceptions (auj.)',
      value: isReceiptsLoading ? '—' : String(todayReceiptsCount),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      glow: 'shadow-emerald-100',
    },
  ];

  // ── STOCK HEALTH RENDER ───────────────────────────────────────────────────
  // NOTE: Same logic as in DashboardContent — reused to keep consistency.
  const renderStockHealth = () => {
    if (isHealthLoading) {
      return (
        <div className="h-[220px] w-full bg-amber-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-amber-300 font-medium">Chargement des données...</span>
        </div>
      );
    }

    if (!stockHealth || stockHealth.length === 0) {
      return (
        <div className="h-[220px] w-full flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 text-sm">
          Aucune donnée de stock trouvée pour ce dépôt
        </div>
      );
    }

    const selectedData =
      stockHealth.find((s) => s.subCategoryId === selectedStockSubCatId) || stockHealth[0];
    const articles = selectedData?.articleStocks || [];

    if (articles.length === 0) {
      return (
        <div className="h-[220px] w-full flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 text-sm">
          Aucun article dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart
            data={articles}
            margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
            barGap={6}
          >
            <defs>
              <linearGradient id="depotHealthy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="depotWarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="depotDanger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" stopOpacity={1} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
            <XAxis
              dataKey="articleName"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              dy={15}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
              dx={-10}
            />
            <ChartTooltip
              cursor={{ fill: '#FFFBF0', opacity: 0.7 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-md border border-amber-100 shadow-2xl rounded-2xl p-4 min-w-[200px]">
                      <p className="font-bold text-slate-800 mb-3 border-b border-amber-50 pb-2">{label}</p>
                      <div className="space-y-2">
                        {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm text-slate-500 font-medium">{entry.name}</span>
                            </div>
                            <span className="font-black text-slate-900 font-mono text-sm">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ChartLegend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} />
            <Bar dataKey="currentStock" name="Stock Actuel" radius={[6, 6, 0, 0]} barSize={24} animationDuration={1200}>
              {articles.map((entry, index) => {
                let colorId = 'url(#depotHealthy)';
                if (entry.currentStock <= entry.minimumStock && entry.minimumStock > 0)
                  colorId = 'url(#depotDanger)';
                else if (entry.currentStock <= entry.minimumStock * 1.2 && entry.minimumStock > 0)
                  colorId = 'url(#depotWarning)';
                return <Cell key={`cell-${index}`} fill={colorId} />;
              })}
            </Bar>
            <Bar
              dataKey="minimumStock"
              name="Stock Minimum"
              fill="#CBD5E1"
              radius={[6, 6, 0, 0]}
              barSize={24}
              opacity={0.6}
              animationDuration={1200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">

      {/* ── HEADER ── */}
      <motion.header {...fadeUp(0)} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {/* WHY: Amber accent on site name immediately signals "depot mode" */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Tableau de bord Dépôt
              </h1>
              {siteName && (
                <p className="text-amber-600 font-bold text-sm mt-0.5">
                  Site : {siteName}
                </p>
              )}
            </div>
          </div>
          <p className="text-slate-400 font-medium">
            Bonjour,{' '}
            <span className="text-amber-600 font-bold">{user?.fullname}</span>. Voici l'état
            de votre dépôt et des stocks en cours.
          </p>
        </div>

        {/* Primary CTAs for depot users */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/stock')}
            className="h-12 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
          >
            <Warehouse className="w-4 h-4 mr-2" />
            Stock & Dépôts
          </Button>
          <Button
            size="lg"
            onClick={() => router.push('/stock/transfer/new')}
            className="h-12 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/20 gap-2 px-6"
          >
            <Plus className="w-5 h-5" />
            Nouveau Transfert
          </Button>
        </div>
      </motion.header>

      {/* ── QUICK SHORTCUTS ── */}
      <motion.div {...fadeUp(0.07)} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { title: 'Articles & M³', icon: Package,       path: '/articles',         color: 'text-amber-600 bg-amber-50 border-amber-100/50' },
          { title: 'Stock & Dépôts', icon: Warehouse,    path: '/stock',            color: 'text-slate-600 bg-slate-50 border-slate-100/50' },
          { title: 'Transferts',     icon: ArrowLeftRight,path: '/stock/transfer',  color: 'text-blue-600 bg-blue-50 border-blue-100/50' },
          { title: 'Achats',         icon: ShoppingCart,  path: '/purchases',       color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50' },
          { title: 'Fournisseurs',   icon: Truck,         path: '/suppliers',       color: 'text-orange-600 bg-orange-50 border-orange-100/50' },
        ].map((item, i) => (
          <motion.div key={item.title} {...scaleIn(i * 0.05 + 0.1)}>
            <Card
              onClick={() => router.push(item.path)}
              className="border border-transparent bg-white shadow-none rounded-[16px] cursor-pointer group transition-all duration-300 hover:border-amber-400 hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-900/5"
            >
              <CardContent className="p-3 flex flex-row items-center justify-start text-left gap-3">
                <div className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center', item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] lg:text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">
                  {item.title}
                </span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── KPI CARDS ── */}
      <motion.div {...fadeUp(0.12)} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.id}
            className={cn(
              'border rounded-2xl shadow-none bg-white overflow-hidden',
              kpi.border
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {kpi.label}
                  </p>
                  <h3
                    className={cn(
                      'text-3xl font-black tracking-tight',
                      isStatsLoading ? 'animate-pulse text-slate-200' : kpi.color
                    )}
                  >
                    {kpi.value}
                  </h3>
                </div>
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', kpi.bg)}>
                  <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── CHARTS SECTION: Stock Health + 7-day Receipts ── */}
      <motion.div {...fadeUp(0.18)} className="grid gap-8 lg:grid-cols-3">

        {/* 7-day Supplier Receipt Chart */}
        <Card className="border-amber-100 rounded-[28px] shadow-none bg-white overflow-hidden">
          <CardHeader className="p-6">
            <CardTitle className="text-lg text-slate-900">Réceptions (7j)</CardTitle>
            <CardDescription className="text-slate-400 font-medium flex items-center justify-between">
              <span>Valeur des réceptions fournisseur</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[220px] w-full">
              {isReceiptsLoading ? (
                <div className="h-full flex items-center justify-center text-amber-300">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={receiptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      cursor={{ fill: '#FFFBF0', opacity: 0.6 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-amber-100 shadow-2xl rounded-2xl p-3 min-w-[150px]">
                              <p className="font-bold text-slate-900 mb-2 border-b border-amber-50 pb-1 text-xs">{label}</p>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500 font-medium">Réceptions</span>
                                <span className="font-black text-amber-700 font-mono text-xs">
                                  {payload[0].value} TND
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={24} animationDuration={1200}>
                      {receiptChartData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill="#F59E0B" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Health Chart — reuses same component logic as sale dashboard */}
        <Card className="lg:col-span-2 border-amber-100 rounded-[28px] shadow-none bg-white overflow-hidden">
          <CardHeader className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-slate-900">Santé du Stock</CardTitle>
                <CardDescription className="text-slate-400 font-medium">
                  Comparaison stock actuel vs stock minimum
                </CardDescription>
              </div>
              {stockHealth && stockHealth.length > 0 && (
                <select
                  value={selectedStockSubCatId || ''}
                  onChange={(e) => setSelectedStockSubCatId(Number(e.target.value))}
                  className="h-8 rounded-xl bg-amber-50/50 border-amber-200 px-2 text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[160px]"
                >
                  {stockHealth.map((c) => (
                    <option key={c.subCategoryId} value={c.subCategoryId}>
                      {c.subCategoryName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">{renderStockHealth()}</CardContent>
        </Card>
      </motion.div>

      {/* ── STOCK ALERTS ── */}
      <motion.div {...fadeUp(0.24)}>
        <Card className="border-amber-100 rounded-2xl shadow-none bg-white overflow-hidden">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-lg text-slate-900">Alertes de Stock</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/stock')}
                className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 font-bold text-xs gap-1"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {isAlertsLoading ? (
              <div className="h-24 flex items-center justify-center text-amber-300">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...
              </div>
            ) : stockAlerts.length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <p className="text-sm font-bold">Tous les articles sont au-dessus du seuil minimum</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {stockAlerts.slice(0, 12).map((alert, idx) => (
                  <div
                    key={`alert-${alert.articleId ?? alert.id ?? idx}`}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border',
                      alert.stockQuantity === 0
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-orange-50 border-orange-200'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        alert.stockQuantity === 0 ? 'bg-rose-100' : 'bg-orange-100'
                      )}
                    >
                      <AlertTriangle
                        className={cn('w-4 h-4', alert.stockQuantity === 0 ? 'text-rose-600' : 'text-orange-500')}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {alert.articleReference}
                      </p>
                      <p
                        className={cn(
                          'text-[0.65rem] font-bold',
                          alert.stockQuantity === 0 ? 'text-rose-600' : 'text-orange-500'
                        )}
                      >
                        Qté: {alert.stockQuantity} m³
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── TRANSFERS SECTION ── */}
      <motion.div {...fadeUp(0.30)}>
        <Card className="border-amber-100 rounded-2xl shadow-none bg-white overflow-hidden">
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                <div>
                  <CardTitle className="text-lg text-slate-900">Transferts de Stock</CardTitle>
                  {pendingTransfers.length > 0 && (
                    <CardDescription className="text-amber-600 font-bold text-xs mt-0.5">
                      {pendingTransfers.length} transfert(s) en attente de confirmation
                    </CardDescription>
                  )}
                </div>
              </div>

              {/* WHY: CTA "Ajouter Transfert" requested by the user — direct link to new transfer form */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/stock/transfer')}
                  className="h-9 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs gap-1"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/stock/transfer/new')}
                  className="h-9 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-bold text-xs gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter Transfert
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isTransfersLoading ? (
              <div className="p-12 flex items-center justify-center text-amber-300">
                <Loader2 className="w-7 h-7 animate-spin mr-2" /> Chargement...
              </div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-400">Aucun transfert enregistré.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-50/80 bg-amber-50/20">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Réf. Origine</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Réf. Réception</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50/30">
                    {transfers.slice(0, 10).map((t: any, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                          {t.originDocNumber || t.originDoc || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">
                          {t.receiptDocNumber || t.receiptDoc || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-medium whitespace-nowrap">
                          {t.createdAt || t.date
                            ? format(new Date(t.createdAt || t.date), 'dd MMM yyyy', { locale: fr })
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {transferStatusBadge(t.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── RECHERCHE APPROFONDIE DES REGLEMENTS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.6 }}
        className="mt-8"
      >
        <PaymentDeepSearchCard />
      </motion.div>

    </div>
  );
}
