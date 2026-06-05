'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { 
  useCaisseBalance, 
  useCaisseMovements, 
  useCaisseApproLimit,
  useAddCaisseMovement, 
  useDeleteCaisseMovement 
} from '@/hooks/use-caisse';
import { useDashboardPayments } from '@/hooks/use-dashboard-payments';
import { useStockHealthBySubCategory } from '@/hooks/use-analytics-kpis';
import { useDocumentsByType } from '@/hooks/use-documents';
import { DocumentTypes } from '@/types/document';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { caisseService } from '@/services/treasury/caisse.service';

import { InstrumentsTable } from '@/components/dashboard/instruments-table';

// UI components from shadcn library
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { TablePagination } from '@/components/shared/table-pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Recharts components for beautiful visualization
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis,
  CartesianGrid
} from 'recharts';

import { 
  Users, 
  CreditCard, 
  Activity, 
  DollarSign,
  Plus,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Trash2,
  Loader2,
  Calendar,
  Settings,
  ShoppingCart,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Truck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function DashboardContent() {
  const router = useRouter();
  
  // NOTE: Auth store hook to fetch current logged-in user profile, role, and sales site context.
  const { user } = useAuthStore();
  const siteId = user?.defaultSiteId ? Number(user.defaultSiteId) : undefined;
  const siteName = user?.defaultSite || '';
  const isAdmin = user?.role === 'Admin';
  
  // ── STATE MANAGEMENT ──
  // selectedDate filters the dashboard payments list
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  // timelineDate filters the movements in the horizontal caisse track
  const [timelineDate, setTimelineDate] = React.useState<Date>(new Date());
  // Caisse action state: ENTREE or SORTIE movement dialog
  const [movementModalType, setMovementModalType] = React.useState<'ENTREE' | 'SORTIE' | null>(null);
  
  // Form states for adding cash movements
  const [movementAmount, setMovementAmount] = React.useState<string>('');
  const [movementReason, setMovementReason] = React.useState<string>('');
  const [movementReference, setMovementReference] = React.useState<string>('');
  const [movementNotes, setMovementNotes] = React.useState<string>('');
  
  // Pagination states for payments table
  const [paymentsPage, setPaymentsPage] = React.useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = React.useState(5);

  const [selectedStockSubCatId, setSelectedStockSubCatId] = React.useState<number | undefined>(undefined);

  // ── API/DATA FETCHING ──
  // React Query signals invalidation on successful mutations automatically
  const { data: balanceData, isLoading: isBalanceLoading } = useCaisseBalance(siteId);
  const caisseBalance = balanceData?.currentBalance ?? 0;

  const { data: movements = [], isLoading: isMovementsLoading } = useCaisseMovements(siteId, 100, timelineDate);
  const { data: approLimit } = useCaisseApproLimit(siteId);

  // Payments filtering based on selected date and user permissions
  const { data: payments = [], isLoading: isPaymentsLoading } = useDashboardPayments(
    selectedDate, 
    user?.id ? Number(user.id) : undefined, 
    'customer'
  );


  
  // Fetch client invoices (type = 6) to calculate daily sales and 7-day bar chart
  const { data: invoices = [], isLoading: isInvoicesLoading } = useDocumentsByType(DocumentTypes.customerInvoice);

  // Stock health data for connected site
  const { data: stockHealth, isLoading: isLoadingStockHealth } = useStockHealthBySubCategory(siteId);

  // Mutations
  const addMovementMutation = useAddCaisseMovement();
  const deleteMovementMutation = useDeleteCaisseMovement();

  // Reset default reason when modal opens
  React.useEffect(() => {
    if (movementModalType === 'ENTREE') {
      setMovementReason('APPROVISIONNEMENT');
    } else if (movementModalType === 'SORTIE') {
      setMovementReason('REMISE_CENTRALE');
    }
    // Clean inputs
    setMovementAmount('');
    setMovementReference('');
    setMovementNotes('');
  }, [movementModalType]);

  // ── CALCULATIONS & DATA TRANSFORMS ──

  // Today's Sales Calculation
  const dailySales = React.useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return invoices
      .filter((inv) => {
        const invDateStr = format(new Date(inv.creationdate), 'yyyy-MM-dd');
        return invDateStr === todayStr;
      })
      .reduce((sum, inv) => sum + (inv.total_net_ttc || 0), 0);
  }, [invoices]);

  // Sales Chart: last 7 days aggregation
  const salesChartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = format(d, 'yyyy-MM-dd');
      
      const dayTotal = invoices
        .filter((inv) => format(new Date(inv.creationdate), 'yyyy-MM-dd') === dStr)
        .reduce((sum, inv) => sum + (inv.total_net_ttc || 0), 0);

      data.push({
        name: format(d, 'EEE dd', { locale: fr }),
        total: dayTotal,
      });
    }
    return data;
  }, [invoices]);

  // Payment totals split by payment method
  const paymentMethodTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    const methodConfigs: Record<string, { icon: any; color: string; bg: string }> = {
      'CASH': { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
      'ESPECE': { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
      'CHEQUE': { icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
      'VIREMENT': { icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
      'CARTE': { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
      'TRAITE': { icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' }
    };

    payments.forEach((p) => {
      const method = (p.paymentMethod || 'AUTRE').toUpperCase();
      totals[method] = (totals[method] || 0) + p.amount;
    });

    return Object.keys(totals).map((method) => {
      const config = methodConfigs[method] || { icon: DollarSign, color: 'text-sand-400', bg: 'bg-sand-50 border-sand-100' };
      return {
        method,
        total: totals[method],
        icon: config.icon,
        color: config.color,
        bg: config.bg
      };
    });
  }, [payments]);

  // Paginated Payments Table list
  const paginatedPayments = React.useMemo(() => {
    const start = (paymentsPage - 1) * paymentsPageSize;
    return payments.slice(start, start + paymentsPageSize);
  }, [payments, paymentsPage, paymentsPageSize]);

  // Check if timeline is pointing to today to disable forward nav
  const isTimelineToday = timelineDate.toDateString() === new Date().toDateString();

  const handlePrevDay = () => {
    const d = new Date(timelineDate);
    d.setDate(d.getDate() - 1);
    setTimelineDate(d);
  };

  const handleNextDay = () => {
    if (isTimelineToday) return;
    const d = new Date(timelineDate);
    d.setDate(d.getDate() + 1);
    setTimelineDate(d);
  };

  const handleGoToToday = () => {
    setTimelineDate(new Date());
  };

  // Helper to format C# movement reasons to user-friendly titles
  const formatReason = (reason: string) => {
    if (!reason) return '';
    return reason
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const MOVEMENT_REASONS: Record<string, string> = {
    SOLDE_INITIAL: 'Solde Initial',
    APPROVISIONNEMENT: 'Approvisionnement',
    AUTRE: 'Autre Entrée',
    REMISE_CENTRALE: 'Remise à la Caisse Principale',
    DEPENSE_DIVERS: 'Dépense Divers'
  };

  // ── CAISSE MOVEMENT ACTIONS ──
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;

    const amount = Number(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    // Safety checks matching Angular component validation
    if (movementModalType === 'SORTIE' && amount > caisseBalance) {
      alert('Solde insuffisant dans la caisse');
      return;
    }

    if (movementModalType === 'ENTREE' && approLimit && amount > approLimit.remaining) {
      alert(`Plafond espèces dépassé. Max disponible : ${approLimit.remaining.toFixed(3)} TND`);
      return;
    }

    await addMovementMutation.mutateAsync({
      salesSiteId: siteId,
      type: movementModalType!,
      amount,
      reason: movementReason,
      reference: movementReference || undefined,
      notes: movementNotes || undefined,
      createdByUserId: user?.id
    });

    setMovementModalType(null);
  };

  const handleDeleteMovement = (id: number, reason: string) => {
    if (!confirm(`Supprimer définitivement "${formatReason(reason)}" ?\nCette action est irréversible.`)) {
      return;
    }
    deleteMovementMutation.mutate({ id, salesSiteId: siteId! });
  };

  // Colors mapping for Recharts Doughnut/Pie Charts
  const chartColors = {
    green: '#1D9E75',
    orange: '#D4AF37',
    red: '#EF5350',
    lightGreen: '#EAF3EE',
    lightOrange: '#FAF6EA',
  };

  // Loading indicator for background operations
  const isGlobalLoading = isBalanceLoading || isInvoicesLoading;

  const renderStockHealth = () => {
    if (isLoadingStockHealth) {
      return (
        <div className="h-[220px] w-full bg-forest-50/30 animate-pulse rounded-2xl flex items-center justify-center">
          <span className="text-forest-300 font-medium">Chargement des données...</span>
        </div>
      );
    }

    if (!stockHealth || stockHealth.length === 0) {
      return (
        <div className="h-[220px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucune donnée de stock trouvée
        </div>
      );
    }

    const selectedData = stockHealth.find(s => s.subCategoryId === selectedStockSubCatId) || stockHealth[0];
    const articles = selectedData?.articleStocks || [];

    if (articles.length === 0) {
      return (
        <div className="h-[220px] w-full flex items-center justify-center bg-sand-50 rounded-2xl text-sand-400 text-sm">
          Aucun article en stock dans cette sous-catégorie
        </div>
      );
    }

    return (
      <div className="h-[220px] w-full flex flex-col gap-4">
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
            <ChartTooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
              formatter={(value: any, name: any) => {
                const displayName = name === 'Stock Actuel' ? 'Stock Actuel' : 
                                    name === 'Stock Minimum' ? 'Stock Minimum' : name;
                return [value, displayName];
              }}
            />
            <ChartLegend 
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
    <div className="space-y-10">
      
      {/* ── HEADER & WELCOME ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-forest-900">
            Tableau de bord
          </h1>
          <p className="text-sand-400 mt-2 font-medium">
            Bienvenue, <span className="text-forest-600 font-bold">{user?.fullname}</span>. Voici l'activité générale de votre caisse et de vos parcs.
          </p>
        </motion.div>
        
        {/* Action shortcuts */}
        <div className="flex items-center gap-3">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => router.push('/sales/customer-invoice-modal')}
            className="h-12 rounded-xl border-forest-100 text-forest-600 hover:bg-forest-50 font-bold"
          >
            Facturer
          </Button>
          <Button 
            size="lg" 
            onClick={() => router.push('/sales')}
            className="h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 gap-2 px-6"
          >
            <Plus className="w-5 h-5" /> Nouvelle Vente
          </Button>
        </div>
      </header>

      {/* ── CAISSE SECTION (GLASSMORPHISM / EDITORIAL LUXURY) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <Card className="border-forest-100/50 bg-white/70 backdrop-blur-md rounded-[32px] overflow-hidden shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-6 border-b border-forest-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-forest-50 text-forest-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">
                    Caisse Point de Vente (Espèces) {siteName ? `— ${siteName}` : ''}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h2 className="text-3xl font-black text-forest-900 tracking-tight">
                      {caisseBalance.toFixed(3)}
                    </h2>
                    <span className="text-sm font-bold text-forest-600">TND</span>
                  </div>
                </div>
              </div>

              {/* Cash operations triggers */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setMovementModalType('ENTREE')} 
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 gap-2"
                >
                  <ArrowDownLeft className="w-4 h-4" /> Approvisionner
                </Button>
                <Button 
                  onClick={() => setMovementModalType('SORTIE')} 
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-5 gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" /> Remise caisse
                </Button>
              </div>
            </div>

            {/* ── HORIZONTAL TIMELINE RECAP ── */}
            <div className="mt-8 space-y-6">
              
              {/* Timeline Header controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-bold text-sand-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest-600" />
                  Mouvements de Caisse
                </span>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handlePrevDay}
                    className="h-8 w-8 rounded-lg text-forest-600 hover:bg-forest-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>

                  <div className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5",
                    isTimelineToday ? "bg-forest-50 border-forest-100 text-forest-800" : "bg-white border-border text-sand-400"
                  )}>
                    <Calendar className="w-3.5 h-3.5" />
                    {isTimelineToday ? "Aujourd'hui" : format(timelineDate, 'EEE dd MMM yyyy', { locale: fr })}
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleNextDay}
                    disabled={isTimelineToday}
                    className="h-8 w-8 rounded-lg text-forest-600 hover:bg-forest-50 disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {!isTimelineToday && (
                  <Button 
                    variant="link" 
                    onClick={handleGoToToday}
                    className="text-xs text-forest-600 font-bold p-0 h-auto hover:text-forest-800"
                  >
                    Revenir à aujourd'hui
                  </Button>
                )}
              </div>

              {/* Timeline track / lists */}
              {isMovementsLoading ? (
                <div className="h-28 flex items-center justify-center text-sand-300">
                  <Loader2 className="w-6 h-6 animate-spin text-forest-600 mr-2" />
                  Chargement de la timeline...
                </div>
              ) : movements.length === 0 ? (
                <div className="h-28 border border-dashed border-forest-100 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                  <p className="text-sm font-bold text-sand-400">Aucun mouvement enregistré pour cette journée.</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto py-8 px-2 scrollbar-thin">
                  <div className="flex items-center min-w-max gap-12 relative">
                    
                    {/* Horizontal connector line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-forest-100/50 -translate-y-1/2 z-0" />

                    {movements.map((m: any, index: number) => {
                      const isEven = index % 2 === 0;
                      const isEntree = m.type === 'ENTREE';
                      
                      return (
                        <div 
                          key={m.id}
                          className={cn(
                            "flex flex-col items-center relative z-10 w-44 group",
                            isEven ? "justify-end pb-8" : "justify-start pt-8"
                          )}
                        >
                          {/* Value layout - zigzag: even displays amount on top */}
                          {isEven && (
                            <div className="text-center mb-3">
                              <span className={cn(
                                "text-xs font-black tracking-tight",
                                isEntree ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {isEntree ? '+' : '−'}{Number(m.amount).toFixed(3)} <small className="text-[0.6rem] font-bold">TND</small>
                              </span>
                            </div>
                          )}

                          {/* Node dot trigger */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center relative border-2 shadow-sm transition-all duration-300 group-hover:scale-110",
                            isEntree 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" 
                              : "bg-rose-50 border-rose-500 text-rose-600 group-hover:bg-rose-500 group-hover:text-white"
                          )}>
                            {/* Pulse for first item today */}
                            {index === 0 && isTimelineToday && (
                              <span className={cn(
                                "absolute inset-0 rounded-full animate-ping opacity-75 z-[-1]",
                                isEntree ? "bg-emerald-400" : "bg-rose-400"
                              )} />
                            )}
                            {isEntree ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>

                          {/* Value layout - zigzag: odd displays amount at bottom */}
                          {!isEven && (
                            <div className="text-center mt-3">
                              <span className={cn(
                                "text-xs font-black tracking-tight",
                                isEntree ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {isEntree ? '+' : '−'}{Number(m.amount).toFixed(3)} <small className="text-[0.6rem] font-bold">TND</small>
                              </span>
                            </div>
                          )}

                          {/* Text indicators */}
                          <div className={cn("text-center mt-2 flex flex-col", isEven ? "" : "order-first mb-2 mt-0")}>
                            <span className="text-[0.7rem] font-bold text-forest-900 leading-tight">
                              {formatReason(m.reason)}
                            </span>
                            <span className="text-[0.65rem] text-sand-300 font-bold mt-0.5">
                              {format(new Date(m.movementDate), 'HH:mm')}
                            </span>
                          </div>

                          {/* Action to delete manual entries */}
                          {m.paymentId === null && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMovement(m.id, m.reason)}
                              className="w-6 h-6 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white border border-rose-100 hover:bg-rose-50 text-rose-600 shadow-sm transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}

                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── SHORTCUTS CONTAINER ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[
          { title: 'Clients', icon: Users, path: '/customers', color: 'text-blue-600 bg-blue-50 border-blue-100/50' },
          { title: 'Fournisseurs', icon: Truck, path: '/suppliers', color: 'text-amber-600 bg-amber-50 border-amber-100/50' },
          { title: 'Ventes', icon: ShoppingCart, path: '/sales', color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50' },
          { title: 'Comptabilité', icon: FileText, path: '/accounting', color: 'text-purple-600 bg-purple-50 border-purple-100/50' },
          { title: 'Paramètres', icon: Settings, path: '/settings', disabled: !isAdmin, color: 'text-sand-400 bg-sand-50 border-sand-100/50' }
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
          >
            <Card 
              onClick={() => !item.disabled && router.push(item.path)}
              className={cn(
                "border border-transparent bg-white shadow-none rounded-[20px] cursor-pointer group transition-all duration-300",
                item.disabled ? "opacity-60 cursor-not-allowed" : "hover:border-forest-600 hover:-translate-y-1 hover:shadow-lg hover:shadow-forest-900/5"
              )}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-forest-900 uppercase tracking-widest">{item.title}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── PAYMENTS SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        <div className="space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-forest-600" />
              <h2 className="text-2xl font-heading font-bold text-forest-900">
                Aperçu des Règlements
              </h2>
            </div>
            
            {/* Filter Datepicker */}
            <div className="w-56">
              <DatePicker date={selectedDate} setDate={(d) => d && setSelectedDate(d)} />
            </div>
          </div>

          {/* Totals Summary */}
          {paymentMethodTotals.length > 0 && (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {paymentMethodTotals.map((tot) => (
                <Card key={tot.method} className={cn("rounded-2xl border bg-white shadow-none", tot.bg)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-white shadow-sm", tot.color)}>
                      <tot.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-wider">{tot.method}</p>
                      <h3 className="text-sm font-black text-forest-950 mt-0.5">
                        {tot.total.toFixed(3)} <span className="text-[0.65rem]">TND</span>
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Table list */}
          <Card className="border-forest-100 rounded-[24px] bg-white overflow-hidden shadow-none">
            <CardContent className="p-0">
              
              {isPaymentsLoading ? (
                <div className="p-12 flex items-center justify-center text-sand-300">
                  <Loader2 className="w-8 h-8 animate-spin text-forest-600 mr-2" />
                  Chargement des règlements...
                </div>
              ) : payments.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-600 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-sand-400">Aucun règlement trouvé pour cette date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-forest-50/50 bg-forest-50/10">
                        <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Heure</th>
                        <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Montant</th>
                        <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Mode</th>
                        <th className="px-6 py-4 text-xs font-bold text-sand-400 uppercase tracking-wider">Documents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forest-50/20">
                      {paginatedPayments.map((p) => {
                        const dateObj = new Date(p.createdAt || p.paymentDate);
                        
                        return (
                          <tr key={p.paymentId} className="hover:bg-forest-50/20 transition-all">
                            <td className="px-6 py-4 text-xs font-bold text-forest-800 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 text-sand-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {format(dateObj, 'HH:mm')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-forest-900">
                              {p.customerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-forest-950 whitespace-nowrap">
                              {p.amount.toFixed(3)} <span className="text-[0.65rem] font-bold text-sand-400">TND</span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="rounded-lg text-xs font-bold px-2 py-0.5">
                                {p.paymentMethod}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {p.invoiceNumber && (
                                  <span className="inline-flex items-center gap-1 text-[0.65rem] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">
                                    <FileText className="w-3 h-3" />
                                    {p.invoiceNumber}
                                  </span>
                                )}
                                {p.deliveryNoteNumber && (
                                  <span className="inline-flex items-center gap-1 text-[0.65rem] font-black text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">
                                    <ShoppingCart className="w-3 h-3" />
                                    {p.deliveryNoteNumber}
                                  </span>
                                )}
                                {!p.invoiceNumber && !p.deliveryNoteNumber && (
                                  <span className="inline-flex items-center gap-1 text-[0.65rem] font-black text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                                    Recouvrement
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Reuse shared TablePagination component */}
                  <TablePagination 
                    currentPage={paymentsPage}
                    totalItems={payments.length}
                    pageSize={paymentsPageSize}
                    onPageChange={(page) => setPaymentsPage(page)}
                    onPageSizeChange={(size) => {
                      setPaymentsPageSize(size);
                      setPaymentsPage(1);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── INSTRUMENTS & BORDEREAU SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
      >
        <InstrumentsTable />
      </motion.div>

      {/* ── CHARTS CONTAINER ── */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Sales Chart (last 7 days Bar Chart) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="border-forest-100 rounded-[28px] shadow-none bg-white overflow-hidden h-full">
            <CardHeader className="p-6">
              <CardTitle className="font-heading text-lg text-forest-900">Ventes (7j)</CardTitle>
              <CardDescription className="text-sand-400 font-medium flex items-center justify-between">
                <span>Aujourd'hui</span>
                <span className="font-bold text-forest-600">{dailySales.toFixed(3)} TND</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={salesChartData}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={5}
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      width={30}
                    />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                      itemStyle={{ color: '#0B3B24', fontWeight: 'bold' }}
                      cursor={{ fill: '#F8FAFC', radius: 4 }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#0B3B24" 
                      radius={[4, 4, 0, 0]} 
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stock Health per SubCategory */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-forest-100 rounded-[28px] shadow-none bg-white overflow-hidden h-full">
            <CardHeader className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-heading text-lg text-forest-900">Santé du Stock</CardTitle>
                  <CardDescription className="text-sand-400 font-medium">Comparaison avec le stock min</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {stockHealth && stockHealth.length > 0 && (
                    <select
                      value={selectedStockSubCatId || ""}
                      onChange={(e) => setSelectedStockSubCatId(Number(e.target.value))}
                      className="h-8 rounded-xl bg-sand-50/50 border-sand-200 px-2 text-xs font-bold text-forest-900 outline-none cursor-pointer focus-visible:ring-forest-500 max-w-[150px]"
                    >
                      {stockHealth.map(c => (
                        <option key={c.subCategoryId} value={c.subCategoryId}>{c.subCategoryName}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {renderStockHealth()}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* ── DIALOG FOR CAISSE MOVEMENT (ENTREE / SORTIE) ── */}
      <Dialog 
        open={movementModalType !== null} 
        onOpenChange={(open) => !open && setMovementModalType(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-forest-100 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-forest-900 flex items-center gap-2">
              {movementModalType === 'ENTREE' ? <TrendingUp className="text-emerald-600" /> : <TrendingDown className="text-rose-600" />}
              {movementModalType === 'ENTREE' ? 'Approvisionnement Caisse' : 'Remise de Caisse'}
            </DialogTitle>
            <DialogDescription className="text-sand-400 font-medium">
              Veuillez saisir les détails du mouvement de caisse ci-dessous.
            </DialogDescription>
          </DialogHeader>

          {/* Current balance indicator in dialog */}
          <div className={cn(
            "p-4 rounded-xl flex items-center justify-between border",
            movementModalType === 'ENTREE' ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
          )}>
            <div>
              <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-wider">Solde Actuel</p>
              <h4 className="text-lg font-black text-forest-950 mt-0.5">{caisseBalance.toFixed(3)} TND</h4>
            </div>
            {movementModalType === 'ENTREE' && approLimit && (
              <div className="text-right">
                <p className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-wider">Plafond rest.</p>
                <h4 className="text-sm font-bold text-emerald-700 mt-0.5">{approLimit.remaining.toFixed(3)} TND</h4>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitMovement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold text-forest-900 uppercase tracking-wider">Montant (TND)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0.001"
                required
                placeholder="0.000"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="h-11 rounded-xl border-forest-100 focus:ring-forest-600"
              />
              {movementModalType === 'ENTREE' && approLimit && (
                <p className="text-[0.7rem] text-sand-400 font-bold">
                  Limite quotidienne max: {approLimit.remaining.toFixed(3)} TND
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs font-bold text-forest-900 uppercase tracking-wider">Motif</Label>
              <Select value={movementReason} onValueChange={(val: string | null) => setMovementReason(val as string)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-forest-100">
                  <SelectValue placeholder="Sélectionner le motif">
                    {movementReason ? (MOVEMENT_REASONS[movementReason] || formatReason(movementReason)) : "Sélectionner le motif"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-forest-100">
                  {movementModalType === 'ENTREE' ? (
                    <>
                      <SelectItem value="SOLDE_INITIAL">Solde Initial</SelectItem>
                      <SelectItem value="APPROVISIONNEMENT">Approvisionnement</SelectItem>
                      <SelectItem value="AUTRE">Autre Entrée</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="REMISE_CENTRALE">Remise à la Caisse Principale</SelectItem>
                      <SelectItem value="DEPENSE_DIVERS">Dépense Divers</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference" className="text-xs font-bold text-forest-900 uppercase tracking-wider">Référence / Pièce</Label>
              <div className="relative">
                <Input
                  id="reference"
                  type="text"
                  placeholder="Ex: REF-240522-001"
                  value={movementReference}
                  onChange={(e) => setMovementReference(e.target.value)}
                  className="h-11 rounded-xl border-forest-100 focus:ring-forest-600 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1.5 h-8 w-8 text-sand-400 hover:text-forest-600 hover:bg-forest-50"
                  onClick={async () => {
                    try {
                      const res = await caisseService.getNextReference();
                      setMovementReference(res.reference);
                    } catch (err) {
                      console.error('Error fetching reference', err);
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold text-forest-900 uppercase tracking-wider">Notes</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Notes supplémentaires..."
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                className="h-11 rounded-xl border-forest-100 focus:ring-forest-600"
              />
            </div>

            <DialogFooter className="pt-4 flex justify-end gap-3 border-t border-forest-50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMovementModalType(null)}
                className="rounded-xl h-11 border-forest-100 text-forest-600"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={addMovementMutation.isPending || !movementAmount || Number(movementAmount) <= 0}
                className={cn(
                  "rounded-xl h-11 text-white font-bold gap-2",
                  movementModalType === 'ENTREE' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {addMovementMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
