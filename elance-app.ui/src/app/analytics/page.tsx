'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  CalendarDays,
  Calendar,
  AlertTriangle,
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  AlertCircle,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAnalyticsKpis, useMonthlyRevenue, useTopSubCategories, useStockHealthBySubCategory } from '@/hooks/use-analytics-kpis';
import { useSupplierPurchasePaymentChart } from '@/hooks/use-supplier-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityLogSection } from '@/components/analytics/activity-log-section';

const COLORS = ['#1D9E75', '#534AB7', '#A39D90', '#E1F5EE', '#F59E0B', '#3B82F6'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-TN', { 
    style: 'currency', 
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value || 0).replace('TND', 'DT');
};

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState<number | 'ALL'>(new Date().getMonth() + 1);
  const [receivablesSearch, setReceivablesSearch] = useState('');

  const { data: kpis, isLoading: isLoadingKpis, isError } = useAnalyticsKpis(
    chartMonth === 'ALL' ? undefined : chartMonth,
    chartYear
  );
  const { data: monthlyData, isLoading: isLoadingMonthly } = useMonthlyRevenue(6);
  
  const [topSalesMonths, setTopSalesMonths] = useState<number>(6);
  const { data: topSubCategories, isLoading: isLoadingTopSubCategories } = useTopSubCategories(topSalesMonths);
  const [selectedSalesSubCatId, setSelectedSalesSubCatId] = useState<number | undefined>(undefined);
  
  const [stockSiteId, setStockSiteId] = useState<number | undefined>(undefined);
  const { data: stockHealth, isLoading: isLoadingStockHealth } = useStockHealthBySubCategory(stockSiteId);
  const [selectedStockSubCatId, setSelectedStockSubCatId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (topSubCategories && topSubCategories.length > 0 && !selectedSalesSubCatId) {
      setSelectedSalesSubCatId(topSubCategories[0].subCategoryId);
    }
  }, [topSubCategories, selectedSalesSubCatId]);

  useEffect(() => {
    if (stockHealth && stockHealth.length > 0 && !selectedStockSubCatId) {
      setSelectedStockSubCatId(stockHealth[0].subCategoryId);
    }
  }, [stockHealth, selectedStockSubCatId]);
  const { data: supplierChartData, isLoading: isLoadingSupplierChart } = useSupplierPurchasePaymentChart(chartYear, chartMonth);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const salesByCategory = (() => {
    if (!kpis?.documentCounts) return [];
    
    const documentTypeTranslations: Record<string, string> = {
      customerDeliveryNote: 'Bon de Livraison Client',
      customerInvoice: 'Facture Client',
      customerOrder: 'Commande Client',
      customerQuote: 'Devis Client',
      stockTransfer: 'Transfert de Stock',
      supplierInvoice: 'Facture Fournisseur',
      supplierInvoiceReturn: 'Retour Facture Fournisseur',
      supplierOrder: 'Commande Fournisseur',
      supplierReceipt: 'Reçu Fournisseur',
      // Fallbacks just in case
      invoice: 'Facture',
      deliveryNote: 'Bon de Livraison',
      quote: 'Devis',
      purchaseOrder: 'Bon de Commande',
      creditNote: 'Avoir',
      payment: 'Paiement',
      receipt: 'Reçu',
      order: 'Commande',
      estimate: 'Devis'
    };

    return Object.entries(kpis.documentCounts).map(([key, value]) => {
      const fallbackName = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      return {
        name: documentTypeTranslations[key] || fallbackName,
        value: value
      };
    }).filter(x => x.value > 0);
  })();

  const kpiCards = [
    { title: "CA Aujourd'hui", value: formatCurrency(kpis?.dailySales || 0), icon: TrendingUp, trend: 'up', change: 'Temps réel' },
    { title: 'CA Semaine', value: formatCurrency(kpis?.weeklySales || 0), icon: CalendarDays, trend: 'up', change: 'Cette semaine' },
    { title: 'CA Mois', value: formatCurrency(kpis?.monthlySales || 0), icon: Calendar, trend: 'up', change: 'Ce mois' },
    { title: 'Alertes Stock', value: `${kpis?.stockAlertCount || 0} Articles`, icon: AlertTriangle, trend: kpis?.stockAlertCount ? 'down' : 'up', change: 'Sous seuil min', warning: !!kpis?.stockAlertCount },
  ];

  const renderPieChart = () => {
    if (!isMounted || isLoadingKpis) {
      return <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl" />;
    }
    
    if (salesByCategory.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucune donnée
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie
            data={salesByCategory}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {salesByCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
          />
          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderSupplierChart = () => {
    if (!isMounted || isLoadingSupplierChart) {
      return (
        <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-forest-300 font-medium">Chargement des données...</span>
        </div>
      );
    }

    if (!supplierChartData || supplierChartData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucune donnée pour la période sélectionnée
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={supplierChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
            formatter={(value: any, name: any) => [
              formatCurrency(Number(value || 0)), 
              name === 'purchases' ? 'Achats TTC' : 'Règlements'
            ]}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ paddingBottom: '20px' }} 
            formatter={(value) => <span className="text-forest-900 font-medium ml-1">{value === 'purchases' ? 'Achats TTC' : 'Règlements'}</span>}
          />
          <Bar dataKey="purchases" name="purchases" fill="#92400E" radius={[4, 4, 0, 0]} barSize={32} animationDuration={800} />
          <Bar dataKey="payments" name="payments" fill="#1D9E75" radius={[4, 4, 0, 0]} barSize={32} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTopClients = () => {
    if (isLoadingKpis) {
      return new Array(5).fill(0).map((_, i) => (
        <div key={`skeleton-client-${i}`} className="flex items-center justify-between p-4 bg-sand-50/50 rounded-2xl border border-forest-50">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
      ));
    }

    if (!kpis?.topClients || kpis.topClients.length === 0) {
      return <div className="p-8 text-center text-sand-400 font-medium">Aucune vente ce mois-ci</div>;
    }

    return kpis.topClients.map((client, i) => (
      <div key={client.id} className="flex items-center justify-between p-4 bg-sand-50/50 rounded-2xl border border-forest-50 hover:border-forest-200 transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center bg-forest-100 text-forest-700 rounded-full text-xs font-bold">{i + 1}</span>
          <span className="font-bold text-forest-900">{client.name}</span>
        </div>
        <div className="text-right">
          <div className="font-bold font-mono text-forest-600">{formatCurrency(client.totalAmount)}</div>
        </div>
      </div>
    ));
  };

  const renderReceivables = () => {
    if (isLoadingKpis) {
      return (
        <div className="h-[400px] w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-forest-300 font-medium">Chargement des créances...</span>
        </div>
      );
    }

    if (!kpis?.customerReceivables || kpis.customerReceivables.length === 0) {
      return (
        <div className="p-8 text-center text-sand-400 font-medium">Aucune créance client enregistrée</div>
      );
    }

    const filteredReceivables = kpis.customerReceivables.filter(c => 
      c.name.toLowerCase().includes(receivablesSearch.toLowerCase())
    );

    const formatDays = (days: number) => {
      if (days < 30) return <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">&lt; 30 j</span>;
      if (days <= 90) return <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold">{days} j</span>;
      return <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-bold">&gt; 90 j</span>;
    };

    if (filteredReceivables.length === 0) {
      return (
        <div className="p-8 text-center text-sand-400 font-medium">Aucun client trouvé pour "{receivablesSearch}"</div>
      );
    }

    return (
      <div className="grid gap-8 lg:grid-cols-2 h-full items-start">
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredReceivables.map((client, i) => {
            const progress = client.totalInvoiced > 0 ? (client.totalPaid / client.totalInvoiced) * 100 : 0;
            return (
              <div key={client.id} className="flex flex-col gap-2 p-4 bg-sand-50/50 rounded-2xl border border-forest-50 hover:border-forest-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-rose-100 text-rose-700 rounded-full text-xs font-bold">{i + 1}</span>
                    <span className="font-bold text-forest-900 line-clamp-1" title={client.name}>{client.name}</span>
                  </div>
                  <div className="text-right pl-2">
                    <div className="font-bold font-mono text-rose-600">{formatCurrency(client.outstanding)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="w-1/2 h-2 bg-rose-100 rounded-full overflow-hidden" title={`${progress.toFixed(0)}% payé`}>
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sand-400 font-medium hidden sm:inline-block">Ancienneté:</span>
                    {formatDays(client.oldestInvoiceDays)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="h-[400px] w-full hidden lg:block">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={filteredReceivables} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                width={100}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Reste à payer']}
              />
              <Bar dataKey="outstanding" name="Outstanding" radius={[0, 4, 4, 0]} barSize={20}>
                {filteredReceivables.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.oldestInvoiceDays > 90 ? '#E11D48' : entry.oldestInvoiceDays > 30 ? '#D97706' : '#1D9E75'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTopSubCategories = () => {
    if (isLoadingTopSubCategories) {
      return (
        <div className="h-[400px] w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-forest-300 font-medium">Chargement des données...</span>
        </div>
      );
    }

    if (!topSubCategories || topSubCategories.length === 0) {
      return (
        <div className="h-[400px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucune donnée de vente pour cette période
        </div>
      );
    }

    const selectedData = topSubCategories.find(s => s.subCategoryId === selectedSalesSubCatId) || topSubCategories[0];
    const articles = selectedData?.topArticles || [];

    if (articles.length === 0) {
      return (
        <div className="h-[400px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucun article vendu dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={articles}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="quantitySold"
              nameKey="articleName"
              stroke="none"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index, payload }: any) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius * 1.1;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                
                // Only show label if it's a significant slice to avoid overlap
                if (articles.length > 5 && value < (articles[0]?.quantitySold || 0) * 0.1) return null;
                
                return (
                  <text x={x} y={y} fill="#4B5563" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
                    [{payload.reference}] {payload.articleName.substring(0, 20)}{payload.articleName.length > 20 ? '...' : ''}
                  </text>
                );
              }}
            >
              {articles.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
              formatter={(value: any, name: any, props: any) => [
                `${value} unités (${formatCurrency(props.payload.revenueTTC)})`, 
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderStockHealth = () => {
    if (isLoadingStockHealth) {
      return (
        <div className="h-[400px] w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-forest-300 font-medium">Chargement des données...</span>
        </div>
      );
    }

    if (!stockHealth || stockHealth.length === 0) {
      return (
        <div className="h-[400px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucune donnée de stock trouvée
        </div>
      );
    }

    const selectedData = stockHealth.find(s => s.subCategoryId === selectedStockSubCatId) || stockHealth[0];
    const articles = selectedData?.articleStocks || [];

    if (articles.length === 0) {
      return (
        <div className="h-[400px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucun article en stock dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[400px] w-full flex flex-col gap-4">
        <ResponsiveContainer width="100%" height="80%" minWidth={1} minHeight={1}>
          <BarChart data={articles} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="articleName" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10 }} 
              dy={10} 
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
              formatter={(value: any, name: any) => {
                const displayName = name === 'Stock Actuel' ? 'Stock Actuel' : 
                                    name === 'Stock Minimum' ? 'Stock Minimum' : name;
                return [value, displayName];
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle" 
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            <Bar dataKey="currentStock" name="Stock Actuel" fill="#1D9E75" radius={[4, 4, 0, 0]} barSize={20}>
              {articles.map((entry, index) => {
                let color = '#1D9E75'; // healthy
                if (entry.currentStock <= entry.minimumStock && entry.minimumStock > 0) {
                  color = '#E11D48'; // danger
                } else if (entry.currentStock <= entry.minimumStock * 1.2 && entry.minimumStock > 0) {
                  color = '#F59E0B'; // warning
                }
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
            <Bar dataKey="minimumStock" name="Stock Minimum" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={20} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {articles.filter(a => a.currentStock <= a.minimumStock && a.minimumStock > 0).map(a => (
            <div key={a.articleId} className="whitespace-nowrap bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              {a.articleName}: {a.currentStock} / {a.minimumStock} min
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-forest-900">Analyses Business</h1>
            <p className="text-sand-400 mt-2 font-medium">
              Intelligence commerciale et performance opérationnelle du parc.
            </p>
          </motion.div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-forest-100 p-1 shadow-sm">
              <select 
                className="h-9 rounded-lg bg-transparent px-3 py-1 text-sm font-bold text-forest-900 outline-none cursor-pointer"
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
              >
                <option value={new Date().getFullYear()}>Année {new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>Année {new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear() - 2}>Année {new Date().getFullYear() - 2}</option>
              </select>
              <div className="w-px h-5 bg-forest-100"></div>
              <select 
                className="h-9 rounded-lg bg-transparent px-3 py-1 text-sm font-bold text-forest-900 outline-none cursor-pointer"
                value={chartMonth}
                onChange={(e) => setChartMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              >
                <option value="ALL">Tous les mois</option>
                <option value="1">Janvier</option>
                <option value="2">Février</option>
                <option value="3">Mars</option>
                <option value="4">Avril</option>
                <option value="5">Mai</option>
                <option value="6">Juin</option>
                <option value="7">Juillet</option>
                <option value="8">Août</option>
                <option value="9">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>
            </div>
            <Button className="h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 px-6">
              <Download className="w-4 h-4 mr-2" /> Rapport Complet
            </Button>
          </div>
        </header>

        {isError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <p className="font-medium text-sm">Impossible de charger les données analytiques. Veuillez réessayer plus tard.</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingKpis ? (
            new Array(4).fill(0).map((_, i) => (
              <Card key={`skeleton-kpi-${i}`} className="border-forest-100/50 bg-white shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 rounded mt-1" />
                  <Skeleton className="h-4 w-20 rounded mt-3" />
                </CardContent>
              </Card>
            ))
          ) : (
            kpiCards.map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className={cn(
                  "border-forest-100/50 bg-white shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden group hover:border-forest-600 transition-all duration-500",
                  stat.warning && "border-amber-200 hover:border-amber-500"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      stat.warning ? "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white" : "bg-forest-50 text-forest-600 group-hover:bg-forest-600 group-hover:text-white"
                    )}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono text-forest-900 tracking-tight">{stat.value}</div>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className={cn("w-3 h-3", stat.warning ? "text-amber-500" : "text-rose-500")} />
                      )}
                      <span className={cn(
                        "text-xs font-bold",
                        stat.trend === 'up' ? "text-emerald-600" : (stat.warning ? "text-amber-500" : "text-rose-500")
                      )}>{stat.change}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Supplier Purchases vs Payments Chart */}
          <Card className="lg:col-span-12 border-forest-100 rounded-[32px] shadow-xl shadow-forest-900/2 bg-white overflow-hidden">
            <CardHeader className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading text-2xl text-forest-900">Achats vs Règlements par Fournisseur</CardTitle>
                <CardDescription className="text-sand-400 font-medium">Comparaison de l'engagement financier et du niveau de règlement.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Filters moved to global header */}
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="h-[400px] w-full relative min-h-0">
                {renderSupplierChart()}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Evolution */}
          <Card className="lg:col-span-8 border-forest-100 rounded-[32px] shadow-xl shadow-forest-900/2 bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="font-heading text-2xl text-forest-900">Évolution Revenue & Marge</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Comparaison mensuelle du chiffre d&apos;affaires et de la rentabilité brute.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="h-[400px] w-full relative min-h-0">
                {!isMounted || isLoadingMonthly ? (
                  <div className="h-full w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
                    <span className="text-forest-300 font-medium">Chargement des données...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={monthlyData || []}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94A3B8', fontSize: 12}}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [formatCurrency(Number(value || 0)), String(name)]}
                      />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1D9E75" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" dataKey="margin" name="Marge" stroke="#534AB7" strokeWidth={3} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Category (Now by Document Type for accuracy given our API) */}
          <Card className="lg:col-span-4 border-forest-100 rounded-[32px] shadow-xl shadow-forest-900/2 bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="font-heading text-2xl text-forest-900">Activité par Document</CardTitle>
              <CardDescription className="text-sand-400 font-medium">Répartition du volume des opérations.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="h-[320px] w-full relative min-h-0">
                {renderPieChart()}
              </div>
              <div className="mt-8 space-y-3">
                {salesByCategory.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                      <span className="text-xs font-bold text-forest-900 capitalize">{cat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-sand-400">{cat.value} doc(s)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Clients & Performance */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl text-forest-900">Top Clients (CA du mois)</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {renderTopClients()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl text-forest-900">Performance Régionale</CardTitle>
              <CardDescription>Données indicatives (Mock V1)</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {[
                  { name: 'Grand Tunis', score: 85 },
                  { name: 'Sousse / Sahel', score: 62 },
                  { name: 'Sfax / Sud', score: 45 },
                ].map((reg) => (
                  <div key={reg.name} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-forest-900">{reg.name}</span>
                      <span className="text-sand-400">{reg.score}%</span>
                    </div>
                    <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${reg.score}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-forest-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suivi des Créances Clients */}
        <Card className="border-rose-100 rounded-[32px] bg-white overflow-hidden shadow-xl shadow-rose-900/5">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-2xl text-forest-900">Suivi des Créances Clients</CardTitle>
                <CardDescription className="text-sand-400 font-medium">Surveillance globale des factures impayées (Balance = Débit - Crédit)</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                  <Input 
                    placeholder="Rechercher un client..." 
                    value={receivablesSearch}
                    onChange={(e) => setReceivablesSearch(e.target.value)}
                    className="pl-9 bg-sand-50/50 border-sand-200 rounded-xl w-[250px] focus-visible:ring-forest-500"
                  />
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl text-rose-600 hidden sm:block">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {renderReceivables()}
          </CardContent>
        </Card>

        {/* Top Articles by SubCategory */}
        <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden shadow-xl shadow-forest-900/2">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading text-2xl text-forest-900">Top Ventes par Sous-Catégorie</CardTitle>
                <CardDescription className="text-sand-400 font-medium">Les sous-catégories les plus performantes (quantité et CA).</CardDescription>
              </div>
              <div className="flex bg-sand-100/50 p-1 rounded-xl">
                {topSubCategories && topSubCategories.length > 0 && (
                  <select
                    value={selectedSalesSubCatId || ""}
                    onChange={(e) => setSelectedSalesSubCatId(Number(e.target.value))}
                    className="h-9 rounded-lg bg-transparent px-3 text-sm font-bold text-forest-900 outline-none cursor-pointer mr-2 border-r border-sand-200"
                  >
                    {topSubCategories.map(c => (
                      <option key={c.subCategoryId} value={c.subCategoryId}>{c.subCategoryName}</option>
                    ))}
                  </select>
                )}
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTopSalesMonths(m)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                      topSalesMonths === m 
                        ? "bg-white text-forest-900 shadow-sm" 
                        : "text-sand-500 hover:text-forest-700"
                    )}
                  >
                    {m} mois
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {renderTopSubCategories()}
          </CardContent>
        </Card>

        {/* Stock Health per SubCategory */}
        <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden shadow-xl shadow-forest-900/2">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading text-2xl text-forest-900">Santé du Stock par Sous-Catégorie</CardTitle>
                <CardDescription className="text-sand-400 font-medium">Comparaison du stock actuel avec le seuil d'alerte (stock minimum).</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {stockHealth && stockHealth.length > 0 && (
                  <select
                    value={selectedStockSubCatId || ""}
                    onChange={(e) => setSelectedStockSubCatId(Number(e.target.value))}
                    className="h-9 rounded-xl bg-sand-50/50 border-sand-200 px-3 text-sm font-bold text-forest-900 outline-none cursor-pointer focus-visible:ring-forest-500"
                  >
                    {stockHealth.map(c => (
                      <option key={c.subCategoryId} value={c.subCategoryId}>{c.subCategoryName}</option>
                    ))}
                  </select>
                )}
                <select
                  value={stockSiteId || ""}
                  onChange={(e) => setStockSiteId(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9 rounded-xl bg-sand-50/50 border-sand-200 px-3 text-sm font-bold text-forest-900 outline-none cursor-pointer focus-visible:ring-forest-500"
                >
                  <option value="">Tous les sites (Entreprise)</option>
                  <option value="1">Site Principal</option>
                  <option value="2">Dépôt Secondaire</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {renderStockHealth()}
          </CardContent>
        </Card>

        {/* Activity Log — human-readable audit feed for non-IT managers */}
        <ActivityLogSection />

      </div>
    </DashboardLayout>
  );
}
