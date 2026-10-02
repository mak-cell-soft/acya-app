'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/use-auth-store';
import { useTransporters } from '@/hooks/use-transporters';
import { useArticles } from '@/hooks/use-articles';
import { stockService } from '@/services/components/stock.service';
import { StockTransferInfo, TransferStatus } from '@/types/stock';
import { Article } from '@/types/article';
import { ListOfLength } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { 
  Calendar, 
  Layers, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  Printer,
  FileEdit,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface EditMerchandiseRow {
  id: string; // client row unique id
  merchandiseId: number;
  articleId: number;
  articleReference: string;
  articleDescription: string;
  packageReference: string;
  quantity: number;
  unit: string;
  isWood: boolean;
  listOfLengths: ListOfLength[];
  initialQuantity: number;
  stockAvailable?: number;
}

interface StockTransferEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransferInfo | null;
  onSaved?: (result: any) => void;
}

export function StockTransferEditDialog({
  isOpen,
  onClose,
  transfer,
  onSaved
}: StockTransferEditDialogProps) {
  const queryClient = useQueryClient();
  const { data: allTransporters = [] } = useTransporters();
  const { data: allArticles = [] } = useArticles();

  // Loading & state
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [transferDate, setTransferDate] = useState<string>('');
  const [transporterId, setTransporterId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rows, setRows] = useState<EditMerchandiseRow[]>([]);

  // Wood Dialog State
  const [woodModalRowId, setWoodModalRowId] = useState<string | null>(null);
  const [selectedWoodArticle, setSelectedWoodArticle] = useState<Article | null>(null);
  const [lengthsStockDetails, setLengthsStockDetails] = useState<any[]>([]);
  const [isWoodModalOpen, setIsWoodModalOpen] = useState(false);
  const activeWoodRow = rows.find(r => r.id === woodModalRowId);

  // Warning modal after stock-affecting edit
  const [pinRegenAlert, setPinRegenAlert] = useState<{
    newPin: string;
    revisionNumber: number;
    transferData: StockTransferInfo;
    detailsData: any[];
    isResend?: boolean;
  } | null>(null);

  const isResend = transfer?.status === TransferStatus.Rejected;

  // State to trigger printing
  const [printData, setPrintData] = useState<{ transfer: StockTransferInfo; details: any[] } | null>(null);

  // Helper format
  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  };

  // Load authoritative transfer details from backend when dialog opens
  useEffect(() => {
    if (!isOpen || !transfer) return;

    let isMounted = true;
    const loadDetails = async () => {
      try {
        setIsLoadingDetails(true);
        // Load details via API
        const details = await stockService.getStockTransferDetails(transfer.docSortie, transfer.docReception);
        
        if (!isMounted) return;

        // Initialize form metadata
        setTransferDate(transfer.transferDate ? transfer.transferDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
        setNotes(transfer.notes || '');

        // Resolve transporter ID
        const matchedTransporter = allTransporters.find(t => 
          t.fullname && t.fullname.toLowerCase() === (transfer.transporter || '').toLowerCase()
        );
        setTransporterId(matchedTransporter ? matchedTransporter.id.toString() : '');

        // Map merchandise rows
        const mappedRows: EditMerchandiseRow[] = (details || []).map((d: any, index: number) => {
          const isWood = d.unit?.toUpperCase().includes('M3') || d.unit?.toUpperCase().includes('MÈTRE 3') || !!d.exitDocLengths?.length;
          
          const mappedLengths: ListOfLength[] = (d.exitDocLengths || []).map((len: any) => ({
            id: len.id,
            nbpieces: len.numberOfPieces ?? len.nbpieces ?? len.numberofpieces ?? 0,
            quantity: len.quantity ?? 0,
            length: len.appVarLengthId ? {
              id: len.appVarLengthId,
              name: len.lengthName || '',
              nature: 'Length',
              value: (len.length || 0).toString(),
              isactive: true,
              isdefault: false,
              iseditable: true
            } : (len.length || undefined)
          }));

          return {
            id: `row-${d.merchandiseId || d.id || index}-${Date.now()}`,
            merchandiseId: d.merchandiseId || d.id,
            articleId: d.articleId,
            articleReference: d.refMerchandise || d.articleReference || '',
            articleDescription: d.description || d.articleDescription || '',
            packageReference: d.refPaquet || d.packageReference || 'Standard',
            quantity: d.quantity,
            initialQuantity: d.quantity,
            unit: d.unit || 'U',
            isWood,
            listOfLengths: mappedLengths
          };
        });

        setRows(mappedRows);
      } catch (err) {
        console.error('Failed to load transfer details for edit:', err);
        toast.error('Impossible de charger les détails du transfert.');
      } finally {
        if (isMounted) setIsLoadingDetails(false);
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, transfer, allTransporters]);

  const handleQuantityChange = (rowId: string, val: number) => {
    const clean = val < 0 ? 0 : val;
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, quantity: clean } : r));
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      toast.error('Un transfert doit contenir au moins un article.');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleOpenWoodDialog = async (row: EditMerchandiseRow) => {
    setWoodModalRowId(row.id);
    const art = allArticles.find(a => a.reference === row.articleReference) || null;
    if (!art) {
      toast.error("Impossible de charger les données techniques de l'article.");
      return;
    }
    setSelectedWoodArticle(art);

    try {
      const details = await stockService.getWoodStockWithLengthDetails({
        merchandiseRef: row.articleReference,
        salesSiteId: transfer?.originSiteId ? Number(transfer.originSiteId) : undefined,
        merchandiseId: row.merchandiseId
      });
      const mapped = (details || []).map((d: any) => ({
        id: d.id ?? d.Id,
        lengthId: d.lengthId ?? d.LengthId,
        lengthName: d.lengthName ?? d.LengthName,
        remainingPieces: d.remainingPieces ?? d.RemainingPieces
      }));
      setLengthsStockDetails(mapped);
    } catch (err) {
      console.error('Failed to load wood stock details by length:', err);
      setLengthsStockDetails([]);
    }

    setIsWoodModalOpen(true);
  };

  const handleWoodSave = (lengths: ListOfLength[], totalVolume: number) => {
    if (!woodModalRowId) return;
    setRows(prev => prev.map(r => {
      if (r.id === woodModalRowId) {
        return {
          ...r,
          quantity: totalVolume,
          listOfLengths: lengths
        };
      }
      return r;
    }));
    setIsWoodModalOpen(false);
    setWoodModalRowId(null);
    setSelectedWoodArticle(null);
  };

  const handleSubmit = async () => {
    if (!transfer) return;

    if (rows.length === 0) {
      toast.error('Veuillez inclure au moins un article dans le transfert.');
      return;
    }

    const invalidQty = rows.some(r => r.quantity <= 0);
    if (invalidQty) {
      toast.error('Tous les articles doivent avoir une quantité strictement positive.');
      return;
    }

    try {
      setIsSaving(true);

      // Build payload
      const merchandisesItems = rows.map(r => ({
        id: r.merchandiseId,
        quantity: r.quantity,
        packagereference: r.packageReference,
        lisoflengths: r.listOfLengths.map(l => ({
          nbpieces: l.nbpieces,
          quantity: l.quantity,
          length: l.length ? { id: l.length.id } : null
        }))
      }));

      const payload = {
        transferDate: new Date(transferDate).toISOString(),
        notes: notes.trim(),
        transporterId: transporterId ? parseInt(transporterId) : undefined,
        originSiteId: transfer.originSiteId,
        destinationSiteId: transfer.destinationSiteId,
        merchandisesItems
      };

      const result = isResend 
        ? await stockService.resendTransfer(transfer.id, payload)
        : await stockService.updateTransfer(transfer.id, payload);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfer-details'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });

      if (onSaved) onSaved(result);

      if (isResend || result.pinRegenerated) {
        // Show reprint warning modal with new PIN
        setPinRegenAlert({
          newPin: result.confirmationCode,
          revisionNumber: result.revisionNumber || (transfer.revisionNumber ? transfer.revisionNumber + 1 : 2),
          isResend,
          transferData: {
            ...transfer,
            confirmationCode: result.confirmationCode,
            revisionNumber: result.revisionNumber,
            notes,
            transferDate
          },
          detailsData: rows.map(r => ({
            articleReference: r.articleReference,
            description: r.articleDescription,
            refPaquet: r.packageReference,
            quantity: r.quantity,
            unit: r.unit
          }))
        });
      } else {
        toast.success(`Transfert ${transfer.docSortie} mis à jour avec succès (Révision ${result.revisionNumber || 2}).`);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to update transfer:', err);
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Erreur lors de la modification du transfert.';
      toast.error(typeof msg === 'string' ? msg : 'Erreur lors de la modification du transfert.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!transfer) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-250 dark:border-stone-850 shadow-2xl p-6 sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
                {isResend ? (
                  <>
                    <RotateCcw className="h-5 w-5 text-amber-500" />
                    Modifier et Renvoyer le Transfert Rejeté
                  </>
                ) : (
                  <>
                    <FileEdit className="h-5 w-5 text-amber-500" />
                    Modifier le Transfert Inter-Sites
                  </>
                )}
              </DialogTitle>
              {isResend ? (
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-rose-200 dark:border-rose-800">
                  REJETÉ • REV {((transfer.revisionNumber || 1)).toString().padStart(2, '0')}
                </Badge>
              ) : (
                <Badge className="bg-stone-150 text-stone-700 dark:bg-stone-800 dark:text-stone-300 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                  REV {((transfer.revisionNumber || 1)).toString().padStart(2, '0')}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-stone-400 leading-normal">
              {isResend ? (
                <>
                  Bon de Sortie <span className="font-mono font-bold text-stone-700 dark:text-stone-200">{transfer.docSortie}</span> (Statut : Rejeté par la destination).
                </>
              ) : (
                <>
                  Bon de Sortie <span className="font-mono font-bold text-stone-700 dark:text-stone-200">{transfer.docSortie}</span> (Statut : En attente).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Rejection notice in dialog if resending */}
          {isResend && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1 mt-2">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                Ce transfert a été rejeté par la destination :
              </span>
              <p className="text-xs text-rose-850 dark:text-rose-200 font-medium">
                {transfer.rejectionReason ? `« ${transfer.rejectionReason} »` : 'Aucun motif de rejet renseigné.'}
              </p>
            </div>
          )}

          {isLoadingDetails ? (
            <div className="py-20 flex flex-col justify-center items-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-stone-800 dark:text-stone-200" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                Chargement des articles du transfert...
              </span>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              
              {/* Sites (Read-only / Immutable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50/70 dark:bg-stone-900/30 border border-stone-200/50 dark:border-stone-800/50">
                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">
                    Dépôt d'Origine (Non modifiable)
                  </Label>
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2 bg-stone-100 dark:bg-stone-800/60 p-2.5 rounded-lg border border-stone-200/50 dark:border-stone-700/50">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>{transfer.origine || transfer.originSiteAddress}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">
                    Dépôt de Destination (Non modifiable)
                  </Label>
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2 bg-stone-100 dark:bg-stone-800/60 p-2.5 rounded-lg border border-stone-200/50 dark:border-stone-700/50">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{transfer.destination || transfer.destinationSiteAddress}</span>
                  </div>
                </div>
              </div>

              {/* Metadata Fields (Editable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-stone-600 dark:text-stone-300 block mb-1">
                    Date du Transfert
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-stone-600 dark:text-stone-300 block mb-1">
                    Transporteur & Véhicule
                  </Label>
                  <Select value={transporterId} onValueChange={(val) => setTransporterId(val || '')}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Sélectionner le transporteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTransporters.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                          {t.fullname} {t.car ? `(${t.car})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instructions / Notes */}
              <div>
                <Label className="text-[10px] uppercase font-bold tracking-wider text-stone-600 dark:text-stone-300 block mb-1">
                  Notes & Instructions Logistiques
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques éventuelles sur la marchandise ou la livraison..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Merchandise Items Table (Editable) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-500" />
                    Marchandises & Quantités Transférées
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    {rows.length} article(s)
                  </span>
                </div>

                <div className="border border-stone-200/60 dark:border-stone-800/60 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-50/70 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                        <th className="p-3 pl-4">Réf Article</th>
                        <th className="p-3">Désignation</th>
                        <th className="p-3">Réf Paquet</th>
                        <th className="p-3 text-right">Quantité</th>
                        <th className="p-3 pr-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50/20 transition-colors">
                          <td className="p-3 pl-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                            {row.articleReference}
                          </td>
                          <td className="p-3 truncate max-w-[200px] text-stone-600 dark:text-stone-300">
                            {row.articleDescription}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-stone-500">
                            {row.packageReference}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.isWood ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-xs">
                                    {formatQuantity(row.quantity, row.unit)}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenWoodDialog(row)}
                                    className="h-7 text-[10px] px-2 rounded-lg font-semibold"
                                  >
                                    Longueurs
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={row.quantity || ''}
                                  onChange={(e) => handleQuantityChange(row.id, parseFloat(e.target.value) || 0)}
                                  className="h-8 w-24 text-right font-mono font-bold text-xs rounded-lg"
                                />
                              )}
                              <span className="text-[10px] text-stone-400 font-medium">
                                {row.unit}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(row.id)}
                              className="h-7 w-7 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-250/50 dark:border-amber-900/30 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Règle de sécurité :</strong> Toute modification d'articles ou de quantités recalculera le stock à l'origine et régénérera automatiquement un <strong>nouveau code PIN de confirmation</strong>.
                  </p>
                </div>
              </div>

            </div>
          )}

          <DialogFooter className="border-t border-stone-100 dark:border-stone-900 pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 text-xs font-semibold rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isLoadingDetails}
              className="h-10 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isResend ? 'Renvoi en cours...' : 'Enregistrement...'}
                </>
              ) : isResend ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Valider et Renvoyer le Transfert
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wood Lengths Dialog if user modifies lengths */}
      {isWoodModalOpen && activeWoodRow && selectedWoodArticle && (
        <WoodLengthsDialog
          isOpen={isWoodModalOpen}
          onClose={() => {
            setIsWoodModalOpen(false);
            setWoodModalRowId(null);
            setSelectedWoodArticle(null);
          }}
          article={selectedWoodArticle}
          currentLengths={activeWoodRow.listOfLengths}
          availableStockDetails={lengthsStockDetails}
          isPurchase={false}
          onSave={handleWoodSave}
        />
      )}

      {/* Warning Alert after Stock-Affecting Edit / Resend */}
      {pinRegenAlert && (
        <AlertDialog open={true} onOpenChange={() => {}}>
          <AlertDialogContent className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-250 dark:border-stone-850 p-6 sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {pinRegenAlert.isResend ? 'Transfert renvoyé avec succès' : 'Code de confirmation régénéré'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-stone-600 dark:text-stone-300 space-y-3 pt-2">
                <p>
                  {pinRegenAlert.isResend
                    ? 'Le transfert a été renvoyé avec succès. Un nouveau code de confirmation a été généré :'
                    : 'Les articles ou quantités ont été modifiés. Le code de confirmation a été régénéré :'}
                </p>
                <div className="bg-stone-100 dark:bg-stone-900 p-3 rounded-xl text-center border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Nouveau Code de Confirmation (Révision {pinRegenAlert.revisionNumber})
                  </span>
                  <span className="text-2xl font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400">
                    {pinRegenAlert.newPin}
                  </span>
                </div>
                <p className="font-semibold text-amber-800 dark:text-amber-400">
                  Veuillez réimprimer le Bon de Sortie pour le transporteur avant l'expédition. Le document précédent est désormais obsolète.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 pt-2">
              <AlertDialogAction
                onClick={() => {
                  const alertData = pinRegenAlert;
                  setPinRegenAlert(null);
                  onClose();
                  // Trigger print
                  setPrintData({
                    transfer: alertData.transferData,
                    details: alertData.detailsData
                  });
                }}
                className="h-10 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-xl gap-2 px-4"
              >
                <Printer className="h-4 w-4" />
                Réimprimer le Bon
              </AlertDialogAction>
              <Button
                variant="outline"
                onClick={() => {
                  setPinRegenAlert(null);
                  onClose();
                }}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Fermer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Direct print dialog trigger */}
      {printData && (
        <PrintVariantDialog
          isOpen={true}
          onClose={() => setPrintData(null)}
          transfer={printData.transfer}
          transferDetails={printData.details}
          docType="transfer"
        />
      )}
    </>
  );
}
