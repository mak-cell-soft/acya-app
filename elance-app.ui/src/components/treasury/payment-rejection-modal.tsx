'use client';

import React, { useState } from 'react';
import { AlertTriangle, Calendar, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paymentService } from '@/services/components/payment.service';
import { toast } from 'sonner';

interface PaymentRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment: {
    id: number;
    reference?: string;
    amount?: number;
    method?: string;
    customerName?: string;
    instrumentNumber?: string;
  } | null;
}

export function PaymentRejectionModal({
  isOpen,
  onClose,
  onSuccess,
  payment
}: PaymentRejectionModalProps) {
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [rejectionDate, setRejectionDate] = useState<string>(getLocalDateString());
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await paymentService.rejectPayment(payment.id, {
        rejectionDate,
        reason: reason.trim() || undefined
      });

      toast.success(`Le règlement N° ${payment.instrumentNumber || payment.reference || payment.id} a été marqué comme rejeté / impayé.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erreur lors du rejet du règlement.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-sand-200">
        <div className="flex items-center justify-between border-b border-sand-100 pb-4">
          <div className="flex items-center space-x-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Signaler un Rejet / Impayé</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-sand-500 hover:bg-sand-100 hover:text-sand-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-rose-50/70 p-3 border border-rose-200 text-sm text-rose-900 space-y-1">
            <p className="font-medium">
              Règlement : {payment.method || 'Chèque / Traite'} N° {payment.instrumentNumber || payment.reference || payment.id}
            </p>
            {payment.customerName && (
              <p className="text-xs text-rose-700">Client : {payment.customerName}</p>
            )}
            {payment.amount !== undefined && (
              <p className="text-sm font-semibold text-rose-800">
                Montant : {payment.amount.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} TND
              </p>
            )}
            <p className="text-xs text-rose-600 pt-1 border-t border-rose-200/60 mt-2">
              Attention : Cette action réattribuera cette somme comme dette sur le grand livre du client et déduira le montant de la banque si versé.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-sand-700 mb-1">
              Date du rejet / avis d'impayé
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
              <Input
                type="date"
                value={rejectionDate}
                onChange={(e) => setRejectionDate(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-sand-700 mb-1">
              Motif du rejet (optionnel)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-sand-400" />
              <Input
                type="text"
                placeholder="Ex: Défaut de provision, chèque impayé..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-sand-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Enregistrement...' : 'Confirmer le Rejet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
