'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useStockTransfersSearch } from '@/hooks/use-stock';
import { useAuthStore } from '@/store/use-auth-store';
import { stockService } from '@/services/components/stock.service';
import { StockTransferInfo, StockTransferSearchParams, TransferStatus, TransferStatus_FR } from '@/types/stock';
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
  Printer,
  Pencil,
  RotateCcw,
  AlertTriangle,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { StockTransferEditDialog } from './stock-transfer-edit-dialog';

const PAGE_SIZE = 20;

export function StockTransfersList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === 'Admin' ||
    user?.role === 'SuperAdmin' ||
    user?.role === '10' ||
    user?.role === '20';

  // Fail-closed origin check: missing site identifiers never grant origin authorization
  const isOriginUser = (tr: StockTransferInfo) => {
    if (isAdmin) return true;
    if (!tr.originSiteId || !user?.defaultSiteId) return false;
    return Number(user.defaultSiteId) === Number(tr.originSiteId);
  };

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Filter & pagination state (server-backed)
  const [referenceInput, setReferenceInput] = useState('');
  const [debouncedReference, setDebouncedReference] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [olderPendingOnly, setOlderPendingOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReference(referenceInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [referenceInput]);

  const searchParams: StockTransferSearchParams = {
    reference: debouncedReference || undefined,
    status: olderPendingOnly ? TransferStatus.Pending : (statusFilter || undefined),
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    olderPendingOnly,
    olderThanDays: 30,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data: pagedResult, isLoading, isFetching, error } = useStockTransfersSearch(searchParams);
  const transfers = pagedResult?.items ?? [];
  const totalCount = pagedResult?.totalCount ?? 0;
  const totalPages = pagedResult?.totalPages ?? 0;
  const historicalPendingCount = pagedResult?.historicalPendingCount ?? 0;

  const hasActiveFilters = Boolean(
    debouncedReference || statusFilter !== '' || fromDate || toDate || olderPendingOnly
  );

  const handleResetFilters = () => {
    setReferenceInput('');
    setDebouncedReference('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setOlderPendingOnly(false);
    setPage(1);
  };

  const handleToggleOlderPending = () => {
    const next = !olderPendingOnly;
    setOlderPendingOnly(next);
    if (next) {
      setStatusFilter(TransferStatus.Pending);
      setFromDate('');
      setToDate('');
    } else {
      setStatusFilter('');
    }
    setPage(1);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code de validation copié.');
    } catch {
      toast.error('Impossible de copier le code.');
    }
  };

  // Active Selected Transfer Drawer State
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransferInfo | null>(null);
  
  // State for printing transfer
  const [printTransfer, setPrintTransfer] = useState<{ transfer: StockTransferInfo; details: any[] } | null>(null);

  // State for editing pending transfer
  const [editTransfer, setEditTransfer] = useState<StockTransferInfo | null>(null);
  
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
      <div className="py-16 text-center text-rose-500 italic text-xs">
        Erreur lors du chargement des transferts. Veuillez rafraîchir.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search Header panel with New creation button */}
      <div className="flex flex-row items-center justify-between border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">
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

      {/* Search & Historical Filter Bar */}
      <div className="bg-white dark:bg-stone-900/30 border border-stone-200/70 dark:border-stone-800/70 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Reference search */}
          <div className="lg:col-span-3 space-y-1">
            <Label htmlFor="transfer-ref-search" className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Référence / N° Bon
            </Label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="transfer-ref-search"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                placeholder="Ex: TS26-00012..."
                className="pl-8 h-9 text-xs bg-stone-50/50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-lg"
              />
            </div>
          </div>

          {/* Status select */}
          <div className="lg:col-span-2 space-y-1">
            <Label htmlFor="transfer-status-filter" className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Statut
            </Label>
            <select
              id="transfer-status-filter"
              value={olderPendingOnly ? TransferStatus.Pending : statusFilter}
              disabled={olderPendingOnly}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val === '' ? '' : (Number(val) as TransferStatus));
                setPage(1);
              }}
              className="w-full h-9 px-2.5 text-xs bg-stone-50/50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
            >
              <option value="">Tous les statuts</option>
              <option value={TransferStatus.Pending}>En attente</option>
              <option value={TransferStatus.Confirmed}>Confirmé</option>
              <option value={TransferStatus.Rejected}>Rejeté</option>
              <option value={TransferStatus.Cancelled}>Annulé</option>
            </select>
          </div>

          {/* Start date */}
          <div className="lg:col-span-2 space-y-1">
            <Label htmlFor="transfer-from-date" className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Date début
            </Label>
            <Input
              id="transfer-from-date"
              type="date"
              value={fromDate}
              disabled={olderPendingOnly}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs bg-stone-50/50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-lg"
            />
          </div>

          {/* End date */}
          <div className="lg:col-span-2 space-y-1">
            <Label htmlFor="transfer-to-date" className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Date fin
            </Label>
            <Input
              id="transfer-to-date"
              type="date"
              value={toDate}
              disabled={olderPendingOnly}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs bg-stone-50/50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-lg"
            />
          </div>

          {/* Dedicated Older Pending (> 30 days) toggle */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <Button
              type="button"
              variant={olderPendingOnly ? 'default' : 'outline'}
              onClick={handleToggleOlderPending}
              className={
                olderPendingOnly
                  ? 'flex-1 h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold gap-1.5 shadow-xs'
                  : 'flex-1 h-9 px-3 rounded-lg border-amber-300/80 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-[11px] font-bold gap-1.5'
              }
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">En attente &gt; 30j</span>
              {historicalPendingCount > 0 && (
                <span
                  className={
                    olderPendingOnly
                      ? 'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white tabular-nums'
                      : 'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 tabular-nums'
                  }
                >
                  {historicalPendingCount}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                title="Réinitialiser les filtres"
                className="h-9 px-2.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 text-xs"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Context strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800/60">
          <div className="flex items-center gap-2">
            {olderPendingOnly ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Affichage de tous les transferts historiques en attente de réception (&gt; 30 jours), quel que soit leur âge.
              </span>
            ) : hasActiveFilters ? (
              <span>Résultats filtrés sur l&apos;historique complet ({totalCount} transfert{totalCount > 1 ? 's' : ''}).</span>
            ) : (
              <span>Vue par défaut : transferts des 30 derniers jours ({totalCount} transfert{totalCount > 1 ? 's' : ''}).</span>
            )}
          </div>
          {isFetching && !isLoading && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-stone-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Actualisation...
            </span>
          )}
        </div>
      </div>

      {transfers.length === 0 ? (
        <Card className="border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/10">
          <CardContent className="p-12 text-center text-stone-400 italic text-xs space-y-2">
            <p>
              {olderPendingOnly
                ? 'Aucun transfert historique en attente de réception (> 30 jours).'
                : hasActiveFilters
                ? 'Aucun transfert ne correspond aux critères de recherche.'
                : 'Aucun transfert de stock enregistré au cours des 30 derniers jours.'}
            </p>
            {!olderPendingOnly && historicalPendingCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleOlderPending}
                className="mt-2 text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg"
              >
                Voir les {historicalPendingCount} transfert(s) en attente &gt; 30 jours
              </Button>
            )}
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
                      {tr.vehicleSerialNumber && (
                        <span className="text-[9px] font-mono font-medium text-stone-400 dark:text-stone-500 block pl-5">
                          Mat: {tr.vehicleSerialNumber}
                        </span>
                      )}
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
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenDetails(tr)}
                          className="h-8 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 gap-1 font-semibold text-[10px] uppercase tracking-wider"
                        >
                          <Eye className="h-3.5 w-3.5" /> Voir
                        </Button>

                        {tr.status === TransferStatus.Pending && isOriginUser(tr) && (
                          <Button
                            variant="ghost"
                            onClick={() => setEditTransfer(tr)}
                            className="h-8 px-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 gap-1 font-semibold text-[10px] uppercase tracking-wider"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modifier
                          </Button>
                        )}

                        {tr.status === TransferStatus.Rejected && isOriginUser(tr) && (
                          <Button
                            variant="ghost"
                            onClick={() => setEditTransfer(tr)}
                            className="h-8 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 gap-1 font-semibold text-[10px] uppercase tracking-wider"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Modifier et Renvoyer
                          </Button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Server-side Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-50/40 dark:bg-stone-900/30 text-xs">
              <span className="text-stone-500 dark:text-stone-400 font-medium tabular-nums">
                Page <span className="font-bold text-stone-800 dark:text-stone-200">{page}</span> sur{' '}
                <span className="font-bold text-stone-800 dark:text-stone-200">{totalPages}</span> — {totalCount} transfert{totalCount > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
                >
                  Suivant <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-250 dark:border-stone-850 shadow-2xl p-6 sm:max-w-2xl w-full">
          <DialogHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
            <DialogTitle className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" /> Détails du Transfert Logistique
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400 leading-normal">
              Fiche détaillée du transfert inter-dépôts {selectedTransfer?.docSortie}.
            </DialogDescription>
          </DialogHeader>

          {/* Core Info summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-4 border-b border-stone-200/40 dark:border-stone-800/40">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Dépôt Expéditeur</span>
              <div className="font-semibold text-stone-800 dark:text-stone-200">{selectedTransfer?.origine || selectedTransfer?.originSiteAddress}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Dépôt Réceptionnaire</span>
              <div className="font-semibold text-stone-800 dark:text-stone-200">{selectedTransfer?.destination || selectedTransfer?.destinationSiteAddress}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Transporteur</span>
              <div className="font-semibold text-stone-800 dark:text-stone-200">{selectedTransfer?.transporter || 'Non spécifié'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Véhicule</span>
              <div className="font-semibold font-mono text-stone-800 dark:text-stone-200">
                {selectedTransfer?.vehicleSerialNumber || (transferDetails?.[0] as any)?.vehicleSerialNumber || '---'}
              </div>
            </div>
          </div>

          {/* Sender Validation Code (visible ONLY for Pending transfers when authorized by backend as origin user / Admin) */}
          {selectedTransfer?.status === TransferStatus.Pending &&
            isOriginUser(selectedTransfer) &&
            selectedTransfer.confirmationCode && (
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Code de Validation (Expéditeur)
                  </span>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80">
                    Communiquez ce code au dépôt réceptionnaire pour confirmer la réception.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-950 border border-amber-300 dark:border-amber-800 font-mono text-base font-bold tracking-widest text-stone-900 dark:text-stone-50 tabular-nums">
                    {selectedTransfer.confirmationCode}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCode(selectedTransfer.confirmationCode!)}
                    className="h-9 px-2.5 rounded-lg border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60"
                    title="Copier le code de validation"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

          {/* Rejection Notice if transfer is Rejected */}
          {selectedTransfer?.status === TransferStatus.Rejected && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                Ce transfert a été rejeté par la destination
              </span>
              <p className="text-xs text-rose-850 dark:text-rose-200 font-medium">
                {selectedTransfer.rejectionReason ? `« ${selectedTransfer.rejectionReason} »` : 'Aucun motif de rejet renseigné.'}
              </p>
            </div>
          )}

          {/* Notes / Instructions section if present */}
          {(selectedTransfer?.notes || (transferDetails?.[0] as any)?.notes) && (
            <div className="p-3 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-stone-200/50 dark:border-stone-850 space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-500" /> Instructions & Notes
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 font-medium whitespace-pre-wrap">
                {selectedTransfer?.notes || (transferDetails?.[0] as any)?.notes}
              </p>
            </div>
          )}

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
            {selectedTransfer?.status === TransferStatus.Rejected && isOriginUser(selectedTransfer) && (
              <Button
                type="button"
                onClick={() => {
                  const tr = selectedTransfer;
                  setSelectedTransfer(null);
                  setEditTransfer(tr);
                }}
                className="h-10 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 transition-all px-4"
              >
                <RotateCcw className="h-4 w-4" />
                Modifier et Renvoyer
              </Button>
            )}
            {selectedTransfer && !isLoadingDetails && (
              <Button
                type="button"
                onClick={() => setPrintTransfer({
                  transfer: {
                    ...selectedTransfer,
                    vehicleSerialNumber: selectedTransfer.vehicleSerialNumber || (transferDetails?.[0] as any)?.vehicleSerialNumber,
                    notes: selectedTransfer.notes || (transferDetails?.[0] as any)?.notes
                  },
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

      {/* Edit Pending Transfer Dialog */}
      <StockTransferEditDialog
        isOpen={editTransfer !== null}
        onClose={() => setEditTransfer(null)}
        transfer={editTransfer}
      />
    </div>
  );
}

