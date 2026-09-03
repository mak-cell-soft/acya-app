'use client';

import React, { useState } from 'react';
import {
  Wallet,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Coins,
  AlertCircle,
  Receipt,
  Search,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import {
  useChantierCaisseSummary,
  useChantierCaisseTransactions,
  useAddCaisseAlimentation,
  useAddCaisseSortie,
  useValidateCaisseRequest,
  useDeleteCaisseTransaction
} from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { cn } from '@/lib/utils';

interface CaisseTabProps {
  site: ChantierDetail;
}

export function CaisseTab({ site }: CaisseTabProps) {
  const [isAlimentationOpen, setIsAlimentationOpen] = useState(false);
  const [isSortieOpen, setIsSortieOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'entree' | 'sortie' | 'pending'>('all');

  // Form states - Alimentation
  const [alimAmount, setAlimAmount] = useState('');
  const [alimDate, setAlimDate] = useState(new Date().toISOString().split('T')[0]);
  const [alimReason, setAlimReason] = useState('Alimentation de caisse');
  const [alimReference, setAlimReference] = useState('Espèces');
  const [alimNotes, setAlimNotes] = useState('');

  // Form states - Sortie
  const [sortieAmount, setSortieAmount] = useState('');
  const [sortieDate, setSortieDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortieReason, setSortieReason] = useState('');
  const [sortieBeneficiaryId, setSortieBeneficiaryId] = useState<number | undefined>(undefined);
  const [sortieReference, setSortieReference] = useState('');
  const [sortieNotes, setSortieNotes] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');

  // Data queries & mutations
  const { data: summary, isLoading: isSummaryLoading } = useChantierCaisseSummary(site.id);
  const { data: transactions = [], isLoading: isTxLoading } = useChantierCaisseTransactions(site.id);
  const { data: persons = [] } = usePersons();

  const addAlimentation = useAddCaisseAlimentation(site.id);
  const addSortie = useAddCaisseSortie(site.id);
  const validateRequest = useValidateCaisseRequest(site.id);
  const deleteTransaction = useDeleteCaisseTransaction(site.id);

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'entree') return tx.type === 0;
    if (filterType === 'sortie') return tx.type === 1 && tx.status === 0;
    if (filterType === 'pending') return tx.status === 1;
    return true;
  });

  const pendingRequests = transactions.filter((tx) => tx.status === 1);

  // Beneficiary list filter
  const filteredPersons = persons.filter((p) => {
    const q = beneficiarySearch.toLowerCase();
    const fullName = `${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
    return fullName.includes(q) || (p.phonenumber && p.phonenumber.includes(q));
  });

  const handleAlimentationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(alimAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await addAlimentation.mutateAsync({
      amount: amountNum,
      transactionDate: alimDate ? new Date(alimDate).toISOString() : undefined,
      reason: alimReason.trim(),
      reference: alimReference.trim() || undefined,
      notes: alimNotes.trim() || undefined,
    });

    setIsAlimentationOpen(false);
    setAlimAmount('');
    setAlimReason('Alimentation de caisse');
    setAlimNotes('');
  };

  const handleSortieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(sortieAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await addSortie.mutateAsync({
      amount: amountNum,
      transactionDate: sortieDate ? new Date(sortieDate).toISOString() : undefined,
      reason: sortieReason.trim(),
      beneficiaryPersonId: sortieBeneficiaryId,
      reference: sortieReference.trim() || undefined,
      notes: sortieNotes.trim() || undefined,
      isMobileRequest: false,
    });

    setIsSortieOpen(false);
    setSortieAmount('');
    setSortieReason('');
    setSortieBeneficiaryId(undefined);
    setSortieNotes('');
  };

  const currentBalance = summary?.currentBalance ?? 0;
  const totalAlim = summary?.totalAlimentations ?? 0;
  const totalSorties = summary?.totalSorties ?? 0;

  return (
    <div className="flex flex-col gap-8 font-['Outfit',sans-serif]">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Solde Actuel Hero Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#888780] uppercase tracking-wider">
                Solde Disponible de la Caisse
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={cn(
                    "text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums",
                    currentBalance > 0
                      ? 'text-[#10b981]'
                      : currentBalance === 0
                      ? 'text-[#1a1a1a]'
                      : 'text-[#dc2626]'
                  )}
                >
                  {currentBalance.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
                <span className="text-sm font-bold text-[#888780]">TND</span>
              </div>
            </div>
            <div
              className={cn(
                "p-3 rounded-2xl ring-1 ring-black/5",
                currentBalance > 0
                  ? 'bg-emerald-50 text-[#10b981]'
                  : 'bg-amber-50 text-[#d97706]'
              )}
            >
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
            <div className="text-xs text-[#888780]">
              Chantier: <span className="font-semibold text-[#1a1a1a]">{site.name}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsAlimentationOpen(true)}
                className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-bold rounded-xl active:scale-[0.96] transition-transform min-h-[38px] px-3.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Alimenter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSortieOpen(true)}
                className="text-xs font-bold rounded-xl border-black/10 hover:bg-black/5 active:scale-[0.96] transition-transform min-h-[38px] px-3.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-[#dc2626]" /> Sortie
              </Button>
            </div>
          </div>
        </div>

        {/* Total Alimentations (Entrées) */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#888780] uppercase">Total Alimentations</span>
              <div className="p-2 rounded-xl bg-blue-50 text-[#2563eb]">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#1a1a1a] mt-2 tabular-nums">
              +{totalAlim.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs font-semibold text-[#888780]">TND</span>
            </div>
          </div>
          <span className="text-[0.7rem] text-[#888780] mt-2">Fonds versés par la direction</span>
        </div>

        {/* Total Sorties (Dépenses) */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#888780] uppercase">Total Décaissements</span>
              <div className="p-2 rounded-xl bg-red-50 text-[#dc2626]">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#dc2626] mt-2 tabular-nums">
              -{totalSorties.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs font-semibold text-[#888780]">TND</span>
            </div>
          </div>
          <span className="text-[0.7rem] text-[#888780] mt-2">Dépenses terrain & achats urgents</span>
        </div>
      </div>

      {/* Pending Mobile Requests (Approval Queue) */}
      {pendingRequests.length > 0 && (
        <Card className="border-[#fde68a] bg-[#fffdf5] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[#fef3c7] pb-3 flex flex-row items-center justify-between bg-[#fffbeb]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#d97706]" />
              <div>
                <CardTitle className="text-sm font-bold text-[#92400e]">
                  Demandes d'argent via l'Application Mobile ({pendingRequests.length})
                </CardTitle>
                <p className="text-xs text-[#b45309]">
                  Ces demandes attendent votre validation avant d'être décaissées de la caisse chantier.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 p-4">
            <div className="flex flex-col gap-2.5">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#fde68a] shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5">
                      {req.beneficiaryPersonName ? req.beneficiaryPersonName.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1a1a1a]">{req.reason}</span>
                        <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                          En attente
                        </span>
                      </div>
                      <div className="text-xs text-[#888780] mt-0.5 flex items-center gap-2">
                        <span>Demandeur: <strong className="text-[#444]">{req.beneficiaryPersonName || 'Utilisateur mobile'}</strong></span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {new Date(req.transactionDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-base font-extrabold text-[#1a1a1a] tabular-nums">
                      {req.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => validateRequest.mutate({ txId: req.id, approve: true })}
                        disabled={validateRequest.isPending}
                        className="bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl active:scale-[0.96] transition-transform min-h-[36px] px-3"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => validateRequest.mutate({ txId: req.id, approve: false })}
                        disabled={validateRequest.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl active:scale-[0.96] transition-transform min-h-[36px] px-3"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions History Ledger */}
      <Card className="border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-black/5 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">
              Journal des Opérations de Caisse
            </CardTitle>
            <p className="text-xs text-[#888780] mt-0.5">
              Historique complet des approvisionnements, paiements et décaissements sur site.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#f8f9fa] p-1 rounded-xl border border-black/5">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96] transition-transform",
                filterType === 'all'
                  ? 'bg-white text-[#1a1a1a] shadow-xs'
                  : 'text-[#888780] hover:text-[#1a1a1a]'
              )}
            >
              Toutes ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('entree')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96] transition-transform",
                filterType === 'entree'
                  ? 'bg-white text-[#10b981] shadow-xs'
                  : 'text-[#888780] hover:text-[#1a1a1a]'
              )}
            >
              Alimentations ({transactions.filter((t) => t.type === 0).length})
            </button>
            <button
              onClick={() => setFilterType('sortie')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96] transition-transform",
                filterType === 'sortie'
                  ? 'bg-white text-[#dc2626] shadow-xs'
                  : 'text-[#888780] hover:text-[#1a1a1a]'
              )}
            >
              Dépenses ({transactions.filter((t) => t.type === 1 && t.status === 0).length})
            </button>
            {pendingRequests.length > 0 && (
              <button
                onClick={() => setFilterType('pending')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96] transition-transform",
                  filterType === 'pending'
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-[#888780] hover:text-[#1a1a1a]'
                )}
              >
                En attente ({pendingRequests.length})
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fafafa] border-b border-black/5 text-[#888780] font-bold uppercase text-[0.65rem] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4">Bénéficiaire / Demandeur</th>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredTransactions.map((tx) => {
                  const isEntree = tx.type === 0;
                  return (
                    <tr key={tx.id} className="hover:bg-[#fcfcfc] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#888780] tabular-nums whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[0.65rem] font-extrabold uppercase px-2.5 py-1 rounded-full",
                            isEntree
                              ? 'bg-emerald-50 text-[#10b981] border border-emerald-200'
                              : 'bg-red-50 text-[#dc2626] border border-red-200'
                          )}
                        >
                          {isEntree ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.typeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1a1a1a] max-w-[240px]">
                        <div className="truncate" title={tx.reason}>{tx.reason}</div>
                        {tx.notes && <div className="text-[0.65rem] text-[#888780] font-normal truncate">{tx.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-[#444] whitespace-nowrap">
                        {tx.beneficiaryPersonName ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="w-5 h-5 rounded-full bg-black/5 text-[#1a1a1a] text-[0.65rem] flex items-center justify-center font-bold">
                              {tx.beneficiaryPersonName.charAt(0)}
                            </span>
                            <span>{tx.beneficiaryPersonName}</span>
                          </div>
                        ) : (
                          <span className="text-[#888780] italic">Direction / Chantier</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#888780] font-mono text-[0.7rem] whitespace-nowrap">
                        {tx.reference || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums whitespace-nowrap text-sm">
                        <span className={isEntree ? 'text-[#10b981]' : 'text-[#dc2626]'}>
                          {isEntree ? '+' : '-'}
                          {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "text-[0.65rem] font-bold px-2 py-0.5 rounded-full",
                            tx.status === 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.status === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-50 text-red-700'
                          )}
                        >
                          {tx.statusName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (confirm('Confirmer la suppression de cette transaction ?')) {
                              deleteTransaction.mutate(tx.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-[#888780] hover:text-red-600 hover:bg-red-50 cursor-pointer active:scale-[0.96] transition-transform"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#888780] text-xs">
                      Aucune transaction de caisse trouvée pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Alimenter la Caisse (Admin Cash In) */}
      <Dialog open={isAlimentationOpen} onOpenChange={setIsAlimentationOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#2563eb]">
                <Plus className="w-5 h-5" />
              </div>
              Alimenter la Caisse du Chantier
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAlimentationSubmit} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Montant à verser (TND) *
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={alimAmount}
                  onChange={(e) => setAlimAmount(e.target.value)}
                  required
                  className="rounded-xl text-sm font-extrabold h-11 pl-3 pr-14 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#888780]">
                  TND
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                  Date du versement *
                </label>
                <Input
                  type="date"
                  value={alimDate}
                  onChange={(e) => setAlimDate(e.target.value)}
                  required
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                  Mode de versement
                </label>
                <select
                  value={alimReference}
                  onChange={(e) => setAlimReference(e.target.value)}
                  className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Virement Bancaire">Virement bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Retrait Caisse Principale">Caisse Principale</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Motif de l'approvisionnement *
              </label>
              <Input
                type="text"
                placeholder="Ex: Alimentation hebdomadaire, Fonds de départ..."
                value={alimReason}
                onChange={(e) => setAlimReason(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Notes ou justificatif
              </label>
              <Input
                type="text"
                placeholder="Réf reçu, bordereau..."
                value={alimNotes}
                onChange={(e) => setAlimNotes(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAlimentationOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={addAlimentation.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-5"
              >
                {addAlimentation.isPending ? 'Enregistrement...' : 'Valider l\'alimentation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Enregistrer une Sortie / Dépense */}
      <Dialog open={isSortieOpen} onOpenChange={setIsSortieOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-50 text-[#dc2626]">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              Enregistrer une Dépense / Décaissement
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSortieSubmit} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Montant décaissé (TND) *
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={sortieAmount}
                  onChange={(e) => setSortieAmount(e.target.value)}
                  required
                  className="rounded-xl text-sm font-extrabold h-11 pl-3 pr-14 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#888780]">
                  TND
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                  Date de la dépense *
                </label>
                <Input
                  type="date"
                  value={sortieDate}
                  onChange={(e) => setSortieDate(e.target.value)}
                  required
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                  Référence / Facture
                </label>
                <Input
                  type="text"
                  placeholder="N° ticket / bon"
                  value={sortieReference}
                  onChange={(e) => setSortieReference(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Motif de la dépense *
              </label>
              <Input
                type="text"
                placeholder="Ex: Achat sacs de ciment d'urgence, carburant camion..."
                value={sortieReason}
                onChange={(e) => setSortieReason(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Bénéficiaire */}
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Bénéficiaire (Employé / Chef de chantier)
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#888780] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Filtrer par nom ou téléphone..."
                  value={beneficiarySearch}
                  onChange={(e) => setBeneficiarySearch(e.target.value)}
                  className="rounded-xl pl-9 text-xs h-9"
                />
              </div>

              <div className="max-h-[140px] overflow-y-auto border border-black/10 rounded-xl bg-[#fafafa] divide-y divide-black/5">
                <button
                  type="button"
                  onClick={() => setSortieBeneficiaryId(undefined)}
                  className={cn(
                    "w-full text-left p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors",
                    sortieBeneficiaryId === undefined ? 'bg-blue-50 font-bold text-[#2563eb]' : 'hover:bg-black/5'
                  )}
                >
                  <span>Aucun bénéficiaire individuel (Dépense globale)</span>
                  {sortieBeneficiaryId === undefined && <UserCheck className="w-3.5 h-3.5" />}
                </button>
                {filteredPersons.map((p) => {
                  const isSelected = sortieBeneficiaryId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSortieBeneficiaryId(p.id)}
                      className={cn(
                        "w-full text-left p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors",
                        isSelected ? 'bg-blue-50 font-bold text-[#2563eb]' : 'hover:bg-black/5'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-black/5 text-[#1a1a1a] flex items-center justify-center font-bold text-[0.65rem]">
                          {(p.firstname || 'P').charAt(0)}
                        </div>
                        <div>
                          <span>{p.firstname} {p.lastname}</span>
                          {p.phonenumber && <span className="text-[0.65rem] text-[#888780] ml-1.5 tabular-nums">({p.phonenumber})</span>}
                        </div>
                      </div>
                      {isSelected && <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Notes
              </label>
              <Input
                type="text"
                placeholder="Détails supplémentaires..."
                value={sortieNotes}
                onChange={(e) => setSortieNotes(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSortieOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={addSortie.isPending}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-5"
              >
                {addSortie.isPending ? 'Enregistrement...' : 'Enregistrer le décaissement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
