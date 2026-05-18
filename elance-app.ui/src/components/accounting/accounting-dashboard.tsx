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
  Filter,
  FileText,
  RefreshCw,
  Building,
  User,
  Hash,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DocumentTypes } from '@/types/document';
import { useDocumentsByTypeFiltered } from '@/hooks/use-documents';

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
      setSelectedYear(new Date().getFullYear() - 1);
    }
  }, []);

  // Filter States
  const [achatsSearch, setAchatsSearch] = useState('');
  const [ventesSearchName, setVentesSearchName] = useState('');
  const [ventesSearchNumber, setVentesSearchNumber] = useState('');

  // Fetch data using React Query hooks
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
    refetchVentes();
  };

  // List of selectable years (from 2020 to current + 1)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let i = 2020; i <= currentYear + 1; i++) {
      list.push(i);
    }
    return list;
  }, []);

  // Navigation Handlers
  const prevYear = () => setSelectedYear(prev => prev - 1);
  const nextYear = () => setSelectedYear(prev => prev + 1);

  // Client-side filtering logic for Achats
  const filteredAchats = useMemo(() => {
    return achatsDocs.filter(doc => {
      const term = achatsSearch.toLowerCase();
      const counterpartName = doc.counterpart?.name?.toLowerCase() || '';
      const docNum = doc.docnumber?.toLowerCase() || '';
      const ref = doc.supplierReference?.toLowerCase() || '';
      return counterpartName.includes(term) || docNum.includes(term) || ref.includes(term);
    });
  }, [achatsDocs, achatsSearch]);

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

  // Totals calculations using useMemo
  const achatsTotals = useMemo(() => {
    return filteredAchats.reduce((acc, doc) => {
      acc.ht += doc.total_ht_net_doc || 0;
      acc.tva += doc.total_tva_doc || 0;
      acc.tax += parseFloat(doc.taxe?.value || '0');
      acc.rs += doc.holdingtax?.taxvalue || 0;
      acc.ttc += doc.total_net_ttc || 0;
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
  const getTvaRate = (doc: any) => {
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
              Comptabilité &amp; Finance
            </span>
          </div>
          <h1 className="text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
            Pré-Analyse Comptable
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
            Consultez et validez les volumes d&apos;achats et de ventes avec calcul automatique de la TVA, du timbre fiscal et de la retenue à la source (RS).
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
                  {isLoadingAchats ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Chargement des factures d&apos;achat...
                      </TableCell>
                    </TableRow>
                  ) : filteredAchats.length > 0 ? (
                    filteredAchats.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono">{formatDate(doc.creationdate)}</TableCell>
                        <TableCell className="font-bold text-slate-900">{doc.counterpart?.name || '—'}</TableCell>
                        <TableCell className="font-mono text-slate-500">{doc.supplierReference || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(doc.total_ht_net_doc || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-650">{formatCurrency(doc.total_tva_doc || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(parseFloat(doc.taxe?.value || '0'))}</TableCell>
                        <TableCell className="text-right font-mono text-rose-600">{formatCurrency(doc.holdingtax?.taxvalue || 0)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">{formatCurrency(doc.total_net_ttc || 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Aucune facture d&apos;achat trouvée pour cette période.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                    filteredVentes.map((doc) => (
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
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
