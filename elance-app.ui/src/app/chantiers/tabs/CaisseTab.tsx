'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Coins,
  Search,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import {
  useChantierCaisseSummary,
  useChantierCaisseTransactions,
  useAddCaisseAlimentation,
  useAddCaisseSortie,
  useValidateCaisseRequest,
  useDeleteCaisseTransaction,
} from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

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
  const { data: summary } = useChantierCaisseSummary(site.id);
  const { data: transactions = [] } = useChantierCaisseTransactions(site.id);
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
    <div className="flex flex-col gap-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Solde Actuel Hero Card */}
        <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
                Solde Disponible de la Caisse
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className={cn(
                    'text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums',
                    currentBalance > 0
                      ? 'text-[#10b981]'
                      : currentBalance === 0
                      ? 'text-[#0f172a]'
                      : 'text-[#dc2626]'
                  )}
                >
                  {currentBalance.toLocaleString('fr-FR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </span>
                <span className="text-sm font-bold text-[#64748b]">TND</span>
              </div>
            </div>

            <div
              className={cn(
                'p-3 rounded-2xl ring-1 ring-black/5 shrink-0',
                currentBalance > 0
                  ? 'bg-emerald-50 text-[#10b981]'
                  : 'bg-amber-50 text-[#d97706]'
              )}
            >
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
            <div className="text-xs text-[#64748b] truncate pr-2">
              Site : <strong className="text-[#0f172a]">{site.name}</strong>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setIsAlimentationOpen(true)}
                className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-bold rounded-xl active:scale-[0.96] transition-transform h-8.5 px-3 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Alimenter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSortieOpen(true)}
                className="text-xs font-bold rounded-xl border-black/15 hover:bg-slate-50 active:scale-[0.96] transition-transform h-8.5 px-3"
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-[#dc2626]" /> Sortie
              </Button>
            </div>
          </div>
        </div>

        {/* Total Alimentations */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
                Alimentations
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-[#2563eb]">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#0f172a] mt-2 tabular-nums">
              +{totalAlim.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}{' '}
              <span className="text-xs font-semibold text-[#64748b]">TND</span>
            </div>
          </div>
          <span className="text-[0.68rem] text-[#94a3b8] mt-2">Fonds reçus de la direction</span>
        </div>

        {/* Total Sorties */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] font-bold text-[#64748b] uppercase tracking-wider">
                Décaissements
              </span>
              <div className="p-2 rounded-xl bg-red-50 text-[#dc2626]">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#dc2626] mt-2 tabular-nums">
              -{totalSorties.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}{' '}
              <span className="text-xs font-semibold text-[#64748b]">TND</span>
            </div>
          </div>
          <span className="text-[0.68rem] text-[#94a3b8] mt-2">Dépenses et achats sur site</span>
        </div>
      </div>

      {/* Pending Mobile Requests (Approval Queue) */}
      {pendingRequests.length > 0 && (
        <Card className="border-[#fde68a] bg-[#fffdf5] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[#fef3c7] pb-3 pt-3.5 px-5 bg-[#fffbeb]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#d97706]" />
              <div>
                <CardTitle className="text-sm font-bold text-[#92400e]">
                  Demandes d&apos;argent via l&apos;Application Mobile ({pendingRequests.length})
                </CardTitle>
                <p className="text-[0.72rem] text-[#b45309]">
                  Ces demandes nécessitent votre accord avant débit effectif de la caisse chantier.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2.5">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#fde68a] shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5">
                      {req.beneficiaryPersonName ? req.beneficiaryPersonName.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#0f172a]">{req.reason}</span>
                        <span className="text-[0.65rem] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 uppercase">
                          En attente
                        </span>
                      </div>
                      <div className="text-[0.7rem] text-[#64748b] mt-0.5 flex items-center gap-2">
                        <span>
                          Demandeur : <strong className="text-[#334155]">{req.beneficiaryPersonName || 'Utilisateur mobile'}</strong>
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {new Date(req.transactionDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-sm sm:text-base font-extrabold text-[#0f172a] tabular-nums">
                      {req.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => validateRequest.mutate({ txId: req.id, approve: true })}
                        disabled={validateRequest.isPending}
                        className="bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl active:scale-[0.96] transition-transform h-8 px-3"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => validateRequest.mutate({ txId: req.id, approve: false })}
                        disabled={validateRequest.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl active:scale-[0.96] transition-transform h-8 px-3"
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
      <Card className="border-black/5 shadow-xs rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
              Journal des Opérations de Caisse
            </CardTitle>
            <p className="text-xs text-[#64748b] mt-0.5">
              Historique des approvisionnements, paiements et décaissements sur site.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-black/5">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96]',
                filterType === 'all'
                  ? 'bg-white text-[#0f172a] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              )}
            >
              Toutes ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('entree')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96]',
                filterType === 'entree'
                  ? 'bg-white text-[#10b981] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              )}
            >
              Alimentations ({transactions.filter((t) => t.type === 0).length})
            </button>
            <button
              onClick={() => setFilterType('sortie')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96]',
                filterType === 'sortie'
                  ? 'bg-white text-[#dc2626] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              )}
            >
              Dépenses ({transactions.filter((t) => t.type === 1 && t.status === 0).length})
            </button>
            {pendingRequests.length > 0 && (
              <button
                onClick={() => setFilterType('pending')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-[0.96]',
                  filterType === 'pending'
                    ? 'bg-white text-amber-600 shadow-2xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
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
                <tr className="bg-[#f8fafc] border-b border-black/5 text-[#64748b] font-bold uppercase text-[0.65rem] tracking-wider">
                  <th className="py-3 px-5">Date</th>
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
                    <tr key={tx.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-5 font-bold text-[#64748b] tabular-nums whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[0.65rem] font-extrabold uppercase px-2.5 py-0.5 rounded-full border',
                            isEntree
                              ? 'bg-emerald-50 text-[#065f46] border-emerald-200'
                              : 'bg-red-50 text-[#dc2626] border-red-200'
                          )}
                        >
                          {isEntree ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.typeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0f172a] max-w-[240px]">
                        <div className="truncate" title={tx.reason}>
                          {tx.reason}
                        </div>
                        {tx.notes && (
                          <div className="text-[0.68rem] text-[#94a3b8] font-normal truncate">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#334155] whitespace-nowrap">
                        {tx.beneficiaryPersonName ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0f172a] text-[0.65rem] flex items-center justify-center font-bold">
                              {tx.beneficiaryPersonName.charAt(0)}
                            </span>
                            <span>{tx.beneficiaryPersonName}</span>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] italic">Direction / Chantier</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748b] font-mono text-[0.7rem] whitespace-nowrap">
                        {tx.reference || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold tabular-nums whitespace-nowrap text-xs sm:text-sm">
                        <span className={isEntree ? 'text-[#10b981]' : 'text-[#dc2626]'}>
                          {isEntree ? '+' : '-'}
                          {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[0.65rem] font-bold px-2 py-0.5 rounded-full',
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
                          className="p-1.5 rounded-lg text-[#94a3b8] hover:text-red-600 hover:bg-red-50 cursor-pointer active:scale-[0.96] transition-transform"
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
                    <td colSpan={8} className="py-12 text-center text-[#94a3b8] text-xs">
                      Aucune transaction de caisse trouvée pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Alimenter la Caisse */}
      <ChantierModal
        open={isAlimentationOpen}
        onOpenChange={setIsAlimentationOpen}
        title="Alimenter la caisse du chantier"
        description="Enregistrez un versement de fonds pour approvisionner la trésorerie locale du site."
        icon={Plus}
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleAlimentationSubmit}
        submitLabel="Valider l'alimentation"
        isSubmitting={addAlimentation.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Montant à verser (TND)" required>
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={alimAmount}
                onChange={(e) => setAlimAmount(e.target.value)}
                required
                className="rounded-xl text-sm font-extrabold h-10 pl-3 pr-14 tabular-nums border-black/15 focus:border-[#2563eb]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748b]">
                TND
              </span>
            </div>
          </FormFieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormFieldGroup label="Date du versement" required>
              <Input
                type="date"
                value={alimDate}
                onChange={(e) => setAlimDate(e.target.value)}
                required
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Mode de versement">
              <select
                value={alimReference}
                onChange={(e) => setAlimReference(e.target.value)}
                className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              >
                <option value="Espèces">Espèces</option>
                <option value="Virement Bancaire">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Retrait Caisse Principale">Caisse Principale</option>
              </select>
            </FormFieldGroup>
          </div>

          <FormFieldGroup label="Motif de l'approvisionnement" required>
            <Input
              type="text"
              placeholder="Ex: Alimentation hebdomadaire, Fonds de roulement..."
              value={alimReason}
              onChange={(e) => setAlimReason(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Notes ou justificatif">
            <Input
              type="text"
              placeholder="Réf reçu, bordereau..."
              value={alimNotes}
              onChange={(e) => setAlimNotes(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>

      {/* Modal: Enregistrer une Sortie / Dépense */}
      <ChantierModal
        open={isSortieOpen}
        onOpenChange={setIsSortieOpen}
        title="Enregistrer une dépense / décaissement"
        description="Déclarez un achat urgent ou paiement comptant décaissé depuis la caisse du chantier."
        icon={ArrowUpRight}
        iconColor="text-[#dc2626]"
        iconBg="bg-red-50"
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleSortieSubmit}
        submitLabel="Enregistrer le décaissement"
        danger
        isSubmitting={addSortie.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Montant décaissé (TND)" required>
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={sortieAmount}
                onChange={(e) => setSortieAmount(e.target.value)}
                required
                className="rounded-xl text-sm font-extrabold h-10 pl-3 pr-14 tabular-nums border-black/15 focus:border-red-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748b]">
                TND
              </span>
            </div>
          </FormFieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormFieldGroup label="Date de la dépense" required>
              <Input
                type="date"
                value={sortieDate}
                onChange={(e) => setSortieDate(e.target.value)}
                required
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-red-500"
              />
            </FormFieldGroup>

            <FormFieldGroup label="Référence / Facture">
              <Input
                type="text"
                placeholder="N° ticket / bon"
                value={sortieReference}
                onChange={(e) => setSortieReference(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-red-500 font-mono"
              />
            </FormFieldGroup>
          </div>

          <FormFieldGroup label="Motif de la dépense" required>
            <Input
              type="text"
              placeholder="Ex: Achat sacs de ciment d'urgence, carburant camion..."
              value={sortieReason}
              onChange={(e) => setSortieReason(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-red-500"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Bénéficiaire (Employé / Prestataire)">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Filtrer par nom ou téléphone..."
                value={beneficiarySearch}
                onChange={(e) => setBeneficiarySearch(e.target.value)}
                className="rounded-xl pl-9 text-xs h-8.5 border-black/15 focus:border-red-500"
              />
            </div>

            <div className="max-h-[130px] overflow-y-auto border border-black/10 rounded-xl bg-[#fafafa] divide-y divide-black/5">
              <button
                type="button"
                onClick={() => setSortieBeneficiaryId(undefined)}
                className={cn(
                  'w-full text-left p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors',
                  sortieBeneficiaryId === undefined
                    ? 'bg-blue-50 font-bold text-[#2563eb]'
                    : 'hover:bg-slate-100'
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
                      'w-full text-left p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors',
                      isSelected ? 'bg-blue-50 font-bold text-[#2563eb]' : 'hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-[#0f172a] flex items-center justify-center font-bold text-[0.65rem]">
                        {(p.firstname || 'P').charAt(0)}
                      </div>
                      <div>
                        <span>{p.firstname} {p.lastname}</span>
                        {p.phonenumber && (
                          <span className="text-[0.65rem] text-[#94a3b8] ml-1.5 tabular-nums">
                            ({p.phonenumber})
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </FormFieldGroup>

          <FormFieldGroup label="Notes ou justificatif">
            <Input
              type="text"
              placeholder="Détails supplémentaires..."
              value={sortieNotes}
              onChange={(e) => setSortieNotes(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-red-500"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
