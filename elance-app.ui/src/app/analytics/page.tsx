'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  TrendingDown,
  CalendarDays,
  Calendar,
  AlertTriangle,
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  AlertCircle,
  Search,
  SlidersHorizontal,
  FileDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAnalyticsKpis, useMonthlyRevenue, useTopSubCategories, useStockHealthBySubCategory } from '@/hooks/use-analytics-kpis';
import { useCustomers } from '@/hooks/use-customers';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useArticles } from '@/hooks/use-articles';
import { useSupplierPurchasePaymentChart } from '@/hooks/use-supplier-chart';
import { useDocumentsByTypeFiltered } from '@/hooks/use-documents';
import { useProfitMargins } from '@/hooks/use-deep-search';
import { DocumentTypes } from '@/types/document';
import { SubCategoryStockHealthDto, ArticleStockDto } from '@/types/analytics';
import { useStockDashboardStats } from '@/hooks/use-stock';
import { useEcheances, useSalesEcheances } from '@/hooks/use-payments';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityLogSection } from '@/components/analytics/activity-log-section';
import { AnalyticsReport } from '@/components/analytics/analytics-report';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
  const { hasAnyPermission } = usePermissionGuard();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState<number | 'ALL'>(new Date().getMonth() + 1);
  const [receivablesSearch, setReceivablesSearch] = useState('');
  const [showReport, setShowReport] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: enterprise } = useEnterprise();

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Rapport Complet — ${enterprise?.name || 'Analyse Business'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; background: #ffffff; }
            @media print {
              @page { margin: 15mm; size: A4; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const { data: kpis, isLoading: isLoadingKpis, isError } = useAnalyticsKpis(
    chartMonth === 'ALL' ? undefined : chartMonth,
    chartYear
  );

  // Profit Margins Analytics state
  const [marginAnalyticsYear, setMarginAnalyticsYear] = useState<number>(new Date().getFullYear());
  const [marginAnalyticsCostMethod, setMarginAnalyticsCostMethod] = useState<'lastPrice' | 'cmp'>('lastPrice');

  const { data: profitMarginAnalytics, isLoading: isLoadingProfitMargins } = useProfitMargins(
    undefined,
    undefined,
    chartMonth === 'ALL' ? undefined : chartMonth,
    marginAnalyticsYear,
    marginAnalyticsCostMethod,
    true
  );

  // ── ADVANCED RECEIVABLES ANALYSIS DIALOG STATES ──
  const [showReceivablesDialog, setShowReceivablesDialog] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [dialogMinAmount, setDialogMinAmount] = useState<number | ''>('');
  const [dialogMaxAmount, setDialogMaxAmount] = useState<number | ''>('');
  const [dialogAgeFilter, setDialogAgeFilter] = useState<'all' | 'lt30' | 'bt30_90' | 'gt90'>('all');
  const [dialogPayFilter, setDialogPayFilter] = useState<'all' | 'lt50' | 'bt50_80' | 'gt80'>('all');
  const [dialogSort, setDialogSort] = useState<'outstanding_desc' | 'outstanding_asc' | 'age_desc' | 'pay_asc' | 'name_asc'>('outstanding_desc');

  // Filtered & Sorted Receivables for Dialog
  const dialogFilteredReceivables = React.useMemo(() => {
    if (!kpis?.customerReceivables) return [];

    let list = [...kpis.customerReceivables];

    // 1. Filter by Name
    if (dialogSearch.trim()) {
      const s = dialogSearch.toLowerCase();
      list = list.filter((c: any) => c.name.toLowerCase().includes(s));
    }

    // 2. Filter by Min Amount
    if (typeof dialogMinAmount === 'number') {
      list = list.filter((c: any) => c.outstanding >= dialogMinAmount);
    }

    // 3. Filter by Max Amount
    if (typeof dialogMaxAmount === 'number') {
      list = list.filter((c: any) => c.outstanding <= dialogMaxAmount);
    }

    // 4. Filter by Oldest Invoice Age (oldestInvoiceDays)
    if (dialogAgeFilter === 'lt30') {
      list = list.filter((c: any) => c.oldestInvoiceDays < 30);
    } else if (dialogAgeFilter === 'bt30_90') {
      list = list.filter((c: any) => c.oldestInvoiceDays >= 30 && c.oldestInvoiceDays <= 90);
    } else if (dialogAgeFilter === 'gt90') {
      list = list.filter((c: any) => c.oldestInvoiceDays > 90);
    }

    // 5. Filter by % Paid
    if (dialogPayFilter !== 'all') {
      list = list.filter((c: any) => {
        const progress = c.totalInvoiced > 0 ? (c.totalPaid / c.totalInvoiced) * 100 : 0;
        if (dialogPayFilter === 'lt50') return progress < 50;
        if (dialogPayFilter === 'bt50_80') return progress >= 50 && progress <= 80;
        if (dialogPayFilter === 'gt80') return progress > 80;
        return true;
      });
    }

    // 6. Sort
    list.sort((a: any, b: any) => {
      const aProgress = a.totalInvoiced > 0 ? (a.totalPaid / a.totalInvoiced) * 100 : 0;
      const bProgress = b.totalInvoiced > 0 ? (b.totalPaid / b.totalInvoiced) * 100 : 0;

      switch (dialogSort) {
        case 'outstanding_desc':
          return b.outstanding - a.outstanding;
        case 'outstanding_asc':
          return a.outstanding - b.outstanding;
        case 'age_desc':
          return b.oldestInvoiceDays - a.oldestInvoiceDays;
        case 'pay_asc':
          return aProgress - bProgress;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return list;
  }, [kpis?.customerReceivables, dialogSearch, dialogMinAmount, dialogMaxAmount, dialogAgeFilter, dialogPayFilter, dialogSort]);

  // Derived KPI Stats for Dialog
  const dialogSummaryStats = React.useMemo(() => {
    const list = dialogFilteredReceivables;
    const totalOutstanding = list.reduce((sum: number, c: any) => sum + (c.outstanding || 0), 0);
    const criticalCount = list.filter((c: any) => c.oldestInvoiceDays > 90).length;
    const avgAge = list.length > 0 
      ? Math.round(list.reduce((sum: number, c: any) => sum + (c.oldestInvoiceDays || 0), 0) / list.length) 
      : 0;

    return {
      totalOutstanding,
      criticalCount,
      avgAge,
      totalCount: list.length
    };
  }, [dialogFilteredReceivables]);

  // Export CSV Function
  const exportToCSV = () => {
    if (dialogFilteredReceivables.length === 0) return;

    // Headers
    const headers = ['Client', 'Total Facture (DT)', 'Total Paye (DT)', 'Solde Restant (DT)', '% Paye', 'Anciennete (jours)'];
    const rows = dialogFilteredReceivables.map((c: any) => {
      const progress = c.totalInvoiced > 0 ? (c.totalPaid / c.totalInvoiced) * 100 : 0;
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        c.totalInvoiced.toFixed(3),
        c.totalPaid.toFixed(3),
        c.outstanding.toFixed(3),
        `${progress.toFixed(1)}%`,
        c.oldestInvoiceDays
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `suivi_creances_clients_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const { data: monthlyData, isLoading: isLoadingMonthly } = useMonthlyRevenue(6);
  
  const [topSalesMonths, setTopSalesMonths] = useState<number>(6);
  const { data: topSubCategories, isLoading: isLoadingTopSubCategories } = useTopSubCategories(topSalesMonths);
  const [selectedSalesSubCatId, setSelectedSalesSubCatId] = useState<number | undefined>(undefined);
  
  const [stockSiteId, setStockSiteId] = useState<number | undefined>(undefined);
  const { data: stockHealth, isLoading: isLoadingStockHealth } = useStockHealthBySubCategory(stockSiteId);
  const [selectedStockSubCatId, setSelectedStockSubCatId] = useState<number | undefined>(undefined);
  const { data: allArticles = [] } = useArticles();

  const stockHealthWithMinQty = React.useMemo(() => {
    if (!stockHealth) return [];
    return stockHealth.map((subCat: SubCategoryStockHealthDto) => ({
      ...subCat,
      articleStocks: subCat.articleStocks.map((a: ArticleStockDto) => {
        const article = allArticles.find((art: any) => art.id === a.articleId);
        return {
          ...a,
          minimumStock: article ? article.minquantity : a.minimumStock
        };
      })
    }));
  }, [stockHealth, allArticles]);
  
  const { data: stockStats } = useStockDashboardStats(stockSiteId);

  // Future treasury coverage projection hooks & logic
  const [projectionDays, setProjectionDays] = useState<60 | 90 | 120 | 150>(90);
  const { data: purchaseEcheances = [], isLoading: loadingPurchases } = useEcheances(projectionDays);
  const { data: salesEcheances = [], isLoading: loadingSales } = useSalesEcheances(projectionDays);

  const futureTotals = React.useMemo(() => {
    const purchasesTotal = purchaseEcheances.reduce((acc: number, curr: any) => acc + (curr.totalAmount || 0), 0);
    const salesTotal = salesEcheances.reduce((acc: number, curr: any) => acc + (curr.totalAmount || 0), 0);
    return {
      purchases: purchasesTotal,
      sales: salesTotal,
      net: salesTotal - purchasesTotal
    };
  }, [purchaseEcheances, salesEcheances]);

  const combinedEcheancesData = React.useMemo(() => {
    const dataMap: Record<string, { dateLabel: string; dateObj: Date; purchases: number; sales: number }> = {};

    purchaseEcheances.forEach((item: any) => {
      const d = new Date(item.dueDate);
      const key = d.toDateString();
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!dataMap[key]) {
        dataMap[key] = { dateLabel: label, dateObj: d, purchases: 0, sales: 0 };
      }
      dataMap[key].purchases += Number(item.totalAmount || 0);
    });

    salesEcheances.forEach((item: any) => {
      const d = new Date(item.dueDate);
      const key = d.toDateString();
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!dataMap[key]) {
        dataMap[key] = { dateLabel: label, dateObj: d, purchases: 0, sales: 0 };
      }
      dataMap[key].sales += Number(item.totalAmount || 0);
    });

    return Object.values(dataMap)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map((item) => ({
        name: item.dateLabel,
        purchases: item.purchases,
        sales: item.sales,
      }));
  }, [purchaseEcheances, salesEcheances]);

  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();

  const { data: achatsDocs = [] } = useDocumentsByTypeFiltered({
    typeDoc: DocumentTypes.supplierInvoice,
    month: chartMonth === 'ALL' ? 0 : chartMonth,
    year: chartYear,
    day: 0
  });

  const { data: avoirsDocs = [] } = useDocumentsByTypeFiltered({
    typeDoc: DocumentTypes.supplierInvoiceReturn,
    month: chartMonth === 'ALL' ? 0 : chartMonth,
    year: chartYear,
    day: 0
  });

  const totalPurchasesTTC = React.useMemo(() => {
    let total = 0;
    achatsDocs.forEach((doc: any) => {
      total += (doc.total_net_ttc || 0);
    });
    avoirsDocs.forEach((doc: any) => {
      total -= (doc.total_net_ttc || 0);
    });
    return total;
  }, [achatsDocs, avoirsDocs]);

  useEffect(() => {
    if (topSubCategories && topSubCategories.length > 0 && !selectedSalesSubCatId) {
      setSelectedSalesSubCatId(topSubCategories[0].subCategoryId);
    }
  }, [topSubCategories, selectedSalesSubCatId]);

  useEffect(() => {
    if (stockHealthWithMinQty && stockHealthWithMinQty.length > 0 && !selectedStockSubCatId) {
      setSelectedStockSubCatId(stockHealthWithMinQty[0].subCategoryId);
    }
  }, [stockHealthWithMinQty, selectedStockSubCatId]);
  const { data: supplierChartData, isLoading: isLoadingSupplierChart } = useSupplierPurchasePaymentChart(chartYear, chartMonth);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    
    // Redirect if no permission
    if (!hasAnyPermission('analytics')) {
      toast.error("Vous n'avez pas l'autorisation d'acc\u00e9der aux analyses.");
      router.replace('/');
    }
  }, [hasAnyPermission, router]);

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
    { title: 'CA Mois Achat', value: formatCurrency(totalPurchasesTTC), icon: TrendingDown, trend: 'down', change: 'Achats (TTC)', warning: false, isAchat: true },
    { title: 'Alertes Stock', value: `${kpis?.stockAlertCount || 0} Articles`, icon: AlertTriangle, trend: kpis?.stockAlertCount ? 'down' : 'up', change: 'Sous seuil min', warning: !!kpis?.stockAlertCount },
  ];

  // Visual render: Pie Chart for Activity by Document Type
  const renderPieChart = () => {
    if (!isMounted || isLoadingKpis) {
      return <div className="h-full w-full bg-slate-100/70 animate-pulse rounded-xl" />;
    }
    
    if (salesByCategory.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
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
            innerRadius={65}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="#FFFFFF"
            strokeWidth={2}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {salesByCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[190px]">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: payload[0].payload.fill }} />
                      <span className="font-semibold text-slate-800 text-xs truncate">{payload[0].name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 pl-5">
                      <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">{payload[0].value}</span>
                      <span className="text-xs text-slate-500 font-medium">doc(s)</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Visual render: Supplier Purchases vs Payments Bar Chart
  const renderSupplierChart = () => {
    if (!isMounted || isLoadingSupplierChart) {
      return (
        <div className="h-full w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des données...</span>
        </div>
      );
    }

    if (!supplierChartData || supplierChartData.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucune donnée pour la période sélectionnée
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={supplierChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }} barGap={8}>
          <defs>
            <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity={1} />
              <stop offset="100%" stopColor="#B45309" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
            dx={-8}
          />
          <Tooltip 
            cursor={{ fill: '#F1F5F9', opacity: 0.6 }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[210px]">
                    <p className="font-semibold text-slate-800 text-xs mb-2 pb-1.5 border-b border-slate-100">{label}</p>
                    <div className="space-y-2">
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: entry.name === 'purchases' ? '#D97706' : '#10B981' }} />
                            <span className="text-xs text-slate-500 font-medium">{entry.name === 'purchases' ? 'Achats TTC' : 'Règlements'}</span>
                          </div>
                          <span className="font-bold text-slate-900 font-mono text-xs pl-4 tabular-nums">{formatCurrency(Number(entry.value || 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ paddingBottom: '20px' }} 
            formatter={(value) => <span className="text-slate-700 font-medium text-xs ml-1">{value === 'purchases' ? 'Achats TTC' : 'Règlements'}</span>}
          />
          <Bar dataKey="purchases" name="purchases" fill="url(#colorPurchases)" radius={[4, 4, 0, 0]} barSize={26} animationDuration={1000} animationEasing="ease-out" />
          <Bar dataKey="payments" name="payments" fill="url(#colorPayments)" radius={[4, 4, 0, 0]} barSize={26} animationDuration={1000} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Visual render: Top Clients list by monthly turnover
  const renderTopClients = () => {
    if (isLoadingKpis) {
      return new Array(5).fill(0).map((_, i) => (
        <div key={`skeleton-client-${i}`} className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl border border-slate-200">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ));
    }

    if (!kpis?.topClients || kpis.topClients.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 font-medium text-xs sm:text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          Aucune vente enregistrée ce mois-ci
        </div>
      );
    }

    return kpis.topClients.map((client, i) => (
      <div key={client.id} className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center bg-corp-blue-100 text-corp-blue-700 rounded-lg text-xs font-bold shrink-0">{i + 1}</span>
          <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs" title={client.name}>{client.name}</span>
        </div>
        <div className="text-right pl-2">
          <div className="font-bold font-mono text-corp-blue-700 text-xs sm:text-sm tabular-nums">{formatCurrency(client.totalAmount)}</div>
        </div>
      </div>
    ));
  };

  // Visual render: Customer Receivables list & aging distribution
  const renderReceivables = () => {
    if (isLoadingKpis) {
      return (
        <div className="h-[380px] w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des créances...</span>
        </div>
      );
    }

    if (!kpis?.customerReceivables || kpis.customerReceivables.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 font-medium text-xs sm:text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          Aucune créance client enregistrée
        </div>
      );
    }

    const filteredReceivables = kpis.customerReceivables.filter(c => 
      c.name.toLowerCase().includes(receivablesSearch.toLowerCase())
    );

    const formatDays = (days: number) => {
      if (days < 30) return <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px] font-semibold">&lt; 30 j</span>;
      if (days <= 90) return <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-semibold">{days} j</span>;
      return <span className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded text-[11px] font-semibold">&gt; 90 j</span>;
    };

    if (filteredReceivables.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 font-medium text-xs sm:text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          Aucun client trouvé pour &quot;{receivablesSearch}&quot;
        </div>
      );
    }

    return (
      <div className="grid gap-6 lg:grid-cols-2 h-full items-start">
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredReceivables.map((client, i) => {
            const progress = client.totalInvoiced > 0 ? (client.totalPaid / client.totalInvoiced) * 100 : 0;
            return (
              <div key={client.id} className="flex flex-col gap-2 p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold shrink-0">{i + 1}</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate" title={client.name}>{client.name}</span>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <div className="font-bold font-mono text-rose-700 text-xs sm:text-sm tabular-nums">{formatCurrency(client.outstanding)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-200/90 rounded-full overflow-hidden" title={`${progress.toFixed(0)}% payé`}>
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">Ancienneté:</span>
                    {formatDays(client.oldestInvoiceDays)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="h-[380px] w-full hidden lg:block border border-slate-100 rounded-xl p-3 bg-slate-50/30">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={filteredReceivables} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                width={110}
              />
              <Tooltip 
                cursor={{ fill: '#F1F5F9', opacity: 0.6 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[190px]">
                        <p className="font-semibold text-slate-800 text-xs mb-1.5 border-b border-slate-100 pb-1 truncate">{label}</p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 font-medium">Reste à payer</span>
                          <span className="font-bold text-rose-700 font-mono text-xs tabular-nums">{formatCurrency(Number(payload[0].value || 0))}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="outstanding" name="Outstanding" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1000} animationEasing="ease-out">
                {filteredReceivables.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.oldestInvoiceDays > 90 ? '#E11D48' : entry.oldestInvoiceDays > 30 ? '#D97706' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Visual render: Top Sales per Sub-Category Pie Chart
  const renderTopSubCategories = () => {
    if (isLoadingTopSubCategories) {
      return (
        <div className="h-[360px] w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des données...</span>
        </div>
      );
    }

    if (!topSubCategories || topSubCategories.length === 0) {
      return (
        <div className="h-[360px] w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucune donnée de vente pour cette période
        </div>
      );
    }

    const selectedData = topSubCategories.find(s => s.subCategoryId === selectedSalesSubCatId) || topSubCategories[0];
    const articles = selectedData?.topArticles || [];

    if (articles.length === 0) {
      return (
        <div className="h-[360px] w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucun article vendu dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={articles}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={115}
              paddingAngle={4}
              dataKey="quantitySold"
              nameKey="articleName"
              stroke="#FFFFFF"
              strokeWidth={2}
              animationDuration={1000}
              animationEasing="ease-out"
              label={({ cx, cy, midAngle, outerRadius, value, payload }: any) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius * 1.15;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                if (articles.length > 5 && value < (articles[0]?.quantitySold || 0) * 0.08) return null;
                return (
                  <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-semibold">
                    {payload.articleName.substring(0, 18)}{payload.articleName.length > 18 ? '...' : ''}
                  </text>
                );
              }}
            >
              {articles.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                        <div className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: payload[0].payload.fill }} />
                        <span className="font-semibold text-slate-800 text-xs truncate">{data.articleName}</span>
                      </div>
                      <div className="space-y-1 pl-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 font-medium">Quantité</span>
                          <span className="font-bold text-slate-900 font-mono text-xs tabular-nums">{data.quantitySold}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 font-medium">CA TTC</span>
                          <span className="font-bold text-emerald-700 font-mono text-xs tabular-nums">{formatCurrency(data.revenueTTC)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Visual render: Profit Margins & Profitability Analytics
  const renderProfitMarginsAnalytics = () => {
    if (!isMounted || isLoadingProfitMargins) {
      return (
        <div className="h-[320px] w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des données de rentabilité...</span>
        </div>
      );
    }

    const items = profitMarginAnalytics?.items || [];
    if (items.length === 0) {
      return (
        <div className="h-[320px] w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucune donnée de marge pour cette période
        </div>
      );
    }

    const topItems = items.slice(0, 7);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/90 rounded-xl shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Marge Totale HT</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">{formatCurrency(profitMarginAnalytics?.totalMarginHT || 0)}</div>
          </div>
          <div className="p-4 bg-slate-50/70 border border-slate-200/90 rounded-xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Ventes Totales HT</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{formatCurrency(profitMarginAnalytics?.totalSalesHTNet || 0)}</div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Taux de Marge Global</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">{(profitMarginAnalytics?.globalMarginPercentage || 0).toFixed(2)} %</div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={topItems} margin={{ top: 10, right: 20, left: 10, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
              <XAxis dataKey="articleReference" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(val) => `${val} DT`} dx={-5} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[200px]">
                        <p className="font-semibold text-slate-800 text-xs mb-0.5">{data.articleReference}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px] pb-1.5 mb-1.5 border-b border-slate-100">{data.articleDescription}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-3"><span className="text-slate-500">Marge HT:</span> <span className="font-bold text-emerald-700 font-mono tabular-nums">{formatCurrency(data.marginHT)}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-slate-500">Taux Marge:</span> <span className="font-bold text-slate-900 font-mono tabular-nums">{data.marginPercentage.toFixed(2)}%</span></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="marginHT" name="Marge HT" fill="#10B981" radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Visual render: Stock Health Bar Chart and Threshold Alerts
  const renderStockHealth = () => {
    if (isLoadingStockHealth) {
      return (
        <div className="h-[380px] w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des données...</span>
        </div>
      );
    }

    if (!stockHealthWithMinQty || stockHealthWithMinQty.length === 0) {
      return (
        <div className="h-[380px] w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucune donnée de stock trouvée
        </div>
      );
    }

    const selectedData = stockHealthWithMinQty.find(s => s.subCategoryId === selectedStockSubCatId) || stockHealthWithMinQty[0];
    const articles = selectedData?.articleStocks || [];

    if (articles.length === 0) {
      return (
        <div className="h-[380px] w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
          Aucun article en stock dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[380px] w-full flex flex-col gap-4">
        <ResponsiveContainer width="100%" height="82%" minWidth={1} minHeight={1}>
          <BarChart data={articles} margin={{ top: 15, right: 20, left: 10, bottom: 25 }} barGap={6}>
            <defs>
              <linearGradient id="colorHealthyStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="colorWarningStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="colorDangerStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" stopOpacity={1} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
            <XAxis 
              dataKey="articleName" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} 
              dy={10} 
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              dx={-8}
            />
            <Tooltip 
              cursor={{ fill: '#F1F5F9', opacity: 0.6 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[190px]">
                      <p className="font-semibold text-slate-800 text-xs mb-2 pb-1.5 border-b border-slate-100 truncate">{label}</p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => {
                          const isCustomColor = entry.name === 'Stock Actuel' && entry.payload;
                          let dotColor = entry.color;
                          if (isCustomColor) {
                            if (entry.payload.currentStock <= entry.payload.minimumStock && entry.payload.minimumStock > 0) dotColor = '#E11D48';
                            else if (entry.payload.currentStock <= entry.payload.minimumStock * 1.2 && entry.payload.minimumStock > 0) dotColor = '#F59E0B';
                            else dotColor = '#10B981';
                          }
                          return (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: dotColor }} />
                                <span className="text-xs text-slate-500 font-medium">{entry.name}</span>
                              </div>
                              <span className="font-bold text-slate-900 font-mono text-xs tabular-nums">{entry.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle" 
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            <Bar dataKey="currentStock" name="Stock Actuel" radius={[4, 4, 0, 0]} barSize={22} animationDuration={1000} animationEasing="ease-out">
              {articles.map((entry, index) => {
                let colorId = 'url(#colorHealthyStock)'; // healthy
                if (entry.currentStock <= entry.minimumStock && entry.minimumStock > 0) {
                  colorId = 'url(#colorDangerStock)'; // danger
                } else if (entry.currentStock <= entry.minimumStock * 1.2 && entry.minimumStock > 0) {
                  colorId = 'url(#colorWarningStock)'; // warning
                }
                return <Cell key={`cell-${index}`} fill={colorId} />;
              })}
            </Bar>
            <Bar dataKey="minimumStock" name="Stock Minimum" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={22} opacity={0.7} animationDuration={1000} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {articles.filter(a => a.currentStock <= a.minimumStock && a.minimumStock > 0).map(a => (
            <div key={a.articleId} className="whitespace-nowrap bg-rose-50 border border-rose-200/90 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{a.articleName}: <strong className="font-mono tabular-nums">{a.currentStock}</strong> / {a.minimumStock} min</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Page Header and Filter Toolbar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Analyses Business</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Intelligence commerciale et performance opérationnelle du parc.
            </p>
          </motion.div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toolbar */}
            <div className="inline-flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
              <select 
                className="h-9 rounded-lg bg-slate-50/80 hover:bg-slate-100/90 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer border border-transparent hover:border-slate-200 transition-colors focus:ring-1 focus:ring-corp-blue-500"
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
              >
                <option value={new Date().getFullYear()}>Année {new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>Année {new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear() - 2}>Année {new Date().getFullYear() - 2}</option>
              </select>
              <div className="w-px h-5 bg-slate-200 shrink-0"></div>
              <select 
                className="h-9 rounded-lg bg-slate-50/80 hover:bg-slate-100/90 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer border border-transparent hover:border-slate-200 transition-colors focus:ring-1 focus:ring-corp-blue-500"
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
            <Button
              onClick={() => setShowReport(true)}
              className="h-9 sm:h-10 bg-corp-blue-600 text-white hover:bg-corp-blue-700 font-semibold text-xs sm:text-sm rounded-xl shadow-xs px-4 transition-colors gap-2 shrink-0"
            >
              <Download className="w-4 h-4" /> Rapport Complet
            </Button>
          </div>
        </header>

        {isError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-medium text-xs sm:text-sm">Impossible de charger les données analytiques. Veuillez réessayer plus tard.</p>
          </div>
        )}

        {/* 5 Top KPI Cards — Equal Weight, Consistent Height, Clear Hierarchy */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isLoadingKpis ? (
            new Array(5).fill(0).map((_, i) => (
              <Card key={`skeleton-kpi-${i}`} className="border border-slate-200 bg-white shadow-xs rounded-2xl p-5 flex flex-col justify-between h-[132px]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-7 w-28 rounded" />
                </div>
                <Skeleton className="h-3 w-16 rounded" />
              </Card>
            ))
          ) : (
            kpiCards.map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="h-full"
              >
                <Card className={cn(
                  "h-full bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all duration-200",
                  stat.warning && "border-amber-300/90 bg-amber-50/20 hover:border-amber-400",
                  stat.isAchat && "border-slate-200 bg-slate-50/40 hover:border-slate-300"
                )}>
                  {/* KPI Card Header: readable title & visible icon container */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 line-clamp-1 truncate" title={stat.title}>
                      {stat.title}
                    </span>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                      stat.warning ? "bg-amber-50 text-amber-600 border-amber-200" : 
                      stat.isAchat ? "bg-amber-50 text-amber-700 border-amber-200/80" : 
                      "bg-corp-blue-50 text-corp-blue-600 border-corp-blue-100"
                    )}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Main KPI Value: bold, large, high-contrast numeric */}
                  <div className="my-2.5">
                    <div className="text-xl sm:text-2xl lg:text-[1.55rem] font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                      {stat.value}
                    </div>
                  </div>

                  {/* Contextual & Trend Information: crisp status pill */}
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                      stat.trend === 'up' 
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200/70" 
                        : (stat.warning 
                          ? "text-amber-700 bg-amber-50 border-amber-200/70" 
                          : (stat.isAchat 
                            ? "text-amber-800 bg-amber-50/70 border-amber-200/70" 
                            : "text-rose-700 bg-rose-50 border-rose-200/70"))
                    )}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className={cn(
                          "w-3 h-3 shrink-0",
                          stat.warning ? "text-amber-600" : (stat.isAchat ? "text-amber-700" : "text-rose-600")
                        )} />
                      )}
                      <span>{stat.change}</span>
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Future Treasury Coverage Projection Chart */}
          <Card className="lg:col-span-12 border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-corp-blue-600 shrink-0" />
                  Couverture de Trésorerie Future (Projection à Échéance)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                  Visualisation de la couverture des achats futurs (décaissements) par les règlements clients attendus (encaissements).
                </CardDescription>
              </div>
              <div className="inline-flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
                {([60, 90, 120, 150] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setProjectionDays(days)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                      projectionDays === days
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {days} jours
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5 space-y-6">
              {/* KPIs indicators — Equal height & clear boundary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/30 border border-slate-200 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                      Encaissements Prévus (Ventes)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg sm:text-xl font-bold font-mono text-emerald-800 tracking-tight tabular-nums">
                        {formatCurrency(futureTotals.sales)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/30 border border-slate-200 border-l-4 border-l-amber-500 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                      Décaissements Prévus (Achats)
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg sm:text-xl font-bold font-mono text-amber-800 tracking-tight tabular-nums">
                        {formatCurrency(futureTotals.purchases)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "border border-slate-200 border-l-4 rounded-xl p-4 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors",
                  futureTotals.net >= 0 
                    ? "bg-teal-50/30 border-l-teal-500" 
                    : "bg-rose-50/30 border-l-rose-500"
                )}>
                  <div className={cn(
                    "w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0",
                    futureTotals.net >= 0 ? "bg-teal-500" : "bg-rose-500"
                  )}>
                    {futureTotals.net >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                      Solde Net Prévisionnel
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={cn(
                        "text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums",
                        futureTotals.net >= 0 ? "text-teal-900" : "text-rose-900"
                      )}>
                        {formatCurrency(futureTotals.net)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Area Chart Container */}
              <div className="h-[360px] w-full relative min-h-0">
                {loadingPurchases || loadingSales ? (
                  <div className="h-full w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
                    <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des projections...</span>
                  </div>
                ) : combinedEcheancesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={combinedEcheancesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSalesProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPurchProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 500}} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748B', fontSize: 11, fontWeight: 500}}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
                        dx={-8}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[210px]">
                                <p className="font-semibold text-slate-800 text-xs mb-2 pb-1.5 border-b border-slate-100">Échéance du {label}</p>
                                <div className="space-y-2">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: entry.name === 'sales' ? '#10B981' : '#F59E0B' }} />
                                        <span className="text-xs text-slate-500 font-medium">{entry.name === 'sales' ? 'Encaissements Clients' : 'Décaissements Achats'}</span>
                                      </div>
                                      <span className="font-bold text-slate-900 font-mono text-xs pl-4 tabular-nums">{formatCurrency(Number(entry.value || 0))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle" 
                        wrapperStyle={{ paddingBottom: '20px' }}
                        formatter={(value) => <span className="text-slate-700 font-medium text-xs ml-1">{value === 'sales' ? 'Encaissements Clients' : 'Décaissements Achats'}</span>}
                      />
                      <Area type="monotone" dataKey="sales" name="sales" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesProj)" />
                      <Area type="monotone" dataKey="purchases" name="purchases" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchProj)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs sm:text-sm">
                    Aucune projection d&apos;échéance disponible.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Purchases vs Payments Chart */}
          <Card className="lg:col-span-12 border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Achats vs Règlements par Fournisseur</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Comparaison de l&apos;engagement financier et du niveau de règlement.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="h-[360px] w-full relative min-h-0">
                {renderSupplierChart()}
              </div>
            </CardContent>
          </Card>

          {/* Profit Margins Analysis Chart Card */}
          <Card className="lg:col-span-12 border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Marges Bénéficiaires &amp; Rentabilité
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Analyse comparative des prix de vente HT nets vs coûts d&apos;achat HT nets par article.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={marginAnalyticsCostMethod}
                  onValueChange={(val) => val && setMarginAnalyticsCostMethod(val as 'lastPrice' | 'cmp')}
                >
                  <SelectTrigger className="w-auto min-w-[200px] h-9 text-xs font-semibold border-slate-200 rounded-lg bg-slate-50/80 hover:bg-slate-100">
                    <SelectValue placeholder="Méthode d'Achat">
                      {marginAnalyticsCostMethod === 'cmp' ? 'CMP (Coût Moyen)' : 'Dernier Prix (Par défaut)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-slate-200">
                    <SelectItem value="lastPrice" className="text-xs font-medium">Dernier Prix (Par défaut)</SelectItem>
                    <SelectItem value="cmp" className="text-xs font-medium">CMP (Coût Moyen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              {renderProfitMarginsAnalytics()}
            </CardContent>
          </Card>

          {/* Revenue Evolution */}
          <Card className="lg:col-span-8 border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Évolution Revenue &amp; Marge</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Comparaison mensuelle du chiffre d&apos;affaires et de la rentabilité brute.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="h-[360px] w-full relative min-h-0">
                {!isMounted || isLoadingMonthly ? (
                  <div className="h-full w-full bg-slate-100/70 animate-pulse rounded-xl flex items-center justify-center">
                    <span className="text-slate-400 font-medium text-xs sm:text-sm">Chargement des données...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={monthlyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.8} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 500}} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748B', fontSize: 11, fontWeight: 500}}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
                        dx={-8}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[200px]">
                                <p className="font-semibold text-slate-800 text-xs mb-2 pb-1.5 border-b border-slate-100">{label}</p>
                                <div className="space-y-2">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: entry.color }} />
                                        <span className="text-xs text-slate-500 font-medium">{entry.name}</span>
                                      </div>
                                      <span className="font-bold text-slate-900 font-mono text-xs pl-4 tabular-nums">{formatCurrency(Number(entry.value || 0))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" animationDuration={1000} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="margin" name="Marge" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMargin)" animationDuration={1000} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Category (Now by Document Type for accuracy given our API) */}
          <Card className="lg:col-span-4 border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Activité par Document</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Répartition du volume des opérations.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="h-[260px] w-full relative min-h-0">
                {renderPieChart()}
              </div>
              <div className="mt-6 space-y-2">
                {salesByCategory.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-xs" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                      <span className="text-xs font-semibold text-slate-800 capitalize truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded tabular-nums">{cat.value} doc(s)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Clients & Performance */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Top Clients (CA du mois)</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Les clients générant le plus de volume sur la période.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="space-y-3">
                {renderTopClients()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200 rounded-2xl shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Clients / Fournisseurs</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Total du réseau : {customers.length + suppliers.length} partenaires</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="h-[250px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Clients', value: customers.length },
                        { name: 'Fournisseurs', value: suppliers.length }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip 
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[150px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: payload[0].payload.fill }} />
                                <span className="font-semibold text-slate-800 text-xs">{payload[0].name}</span>
                              </div>
                              <p className="text-lg font-bold text-slate-900 font-mono pl-4 tabular-nums">{payload[0].value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suivi des Créances Clients */}
        <Card className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Suivi des Créances Clients</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowReceivablesDialog(true)}
                    className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200"
                    title="Analyse approfondie et filtres"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Surveillance globale des factures impayées (Balance = Débit - Crédit)</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher un client..." 
                    value={receivablesSearch}
                    onChange={(e) => setReceivablesSearch(e.target.value)}
                    className="pl-9 bg-slate-50/80 border-slate-200 rounded-xl text-xs sm:text-sm w-[220px] sm:w-[260px] focus-visible:ring-corp-blue-500"
                  />
                </div>
                <div className="bg-rose-50 border border-rose-200/80 p-2 rounded-xl text-rose-600 hidden sm:flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 lg:p-7 pt-5">
            {renderReceivables()}
          </CardContent>
        </Card>

        {/* ── ADVANCED RECEIVABLES ANALYSIS DIALOG ── */}
        <Dialog open={showReceivablesDialog} onOpenChange={(open: boolean) => {
          setShowReceivablesDialog(open);
          if (!open) {
            // Reset dialog states when closing
            setDialogSearch('');
            setDialogMinAmount('');
            setDialogMaxAmount('');
            setDialogAgeFilter('all');
            setDialogPayFilter('all');
            setDialogSort('outstanding_desc');
          }
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-5xl xl:max-w-6xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>Analyse Approfondie des Créances Clients</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Filtrez par montant, date d&apos;échéance et exportez les rapports complets.
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={dialogFilteredReceivables.length === 0}
                  className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs gap-2 shrink-0 h-9 bg-white shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  Exporter en CSV
                </Button>
              </div>
            </DialogHeader>

            {/* Dialog summary KPI Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-slate-50/40 border-b border-slate-200">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Créances totales</span>
                <span className="text-base sm:text-lg font-bold text-rose-700 font-mono tabular-nums">
                  {formatCurrency(dialogSummaryStats.totalOutstanding)}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Clients en retard (&gt;90j)</span>
                <span className="text-base sm:text-lg font-bold text-amber-700 font-mono tabular-nums">
                  {dialogSummaryStats.criticalCount}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Ancienneté Moyenne</span>
                <span className="text-base sm:text-lg font-bold text-slate-800 font-mono tabular-nums">
                  {dialogSummaryStats.avgAge} <span className="text-xs font-normal text-slate-400">jours</span>
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total filtré</span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono tabular-nums">
                  {dialogSummaryStats.totalCount} <span className="text-xs font-normal text-slate-400">clients</span>
                </span>
              </div>
            </div>

            {/* Filtering and sorting controls */}
            <div className="p-5 border-b border-slate-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher un client..." 
                    value={dialogSearch}
                    onChange={(e) => setDialogSearch(e.target.value)}
                    className="pl-9 bg-white border-slate-200 rounded-xl w-full text-xs sm:text-sm h-9"
                  />
                </div>

                {/* Min amount input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-semibold uppercase">Min DT</span>
                  <Input 
                    type="number"
                    placeholder="0.000" 
                    value={dialogMinAmount === '' ? '' : dialogMinAmount}
                    onChange={(e) => setDialogMinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="pl-16 bg-white border-slate-200 rounded-xl w-full text-xs sm:text-sm font-mono h-9"
                  />
                </div>

                {/* Max amount input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-semibold uppercase">Max DT</span>
                  <Input 
                    type="number"
                    placeholder="Filtre max..." 
                    value={dialogMaxAmount === '' ? '' : dialogMaxAmount}
                    onChange={(e) => setDialogMaxAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="pl-16 bg-white border-slate-200 rounded-xl w-full text-xs sm:text-sm font-mono h-9"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Age and pay filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ancienneté</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                      {[
                        { id: 'all', label: 'Tous' },
                        { id: 'lt30', label: '< 30 j' },
                        { id: 'bt30_90', label: '30-90 j' },
                        { id: 'gt90', label: '> 90 j' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setDialogAgeFilter(opt.id as any)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all",
                            dialogAgeFilter === opt.id
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Taux de règlement</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                      {[
                        { id: 'all', label: 'Tous' },
                        { id: 'lt50', label: '< 50%' },
                        { id: 'bt50_80', label: '50-80%' },
                        { id: 'gt80', label: '> 80%' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setDialogPayFilter(opt.id as any)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all",
                            dialogPayFilter === opt.id
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sort selector */}
                <div className="flex flex-col gap-0.5 shrink-0 w-full sm:w-[220px]">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Trier par</span>
                  <Select value={dialogSort} onValueChange={(val) => setDialogSort(val as any)}>
                    <SelectTrigger className="w-full bg-white border-slate-200 rounded-xl text-xs font-semibold h-9">
                      <SelectValue placeholder="Ordre d'affichage">
                        {dialogSort === 'outstanding_desc' && "Solde restant (Décroissant)"}
                        {dialogSort === 'outstanding_asc' && "Solde restant (Croissant)"}
                        {dialogSort === 'age_desc' && "Ancienneté (Plus ancien)"}
                        {dialogSort === 'pay_asc' && "Taux payé (Moins réglé)"}
                        {dialogSort === 'name_asc' && "Nom du client (A-Z)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 rounded-xl">
                      <SelectItem value="outstanding_desc" className="text-xs font-medium cursor-pointer hover:bg-slate-50">Solde restant (Décroissant)</SelectItem>
                      <SelectItem value="outstanding_asc" className="text-xs font-medium cursor-pointer hover:bg-slate-50">Solde restant (Croissant)</SelectItem>
                      <SelectItem value="age_desc" className="text-xs font-medium cursor-pointer hover:bg-slate-50">Ancienneté (Plus ancien)</SelectItem>
                      <SelectItem value="pay_asc" className="text-xs font-medium cursor-pointer hover:bg-slate-50">Taux payé (Moins réglé)</SelectItem>
                      <SelectItem value="name_asc" className="text-xs font-medium cursor-pointer hover:bg-slate-50">Nom du client (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dialogue Table Area */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar">
              {dialogFilteredReceivables.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2.5 text-slate-300" />
                  <p className="text-xs sm:text-sm font-semibold">Aucun résultat ne correspond à vos filtres.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 sticky top-0 backdrop-blur z-10">
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Client</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-right">Facturé</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-right">Payé</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-right">Solde Restant</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-center">Taux</th>
                      <th className="px-5 py-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-center">Ancienneté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dialogFilteredReceivables.map((client: any) => {
                      const progress = client.totalInvoiced > 0 ? (client.totalPaid / client.totalInvoiced) * 100 : 0;
                      
                      let ageColor = 'text-emerald-700 bg-emerald-50 border-emerald-200/80';
                      let ageLabel = '< 30 j';
                      if (client.oldestInvoiceDays >= 30 && client.oldestInvoiceDays <= 90) {
                        ageColor = 'text-amber-700 bg-amber-50 border-amber-200/80';
                        ageLabel = `${client.oldestInvoiceDays} j`;
                      } else if (client.oldestInvoiceDays > 90) {
                        ageColor = 'text-rose-700 bg-rose-50 border-rose-200/80';
                        ageLabel = `> 90 j (${client.oldestInvoiceDays} j)`;
                      }

                      return (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {client.name}
                          </td>
                          <td className="px-5 py-3 text-xs font-mono font-medium text-slate-600 text-right tabular-nums">
                            {formatCurrency(client.totalInvoiced)}
                          </td>
                          <td className="px-5 py-3 text-xs font-mono font-medium text-slate-600 text-right tabular-nums">
                            {formatCurrency(client.totalPaid)}
                          </td>
                          <td className="px-5 py-3 text-xs font-mono font-bold text-rose-700 text-right tabular-nums">
                            {formatCurrency(client.outstanding)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress.toFixed(0)}%</span>
                              <div className="w-16 h-1.5 bg-slate-200/90 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={cn("px-2 py-0.5 rounded-md border text-[11px] font-semibold inline-block", ageColor)}>
                              {ageLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Stock Health & Top SubCategories */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stock Health Pie */}
          <Card className="lg:col-span-1 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Santé du Stock</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Répartition globale des articles</CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              <div className="h-[340px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Bon', value: stockStats?.healthyStockItems ?? 0 },
                        { name: 'Bas', value: stockStats?.lowStockItems ?? 0 },
                        { name: 'Rupture', value: stockStats?.outOfStockItems ?? 0 }
                      ]}
                      outerRadius={110}
                      innerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip 
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md rounded-xl p-3 min-w-[150px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: payload[0].payload.fill }} />
                                <span className="font-semibold text-slate-800 text-xs">{payload[0].name}</span>
                              </div>
                              <p className="text-lg font-bold text-slate-900 font-mono pl-4 tabular-nums">{payload[0].value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Ventes par Sous-Catégorie */}
          <Card className="lg:col-span-2 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
            <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Top Ventes par Sous-Catégorie</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Les sous-catégories les plus performantes (quantité et CA).</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {topSubCategories && topSubCategories.length > 0 && (
                    <select
                      value={selectedSalesSubCatId || ""}
                      onChange={(e) => setSelectedSalesSubCatId(Number(e.target.value))}
                      className="h-8 bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    >
                      {topSubCategories.map(c => (
                        <option key={c.subCategoryId} value={c.subCategoryId}>{c.subCategoryName}</option>
                      ))}
                    </select>
                  )}
                  <div className="inline-flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
                    {[3, 6, 12].map((m) => (
                      <button
                        key={m}
                        onClick={() => setTopSalesMonths(m)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                          topSalesMonths === m 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {m} mois
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-7 pt-5">
              {renderTopSubCategories()}
            </CardContent>
          </Card>
        </div>

        {/* Stock Health per SubCategory */}
        <Card className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <CardHeader className="p-6 lg:p-7 pb-4 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">Santé du Stock par Sous-Catégorie</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Comparaison du stock actuel avec le seuil d&apos;alerte (stock minimum).</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {stockHealthWithMinQty && stockHealthWithMinQty.length > 0 && (
                  <select
                    value={selectedStockSubCatId || ""}
                    onChange={(e) => setSelectedStockSubCatId(Number(e.target.value))}
                    className="h-9 rounded-xl bg-slate-50/80 border border-slate-200 px-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus-visible:ring-corp-blue-500"
                  >
                    {stockHealthWithMinQty.map(c => (
                      <option key={c.subCategoryId} value={c.subCategoryId}>{c.subCategoryName}</option>
                    ))}
                  </select>
                )}
                <select
                  value={stockSiteId || ""}
                  onChange={(e) => setStockSiteId(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9 rounded-xl bg-slate-50/80 border border-slate-200 px-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus-visible:ring-corp-blue-500"
                >
                  <option value="">Tous les sites (Entreprise)</option>
                  <option value="1">Site Principal</option>
                  <option value="2">Dépôt Secondaire</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 lg:p-7 pt-5">
            {renderStockHealth()}
          </CardContent>
        </Card>

        {/* Activity Log — human-readable audit feed for non-IT managers */}
        <ActivityLogSection />

      </div>

      {/* ── RAPPORT COMPLET MODAL ── */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-0 flex flex-col max-h-[92vh]">
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-corp-blue-600" />
                  Rapport Complet d&apos;Analyse Business
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Aperçu avant impression — Cliquez sur «&nbsp;Imprimer&nbsp;» pour lancer le dialogue d&apos;impression.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handlePrint}
                  className="h-9 bg-corp-blue-600 text-white hover:bg-corp-blue-700 font-semibold px-4 text-xs sm:text-sm rounded-xl shadow-xs gap-2"
                >
                  <Download className="w-4 h-4" /> Imprimer
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowReport(false)}
                  className="h-9 w-9 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable report preview */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-4">
            <div ref={printRef} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <AnalyticsReport
                enterprise={enterprise}
                chartMonth={chartMonth}
                chartYear={chartYear}
                kpis={kpis}
                totalPurchasesTTC={totalPurchasesTTC}
                monthlyData={monthlyData || []}
                profitMarginAnalytics={profitMarginAnalytics}
                futureTotals={futureTotals}
                stockStats={stockStats}
                customersCount={customers.length}
                suppliersCount={suppliers.length}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

