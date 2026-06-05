'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
    FileText,
  RefreshCw,
  Building,
  User,
  Hash,
  Percent,
  Coins,
  Store,
  Wallet,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DocumentTypes } from '@/types/document';
import { useDocumentsByTypeFiltered } from '@/hooks/use-documents';
import { TablePagination } from '@/components/shared/table-pagination';
import { useAuthStore } from '@/store/use-auth-store';
import { useBankBalances, useCaissePrincipaleBalance, useAllCaisseBalances } from '@/hooks/use-treasury';
import { BankDepositDialog } from '@/components/accounting/bank-deposit-dialog';
// Bank management: reuse the BankFormDialog from settings (Add/Edit) and the delete hook
import { BankFormDialog } from '@/components/settings/bank-form-dialog';
import { useBanks, useDeleteBank } from '@/hooks/use-banks';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { PendingBordereauxSection } from '@/components/analytics/pending-bordereaux';
import { PendingTraitesSection } from '@/components/accounting/pending-traites';
import { InstrumentsTable } from '@/components/dashboard/instruments-table';

// Constant months list
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function AccountingDashboard() {
  // Navigation States
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    // Default to last month
    const prevMonth = new Date().getMonth() - 1;
    return prevMonth < 0 ? 11 : prevMonth;
  });

  // Automatically adjust year if month wrapped around to last year
  React.useEffect(() => {
    const prevMonth = new Date().getMonth() - 1;
    if (prevMonth < 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedYear(new Date().getFullYear() - 1);
    }
  }, []);

  // Filter States
  const [achatsSearch, setAchatsSearch] = useState('');
  const [ventesSearchName, setVentesSearchName] = useState('');
  const [ventesSearchNumber, setVentesSearchNumber] = useState('');

  // Pagination States
  const [achatsPage, setAchatsPage] = useState(1);
  const [achatsPageSize, setAchatsPageSize] = useState(10);
  const [ventesPage, setVentesPage] = useState(1);
  const [ventesPageSize, setVentesPageSize] = useState(10);
  
  // Print List States
  const [isPrintAchatsListModalOpen, setIsPrintAchatsListModalOpen] = useState(false);
  const [isPrintVentesListModalOpen, setIsPrintVentesListModalOpen] = useState(false);

  // Reset pages to 1 when period or search terms change
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAchatsPage(1);
  }, [selectedYear, selectedMonth, achatsSearch]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVentesPage(1);
  }, [selectedYear, selectedMonth, ventesSearchName, ventesSearchNumber]);

  // Auth Store for Admin validation
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
  const [selectedBank, setSelectedBank] = useState<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>(null);

  // Confirmation state for bank deletion — holds the bank object being deleted, or null
  const [bankToDelete, setBankToDelete] = useState<any /* eslint-disable-line @typescript-eslint/no-explicit-any */>(null);

  // Fetch the full banks list (needed for the management table)
  const { data: banksList = [], isLoading: isLoadingBanksList } = useBanks();
  const deleteBankMutation = useDeleteBank();

  // Handler: open dialog for editing an existing bank
  const handleEditBank = (bank: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setSelectedBank(bank);
    setIsBankFormOpen(true);
  };

  // Handler: open dialog for adding a new bank
  const handleAddBank = () => {
    setSelectedBank(null);
    setIsBankFormOpen(true);
  };

  // Handler: close form dialog and clear selection
  const handleBankFormClose = () => {
    setIsBankFormOpen(false);
    setSelectedBank(null);
  };

  // Handler: confirm deletion of a bank
  const handleConfirmDelete = (bank: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    setBankToDelete(bank);
  };

  // Handler: execute the delete mutation after user confirms
  const handleDeleteBank = () => {
    if (!bankToDelete) return;
    deleteBankMutation.mutate(bankToDelete.id, {
      onSettled: () => setBankToDelete(null)
    });
  };

  // Computations for Treasury
  const totalCaissesSites = useMemo(() => {
    if (!siteCaisseBalances) return 0;
    return siteCaisseBalances.reduce((sum: number, s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => sum + (s.currentBalance || 0), 0);
  }, [siteCaisseBalances]);

  const totalBankBalances = useMemo(() => {
    if (!bankBalances) return 0;
    return bankBalances.reduce((sum: number, b: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => sum + (b.currentBalance || 0), 0);
  }, [bankBalances]);

  // Query both standard supplier invoices and supplier credit notes (avoirs)
  const { 
    data: achatsDocs = [], 
    isLoading: isLoadingAchats, 
    refetch: refetchAchats 
  } = useDocumentsByTypeFiltered({
    typeDoc: DocumentTypes.supplierInvoice,
    month: selectedMonth + 1,
    year: selectedYear,
    day: 0
  });

  const { 
    data: avoirsDocs = [], 
    isLoading: isLoadingAvoirs, 
    refetch: refetchAvoirs 
  } = useDocumentsByTypeFiltered({
    typeDoc: DocumentTypes.supplierInvoiceReturn,
    month: selectedMonth + 1,
    year: selectedYear,
    day: 0
  });

  const { 
    data: ventesDocs = [], 
    isLoading: isLoadingVentes, 
    refetch: refetchVentes 
  } = useDocumentsByTypeFiltered({
    typeDoc: DocumentTypes.customerInvoice,
    month: selectedMonth + 1,
    year: selectedYear,
    day: 0
  });

  const refreshAll = () => {
    refetchAchats();
    refetchAvoirs();
    refetchVentes();
    if (isAdmin) {
      refetchBanks();
      refetchMainCaisse();
      refetchSites();
    }
  };



  // Navigation Handlers
  const prevYear = () => setSelectedYear(prev => prev - 1);
  const nextYear = () => setSelectedYear(prev => prev + 1);

  // Client-side filtering logic for Achats
  // Combines both standard supplier invoices and credit notes, then sorts by creationdate descending
  const filteredAchats = useMemo(() => {
    const combined = [...achatsDocs, ...avoirsDocs];
    const sorted = combined.sort((a, b) => new Date(b.creationdate).getTime() - new Date(a.creationdate).getTime());

    return sorted.filter(doc => {
      const term = achatsSearch.toLowerCase();
      const counterpartName = doc.counterpart?.name?.toLowerCase() || '';
      const docNum = doc.docnumber?.toLowerCase() || '';
      const ref = doc.supplierReference?.toLowerCase() || '';
      return counterpartName.includes(term) || docNum.includes(term) || ref.includes(term);
    });
  }, [achatsDocs, avoirsDocs, achatsSearch]);

  // Slice pagination for Achats
  const paginatedAchats = useMemo(() => {
    const startIndex = (achatsPage - 1) * achatsPageSize;
    return filteredAchats.slice(startIndex, startIndex + achatsPageSize);
  }, [filteredAchats, achatsPage, achatsPageSize]);

  // Client-side filtering logic for Ventes
  const filteredVentes = useMemo(() => {
    return ventesDocs.filter(doc => {
      const nameTerm = ventesSearchName.toLowerCase();
      const numTerm = ventesSearchNumber.toLowerCase();

      const name = doc.counterpart?.name || '';
      const firstname = doc.counterpart?.firstname || '';
      const lastname = doc.counterpart?.lastname || '';
      const counterpartFullName = `${name} ${firstname} ${lastname}`.toLowerCase();

      const docNum = doc.docnumber?.toLowerCase() || '';

      const nameMatch = !nameTerm || counterpartFullName.includes(nameTerm);
      const numMatch = !numTerm || docNum.includes(numTerm);

      return nameMatch && numMatch;
    });
  }, [ventesDocs, ventesSearchName, ventesSearchNumber]);

  // Slice pagination for Ventes
  const paginatedVentes = useMemo(() => {
    const startIndex = (ventesPage - 1) * ventesPageSize;
    return filteredVentes.slice(startIndex, startIndex + ventesPageSize);
  }, [filteredVentes, ventesPage, ventesPageSize]);

  // Totals calculations using useMemo
  // Substracts credit notes (DocumentTypes.supplierInvoiceReturn) from purchase aggregates
  const achatsTotals = useMemo(() => {
    return filteredAchats.reduce((acc, doc) => {
      const isCreditNote = doc.type === DocumentTypes.supplierInvoiceReturn;
      const multiplier = isCreditNote ? -1 : 1;

      acc.ht += (doc.total_ht_net_doc || 0) * multiplier;
      acc.tva += (doc.total_tva_doc || 0) * multiplier;
      acc.tax += parseFloat(doc.taxe?.value || '0') * multiplier;
      acc.rs += (doc.holdingtax?.taxvalue || 0) * multiplier;
      acc.ttc += (doc.total_net_ttc || 0) * multiplier;
      acc.count++;
      return acc;
    }, { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 });
  }, [filteredAchats]);

  const ventesTotals = useMemo(() => {
    return filteredVentes.reduce((acc, doc) => {
      acc.ht += doc.total_ht_net_doc || 0;
      acc.tva += doc.total_tva_doc || 0;
      acc.tax += parseFloat(doc.taxe?.value || '0');
      acc.rs += doc.holdingtax?.taxvalue || 0;
      acc.ttc += doc.total_net_ttc || 0;
      acc.count++;
      return acc;
    }, { ht: 0, tva: 0, tax: 0, rs: 0, ttc: 0, count: 0 });
  }, [filteredVentes]);

  // TVA rate calculation helper
  const getTvaRate = (doc: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
    if (!doc.total_ht_net_doc || doc.total_ht_net_doc === 0) return '—';
    const rate = (doc.total_tva_doc / doc.total_ht_net_doc) * 100;
    return Math.round(rate) + '%';
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
  };

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header and Year Navigator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-forest-950/10 text-forest-900 rounded-xl">
              <Calculator className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold tracking-widest text-forest-800 uppercase font-mono">
              Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
            Comptabilité & Finance
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
            Gérez votre trésorerie et analysez vos volumes d&apos;achats et de ventes avec le calcul automatique des taxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={refreshAll} 
            className="rounded-xl border-slate-200 hover:bg-slate-50 gap-2 h-11 px-4 font-bold"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
            Actualiser
          </Button>

          {/* Year navigator */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm h-11">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={prevYear} 
              className="h-9 w-9 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="px-4 text-sm font-bold text-slate-800 font-mono min-w-[70px] text-center">
              {selectedYear}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextYear} 
              className="h-9 w-9 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* TREASURY & BANK SECTION FOR ADMINS */}
      {isAdmin && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-6 pt-2"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-forest-50/50 text-forest-900 rounded-xl border border-forest-150 shadow-sm">
                <Landmark className="w-5 h-5 text-forest-900" />
              </span>
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">
                  Trésorerie &amp; Comptes Bancaires
                </h2>
                <p className="text-xs text-slate-500">
                  Situation consolidée des liquidités physiques et des avoirs en banque
                </p>
              </div>
            </div>
          </div>

          {/* Treasury KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Caisse Principale */}
            <Card className="rounded-[24px] border-slate-150 shadow-sm bg-white p-6 space-y-4 border relative overflow-hidden group hover:shadow-md transition-all duration-300">
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
                className="w-full h-10 bg-forest-900 hover:bg-forest-950 text-white rounded-xl font-bold text-xs gap-2 transition-all shadow-sm"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                Verser en Banque
              </Button>
            </Card>

            {/* Card 2: Caisses Points de Vente */}
            <Card className="rounded-[24px] border-slate-150 shadow-sm bg-white p-6 space-y-4 border relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-forest-900/5 rounded-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Caisses Points de Vente
                </span>
                <span className="p-1.5 bg-forest-50 text-forest-900 rounded-lg">
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
              <div className="pt-2 text-[10px] text-forest-800 font-semibold flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mise à jour en temps réel des terminaux
              </div>
            </Card>

            {/* Card 3: Total en Banque */}
            <Card className="rounded-[24px] border-slate-150 shadow-sm bg-slate-900 text-white p-6 space-y-4 border-none relative overflow-hidden group hover:shadow-lg hover:shadow-slate-900/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Disponibilités en Banque
                </span>
                <span className="p-1.5 bg-white/10 text-amber-400 rounded-lg">
                  <Landmark className="w-4 h-4" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-mono font-extrabold text-amber-400 tracking-tight">
                  {isLoadingBanks ? (
                    <span className="inline-block w-24 h-6 bg-slate-800 animate-pulse rounded" />
                  ) : (
                    formatCurrency(totalBankBalances)
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Avoir global sur l&apos;ensemble des comptes</p>
              </div>
              <div className="pt-2 text-[10px] text-slate-400 font-medium">
                Comptabilisation des versements validés
              </div>
            </Card>
          </div>

          {/* Details Grid — Site breakdown + Bank balances */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Site Caisses Breakdown */}
            <Card className="lg:col-span-5 border-slate-100 shadow-md shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
              <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/50">
                <CardTitle className="text-sm font-serif font-bold text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-forest-850" />
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
                    siteCaisseBalances.map((site: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
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
            <Card className="lg:col-span-7 border-slate-100 shadow-md shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
              <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/50">
                <CardTitle className="text-sm font-serif font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-forest-850" />
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
                        bankBalances.map((bank: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                          <TableRow key={bank.bankId} className="hover:bg-slate-55/50 transition-colors">
                            <TableCell className="font-bold text-slate-900">
                              {bank.bankName || bank.designation}
                            </TableCell>
                            <TableCell className="font-mono text-slate-500 text-[11px]">
                              {bank.rib || '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-forest-900">
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
               Uses BankFormDialog (from settings) + useDeleteBank
          ───────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
          >
            <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
              {/* Card Header: dark stripe matching the treasury section aesthetic */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-white/10 text-amber-400 rounded-lg">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-serif font-bold text-amber-50">
                      Gestion des Comptes Bancaires
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Ajout · Modification · Suppression
                    </p>
                  </div>
                </div>
                {/* Add new bank button */}
                <Button
                  onClick={handleAddBank}
                  className="h-9 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl gap-2 shadow-sm transition-all"
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
                        banksList.map((bank: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                          <TableRow
                            key={bank.id}
                            className={cn(
                              'hover:bg-slate-50/60 transition-colors group',
                              // Highlight the row being considered for deletion
                              bankToDelete?.id === bank.id && 'bg-rose-50/40'
                            )}
                          >
                            {/* Bank reference badge */}
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
                            <TableCell className="text-right font-mono font-bold text-forest-900">
                              {formatCurrency(bank.initialBalance || 0)}
                            </TableCell>

                            {/* Actions cell: inline confirmation or edit/delete buttons */}
                            <TableCell className="text-center">
                              {bankToDelete?.id === bank.id ? (
                                /* Inline confirmation prompt */
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
                                /* Normal edit / delete buttons */
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditBank(bank)}
                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-forest-900 hover:bg-forest-50"
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
                                className="h-9 px-5 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl gap-2"
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
      )}

      {/* Month Navigator */}
      <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-[24px] bg-white overflow-hidden border">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-serif font-bold text-amber-50">
                Période active : {MONTHS[selectedMonth]} {selectedYear}
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Analyse mensuelle de la facturation
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-slate-50 overflow-x-auto flex items-center gap-1 justify-between border-t border-slate-100">
          {MONTHS.map((month, idx) => (
            <Button
              key={month}
              variant={selectedMonth === idx ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMonth(idx)}
              className={cn(
                'rounded-xl h-9 px-4 font-bold text-xs transition-colors flex-1 min-w-[85px]',
                selectedMonth === idx
                  ? 'bg-amber-900 text-white hover:bg-amber-950 shadow-sm'
                  : 'text-slate-500 hover:text-amber-900 hover:bg-amber-50/50'
              )}
            >
              {month}
            </Button>
          ))}
        </div>
      </Card>

      {/* PRÉ-ANALYSE COMPTABLE SECTION */}
      <div className="pt-8 mt-8 border-t border-slate-100 space-y-2">
        <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-forest-900" />
          Pré-Analyse Comptable
        </h2>
        <p className="text-sm text-slate-500">
          Analyse détaillée et consolidation des factures d&apos;achats et de ventes
        </p>
      </div>

      {/* ACHATS SECTION */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Achats (Factures Fournisseur)
              </h2>
              <p className="text-xs text-slate-500">
                Flux sortants et taxes collectées sur les approvisionnements
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsPrintAchatsListModalOpen(true)}
            variant="outline"
            className="h-10 rounded-xl border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
          >
            <Printer className="w-4 h-4" /> Imprimer la liste
          </Button>
        </div>

        {/* Achats KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Total HT
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(achatsTotals.ht)}
              </span>
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">HT net global des acquisitions</p>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Total TVA
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(achatsTotals.tva)}
              </span>
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">TVA déductible cumulée</p>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Fiscal (Timbre &amp; RS)
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(achatsTotals.tax + achatsTotals.rs)}
              </span>
              <ShieldAlert className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 font-mono block">
              Timbre: {formatCurrency(achatsTotals.tax)} | RS: {formatCurrency(achatsTotals.rs)}
            </span>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-amber-950/[0.02] border-amber-900/10 p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider block font-mono">
              Total TTC
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-amber-900">
                {formatCurrency(achatsTotals.ttc)}
              </span>
              <Badge className="bg-amber-900 text-white font-mono text-[9px]">
                {achatsTotals.count} Docs
              </Badge>
            </div>
            <p className="text-[10px] text-amber-800/60 font-medium">Coût global des acquisitions TTC</p>
          </Card>
        </div>

        {/* Achats Table & Filters */}
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
          <CardHeader className="border-b border-slate-100 p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher un fournisseur ou numéro de document..."
                className="pl-10 h-11 rounded-xl border-slate-200 bg-[#fafafa] text-xs font-semibold focus:border-amber-900 focus:ring-amber-900 transition-all focus:bg-white"
                value={achatsSearch}
                onChange={(e) => setAchatsSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow className="text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:bg-transparent">
                    <TableHead className="font-bold flex items-center gap-1.5 h-12"><Calendar className="w-3.5 h-3.5" /> Date Facture</TableHead>
                    <TableHead className="font-bold"><div className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Fournisseur</div></TableHead>
                    <TableHead className="font-bold"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Référence</div></TableHead>
                    <TableHead className="text-right font-bold">Montant HT</TableHead>
                    <TableHead className="text-right font-bold">TVA</TableHead>
                    <TableHead className="text-right font-bold">Timbre</TableHead>
                    <TableHead className="text-right font-bold">RS</TableHead>
                    <TableHead className="text-right font-bold">Net TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-slate-700 font-medium text-xs">
                  {isLoadingAchats || isLoadingAvoirs ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Chargement des documents d&apos;achat...
                      </TableCell>
                    </TableRow>
                  ) : filteredAchats.length > 0 ? (
                    paginatedAchats.map((doc) => {
                      const isCreditNote = doc.type === DocumentTypes.supplierInvoiceReturn;
                      return (
                        <TableRow key={doc.id} className={cn("hover:bg-slate-50/50 transition-colors", isCreditNote && "bg-rose-50/20")}>
                          <TableCell className="font-mono">{formatDate(doc.creationdate)}</TableCell>
                          <TableCell className="font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{doc.counterpart?.name || '—'}</span>
                              {isCreditNote && (
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0 px-1.5 font-bold font-mono">
                                  Avoir
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-slate-500">{doc.supplierReference || '—'}</TableCell>
                          <TableCell className={cn("text-right font-mono", isCreditNote && "text-rose-600")}>
                            {isCreditNote ? '-' : ''}{formatCurrency(doc.total_ht_net_doc || 0)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono", isCreditNote ? "text-rose-600" : "text-slate-650")}>
                            {isCreditNote ? '-' : ''}{formatCurrency(doc.total_tva_doc || 0)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono", isCreditNote ? "text-rose-600" : "text-slate-500")}>
                            {isCreditNote ? '-' : ''}{formatCurrency(parseFloat(doc.taxe?.value || '0'))}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono", isCreditNote ? "text-rose-600" : "text-rose-600")}>
                            {isCreditNote ? '-' : ''}{formatCurrency(doc.holdingtax?.taxvalue || 0)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono font-bold", isCreditNote ? "text-rose-700" : "text-slate-900")}>
                            {isCreditNote ? '-' : ''}{formatCurrency(doc.total_net_ttc || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Aucun document d&apos;achat trouvé pour cette période.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-slate-100 px-6">
              <TablePagination
                currentPage={achatsPage}
                totalItems={filteredAchats.length}
                pageSize={achatsPageSize}
                onPageChange={setAchatsPage}
                onPageSizeChange={setAchatsPageSize}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* VENTES SECTION */}
      <section className="space-y-6 pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-forest-50 text-forest-900 rounded-xl border border-forest-100 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Ventes (Factures Client)
              </h2>
              <p className="text-xs text-slate-500">
                Flux entrants et taxes appliquées sur les ventes de bois
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsPrintVentesListModalOpen(true)}
            variant="outline"
            className="h-10 rounded-xl border-forest-900/20 text-forest-900 font-bold hover:bg-forest-50 gap-2 flex items-center transition-all duration-300"
          >
            <Printer className="w-4 h-4" /> Imprimer la liste
          </Button>
        </div>

        {/* Ventes KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Total HT
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(ventesTotals.ht)}
              </span>
              <ArrowUpRight className="w-4 h-4 text-forest-600" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Chiffre d&apos;affaires HT global</p>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Total TVA
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(ventesTotals.tva)}
              </span>
              <Percent className="w-4 h-4 text-forest-650" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">TVA collectée cumulée</p>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Fiscal (Timbre &amp; RS)
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">
                {formatCurrency(ventesTotals.tax + ventesTotals.rs)}
              </span>
              <ShieldAlert className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 font-mono block">
              Timbre: {formatCurrency(ventesTotals.tax)} | RS: {formatCurrency(ventesTotals.rs)}
            </span>
          </Card>

          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-forest-900/5 border-forest-900/10 p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-forest-800 uppercase tracking-wider block font-mono">
              Total TTC
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-forest-900">
                {formatCurrency(ventesTotals.ttc)}
              </span>
              <Badge className="bg-forest-900 text-white font-mono text-[9px]">
                {ventesTotals.count} Docs
              </Badge>
            </div>
            <p className="text-[10px] text-forest-800/60 font-medium">Valeur totale facturée TTC</p>
          </Card>
        </div>

        {/* Ventes Table & Filters */}
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
          <CardHeader className="border-b border-slate-100 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par client..."
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-[#fafafa] text-xs font-semibold focus:border-forest-900 focus:ring-forest-900 transition-all focus:bg-white"
                  value={ventesSearchName}
                  onChange={(e) => setVentesSearchName(e.target.value)}
                />
              </div>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par numéro de facture..."
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-[#fafafa] text-xs font-semibold focus:border-forest-900 focus:ring-forest-900 transition-all focus:bg-white"
                  value={ventesSearchNumber}
                  onChange={(e) => setVentesSearchNumber(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow className="text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:bg-transparent">
                    <TableHead className="font-bold flex items-center gap-1.5 h-12"><Calendar className="w-3.5 h-3.5" /> Date Facture</TableHead>
                    <TableHead className="font-bold"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Client</div></TableHead>
                    <TableHead className="font-bold"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> N° Facture</div></TableHead>
                    <TableHead className="text-right font-bold">Montant HT</TableHead>
                    <TableHead className="text-right font-bold">Taux TVA</TableHead>
                    <TableHead className="text-right font-bold">Montant TVA</TableHead>
                    <TableHead className="text-right font-bold">Timbre</TableHead>
                    <TableHead className="text-right font-bold">RS</TableHead>
                    <TableHead className="text-right font-bold">Net TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-slate-700 font-medium text-xs">
                  {isLoadingVentes ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-slate-400 italic">
                        Chargement des factures de vente...
                      </TableCell>
                    </TableRow>
                  ) : filteredVentes.length > 0 ? (
                    paginatedVentes.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono">{formatDate(doc.creationdate)}</TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {doc.counterpart?.name || `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-slate-500">{doc.docnumber}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(doc.total_ht_net_doc || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-500">{getTvaRate(doc)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-650">{formatCurrency(doc.total_tva_doc || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(parseFloat(doc.taxe?.value || '0'))}</TableCell>
                        <TableCell className="text-right font-mono text-rose-600">{formatCurrency(doc.holdingtax?.taxvalue || 0)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-forest-900">{formatCurrency(doc.total_net_ttc || 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-slate-400 italic">
                        Aucune facture de vente trouvée pour cette période.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-slate-100 px-6">
              <TablePagination
                currentPage={ventesPage}
                totalItems={filteredVentes.length}
                pageSize={ventesPageSize}
                onPageChange={setVentesPage}
                onPageSizeChange={setVentesPageSize}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bank Deposit Dialog for Admins */}
      {isAdmin && (
        <BankDepositDialog
          isOpen={isDepositDialogOpen}
          onClose={() => setIsDepositDialogOpen(false)}
          isCentral={true}
          onSuccess={refreshAll}
        />
      )}

      {/* Bank Form Dialog — Add or Edit a bank account (Admin only) */}
      {isAdmin && (
        <BankFormDialog
          isOpen={isBankFormOpen}
          onClose={handleBankFormClose}
          bank={selectedBank}
        />
      )}

      {/* Print Lists Dialogs */}
      <PrintVariantDialog
        isOpen={isPrintAchatsListModalOpen}
        onClose={() => setIsPrintAchatsListModalOpen(false)}
        docType="document-list"
        documentsList={filteredAchats}
        listContext="purchases"
        listTitle="Factures Fournisseur"
      />

      <PrintVariantDialog
        isOpen={isPrintVentesListModalOpen}
        onClose={() => setIsPrintVentesListModalOpen(false)}
        docType="document-list"
        documentsList={filteredVentes}
        listContext="sales"
        listTitle="Factures Client"
      />
    </div>
  );
}
