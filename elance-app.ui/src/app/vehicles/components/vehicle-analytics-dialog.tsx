'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import {
  Fuel,
  Droplets,
  Wrench,
  Calendar,
  ShieldCheck,
  Disc,
  Receipt,
  FileText,
  Loader2,
  DollarSign,
  Gauge,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Truck,
  User,
  Building2,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import { VehicleExpense, VehicleExpenseStats } from '@/types/vehicle-expense';
import { vehicleExpenseService } from '@/services/components/vehicle-expense.service';
import { VehicleExpenseDialog } from './vehicle-expense-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VehicleAnalyticsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onVehicleUpdated?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  Fuel: { label: 'Carburant', icon: Fuel, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  OilChange: { label: 'Vidange', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  Repair: { label: 'Réparation', icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  TechnicalVisit: { label: 'Visite Tech', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  Insurance: { label: 'Assurance', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Tires: { label: 'Pneus', icon: Disc, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  Vignette: { label: 'Vignette', icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  Other: { label: 'Autre', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#06b6d4', '#f97316', '#64748b'];

export function VehicleAnalyticsDialog({
  isOpen,
  onClose,
  vehicle,
  onVehicleUpdated,
}: VehicleAnalyticsDialogProps) {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<VehicleExpenseStats | null>(null);
  const [expenses, setExpenses] = React.useState<VehicleExpense[]>([]);
  const [filterType, setFilterType] = React.useState<string>('ALL');

  // Expense form dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = React.useState(false);
  const [expenseToEdit, setExpenseToEdit] = React.useState<VehicleExpense | null>(null);

  const loadData = React.useCallback(async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const [statsData, expensesData] = await Promise.all([
        vehicleExpenseService.getStats(vehicle.id),
        vehicleExpenseService.getByVehicle(vehicle.id),
      ]);
      setStats(statsData);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des données analytiques');
    } finally {
      setLoading(false);
    }
  }, [vehicle]);

  React.useEffect(() => {
    if (isOpen && vehicle) {
      loadData();
    }
  }, [isOpen, vehicle, loadData]);

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette entrée ?')) return;
    try {
      await vehicleExpenseService.delete(id);
      toast.success('Entrée supprimée');
      loadData();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openAddExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseDialogOpen(true);
  };

  const openEditExpense = (exp: VehicleExpense) => {
    setExpenseToEdit(exp);
    setIsExpenseDialogOpen(true);
  };

  const filteredExpenses = React.useMemo(() => {
    if (filterType === 'ALL') return expenses;
    return expenses.filter(e => e.type === filterType);
  }, [expenses, filterType]);

  // Format chart data
  const monthlyChartData = React.useMemo(() => {
    if (!stats?.monthlyExpenses) return [];
    return stats.monthlyExpenses.map(m => ({
      ...m,
      name: m.month,
      carburant: m.fuelAmount,
      entretien: m.maintenanceAmount,
      total: m.totalAmount,
      kilometrage: m.maxMileage || 0,
    }));
  }, [stats]);

  const pieChartData = React.useMemo(() => {
    if (!stats?.expenseBreakdown) return [];
    return stats.expenseBreakdown.map(b => ({
      name: TYPE_CONFIG[b.type]?.label || b.type,
      value: b.amount,
      count: b.count,
    }));
  }, [stats]);

  if (!vehicle) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 border-corp-blue-100 shadow-2xl bg-sand-50/30">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-corp-blue-950 via-corp-blue-900 to-corp-blue-800 text-white p-6 sm:p-8 rounded-t-3xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg text-amber-400">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{vehicle.brand}</h2>
                    <Badge className="bg-corp-blue-500/30 text-corp-blue-100 border-white/20 font-mono text-xs font-bold">
                      {vehicle.serialnumber}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-corp-blue-200 mt-1 font-medium">
                    {vehicle.fuelcardconductor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-corp-blue-300" /> {vehicle.fuelcardconductor}
                      </span>
                    )}
                    {vehicle.mileage && (
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-corp-blue-300" /> {Number(vehicle.mileage).toLocaleString()} km
                      </span>
                    )}
                    {vehicle.fuelcardtype && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-corp-blue-300" /> {vehicle.fuelcardtype} ({vehicle.fuelcardamount ? `${vehicle.fuelcardamount} DT` : 'Carte'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={openAddExpense}
                  className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-corp-blue-950 font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nouveau Plein / Dépense
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Consommation Moyenne */}
              <div className="bg-white rounded-2xl p-5 border border-corp-blue-100/60 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Consommation</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Fuel className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-corp-blue-950">
                    {loading ? '...' : stats?.averageConsumptionPer100Km ? `${stats.averageConsumptionPer100Km} L` : 'N/D'}
                    <span className="text-xs font-bold text-sand-400 ml-1">/ 100 km</span>
                  </div>
                  <p className="text-[0.7rem] font-semibold text-sand-500 mt-1">
                    {stats?.totalLiters ? `${stats.totalLiters.toLocaleString()} L consommés` : 'Calculé sur les pleins'}
                  </p>
                </div>
              </div>

              {/* Card 2: Dépenses Carburant */}
              <div className="bg-white rounded-2xl p-5 border border-corp-blue-100/60 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Total Carburant</span>
                  <span className="p-2 rounded-xl bg-corp-blue-50 text-corp-blue-600">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-corp-blue-950">
                    {loading ? '...' : `${(stats?.totalFuelAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} DT`}
                  </div>
                  <p className="text-[0.7rem] font-semibold text-sand-500 mt-1">
                    Plafond carte : {vehicle.fuelcardamount ? `${vehicle.fuelcardamount} DT` : 'Non défini'}
                  </p>
                </div>
              </div>

              {/* Card 3: Entretien & Réparations */}
              <div className="bg-white rounded-2xl p-5 border border-corp-blue-100/60 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Maintenance & Réparations</span>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Wrench className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-corp-blue-950">
                    {loading ? '...' : `${(stats?.totalMaintenanceAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} DT`}
                  </div>
                  <p className="text-[0.7rem] font-semibold text-sand-500 mt-1">
                    Vidanges, pneus, visites, pièces
                  </p>
                </div>
              </div>

              {/* Card 4: Coût Total de Fonctionnement (TCO) */}
              <div className="bg-white rounded-2xl p-5 border border-corp-blue-100/60 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Coût Global Flotte</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-corp-blue-950">
                    {loading ? '...' : `${(stats?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} DT`}
                  </div>
                  <p className="text-[0.7rem] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {stats?.totalExpensesCount || 0} opérations enregistrées
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs: Visual Analytics vs Operations Journal */}
            <Tabs defaultValue="charts" className="space-y-6">
              <div className="flex items-center justify-between border-b border-corp-blue-100/60 pb-3">
                <TabsList className="bg-sand-100/80 p-1 rounded-xl">
                  <TabsTrigger value="charts" className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-corp-blue-950">
                    📊 Graphiques & Consommation
                  </TabsTrigger>
                  <TabsTrigger value="journal" className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-corp-blue-950">
                    📋 Journal des Opérations ({expenses.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Charts & Analytics */}
              <TabsContent value="charts" className="space-y-6 m-0">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-sand-400">
                    <Loader2 className="w-8 h-8 animate-spin text-corp-blue-600" />
                    <span className="font-bold text-sm">Génération des graphiques...</span>
                  </div>
                ) : monthlyChartData.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-corp-blue-200">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
                      <Fuel className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-corp-blue-950">Aucune donnée historique</h3>
                    <p className="text-xs text-sand-500 max-w-sm mx-auto mt-1 mb-6">
                      Enregistrez votre premier plein de carburant ou entretien pour visualiser les graphiques de consommation et de coûts.
                    </p>
                    <Button onClick={openAddExpense} className="rounded-xl bg-corp-blue-600 text-white font-bold">
                      <Plus className="w-4 h-4 mr-2" /> Ajouter un plein maintenant
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Area Chart: Monthly Expenses (Fuel vs Maintenance) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-corp-blue-100/60 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-corp-blue-950">Évolution des Dépenses Mensuelles (TND)</h3>
                          <p className="text-[0.7rem] text-sand-400 font-medium">Comparatif Carburant vs Maintenance</p>
                        </div>
                        <div className="flex items-center gap-3 text-[0.7rem] font-bold">
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Carburant
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Entretien
                          </span>
                        </div>
                      </div>

                      <div className="h-[280px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="colorMaint" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-corp-blue-950 text-white p-3 rounded-xl shadow-xl border border-corp-blue-800 text-xs">
                                      <p className="font-bold text-corp-blue-200 mb-1">{label}</p>
                                      {payload.map((entry: any, index: number) => (
                                        <p key={index} className="font-semibold flex items-center justify-between gap-4">
                                          <span style={{ color: entry.color }}>{entry.name}:</span>
                                          <span className="font-mono font-bold">{Number(entry.value).toFixed(3)} DT</span>
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="carburant" name="Carburant" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFuel)" />
                            <Area type="monotone" dataKey="entretien" name="Entretien" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMaint)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Donut Chart: Expenses Breakdown */}
                    <div className="bg-white rounded-2xl p-6 border border-corp-blue-100/60 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-corp-blue-950">Répartition des Coûts</h3>
                        <p className="text-[0.7rem] text-sand-400 font-medium">Par catégorie de dépense</p>
                      </div>

                      <div className="h-[230px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-corp-blue-950 text-white p-2.5 rounded-xl text-xs shadow-xl">
                                      <p className="font-bold">{data.name}</p>
                                      <p className="font-mono text-amber-400 font-bold">{Number(data.value).toFixed(3)} DT ({data.count} ops)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sand-100">
                        {pieChartData.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[0.7rem]">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="font-semibold text-sand-600 truncate">{item.name}</span>
                            <span className="font-bold text-corp-blue-950 ml-auto">{Math.round(item.value)} DT</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progression Kilométrique Chart */}
                    <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-corp-blue-100/60 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-corp-blue-950">Suivi Kilométrique au Compteur</h3>
                          <p className="text-[0.7rem] text-sand-400 font-medium">Kilométrage cumulé enregistré lors des pleins et passages à l'atelier</p>
                        </div>
                      </div>

                      <div className="h-[220px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-corp-blue-950 text-white p-3 rounded-xl shadow-xl text-xs">
                                      <p className="font-bold text-corp-blue-200">{label}</p>
                                      <p className="font-mono font-bold text-amber-400">
                                        Compteur : {Number(payload[0].value).toLocaleString()} km
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="kilometrage"
                              stroke="#0d9488"
                              strokeWidth={3}
                              dot={{ fill: '#0d9488', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Operations Journal Table */}
              <TabsContent value="journal" className="space-y-4 m-0">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={filterType === 'ALL' ? 'default' : 'outline'}
                    onClick={() => setFilterType('ALL')}
                    className={`rounded-xl text-xs font-bold ${filterType === 'ALL' ? 'bg-corp-blue-900 text-white' : 'border-corp-blue-100 text-corp-blue-900'}`}
                  >
                    Tous ({expenses.length})
                  </Button>
                  {Object.entries(TYPE_CONFIG).map(([typeKey, config]) => {
                    const count = expenses.filter(e => e.type === typeKey).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={typeKey}
                        size="sm"
                        variant={filterType === typeKey ? 'default' : 'outline'}
                        onClick={() => setFilterType(typeKey)}
                        className={`rounded-xl text-xs font-bold ${filterType === typeKey ? 'bg-corp-blue-900 text-white' : 'border-corp-blue-100 text-corp-blue-900'}`}
                      >
                        {config.label} ({count})
                      </Button>
                    );
                  })}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-corp-blue-100/60 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-sand-50/70 border-b border-corp-blue-50">
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Date</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Opération</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider">Chauffeur / Station</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider text-center">Compteur</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider text-right">Volume / Détails</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider text-right">Montant (TND)</th>
                          <th className="p-4 text-[0.7rem] font-bold text-sand-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-corp-blue-50 text-xs">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-sand-400">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-corp-blue-600 mb-2" />
                              Chargement du journal...
                            </td>
                          </tr>
                        ) : filteredExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-sand-400 font-bold">
                              Aucune opération trouvée pour ce filtre.
                            </td>
                          </tr>
                        ) : (
                          filteredExpenses.map((item) => {
                            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.Other;
                            const Icon = config.icon;
                            return (
                              <tr key={item.id} className="hover:bg-sand-50/50 transition-colors">
                                <td className="p-4 font-bold text-corp-blue-950 whitespace-nowrap">
                                  {new Date(item.date).toLocaleDateString('fr-TN')}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[0.7rem] font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {config.label}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-corp-blue-900">{item.driverName || '---'}</div>
                                  <div className="text-[0.7rem] text-sand-400">{item.stationOrProvider || ''}</div>
                                </td>
                                <td className="p-4 text-center font-mono font-bold text-sand-600">
                                  {item.mileage ? `${Number(item.mileage).toLocaleString()} km` : '---'}
                                </td>
                                <td className="p-4 text-right">
                                  {item.liters ? (
                                    <span className="font-bold text-amber-600">{item.liters} L</span>
                                  ) : (
                                    <span className="text-sand-400 truncate max-w-xs block">{item.notes || '---'}</span>
                                  )}
                                </td>
                                <td className="p-4 text-right font-black font-mono text-corp-blue-950 text-sm">
                                  {item.amount.toFixed(3)}
                                </td>
                                <td className="p-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openEditExpense(item)}
                                      className="h-8 w-8 rounded-lg text-sand-400 hover:text-corp-blue-600 hover:bg-corp-blue-50"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteExpense(item.id)}
                                      className="h-8 w-8 rounded-lg text-sand-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Expense Dialog */}
      <VehicleExpenseDialog
        isOpen={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        vehicle={vehicle}
        expenseToEdit={expenseToEdit}
        onSuccess={() => {
          loadData();
          if (onVehicleUpdated) onVehicleUpdated();
        }}
      />
    </>
  );
}
