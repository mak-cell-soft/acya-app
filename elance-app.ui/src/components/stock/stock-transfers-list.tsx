'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useStockTransfers } from '@/hooks/use-stock';
import { useAuthStore } from '@/store/use-auth-store';
import { stockService } from '@/services/components/stock.service';
import { StockTransferInfo, TransferStatus, TransferStatus_FR } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Truck, 
  ArrowRight, 
  Eye, 
  Check, 
  X as CloseIcon, 
  FileText,
  Calendar,
  Building,
  Loader2,
  Lock,
  PlusCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';

export function StockTransfersList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  const { data: transfers = [], isLoading, error } = useStockTransfers();

  // Active Selected Transfer Drawer State
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransferInfo | null>(null);
  
  // State for printing transfer
  const [printTransfer, setPrintTransfer] = useState<{ transfer: StockTransferInfo; details: any[] } | null>(null);
  
  // Confirmation / Rejection form state
  const [isConfirmingMode, setIsConfirmingMode] = useState(false);
  const [isRejectingMode, setIsRejectingMode] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch transfer details when a transfer is selected
  const { data: transferDetails = [], isLoading: isLoadingDetails } = useQuery<any[]>({
    queryKey: ['stock-transfer-details', selectedTransfer?.docSortie, selectedTransfer?.docReception],
    queryFn: () => {
      if (!selectedTransfer) return Promise.reject();
      return stockService.getStockTransferDetails(selectedTransfer.docSortie, selectedTransfer.docReception);
    },
    enabled: !!selectedTransfer
  });

  const handleOpenDetails = (transfer: StockTransferInfo) => {
    setSelectedTransfer(transfer);
    setIsConfirmingMode(false);
    setIsRejectingMode(false);
    setConfirmationCode('');
    setActionComment('');
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTransfer) return;
    if (!confirmationCode.trim()) {
      toast.error('Veuillez spécifier le code de confirmation figurant sur le bon logistique.');
      return;
    }

    try {
      setIsActionLoading(true);
      await stockService.confirmTransfer(selectedTransfer.id, confirmationCode.trim(), actionComment.trim());
      toast.success('Le transfert inter-sites a été validé et réceptionné.');
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error('Failed to confirm stock transfer:', err);
      toast.error(err.response?.data || 'Une erreur est survenue lors de la confirmation.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectTransfer = async () => {
    if (!selectedTransfer) return;
    if (!actionComment.trim()) {
      toast.error('Veuillez indiquer le motif du rejet dans la section commentaires.');
      return;
    }

    try {
      setIsActionLoading(true);
      await stockService.rejectTransfer(selectedTransfer.id, actionComment.trim());
      toast.error('Le transfert logistique a été rejeté.');
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setSelectedTransfer(null);
    } catch (err: any) {
      console.error('Failed to reject stock transfer:', err);
      toast.error(err.response?.data || 'Une erreur est survenue lors du rejet.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-stone-900 dark:text-stone-100" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
          Chargement du registre logistique...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-rose-500 font-serif italic text-xs">
        Erreur lors du chargement des transferts. Veuillez rafraîchir.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search Header panel with New creation button */}
      <div className="flex flex-row items-center justify-between border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div>
          <h2 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">
            Registre des Expéditions Inter-Sites
          </h2>
          <span className="text-[9px] text-stone-400 lowercase leading-normal block">
            gérez les flux logistiques entrants/sortants et vérifiez les signatures électroniques.
          </span>
        </div>
        <Button
          onClick={() => router.push('/stock/transfer/new')}
          className="h-10 px-4 bg-stone-900 hover:bg-stone-850 dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-900 text-white rounded-xl gap-2 font-semibold text-[10px] uppercase tracking-wider transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Nouveau Bon de Sortie
        </Button>
      </div>

      {transfers.length === 0 ? (
        <Card className="border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/10">
          <CardContent className="p-12 text-center text-stone-400 italic text-xs font-serif">
            Aucun transfert de stock enregistré dans le registre.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white dark:bg-stone-900/20 border border-stone-200/60 dark:border-stone-800/60 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                  <th className="p-4 pl-5">Date</th>
                  <th className="p-4">N° Bon Sortie</th>
                  <th className="p-4">N° Bon Réception</th>
                  <th className="p-4">Trajet (Origine → Dest)</th>
                  <th className="p-4">Transporteur</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 pr-5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-stone-50/20 transition-colors">
                    
                    {/* Date */}
                    <td className="p-4 pl-5 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-stone-450" />
                        {new Date(tr.transferDate).toLocaleDateString('fr-FR')}
                      </span>
                    </td>

                    {/* Exit doc */}
                    <td className="p-4 font-mono font-bold text-stone-850 dark:text-stone-100">
                      {tr.docSortie}
                    </td>

                    {/* Receipt doc */}
                    <td className="p-4 font-mono text-stone-500">
                      {tr.docReception || <span className="text-stone-300 italic">En attente</span>}
                    </td>

                    {/* Origin to destination */}
                    <td className="p-4 font-semibold text-stone-700 dark:text-stone-300">
                      <div className="flex items-center gap-1.5">
                        <span>{tr.origine || tr.originSiteAddress}</span>
                        <ArrowRight className="h-3 w-3 text-stone-400" />
                        <span>{tr.destination || tr.destinationSiteAddress}</span>
                      </div>
                    </td>

                    {/* Transporter */}
                    <td className="p-4 text-stone-600 dark:text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-stone-450" />
                        {tr.transporter || 'Non spécifié'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      {tr.status === TransferStatus.Pending ? (
                        <Badge className="bg-amber-100 text-amber-850 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[9px] uppercase font-bold tracking-wider">
                          {TransferStatus_FR[tr.status]}
                        </Badge>
                      ) : tr.status === TransferStatus.Confirmed ? (
                        <Badge className="bg-emerald-100 text-emerald-850 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[9px] uppercase font-bold tracking-wider">
                          {TransferStatus_FR[tr.status]}
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-850 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-[9px] uppercase font-bold tracking-wider">
                          {TransferStatus_FR[tr.status]}
                        </Badge>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 pr-5 text-center">
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenDetails(tr)}
                        className="h-8 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 gap-1 font-semibold text-[10px] uppercase tracking-wider"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir
                      </Button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-250 dark:border-stone-850 shadow-2xl p-6 sm:max-w-2xl w-full">
          <DialogHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
            <DialogTitle className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" /> Détails du Transfert Logistique
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400 leading-normal">
              Fiche détaillée du transfert inter-dépôts {selectedTransfer?.docSortie}.
            </DialogDescription>
          </DialogHeader>

          {/* Core Info summary grid */}
          <div className="grid grid-cols-2 gap-4 text-xs py-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Dépôt Expéditeur</span>
              <div className="font-semibold text-stone-800 dark:text-stone-200">{selectedTransfer?.origine || selectedTransfer?.originSiteAddress}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Dépôt Réceptionnaire</span>
              <div className="font-semibold text-stone-800 dark:text-stone-200">{selectedTransfer?.destination || selectedTransfer?.destinationSiteAddress}</div>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-bold text-stone-450 tracking-wider">Marchandises Expédiées</h4>
            
            {isLoadingDetails ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-stone-900 dark:text-stone-50" />
              </div>
            ) : transferDetails.length === 0 ? (
              <div className="py-4 text-center italic text-stone-400 text-xs">
                Aucun article renseigné dans ce transfert.
              </div>
            ) : (
              <div className="border border-stone-200/50 dark:border-stone-850 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/40 dark:border-stone-800 font-bold text-stone-500">
                      <th className="p-3 pl-4">Réf. Article</th>
                      <th className="p-3">Désignation</th>
                      <th className="p-3 font-mono">N° Paquet</th>
                      <th className="p-3 text-right pr-4">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-850 font-semibold text-stone-700 dark:text-stone-300">
                    {transferDetails.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-stone-50/10">
                        <td className="p-3 pl-4 font-mono font-bold text-stone-900 dark:text-stone-50">
                          {item.refMerchandise || item.articleReference}
                        </td>
                        <td className="p-3 truncate max-w-[150px]">{item.description || item.articleDescription}</td>
                        <td className="p-3 font-mono text-[10px]">
                          {item.refPaquet || item.packageReference || 'Standard'}
                        </td>
                        <td className="p-3 text-right pr-4 font-mono font-bold">
                          {formatQuantity(item.quantity, item.unit)}
                          <span className="text-[9px] text-stone-400 font-sans font-medium ml-1">{item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>



          <DialogFooter className="border-t border-stone-100 dark:border-stone-900 pt-4 gap-2">
            {selectedTransfer && !isLoadingDetails && (
              <Button
                type="button"
                onClick={() => setPrintTransfer({
                  transfer: selectedTransfer,
                  details: transferDetails
                })}
                className="h-10 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl gap-2 transition-all px-4"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedTransfer(null)}
              className="h-10 text-xs font-bold border-stone-200 dark:border-stone-800 rounded-xl"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Option Dialog */}
      <PrintVariantDialog
        isOpen={printTransfer !== null}
        onClose={() => setPrintTransfer(null)}
        transfer={printTransfer?.transfer}
        transferDetails={printTransfer?.details}
        docType="transfer"
      />
    </div>
  );
}

