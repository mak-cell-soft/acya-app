'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { stockService } from '@/services/components/stock.service';
import { StockTransferInfo, StockTransferDetails, TransferStatus, TransferStatus_FR } from '@/types/stock';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';
import { 
  Loader2, 
  MapPin, 
  Truck, 
  Calendar, 
  Barcode, 
  ShieldCheck, 
  XOctagon,
  MessageSquare
} from 'lucide-react';

interface StockTransferDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransferInfo | null;
  onSuccess: () => void;
}

export function StockTransferDetailsDialog({
  isOpen,
  onClose,
  transfer,
  onSuccess,
}: StockTransferDetailsDialogProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const [details, setDetails] = useState<StockTransferDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Confirmation state
  const [confirming, setConfirming] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && transfer) {
      loadDetails();
      // Reset forms
      setConfirming(false);
      setRejecting(false);
      setConfirmationCode('');
      setComment('');
    }
  }, [isOpen, transfer]);

  const loadDetails = async () => {
    if (!transfer) return;
    try {
      setLoading(true);
      const data = await stockService.getStockTransferDetails(transfer.docSortie, transfer.docReception);
      setDetails(data);
    } catch (err) {
      console.error('Failed to load transfer details:', err);
      toast.error('Erreur lors du chargement des détails du transfert.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;

    if (!confirmationCode.trim()) {
      toast.error('Le code de confirmation est obligatoire.');
      return;
    }

    try {
      setActionLoading(true);
      await stockService.confirmTransfer(transfer.id, confirmationCode.trim(), comment.trim());
      toast.success('Le transfert de stock a été CONFIRMÉ avec succès.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Transfer confirmation failed:', err);
      toast.error('Code incorrect ou erreur lors de la confirmation du transfert.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;

    if (!comment.trim()) {
      toast.error('Veuillez spécifier la raison du rejet dans le commentaire.');
      return;
    }

    try {
      setActionLoading(true);
      await stockService.rejectTransfer(transfer.id, comment.trim());
      toast.success('Le transfert de stock a été REJETÉ.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Transfer rejection failed:', err);
      toast.error('Erreur lors du rejet du transfert.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
              Détails du Transfert
            </DialogTitle>
            {transfer && (
              <Badge 
                className={
                  transfer.status === TransferStatus.Confirmed
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : transfer.status === TransferStatus.Rejected
                    ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                    : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                }
              >
                {TransferStatus_FR[transfer.status]}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-stone-500 mt-1">
            Ordre de mouvement entre sites dépôts.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400 font-serif">Chargement des articles...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info cards */}
            {transfer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-100/50 dark:bg-stone-800/40 p-4 border border-stone-200/30 dark:border-stone-700/30 rounded-xl">
                <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-stone-400" />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Origine:</span>
                    <span>{transfer.origine || transfer.originSiteAddress}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-stone-500" />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Destination:</span>
                    <span>{transfer.destination || transfer.destinationSiteAddress}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-stone-400" />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Date:</span>
                    <span>{format(new Date(transfer.transferDate), 'dd MMMM yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-stone-400" />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Transporteur:</span>
                    <span>{transfer.transporter || 'Non spécifié'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Document numbers */}
            {transfer && (
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="bg-white dark:bg-stone-950 p-2 border border-stone-200/60 dark:border-stone-800 rounded-lg">
                  <span className="text-stone-400 font-semibold uppercase mr-2">Bon Sortie:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{transfer.docSortie}</span>
                </div>
                {transfer.docReception && (
                  <div className="bg-white dark:bg-stone-950 p-2 border border-stone-200/60 dark:border-stone-800 rounded-lg">
                    <span className="text-stone-400 font-semibold uppercase mr-2">Bon Réception:</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">{transfer.docReception}</span>
                  </div>
                )}
              </div>
            )}

            {/* Merchandise details list */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500 font-bold">Articles Transférés</h4>
              <div className="overflow-hidden bg-white dark:bg-stone-950 border border-stone-200/60 dark:border-stone-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500">
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Réf. Paquet</th>
                      <th className="py-3 px-4 text-right">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/40 dark:divide-stone-800/40 font-medium">
                    {details.map((item: any) => (
                      <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {item.refMerchandise || item.articleReference}
                        </td>
                        <td className="py-3 px-4 text-stone-750 truncate max-w-[200px]">{item.description || item.articleDescription}</td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {item.refPaquet || item.packageReference || 'Standard'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {item.quantity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-stone-400 font-semibold">{item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirmation & Rejection flows - display only if status is Pending and user is Admin */}
            {transfer && transfer.status === TransferStatus.Pending && (
              <div className="border-t border-stone-200/60 dark:border-stone-800/60 pt-6">
                {!confirming && !rejecting ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <span>{isAdmin ? 'Veuillez procéder à la réception physique de ces volumes.' : 'Réservé aux administrateurs.'}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setRejecting(true)}
                          className="h-10 px-4 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider hover:bg-rose-50 rounded-xl"
                        >
                          Rejeter
                        </Button>
                        <Button
                          onClick={() => setConfirming(true)}
                          className="h-10 px-5 text-xs font-semibold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-900 rounded-xl shadow-sm"
                        >
                          Confirmer Réception
                        </Button>
                      </div>
                    )}
                  </div>
                ) : confirming ? (
                  <form onSubmit={handleConfirm} className="space-y-4 bg-stone-100/60 dark:bg-stone-800/25 p-4 rounded-xl border border-stone-200/40 dark:border-stone-800/40">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" /> Valider avec le Code
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirm-code" className="text-[10px] uppercase font-bold text-stone-500">Code de Confirmation *</Label>
                        <Input
                          id="confirm-code"
                          required
                          value={confirmationCode}
                          onChange={(e) => setConfirmationCode(e.target.value)}
                          placeholder="Code secret"
                          className="bg-white dark:bg-stone-950 font-mono text-sm py-4 border-stone-200 dark:border-stone-800 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-comment" className="text-[10px] uppercase font-bold text-stone-500">Commentaire (Optionnel)</Label>
                        <Input
                          id="confirm-comment"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Note de réception..."
                          className="bg-white dark:bg-stone-950 text-xs py-4 border-stone-200 dark:border-stone-800 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirming(false)}
                        className="h-9 px-3 text-xs uppercase tracking-wider font-semibold rounded-lg"
                      >
                        Retour
                      </Button>
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="h-9 px-4 text-xs uppercase tracking-wider font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1.5 shadow-sm"
                      >
                        {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Confirmer le Transfert
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleReject} className="space-y-4 bg-stone-100/60 dark:bg-stone-800/25 p-4 rounded-xl border border-stone-200/40 dark:border-stone-800/40">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-rose-800 dark:text-rose-450 flex items-center gap-1.5">
                      <XOctagon className="h-4 w-4 text-rose-500" /> Annuler / Rejeter le Transfert
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reject-reason" className="text-[10px] uppercase font-bold text-stone-500">Motif de Refus *</Label>
                      <Input
                        id="reject-reason"
                        required
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Raison du rejet (ex: Quantités incorrectes, paquet endommagé...)"
                        className="bg-white dark:bg-stone-950 text-xs py-4 border-stone-200 dark:border-stone-800 rounded-xl"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setRejecting(false)}
                        className="h-9 px-3 text-xs uppercase tracking-wider font-semibold rounded-lg"
                      >
                        Retour
                      </Button>
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="h-9 px-4 text-xs uppercase tracking-wider font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg gap-1.5 shadow-sm"
                      >
                        {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Confirmer le Rejet
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-stone-200/50 dark:border-stone-800/50 pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="py-5 px-5 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-all rounded-xl border-stone-200/80 dark:border-stone-800 text-xs font-semibold uppercase tracking-wider"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
