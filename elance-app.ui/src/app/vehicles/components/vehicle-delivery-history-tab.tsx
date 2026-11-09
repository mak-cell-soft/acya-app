'use client';

import * as React from 'react';
import { 
  useVehicleDeliveryHistory, 
  useVehicleDeliveryStats 
} from '@/hooks/use-delivery-tracking';
import { 
  DeliveryTrackingListItem, 
  DeliveryTrackingStatus 
} from '@/types/delivery-tracking';
import { RecordReturnDialog } from './record-return-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Search, 
  X, 
  Loader2, 
  ArrowRight,
  BarChart3,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VehicleDeliveryHistoryTabProps {
  vehicleId: number;
  vehicleSerial?: string | null;
  vehicleBrand?: string | null;
}

export function formatDeliveryDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '---';
  }
  if (minutes < 1) {
    return '< 1 min';
  }
  const days = Math.floor(minutes / (24 * 60));
  const remainingHours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = Math.floor(minutes % 60);

  if (days > 0) {
    return `${days} j ${remainingHours} h`;
  }
  if (remainingHours > 0) {
    return remainingMinutes > 0 ? `${remainingHours} h ${remainingMinutes} min` : `${remainingHours} h`;
  }
  return `${remainingMinutes} min`;
}

export function formatElapsedTime(departureDateStr: string): string {
  try {
    const dep = new Date(departureDateStr);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - dep.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return 'À l\'instant';
    return formatDeliveryDuration(diffMinutes);
  } catch {
    return '---';
  }
}

export function VehicleDeliveryHistoryTab({
  vehicleId,
  vehicleSerial,
  vehicleBrand,
}: VehicleDeliveryHistoryTabProps) {
  // Query States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'IN_TRANSIT' | 'COMPLETED'>('ALL');

  // Return dialog state
  const [selectedForReturn, setSelectedForReturn] = React.useState<DeliveryTrackingListItem | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = React.useState(false);

  // TanStack Query hooks
  const { 
    data: historyData, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory 
  } = useVehicleDeliveryHistory(vehicleId, {
    status: statusFilter === 'IN_TRANSIT' ? DeliveryTrackingStatus.InTransit : statusFilter === 'COMPLETED' ? DeliveryTrackingStatus.Completed : undefined,
    search: searchQuery.trim() || undefined,
    pageSize: 50,
  });

  const { 
    data: statsData, 
    isLoading: isLoadingStats,
    refetch: refetchStats 
  } = useVehicleDeliveryStats(vehicleId);

  const deliveries = historyData?.items || [];

  const handleOpenReturnDialog = (item: DeliveryTrackingListItem) => {
    setSelectedForReturn(item);
    setIsReturnDialogOpen(true);
  };

  const handleReturnSuccess = () => {
    refetchHistory();
    refetchStats();
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '---';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-sand-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sand-400">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">Total Livraisons</span>
            <Truck className="w-4 h-4 text-corp-blue-600" />
          </div>
          <div className="text-xl font-black text-corp-blue-950">
            {statsData?.totalDeliveries ?? (isLoadingStats ? '...' : 0)}
          </div>
          <div className="text-[0.65rem] text-sand-500 font-medium">Courses effectuées</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">En cours</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <div className="text-xl font-black text-amber-950">
            {statsData?.activeDeliveries ?? (isLoadingStats ? '...' : 0)}
          </div>
          <div className="text-[0.65rem] text-amber-700 font-medium">Véhicule sur le terrain</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">Clôturées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-950">
            {statsData?.completedDeliveries ?? (isLoadingStats ? '...' : 0)}
          </div>
          <div className="text-[0.65rem] text-emerald-700 font-medium">Retours enregistrés</div>
        </div>

        <div className="p-4 rounded-2xl bg-corp-blue-50/60 border border-corp-blue-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-corp-blue-600">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">Durée Moyenne</span>
            <Clock className="w-4 h-4 text-corp-blue-600" />
          </div>
          <div className="text-xl font-black text-corp-blue-950">
            {statsData?.averageDeliveryMinutes ? formatDeliveryDuration(Math.round(statsData.averageDeliveryMinutes)) : '---'}
          </div>
          <div className="text-[0.65rem] text-corp-blue-700 font-medium">Temps moyen / course</div>
        </div>
      </div>

      {/* 2. Monthly Delivery Volume Chart */}
      {statsData && statsData.monthlyDeliveries && statsData.monthlyDeliveries.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-sand-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-corp-blue-600" />
              <h4 className="text-xs font-black text-corp-blue-950 uppercase tracking-wider">
                Volume des livraisons mensuelles
              </h4>
            </div>
            <span className="text-[0.65rem] font-semibold text-sand-500">Derniers 12 mois</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData.monthlyDeliveries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis 
                  allowDecimals={false} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                />
                <RechartsTooltip 
                  formatter={(val: any) => [`${val} livraisons`, 'Total']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }} 
                />
                <Bar dataKey="totalCount" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par document, client ou adresse..."
            className="pl-10 h-10 rounded-xl border-corp-blue-100 bg-sand-50/50 text-xs font-bold text-corp-blue-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-red-500 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-sand-100/70 border border-sand-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              statusFilter === 'ALL'
                ? "bg-white text-corp-blue-900 shadow-2xs"
                : "text-sand-600 hover:text-corp-blue-900"
            )}
          >
            Toutes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              statusFilter === 'IN_TRANSIT'
                ? "bg-amber-500 text-white shadow-2xs"
                : "text-amber-700 hover:text-amber-900"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            En cours
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              statusFilter === 'COMPLETED'
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 hover:text-emerald-900"
            )}
          >
            Terminées
          </button>
        </div>
      </div>

      {/* 4. Delivery History Table */}
      <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand-50/80 border-b border-sand-200/80 text-[0.65rem] font-bold text-sand-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Document</th>
                <th className="p-3.5">Destinataire</th>
                <th className="p-3.5">Départ</th>
                <th className="p-3.5">Retour</th>
                <th className="p-3.5">Durée</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-sand-400">
                      <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600" />
                      <span className="font-bold text-xs">Chargement de l'historique des livraisons...</span>
                    </div>
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sand-400 font-bold">
                    {searchQuery
                      ? `Aucune livraison trouvée pour "${searchQuery}".`
                      : 'Aucune livraison enregistrée pour ce véhicule.'}
                  </td>
                </tr>
              ) : (
                deliveries.map((item) => {
                  const isInTransit = item.status === DeliveryTrackingStatus.InTransit || !item.returnDate;
                  const isCompleted = item.status === DeliveryTrackingStatus.Completed && !!item.returnDate;

                  return (
                    <tr key={item.id} className="hover:bg-sand-50/50 transition-colors">
                      {/* Document Ref & Type */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-corp-blue-900 block">
                            {item.docNumber || `Doc #${item.documentId}`}
                          </span>
                          <span className="text-[0.65rem] font-semibold text-sand-400 block">
                            {item.documentType === 5 ? 'Bon de Livraison' : item.documentType === 6 ? 'Facture Directe' : 'Document'}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td className="p-3.5 max-w-xs">
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-corp-blue-950 block truncate">
                            {item.customerName || 'Client'}
                          </span>
                          {item.deliveryAddress && (
                            <span className="text-[0.68rem] text-sand-500 font-medium block truncate flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-sand-400" />
                              {item.deliveryAddress}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Departure */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-corp-blue-900 block text-xs">
                          {formatDateTime(item.departureDate)}
                        </span>
                        {item.driverName && (
                          <span className="text-[0.65rem] text-sand-400 block">
                            Par : {item.driverName}
                          </span>
                        )}
                      </td>

                      {/* Return */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isInTransit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            En cours
                          </span>
                        ) : (
                          <span className="font-bold text-corp-blue-900 text-xs">
                            {formatDateTime(item.returnDate)}
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isInTransit ? (
                          <span className="text-[0.7rem] font-bold text-amber-700">
                            {formatElapsedTime(item.departureDate)}
                          </span>
                        ) : (
                          <span className="font-bold text-corp-blue-900 text-xs">
                            {formatDeliveryDuration(item.durationMinutes)}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isInTransit ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[0.65rem] font-bold">
                            En cours
                          </Badge>
                        ) : isCompleted ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[0.65rem] font-bold">
                            Terminée
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[0.65rem] font-bold">
                            Annulée
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isInTransit ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenReturnDialog(item)}
                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[0.7rem] gap-1 shadow-xs transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Enregistrer le retour</span>
                          </Button>
                        ) : (
                          <span className="text-[0.65rem] font-bold text-sand-400 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Clôturée
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Return Recording */}
      <RecordReturnDialog
        isOpen={isReturnDialogOpen}
        onClose={() => setIsReturnDialogOpen(false)}
        delivery={selectedForReturn}
        onSuccess={handleReturnSuccess}
      />
    </div>
  );
}

