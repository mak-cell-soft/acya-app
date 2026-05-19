'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { stockService } from '@/services/components/stock.service';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Check, 
  AlertTriangle,
  Loader2, 
  Lock, 
  X,
  FileText,
  Calendar,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

const REJECTION_REASONS = [
  { value: 'PROB_QTY', label: 'Erreur de quantité' },
  { value: 'PROB_QUAL', label: 'Marchandise endommagée' },
  { value: 'WRONG_REF', label: 'Mauvaise référence' },
  { value: 'MISSING', label: 'Marchandise manquante' },
  { value: 'OTHER', label: 'Autre (Veuillez préciser)' }
];

export function GlobalTransferConfirmDialog() {
  const queryClient = useQueryClient();
  const { 
    selectedTransferForConfirm, 
    setSelectedTransferForConfirm,
    dismissNotification 
  } = useNotifications();

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // State
  const [details, setDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isConfirmingMode, setIsConfirmingMode] = useState(false);
  const [isRejectingMode, setIsRejectingMode] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load details on open
  useEffect(() => {
    if (!selectedTransferForConfirm) {
      setDetails([]);
      setIsConfirmingMode(false);
      setIsRejectingMode(false);
      setConfirmationCode('');
      setActionComment('');
      setRejectionReason('');
      setCustomRejectionReason('');
      return;
    }

    const loadDetails = async () => {
      try {
        setIsLoadingDetails(true);
        const res = await stockService.getStockTransferDetails(
          selectedTransferForConfirm.exitDocNumber,
          selectedTransferForConfirm.receiptDocNumber
        );
        setDetails(res || []);
      } catch (err) {
        console.error('[SignalR Dialog] Failed to fetch transfer details:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadDetails();
  }, [selectedTransferForConfirm]);

  const handleClose = () => {
    setSelectedTransferForConfirm(null);
  };

  const handleConfirm = async () => {
    if (!selectedTransferForConfirm) return;
    if (!confirmationCode.trim()) {
      toast.error('Veuillez renseigner la clé de confirmation logistique.');
      return;
    }

    try {
      setIsActionLoading(true);
      await stockService.confirmTransfer(
        selectedTransferForConfirm.id,
        confirmationCode.trim(),
        actionComment.trim()
      );
      toast.success('Transfert inter-sites confirmé et réceptionné avec succès !');
      
      // Invalidate stock caches
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });

      // Dismiss notification and close modal
      await dismissNotification(selectedTransferForConfirm.id);
      setSelectedTransferForConfirm(null);
    } catch (err: any) {
      console.error('[SignalR Dialog] Confirmation failed:', err);
      toast.error(err.response?.data || 'Le code de confirmation saisi est incorrect.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransferForConfirm) return;
    if (!rejectionReason) {
      toast.error('Veuillez sélectionner un motif de rejet.');
      return;
    }

    const reasonLabel = REJECTION_REASONS.find(r => r.value === rejectionReason)?.label;
    const finalReason = rejectionReason === 'OTHER'
      ? `Autre: ${customRejectionReason}`
      : reasonLabel;

    if (rejectionReason === 'OTHER' && !customRejectionReason.trim()) {
      toast.error('Veuillez spécifier le motif personnalisé.');
      return;
    }

    const fullComment = `${finalReason}${actionComment ? ' - Obs: ' + actionComment : ''}`;

    try {
      setIsActionLoading(true);
      await stockService.rejectTransfer(selectedTransferForConfirm.id, fullComment);
      toast.info('Le transfert logistique a été rejeté et retourné.');

      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });

      await dismissNotification(selectedTransferForConfirm.id);
      setSelectedTransferForConfirm(null);
    } catch (err: any) {
      console.error('[SignalR Dialog] Rejection failed:', err);
      toast.error(err.response?.data || 'Erreur lors du rejet du transfert.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Dialog open={!!selectedTransferForConfirm} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 shadow-2xl p-6 sm:max-w-xl w-full animate-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <DialogTitle className="text-sm font-serif font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-2">
            <Truck className="h-5 w-5 text-forest-600" />
            Réception Inter-Sites
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Validez la signature logistique pour confirmer la réception physique des marchandises.
          </DialogDescription>
        </DialogHeader>

        {/* Voucher Info */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 dark:bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Site Expéditeur</span>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">
              {selectedTransferForConfirm?.originSite || 'Dépôt Expéditeur'}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">N° Bon Sortie</span>
            <div className="font-mono font-bold text-forest-700 dark:text-forest-400">
              {selectedTransferForConfirm?.transferRef}
            </div>
          </div>
        </div>

        {/* Dynamic Detail Items */}
        <div className="space-y-2 mt-4">
          <h4 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Articles en Transit</h4>
          
          {isLoadingDetails ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-forest-600" />
            </div>
          ) : details.length === 0 ? (
            <div className="py-4 text-center italic text-zinc-400 text-xs">
              Aucun détail disponible pour ce transfert.
            </div>
          ) : (
            <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200/60 dark:border-zinc-800 font-bold text-zinc-500">
                    <th className="p-2.5 pl-3">Référence</th>
                    <th className="p-2.5">Désignation</th>
                    <th className="p-2.5 font-mono">N° Paquet</th>
                    <th className="p-2.5 text-right pr-3">Qté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-semibold text-zinc-700 dark:text-zinc-300">
                  {details.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="p-2.5 pl-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {item.refMerchandise || item.articleReference}
                      </td>
                      <td className="p-2.5 truncate max-w-[120px]">{item.description || item.articleDescription}</td>
                      <td className="p-2.5 font-mono text-[10px] text-zinc-500">
                        {item.refPaquet || item.packageReference || 'Standard'}
                      </td>
                      <td className="p-2.5 text-right pr-3 font-mono font-bold text-forest-800 dark:text-forest-400">
                        {formatQuantity(item.quantity, item.unit)}
                        <span className="text-[9px] text-zinc-450 ml-0.5">{item.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processing Actions Block */}
        <div className="mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
          {!isConfirmingMode && !isRejectingMode ? (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsRejectingMode(true)}
                className="h-10 text-xs font-bold border-rose-200 hover:bg-rose-50 text-rose-650 dark:border-rose-950 dark:hover:bg-rose-950/20 rounded-xl"
              >
                Rejeter l'expédition
              </Button>
              <Button
                onClick={() => setIsConfirmingMode(true)}
                className="h-10 text-xs font-bold bg-forest-600 hover:bg-forest-700 text-white rounded-xl flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Réceptionner
              </Button>
            </div>
          ) : isConfirmingMode ? (
            <div className="space-y-3.5 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
              <h4 className="text-[10px] uppercase font-bold text-zinc-900 dark:text-zinc-100 tracking-wider flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-forest-600" />
                Clé de validation logistique
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="global-confirm-code" className="text-[10px] uppercase font-bold text-zinc-400">
                    Code de Signature *
                  </Label>
                  <Input
                    id="global-confirm-code"
                    required
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="Saisir la clé numérique fournie par le livreur..."
                    className="bg-white dark:bg-zinc-950 font-mono font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="global-confirm-comment" className="text-[10px] uppercase font-bold text-zinc-400">
                    Remarques / Observations
                  </Label>
                  <textarea
                    id="global-confirm-comment"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Facultatif (ex: colis vérifié et conforme)..."
                    className="flex min-h-[50px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-forest-550/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setIsConfirmingMode(false)}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isActionLoading}
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmer la réception'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 bg-rose-50/10 dark:bg-rose-950/5 p-4 rounded-xl border border-rose-200/30 dark:border-rose-900/25">
              <h4 className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-450 tracking-wider">
                Réfuter la Réception du Transfert
              </h4>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rejection-reason" className="text-[10px] uppercase font-bold text-rose-500">
                    Motif Principal de Rejet *
                  </Label>
                  <select
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">-- Sélectionner un motif --</option>
                    {REJECTION_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {rejectionReason === 'OTHER' && (
                  <div className="space-y-1 animate-in slide-in-from-top-1 duration-155">
                    <Label htmlFor="custom-reason" className="text-[10px] uppercase font-bold text-rose-500">
                      Motif Personnalisé *
                    </Label>
                    <Input
                      id="custom-reason"
                      value={customRejectionReason}
                      onChange={(e) => setCustomRejectionReason(e.target.value)}
                      placeholder="Préciser la raison..."
                      className="bg-white dark:bg-zinc-950 text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="global-reject-comment" className="text-[10px] uppercase font-bold text-zinc-400">
                    Commentaires additionnels
                  </Label>
                  <textarea
                    id="global-reject-comment"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Précisez tout autre détail important..."
                    className="flex min-h-[50px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs focus:ring-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setIsRejectingMode(false)}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isActionLoading}
                  className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                >
                  {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refuser et rejeter'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-900 pt-4 justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-10 text-xs font-bold border-zinc-200 dark:border-zinc-800 rounded-xl"
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
