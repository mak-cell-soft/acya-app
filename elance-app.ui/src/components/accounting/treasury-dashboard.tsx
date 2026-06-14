'use client';

import React, { useState, useMemo } from 'react';
import { 
  RefreshCw,
  Coins,
  Store,
  Wallet,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  History,
  FileSearch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { useBankBalances, useCaissePrincipaleBalance, useAllCaisseBalances } from '@/hooks/use-treasury';
import { useBanks, useDeleteBank } from '@/hooks/use-banks';
import { BankDepositDialog } from '@/components/accounting/bank-deposit-dialog';
import { BankFormDialog } from '@/components/settings/bank-form-dialog';
import { PendingBordereauxSection } from '@/components/analytics/pending-bordereaux';
import { PendingTraitesSection } from '@/components/accounting/pending-traites';
import { InstrumentsTable } from '@/components/dashboard/instruments-table';
import { useBankStatement } from '@/hooks/use-bank-transactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function TreasuryDashboard() {
  const { user } = useAuthStore();
  const isAdmin = useMemo(() => {
    return user?.role === 'Admin' || user?.role === 'SuperAdmin';
  }, [user]);

  // Treasury Queries
  const { data: bankBalances = [], isLoading: isLoadingBanks, refetch: refetchBanks } = useBankBalances();
  const { data: mainCaisseBalance = 0, isLoading: isLoadingMainCaisse, refetch: refetchMainCaisse } = useCaissePrincipaleBalance();
  const { data: siteCaisseBalances = [], isLoading: isLoadingSites, refetch: refetchSites } = useAllCaisseBalances();

  // State to control deposit dialog
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);

  // Bank Management dialog state — null means "add new", object means "editing existing"
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);

  // Confirmation state for bank deletion
  const [bankToDelete, setBankToDelete] = useState<any>(null);

  const { data: banksList = [], isLoading: isLoadingBanksList } = useBanks();
  const deleteBankMutation = useDeleteBank();

  // Rapprochement Bancaire state
  const [statementBankId, setStatementBankId] = useState<number | null>(null);
  const [statementYear, setStatementYear] = useState<number>(new Date().getFullYear());
  const [statementMonth, setStatementMonth] = useState<number>(new Date().getMonth() + 1);

  React.useEffect(() => {
    if (banksList.length > 0 && !statementBankId) {
      setStatementBankId(banksList[0].id);
    }
  }, [banksList, statementBankId]);

  const { data: bankStatement, isLoading: isLoadingStatement, refetch: refetchStatement } = useBankStatement(
    statementBankId ?? 0,
    statementYear,
    statementMonth
  );

  const handleBankFormClose = () => {
    setIsBankFormOpen(false);
    setSelectedBank(null);
  };

  const handleEditBank = (bank: any) => {
    setSelectedBank(bank);
    setIsBankFormOpen(true);
  };

  const handleAddBank = () => {
    setSelectedBank(null);
    setIsBankFormOpen(true);
  };

  const handleConfirmDelete = (bank: any) => {
    setBankToDelete(bank);
  };

  const handleDeleteBank = () => {
    if (!bankToDelete) return;
    deleteBankMutation.mutate(bankToDelete.id, {
      onSettled: () => setBankToDelete(null)
    });
  };

  const refreshAll = () => {
    if (isAdmin) {
      refetchBanks();
      refetchMainCaisse();
      refetchSites();
      if (statementBankId) refetchStatement();
    }
  };

  // Computations for Treasury
  const totalCaissesSites = useMemo(() => {
    if (!siteCaisseBalances) return 0;
    return siteCaisseBalances.reduce((sum: number, s: any) => sum + (s.currentBalance || 0), 0);
  }, [siteCaisseBalances]);

  const totalBankBalances = useMemo(() => {
    if (!bankBalances) return 0;
    return bankBalances.reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0);
  }, [bankBalances]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
  };

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Landmark className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-lg font-medium">Vous n'avez pas l'autorisation d'accéder à cette section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-corp-blue-950/10 text-corp-blue-900 rounded-xl">
              <Landmark className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold tracking-widest text-corp-blue-800 uppercase font-mono">
              Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Trésorerie & Banques
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
            Situation consolidée des liquidités physiques, des avoirs en banque et rapprochement bancaire.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={refreshAll} 
            className="border-slate-200 hover:bg-slate-50 gap-2 h-11 px-4 font-bold"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
            Actualiser
          </Button>
        </div>
      </div>

      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-6 pt-2"
      >
        {/* Treasury KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Caisse Principale */}
          <Card className="rounded-xl border-slate-150 shadow-sm bg-white p-6 space-y-4 border relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Caisse Principale
                </span>
                <button 
                  onClick={() => refetchMainCaisse()} 
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors group cursor-pointer"
                  title="Actualiser le solde"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-all active:rotate-180" />
                </button>
              </div>
              <span className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
                {isLoadingMainCaisse ? (
                  <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded" />
                ) : (
                  formatCurrency(mainCaisseBalance)
                )}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Fonds disponibles dans le coffre central</p>
            </div>
            <Button
              onClick={() => setIsDepositDialogOpen(true)}
              className="w-full h-10 bg-corp-blue-50 hover:bg-corp-blue-100 text-corp-blue-900 border border-corp-blue-200/50 rounded-xl font-bold text-xs gap-2 transition-all shadow-sm"
            >
              <Coins className="w-4 h-4 text-amber-500" />
              Verser en Banque
            </Button>
          </Card>

          {/* Card 2: Caisses Points de Vente */}
          <Card className="rounded-xl border-slate-150 shadow-sm bg-white p-6 space-y-4 border relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-corp-blue-900/5 rounded-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Caisses Points de Vente
              </span>
              <span className="p-1.5 bg-corp-blue-50 text-corp-blue-900 rounded-lg">
                <Store className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
                {isLoadingSites ? (
                  <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded" />
                ) : (
                  formatCurrency(totalCaissesSites)
                )}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Total des liquidités dans les boutiques</p>
            </div>
            <div className="pt-2 text-[10px] text-corp-blue-800 font-semibold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mise à jour en temps réel des terminaux
            </div>
          </Card>

          {/* Card 3: Total en Banque */}
          <Card className="rounded-xl border-corp-blue-200/50 shadow-sm bg-corp-blue-50 text-corp-blue-900 p-6 space-y-4 border relative overflow-hidden group hover:shadow-lg hover:shadow-corp-blue-200/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-corp-blue-600 uppercase tracking-widest font-mono">
                Disponibilités en Banque
              </span>
              <span className="p-1.5 bg-amber-100/50 text-amber-600 rounded-lg">
                <Landmark className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-mono font-extrabold text-amber-600 tracking-tight">
                {isLoadingBanks ? (
                  <span className="inline-block w-24 h-6 bg-corp-blue-200 animate-pulse rounded" />
                ) : (
                  formatCurrency(totalBankBalances)
                )}
              </h3>
              <p className="text-[10px] text-corp-blue-600 font-medium">Avoir global sur l'ensemble des comptes</p>
            </div>
            <div className="pt-2 text-[10px] text-corp-blue-600 font-medium border-t border-corp-blue-200/50 mt-2">
              Comptabilisation des versements validés
            </div>
          </Card>
        </div>

        {/* Details Grid — Site breakdown + Bank balances */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Site Caisses Breakdown */}
          <Card className="lg:col-span-5 border-slate-100 shadow-md shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
            <CardHeader className="border-b border-slate-100 p-5 bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF]">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-corp-blue-850" />
                Caisse par Point de Vente
              </CardTitle>
              <CardDescription className="text-[10px]">
                Fonds disponibles par site physique de vente
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {isLoadingSites ? (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Chargement des caisses...
                  </div>
                ) : siteCaisseBalances.length > 0 ? (
                  siteCaisseBalances.map((site: any) => (
                    <div key={site.salesSiteId} className="p-4 flex items-center justify-between hover:bg-slate-55/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 block">
                          {site.salesSiteName || site.siteName || `Site #${site.salesSiteId}`}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 font-mono block">
                          ID Site: {site.salesSiteId}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold text-slate-800">
                        {formatCurrency(site.currentBalance || 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Aucun point de vente enregistré
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Bank Accounts Details */}
          <Card className="lg:col-span-7 border-slate-100 shadow-md shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
            <CardHeader className="border-b border-slate-100 p-5 bg-gradient-to-br from-corp-blue-50 via-[#EBF1FA] to-[#F8FAFF]">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-corp-blue-850" />
                Soldes Bancaires par Compte
              </CardTitle>
              <CardDescription className="text-[10px]">
                État des comptes bancaires et des soldes actuels enregistrés
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                    <TableRow className="text-slate-400 font-bold uppercase tracking-wider text-[9px] hover:bg-transparent">
                      <TableHead className="font-bold py-3">Banque</TableHead>
                      <TableHead className="font-bold py-3">RIB / Compte</TableHead>
                      <TableHead className="text-right font-bold py-3">Solde Actuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-slate-700 font-medium text-xs">
                    {isLoadingBanks ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-400 italic">
                          Chargement des soldes bancaires...
                        </TableCell>
                      </TableRow>
                    ) : bankBalances.length > 0 ? (
                      bankBalances.map((bank: any) => (
                        <TableRow key={bank.bankId} className="hover:bg-slate-55/50 transition-colors">
                          <TableCell className="font-bold text-slate-900">
                            {bank.bankName || bank.designation}
                          </TableCell>
                          <TableCell className="font-mono text-slate-500 text-[11px]">
                            {bank.rib || '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-corp-blue-900">
                            {formatCurrency(bank.currentBalance || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-400 italic">
                          Aucun compte bancaire configuré
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────
             RAPPROCHEMENT BANCAIRE (Mock Data)
        ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
        >
          <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-xl overflow-hidden bg-white border mt-6">
            <div className="px-6 py-4 bg-gradient-to-r from-corp-blue-50 to-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white text-corp-blue-600 rounded-lg shadow-sm border border-slate-100">
                  <FileSearch className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Rapprochement Bancaire
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Historique des transactions
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={statementBankId?.toString() || ''}
                  onValueChange={(val) => setStatementBankId(Number(val))}
                >
                  <SelectTrigger className="w-[200px] h-9 text-xs">
                    <SelectValue placeholder="Sélectionner une banque">
                      {statementBankId ? banksList.find((b: any) => b.id === statementBankId)?.designation : "Sélectionner une banque"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {banksList.map((bank: any) => (
                      <SelectItem key={bank.id} value={bank.id.toString()}>
                        {bank.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statementMonth.toString()}
                  onValueChange={(val) => setStatementMonth(Number(val))}
                >
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Mois">
                      {MONTHS[statementMonth - 1]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statementYear.toString()}
                  onValueChange={(val) => setStatementYear(Number(val))}
                >
                  <SelectTrigger className="w-[100px] h-9 text-xs">
                    <SelectValue placeholder="Année">
                      {statementYear}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const y = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CardContent className="p-0 relative min-h-[200px]">
              {isLoadingStatement ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <RefreshCw className="w-6 h-6 text-corp-blue-500 animate-spin mb-2" />
                  <p className="text-xs font-medium text-slate-500">Chargement des transactions...</p>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="text-slate-400 font-bold uppercase tracking-wider text-[9px] hover:bg-transparent">
                      <TableHead className="font-bold py-3 w-32">Date</TableHead>
                      <TableHead className="font-bold py-3">Description</TableHead>
                      <TableHead className="text-right font-bold py-3 text-rose-600/70">Débit</TableHead>
                      <TableHead className="text-right font-bold py-3 text-emerald-600/70">Crédit</TableHead>
                      <TableHead className="text-center font-bold py-3">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-slate-700 font-medium text-xs">
                    {/* Solde Initial Row */}
                    {bankStatement && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell className="font-mono text-slate-500 text-[10px]">
                          01/{statementMonth.toString().padStart(2, '0')}/{statementYear}
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 italic">
                          Solde initial au 01 {MONTHS[statementMonth - 1]} {statementYear}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600">
                          {bankStatement.initialBalance < 0 ? formatCurrency(Math.abs(bankStatement.initialBalance)) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {bankStatement.initialBalance >= 0 ? formatCurrency(bankStatement.initialBalance) : '-'}
                        </TableCell>
                        <TableCell className="text-center"></TableCell>
                      </TableRow>
                    )}

                    {bankStatement?.transactions.map((tx: any) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="font-mono text-slate-500">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{tx.description}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={tx.isReconciled ? 'default' : 'secondary'} className={cn(
                            "font-bold text-[10px]",
                            tx.isReconciled ? "bg-corp-blue-600" : "bg-slate-200 text-slate-600"
                          )}>
                            {tx.isReconciled ? 'Rapproché' : 'Non Rapproché'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Empty State */}
                    {bankStatement?.transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                          Aucune transaction enregistrée pour ce mois.
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Solde Final Row */}
                    {bankStatement && (() => {
                      const finalBalance = bankStatement.initialBalance 
                        + bankStatement.transactions.reduce((acc: number, t: any) => acc + t.debit, 0)
                        - bankStatement.transactions.reduce((acc: number, t: any) => acc + t.credit, 0);

                      return (
                        <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 border-t-2 border-slate-200">
                          <TableCell className="font-mono text-slate-500 text-[10px]">
                            Fin {MONTHS[statementMonth - 1]}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            Solde final
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-600">
                            {finalBalance < 0 ? formatCurrency(Math.abs(finalBalance)) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {finalBalance >= 0 ? formatCurrency(finalBalance) : '-'}
                          </TableCell>
                          <TableCell className="text-center"></TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Instruments Portfolios */}
        <div className="pt-4 space-y-6">
          <InstrumentsTable side="Customer" />
          <InstrumentsTable side="Supplier" />
        </div>

        {/* Pending Bordereaux Section */}
        <div className="pt-4">
          <PendingBordereauxSection />
          <PendingTraitesSection />
        </div>

        {/* ─────────────────────────────────────────────────────────
             BANK MANAGEMENT — Full CRUD for Admins only
        ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
        >
          <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
            <div className="px-6 py-4 bg-corp-blue-50/90 text-corp-blue-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white text-corp-blue-600 rounded-lg shadow-sm">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-corp-blue-900">
                    Gestion des Comptes Bancaires
                  </h3>
                  <p className="text-[9px] font-bold text-corp-blue-600/80 uppercase tracking-widest font-mono">
                    Ajout · Modification · Suppression
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAddBank}
                className="h-9 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter une Banque
              </Button>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="text-slate-400 font-bold uppercase tracking-wider text-[9px] hover:bg-transparent">
                      <TableHead className="font-bold py-3">Référence</TableHead>
                      <TableHead className="font-bold py-3">Désignation</TableHead>
                      <TableHead className="font-bold py-3">Agence</TableHead>
                      <TableHead className="font-bold py-3">RIB</TableHead>
                      <TableHead className="font-bold py-3">IBAN</TableHead>
                      <TableHead className="text-right font-bold py-3">Frais Chèque HT</TableHead>
                      <TableHead className="text-right font-bold py-3">Frais Traite HT</TableHead>
                      <TableHead className="text-right font-bold py-3">Frais Virement HT</TableHead>
                      <TableHead className="text-right font-bold py-3">Solde Initial</TableHead>
                      <TableHead className="text-center font-bold py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-slate-700 font-medium text-xs">
                    {isLoadingBanksList ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-slate-400 italic">
                          Chargement des comptes bancaires...
                        </TableCell>
                      </TableRow>
                    ) : banksList.length > 0 ? (
                      banksList.map((bank: any) => (
                        <TableRow
                          key={bank.id}
                          className={cn(
                            'hover:bg-slate-50/60 transition-colors group',
                            bankToDelete?.id === bank.id && 'bg-rose-50/40'
                          )}
                        >
                          <TableCell>
                            <Badge className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5">
                              {bank.reference}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 max-w-[180px] truncate">
                            {bank.designation}
                          </TableCell>
                          <TableCell className="text-slate-500">{bank.agency || '—'}</TableCell>
                          <TableCell className="font-mono text-slate-500 text-[11px]">
                            {bank.rib || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-slate-400 text-[11px]">
                            {bank.iban ? bank.iban.substring(0, 16) + '...' : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(bank.chequeDepositFeeHT || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(bank.traiteDepositFeeHT || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(bank.wireTransferFeeHT || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-corp-blue-900">
                            {formatCurrency(bank.initialBalance || 0)}
                          </TableCell>

                          <TableCell className="text-center">
                            {bankToDelete?.id === bank.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] text-rose-700 font-bold">Confirmer ?</span>
                                <Button
                                  size="sm"
                                  onClick={handleDeleteBank}
                                  disabled={deleteBankMutation.isPending}
                                  className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg"
                                >
                                  Supprimer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setBankToDelete(null)}
                                  className="h-7 px-3 text-slate-600 font-bold text-[10px] rounded-lg hover:bg-slate-100"
                                >
                                  Annuler
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditBank(bank)}
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-corp-blue-900 hover:bg-corp-blue-50"
                                  title="Modifier"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleConfirmDelete(bank)}
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <span className="p-3 bg-slate-100 rounded-full">
                              <Landmark className="w-6 h-6 text-slate-400" />
                            </span>
                            <p className="text-sm text-slate-400 italic font-medium">
                              Aucun compte bancaire configuré
                            </p>
                            <Button
                              onClick={handleAddBank}
                              className="h-9 px-5 bg-corp-blue-900 hover:bg-corp-blue-950 text-white font-bold text-xs gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter le premier compte
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      {/* Bank Deposit Dialog for Admins */}
      <BankDepositDialog
        isOpen={isDepositDialogOpen}
        onClose={() => setIsDepositDialogOpen(false)}
        isCentral={true}
        onSuccess={refreshAll}
      />

      {/* Bank Form Dialog — Add or Edit a bank account (Admin only) */}
      <BankFormDialog
        isOpen={isBankFormOpen}
        onClose={handleBankFormClose}
        bank={selectedBank}
      />
    </div>
  );
}
