'use client';

import * as React from 'react';
import { useVehicleDeliveryHistory } from '@/hooks/use-delivery-tracking';
import { DeliveryTrackingListItem, DeliveryTrackingStatus } from '@/types/delivery-tracking';
import { RecordReturnDialog } from './record-return-dialog';
import { formatElapsedTime } from './vehicle-delivery-history-tab';
import { Button } from '@/components/ui/button';
import { Truck, Clock, CheckCircle2, MapPin, User, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VehicleActiveDeliveryCardProps {
  vehicleId: number;
  onViewAllHistory?: () => void;
}

export function VehicleActiveDeliveryCard({
  vehicleId,
  onViewAllHistory,
}: VehicleActiveDeliveryCardProps) {
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [selectedDelivery, setSelectedDelivery] = React.useState<DeliveryTrackingListItem | null>(null);

  const { data, isLoading, refetch } = useVehicleDeliveryHistory(vehicleId, {
    status: DeliveryTrackingStatus.InTransit,
    pageSize: 1,
  });

  const activeDelivery = data?.items?.[0] || null;

  const handleOpenReturn = () => {
    if (activeDelivery) {
      setSelectedDelivery(activeDelivery);
      setReturnDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-sand-50/50 border border-sand-200/60 flex items-center justify-center gap-2 text-sand-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-corp-blue-600" />
        <span>Vérification du statut de livraison...</span>
      </div>
    );
  }

  if (!activeDelivery) {
    return (
      <div className="p-4 rounded-2xl bg-sand-50/40 border border-dashed border-sand-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-corp-blue-900 block">Véhicule disponible au dépôt</span>
            <span className="text-[0.65rem] text-sand-400 font-medium block">Aucune livraison en transit actuellement</span>
          </div>
        </div>

        {onViewAllHistory && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewAllHistory}
            className="h-7 text-xs font-bold text-corp-blue-600 hover:text-corp-blue-800 hover:bg-corp-blue-50 rounded-lg gap-1"
          >
            <span>Historique des livraisons</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Livraison en cours
            </span>
            <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded-lg border border-amber-200 text-corp-blue-900">
              {activeDelivery.docNumber || `Doc #${activeDelivery.documentId}`}
            </span>
          </div>

          <div className="text-[0.7rem] font-bold text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>En cours depuis : {formatElapsedTime(activeDelivery.departureDate)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-corp-blue-900 font-medium truncate">
            <User className="w-3.5 h-3.5 text-sand-400 shrink-0" />
            <span className="truncate">Client : <strong className="font-bold">{activeDelivery.customerName || 'Inconnu'}</strong></span>
          </div>

          {activeDelivery.deliveryAddress && (
            <div className="flex items-center gap-2 text-sand-600 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-sand-400 shrink-0" />
              <span className="truncate">Destination : {activeDelivery.deliveryAddress}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 flex-wrap gap-2">
          <div className="text-[0.68rem] text-sand-500">
            Départ enregistré : <strong>{format(new Date(activeDelivery.departureDate), "d MMM yyyy 'à' HH:mm", { locale: fr })}</strong>
            {activeDelivery.driverName && <span> • Chauffeur : <strong>{activeDelivery.driverName}</strong></span>}
          </div>

          <div className="flex items-center gap-2">
            {onViewAllHistory && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onViewAllHistory}
                className="h-8 text-xs font-bold text-corp-blue-600 hover:bg-white rounded-xl"
              >
                Historique
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleOpenReturn}
              className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enregistrer le retour</span>
            </Button>
          </div>
        </div>
      </div>

      <RecordReturnDialog
        isOpen={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        delivery={selectedDelivery}
        onSuccess={() => refetch()}
      />
    </>
  );
}

