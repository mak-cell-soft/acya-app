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
// Removed treasury imports
import { PrintVariantDialog } from '@/components/print/print-trigger-button';

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
            className="border-slate-200 hover:bg-slate-50 gap-2 h-11 px-4 font-bold"
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



      {/* Month Navigator */}
      <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-xl bg-white overflow-hidden border">
        <div className="px-6 py-4 bg-corp-blue-50/90 text-corp-blue-950 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white text-corp-blue-600 rounded-lg shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-corp-blue-900">
                Période active : {MONTHS[selectedMonth]} {selectedYear}
              </h2>
              <p className="text-[9px] font-bold text-corp-blue-600/80 uppercase tracking-widest font-mono">
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
                  ? 'bg-corp-blue-600 text-white hover:bg-corp-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-corp-blue-900 hover:bg-corp-blue-50/50'
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
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
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
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
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

