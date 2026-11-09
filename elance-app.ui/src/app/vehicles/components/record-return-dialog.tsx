'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeliveryTrackingListItem } from '@/types/delivery-tracking';
import { useCompleteDelivery } from '@/hooks/use-delivery-tracking';
import { Truck, CheckCircle2, Clock, Calendar, MapPin, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecordReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: DeliveryTrackingListItem | null;
  onSuccess?: () => void;
}

export function RecordReturnDialog({
  isOpen,
  onClose,
  delivery,
  onSuccess,
}: RecordReturnDialogProps) {
  const completeMutation = useCompleteDelivery();

  if (!delivery) return null;

  const handleConfirm = async () => {
    try {
      await completeMutation.mutateAsync(delivery.id);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch {
      // Error is handled in mutation onError toast
    }
  };

  const formatDeparture = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full rounded-3xl p-6 bg-white border border-corp-blue-100 shadow-2xl space-y-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-corp-blue-900 tracking-tight">
                Enregistrer le retour de livraison
              </DialogTitle>
              <DialogDescription className="text-xs text-sand-500 font-medium">
                Clôturez la course du véhicule pour calculer la durée de livraison.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Delivery Details Card */}
        <div className="p-4 rounded-2xl bg-sand-50/70 border border-sand-200/80 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-sand-200/60 pb-2">
            <span className="font-bold text-sand-400 uppercase tracking-wider text-[0.65rem]">
              Document
            </span>
            <span className="font-mono font-black text-corp-blue-900 bg-white px-2 py-0.5 rounded-lg border border-sand-200">
              {delivery.docNumber || `Doc #${delivery.documentId}`}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <User className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[0.65rem] text-sand-400 uppercase font-bold block">Destinataire</span>
                <span className="font-bold text-corp-blue-900">{delivery.customerName || 'Client inconnu'}</span>
              </div>
            </div>

            {delivery.deliveryAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[0.65rem] text-sand-400 uppercase font-bold block">Adresse</span>
                  <span className="font-medium text-sand-600">{delivery.deliveryAddress}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[0.65rem] text-sand-400 uppercase font-bold block">Heure de départ</span>
                <span className="font-bold text-corp-blue-800">{formatDeparture(delivery.departureDate)}</span>
              </div>
            </div>

            {delivery.driverName && (
              <div className="flex items-start gap-2">
                <Truck className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[0.65rem] text-sand-400 uppercase font-bold block">Chauffeur</span>
                  <span className="font-medium text-corp-blue-900">{delivery.driverName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Server Clock Notice */}
        <div className="p-3 rounded-2xl bg-corp-blue-50/60 border border-corp-blue-100 text-[0.7rem] text-corp-blue-800 leading-relaxed">
          <p className="font-medium">
            ⏱️ La date et l'heure actuelles du serveur seront automatiquement enregistrées comme date de retour. La durée de la livraison sera calculée instantanément.
          </p>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={completeMutation.isPending}
            className="h-9 rounded-xl text-xs font-bold"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={completeMutation.isPending}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmer le retour</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

