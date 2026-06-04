'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Download,
  FileText,
  ChevronDown,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Printer,
  FileDown,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  ArrowLeftRight,
  Layers,
  Sparkles,
  CreditCard,
  Landmark,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  useDocumentsByTypeFiltered,
  useDeleteDocument
} from '@/hooks/use-documents';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';
import { DocumentDetailDrawer } from '@/components/sales/document-detail-drawer';
import { PaymentModal } from '@/components/sales/payment-modal';
import { WithholdingTaxModal } from '@/components/sales/withholding-tax-modal';
import { CustomerBatchConversionModal } from '@/components/sales/customer-batch-conversion-modal';
import { CustomerSingleBatchConversionModal } from '@/components/sales/customer-single-batch-conversion-modal';
import { BLToInvoiceModal } from '@/components/sales/bl-to-invoice-modal';
import { CustomerRecouvrementDialog } from '@/components/customers/customer-recouvrement-dialog';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { useAuthStore } from '@/store/use-auth-store';

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
];

export default function SalesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentUserId = user?.id ? parseInt(user.id) : null;
  const isAdmin = user?.role === '10' || user?.role === '20';

  // Permission guard: gates UI actions based on the user's saved permissions for the 'sales' module
  const { hasPermission } = usePermissionGuard();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Month & Year state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const selectedMonthIdx = currentDate.getMonth(); // 0-11
  const selectedYear = currentDate.getFullYear();

  // Selected day state (defaults to current date's day of month)
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Helper to get number of days in selected month
  const getDaysCountInMonth = (year: number, monthIdx: number) => {
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  // Keep selectedDay valid when month or year changes
  useEffect(() => {
    const maxDays = getDaysCountInMonth(selectedYear, selectedMonthIdx);
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedMonthIdx, selectedYear, selectedDay]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('bl');

  // Modals state
  const [selectedDocIdForDetail, setSelectedDocIdForDetail] = useState<number | null>(null);
  const [docForPayment, setDocForPayment] = useState<any | null>(null);
  const [docForRS, setDocForRS] = useState<Document | null>(null);
  const [customerIdForRecouvrement, setCustomerIdForRecouvrement] = useState<number | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSingleBatchModalOpen, setIsSingleBatchModalOpen] = useState(false);
  // State for the single BL → Invoice conversion modal
  const [blForConversion, setBlForConversion] = useState<Document | null>(null);
  // State to manage which document is being printed and its type
  const [printDoc, setPrintDoc] = useState<{ doc: Document; type: 'bl' | 'invoice' } | null>(null);
  const [isPrintListModalOpen, setIsPrintListModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Map tabs to document types
  const tabToDocType = (tab: string): DocumentTypes => {
    switch (tab) {
      case 'quote':
        return DocumentTypes.customerQuote;
      case 'order':
        return DocumentTypes.customerOrder;
      case 'bl':
        return DocumentTypes.customerDeliveryNote;
      case 'invoice':
        return DocumentTypes.customerInvoice;
      default:
        return DocumentTypes.customerDeliveryNote;
    }
  };

  const docType = tabToDocType(activeTab);

  // Fetch real documents based on selected filters (filter by day if active tab is bl/Livraison or invoice/Facture)
  const { data: documents, isLoading, refetch } = useDocumentsByTypeFiltered({
    typeDoc: docType,
    month: selectedMonthIdx + 1,
    year: selectedYear,
    day: (activeTab === 'bl' || activeTab === 'invoice') ? selectedDay : undefined
  });

  const deleteDocMutation = useDeleteDocument();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Voulez-vous vraiment supprimer ce document ?')) {
      try {
        await deleteDocMutation.mutateAsync(id);
        toast.success('Document supprimé avec succès.');
        refetch();
      } catch (err) {
        toast.error('Erreur lors de la suppression du document.');
      }
    }
  };

  // Convert handlers
  // - For quote→order and order→bl we still navigate to the creation form.
  // - For bl→invoice we open the BLToInvoiceModal (mirrors Angular DocumentConversionModal),
  //   which calls POST /Document/createinvoice — the same stable endpoint used for batch.
  const handleConvert = (doc: Document, target: 'order' | 'bl' | 'invoice') => {
    if (target === 'order') {
      router.push(`/sales/order/new?sourceId=${doc.id}`);
    } else if (target === 'bl') {
      router.push(`/sales/bl/new?sourceId=${doc.id}`);
    } else if (target === 'invoice') {
      // Open inline confirmation modal — do NOT navigate away
      setBlForConversion(doc);
    }
  };

  // Filter list by search query and sort descended from last created to old
  const filteredDocuments = (documents || [])
    .filter((doc) => {
      const term = searchTerm.toLowerCase();
      const clientName = (doc.counterpart?.name || `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`).toLowerCase();
      return (
        doc.docnumber?.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        doc.description?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      return (b.docnumber || '').localeCompare(a.docnumber || '');
    });

  // Dynamic calculations for dynamic KPI cards
  const totalRawHtSum = filteredDocuments.reduce((acc, curr) => acc + (curr.total_ht_net_doc || 0), 0);
  const totalTtcSum = filteredDocuments.reduce(
    (acc, curr) => acc + (curr.total_net_ttc || 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Banner header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-forest-950 tracking-tight">
              Gestion des Ventes
            </h1>
            <p className="text-sand-400 font-medium mt-1">
              Pilotez l’intégralité de votre cycle client : Devis, Commandes, Bons de Livraison et Factures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/sales/deep-search')}
              variant="outline"
              className="h-11 rounded-xl border-sand-200 text-forest-900 font-bold hover:bg-sand-50"
            >
              <Search className="w-4 h-4 mr-2 text-forest-800" /> Recherche Approfondie
            </Button>
            <Button
              onClick={() => setIsPrintListModalOpen(true)}
              variant="outline"
              className="h-11 rounded-xl border-sand-200 text-forest-900 font-bold hover:bg-sand-50"
            >
              <Printer className="w-4 h-4 mr-2 text-forest-800" /> Imprimer la liste
            </Button>
            {/* Batch conversion buttons — only for users with canAdd on sales */}
            {hasPermission('sales', 'canAdd') && (
              <Button
                onClick={() => setIsBatchModalOpen(true)}
                variant="outline"
                className="h-11 rounded-xl border-sand-200 text-forest-900 font-bold hover:bg-sand-50"
              >
                <ArrowLeftRight className="w-4 h-4 mr-2 text-forest-800" /> Facturation Groupée
              </Button>
            )}
            {hasPermission('sales', 'canAdd') && (
              <Button
                onClick={() => setIsSingleBatchModalOpen(true)}
                variant="outline"
                className="h-11 rounded-xl border-sand-200 text-forest-900 font-bold hover:bg-sand-50"
              >
                <Layers className="w-4 h-4 mr-2 text-forest-800" /> Facture pour un Client
              </Button>
            )}
            {/* Primary create dropdown — hidden unless user has canAdd permission */}
            {hasPermission('sales', 'canAdd') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-11 rounded-xl bg-forest-950 text-white hover:bg-forest-900 font-bold shadow-lg shadow-forest-950/20">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Document
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-sand-100 w-48">
                  <DropdownMenuItem className="font-bold text-sand-800 cursor-pointer p-0">
                    <Link href="/sales/quote/new" className="w-full h-full px-2 py-1.5 block">Nouveau Devis</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-bold text-sand-800 cursor-pointer p-0">
                    <Link href="/sales/order/new" className="w-full h-full px-2 py-1.5 block">Nouvelle Commande</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-bold text-sand-800 cursor-pointer p-0">
                    <Link href="/sales/bl/new" className="w-full h-full px-2 py-1.5 block">Nouveau Bon de Livraison</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-bold text-sand-800 cursor-pointer p-0">
                    <Link href="/sales/invoice/new" className="w-full h-full px-2 py-1.5 block">Nouvelle Facture</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Dynamic Month Navigator & KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Navigator */}
          <Card className="lg:col-span-4 border-sand-200 shadow-sm rounded-[24px] bg-white overflow-hidden flex flex-col justify-between">
            <div className="p-4 bg-forest-950 text-white flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="text-white hover:bg-white/10 h-8 w-8 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-base font-serif font-bold text-sand-100">
                  {MONTHS[selectedMonthIdx]} {selectedYear}
                </h2>
                <p className="text-[9px] font-bold text-sand-400 uppercase tracking-widest">
                  Période sélectionnée
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="text-white hover:bg-white/10 h-8 w-8 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center bg-sand-50/20">
              <div className="text-xs text-sand-400 text-center font-bold uppercase tracking-wider mb-2">
                Sélection rapide du mois
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => {
                      const d = new Date(currentDate);
                      d.setMonth(idx);
                      setCurrentDate(d);
                    }}
                    className={cn(
                      'rounded-md text-[10px] font-bold py-1.5 border transition-all text-center',
                      selectedMonthIdx === idx
                        ? 'bg-forest-950 text-white border-forest-950'
                        : 'bg-white text-sand-600 border-sand-200 hover:bg-sand-50'
                    )}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Core Monthly KPIs */}
          <Card className="lg:col-span-8 border-sand-200 shadow-sm rounded-[24px] bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider block">
                Total Documents Chargés
              </span>
              <div className="text-3xl font-mono font-bold text-forest-950">
                {filteredDocuments.length}
              </div>
              <span className="text-xs text-sand-400 font-medium">Pour les critères actuels</span>
            </div>
            <div className="space-y-1 border-l border-sand-100 pl-6">
              <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider block">
                Chiffre d&apos;affaires HT
              </span>
              <div className="text-2xl font-mono font-bold text-forest-800">
                {totalRawHtSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
              </div>
              <span className="text-xs text-sand-400 font-medium">Excluant taxes additionnelles</span>
            </div>
            <div className="space-y-1 border-l border-sand-100 pl-6">
              <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider block">
                Montant global TTC
              </span>
              <div className="text-2xl font-mono font-bold text-amber-800">
                {totalTtcSum.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
              </div>
              <span className="text-xs text-sand-400 font-medium">Toutes taxes comprises</span>
            </div>
          </Card>
        </div>

        {/* Tab view */}
        <Card className="border-sand-200/80 shadow-md rounded-[24px] overflow-hidden bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="border-b border-sand-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-sand-50/30">
              <TabsList className="bg-sand-100/60 p-1 rounded-xl h-11 border border-sand-200/50">
                <TabsTrigger
                  value="quote"
                  className="rounded-lg h-9 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Devis
                </TabsTrigger>
                <TabsTrigger
                  value="order"
                  className="rounded-lg h-9 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Commandes
                </TabsTrigger>
                <TabsTrigger
                  value="bl"
                  className="rounded-lg h-9 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Livraisons (BL)
                </TabsTrigger>
                <TabsTrigger
                  value="invoice"
                  className="rounded-lg h-9 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Factures
                </TabsTrigger>
              </TabsList>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input
                  placeholder="Rechercher par référence, client..."
                  className="pl-10 h-11 rounded-xl border-sand-200 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(activeTab === 'bl' || activeTab === 'invoice') && (
                <div className="p-5 border-b border-sand-100 bg-sand-50/15">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-sand-400 uppercase tracking-widest block">
                          Navigation Journalière ({activeTab === 'invoice' ? 'Factures' : 'Bons de Livraison'})
                        </span>
                        <p className="text-xs text-sand-500 font-medium mt-0.5">
                          Sélectionnez un jour pour charger les {activeTab === 'invoice' ? 'factures correspondantes' : 'documents correspondants'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-forest-950 text-white font-mono font-bold text-[10px] py-1 px-3.5 rounded-full border border-forest-900 shadow-sm shadow-forest-950/10">
                          Jour {selectedDay} / {getDaysCountInMonth(selectedYear, selectedMonthIdx)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDay(new Date().getDate())}
                          className="h-8 rounded-lg border-sand-200 text-[10px] font-bold uppercase tracking-wider text-sand-500 hover:text-forest-900 hover:bg-white"
                        >
                          Aujourd&apos;hui
                        </Button>
                      </div>
                    </div>
                    
                    {/* Horizontal scrollable list of days */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sand-200 scrollbar-track-transparent">
                      {Array.from(
                        { length: getDaysCountInMonth(selectedYear, selectedMonthIdx) },
                        (_, i) => i + 1
                      ).map((day) => {
                        const isCurrentDay = day === new Date().getDate() && selectedMonthIdx === new Date().getMonth() && selectedYear === new Date().getFullYear();
                        const isSelected = day === selectedDay;
                        
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className={cn(
                              'relative flex flex-col items-center justify-center min-w-[40px] h-10 rounded-full border text-xs font-bold transition-all',
                              isSelected
                                ? 'bg-forest-950 text-white border-forest-950 shadow-md shadow-forest-950/20 scale-105'
                                : 'bg-white text-sand-600 border-sand-200 hover:bg-sand-50 hover:border-sand-300',
                              isCurrentDay && !isSelected && 'ring-2 ring-forest-800/10 text-forest-900 border-forest-800/30'
                            )}
                          >
                            <span>{day}</span>
                            {isCurrentDay && (
                              <span className={cn(
                                'absolute bottom-1 w-1.5 h-1.5 rounded-full',
                                isSelected ? 'bg-white' : 'bg-forest-800 animate-pulse'
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse">
                  <thead>
                    <tr className="bg-sand-50/20 border-b border-sand-100 text-sand-400 font-bold uppercase text-[10px] tracking-widest">
                      <th className="px-6 py-4">Référence</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-6 py-4">Site</th>
                      <th className="px-6 py-4">Créateur</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-4 py-4 text-right">Montant Brut HT</th>
                      <th className="px-6 py-4 text-right">Montant TTC</th>
                      <th className="px-4 py-4 text-center">Statut</th>
                      {activeTab === 'bl' && <th className="px-4 py-4 text-center">Facturation</th>}
                      {activeTab === 'invoice' && <th className="px-4 py-4 text-center">Paiement</th>}
                      {activeTab === 'invoice' && <th className="px-4 py-4">Origine BL</th>}
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={activeTab === 'invoice' ? 11 : activeTab === 'bl' ? 10 : 9} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600"></div>
                            <p className="text-xs text-sand-400 font-bold uppercase tracking-wider">
                              Chargement de la liste...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDocuments.length > 0 ? (
                      filteredDocuments.map((item) => {
                        // Check if BL is invoiced. 
                        // In single conversion: Invoice is a child of BL (Invoice is in childdocuments).
                        // In batch/consolidated conversion: Invoice is a parent of BL (Invoice is in parentdocuments).
                        // Checking both ensures 100% accurate invoicing state regardless of the conversion method.
                        const isBlInvoiced = item.isinvoiced || 
                          item.parentdocuments?.some((p: any) => p.type === DocumentTypes.customerInvoice || p.parentdocument?.type === DocumentTypes.customerInvoice) ||
                          item.childdocuments?.some((c: any) => c.type === DocumentTypes.customerInvoice || c.childdocument?.type === DocumentTypes.customerInvoice);

                        const isOwner = isAdmin || item.updatedbyid === currentUserId;

                        return (
                          <React.Fragment key={item.id}>
                          <tr
                            className={cn(
                              'group hover:bg-sand-50/40 transition-colors cursor-pointer',
                              expandedId === item.id && 'bg-sand-50/60'
                            )}
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          >
                            <td className="px-6 py-4">
                              <span className="font-bold text-forest-950">{item.docnumber || 'Brouillon'}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs text-sand-500">
                                {new Date(item.creationdate!).toLocaleDateString('fr-FR')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="font-mono text-[9px] bg-sand-50 border-sand-200 text-sand-600">
                                {item.sales_site?.address || 'Générique'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-forest-100 flex items-center justify-center text-[9px] font-bold text-forest-800" title={item.appuser?.person ? `${item.appuser.person.firstname} ${item.appuser.person.lastname}` : item.appuser?.login || 'Système'}>
                                  {item.appuser?.person ? `${item.appuser.person.firstname[0]}${item.appuser.person.lastname[0]}`.toUpperCase() : 'SYS'}
                                </div>
                                <span className="text-xs font-medium text-sand-700 truncate max-w-[100px]">
                                  {item.appuser?.person ? `${item.appuser.person.firstname} ${item.appuser.person.lastname}` : item.appuser?.login || 'Système'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-serif font-bold text-forest-950 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-forest-50 border border-forest-100/50 flex items-center justify-center text-xs text-forest-800">
                                  {(item.counterpart?.name || item.counterpart?.firstname || 'C')?.substring(0, 1)}
                                </div>
                                {item.counterpart?.name || `${item.counterpart?.firstname || ''} ${item.counterpart?.lastname || ''}`.trim() || 'Client sans nom'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-sand-600">
                              {(item.total_ht_net_doc || 0).toLocaleString('fr-FR', {
                                minimumFractionDigits: 3
                              })}{' '}
                              DT
                            </td>
                            <td className="px-6 py-4 text-right">
                              {activeTab === 'invoice' && item.withholdingtax ? (
                                <div className="flex flex-col items-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  <span className="font-mono font-bold text-forest-900 text-sm">
                                    {((item.total_net_payable || item.total_net_ttc || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                                  </span>
                                  <span className="font-mono text-[10px] text-sand-400 line-through">
                                    {(item.total_net_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT TTC
                                  </span>
                                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[8px] font-bold uppercase scale-90 origin-right tracking-wider px-1.5 py-0 mt-0.5">
                                    RS Appliquée
                                  </Badge>
                                </div>
                              ) : (
                                <span className="font-mono font-bold text-forest-800">
                                  {(item.total_net_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}{' '}
                                  DT
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider',
                                    item.docstatus === DocStatus.Validated
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : item.docstatus === DocStatus.Created
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-teal-50 text-teal-800 border border-teal-200'
                                  )}
                                >
                                  {item.docstatus === DocStatus.Validated
                                    ? 'Validé'
                                    : item.docstatus === DocStatus.Created
                                    ? 'Créé'
                                    : 'Confirmé'}
                                </Badge>
                                
                                {activeTab === 'invoice' && (
                                  <Badge
                                    className={cn(
                                      'rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider mt-1',
                                      item.billingstatus === BillingStatus.Billed
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : item.billingstatus === BillingStatus.PartiallyBilled
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-orange-50 text-orange-800 border border-orange-200'
                                    )}
                                  >
                                    {item.billingstatus === BillingStatus.Billed
                                      ? 'Payé'
                                      : item.billingstatus === BillingStatus.PartiallyBilled
                                      ? 'Partiellement Payé'
                                      : 'Non Payé'}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            
                            {activeTab === 'bl' && (
                              <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center">
                                  {isBlInvoiced ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 pl-2 pr-2.5 py-0.5 text-[9px] font-bold"
                                      title="Déjà Facturé"
                                    >
                                      <Lock className="w-3 h-3 text-emerald-600" />
                                      Facturé
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full bg-amber-50 text-amber-800 border-amber-200 gap-1 pl-2 pr-2.5 py-0.5 text-[9px] font-bold"
                                      title="En attente facturation"
                                    >
                                      <LockOpen className="w-3 h-3 text-amber-600" />
                                      À Facturer
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            )}

                            {activeTab === 'invoice' && (
                              <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col items-center justify-center text-[10px] gap-1 font-sans">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-emerald-800 text-[9px] uppercase tracking-wider">Payé:</span>
                                    <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 font-bold">
                                      {(item.total_paid || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-rose-800 text-[9px] uppercase tracking-wider">Reste:</span>
                                    <span className="font-mono text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 font-bold">
                                      {(() => {
                                        const paid = item.total_paid ?? 0;
                                        const targetTotal = (item.withholdingtax && item.total_net_payable != null)
                                          ? item.total_net_payable
                                          : (item.total_net_ttc ?? 0);
                                        const remaining = Math.max(0, targetTotal - paid);
                                        return remaining.toLocaleString('fr-FR', { minimumFractionDigits: 3 });
                                      })()} DT
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}

                            {activeTab === 'invoice' && (
                              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                {item.deliveryNoteDocNumbers && item.deliveryNoteDocNumbers.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.deliveryNoteDocNumbers.map((num) => (
                                      <Badge
                                        key={num}
                                        variant="outline"
                                        className="font-mono text-[9px] bg-sand-50/50 border-sand-200 text-sand-700"
                                      >
                                        {num}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] italic text-sand-400 font-medium">Facture directe</span>
                                )}
                              </td>
                            )}
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {item.type === DocumentTypes.customerInvoice && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDocForRS(item)}
                                    className="h-8 w-8 text-amber-650 hover:text-amber-850 hover:bg-amber-50 rounded-lg"
                                    title="Retenue à la source (RS)"
                                  >
                                    <Landmark className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedDocIdForDetail(item.id)}
                                  className="h-8 w-8 text-sand-400 hover:text-forest-950 hover:bg-sand-100 rounded-lg"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-sand-400 hover:bg-sand-100 rounded-lg"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl border-sand-100 w-44">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedDocIdForDetail(item.id)}
                                      className="gap-2 font-semibold text-sand-800 cursor-pointer"
                                    >
                                      <FileText className="w-4 h-4" /> Voir détails
                                    </DropdownMenuItem>

                                    {/* Print options for BL and Invoices */}
                                    {item.type === DocumentTypes.customerDeliveryNote && (
                                      <DropdownMenuItem
                                        onClick={() => setPrintDoc({ doc: item, type: 'bl' })}
                                        className="gap-2 font-semibold text-sand-800 cursor-pointer"
                                      >
                                        <Printer className="w-4 h-4" /> Imprimer BL
                                      </DropdownMenuItem>
                                    )}

                                    {item.type === DocumentTypes.customerInvoice && (
                                      <DropdownMenuItem
                                        onClick={() => setPrintDoc({ doc: item, type: 'invoice' })}
                                        className="gap-2 font-semibold text-sand-800 cursor-pointer"
                                      >
                                        <Printer className="w-4 h-4" /> Imprimer Facture
                                      </DropdownMenuItem>
                                    )}

                                    {/* Quote Conversion Options — require canAdd (creating a new document from conversion) */}
                                    {hasPermission('sales', 'canAdd') && item.type === DocumentTypes.customerQuote && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleConvert(item, 'order')}
                                          disabled={!isOwner}
                                          className={cn("gap-2 font-semibold cursor-pointer", !isOwner ? "text-sand-400 cursor-not-allowed" : "text-forest-850")}
                                        >
                                          <ArrowRight className="w-4 h-4" /> Convertir en Commande
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleConvert(item, 'bl')}
                                          disabled={!isOwner}
                                          className={cn("gap-2 font-semibold cursor-pointer", !isOwner ? "text-sand-400 cursor-not-allowed" : "text-forest-850")}
                                        >
                                          <ArrowRight className="w-4 h-4" /> Convertir en BL
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    {/* Order Conversion Options — require canAdd */}
                                    {hasPermission('sales', 'canAdd') && item.type === DocumentTypes.customerOrder && (
                                      <DropdownMenuItem
                                        onClick={() => handleConvert(item, 'bl')}
                                        disabled={!isOwner}
                                        className={cn("gap-2 font-semibold cursor-pointer", !isOwner ? "text-sand-400 cursor-not-allowed" : "text-forest-850")}
                                      >
                                        <ArrowRight className="w-4 h-4" /> Convertir en BL
                                      </DropdownMenuItem>
                                    )}

                                    {/* BL → Invoice Conversion — require canAdd */}
                                    {hasPermission('sales', 'canAdd') && item.type === DocumentTypes.customerDeliveryNote && (
                                      <DropdownMenuItem
                                        onClick={() => handleConvert(item, 'invoice')}
                                        className={cn(
                                          "gap-2 font-semibold cursor-pointer",
                                          isBlInvoiced || !isOwner ? "text-sand-450 cursor-not-allowed" : "text-forest-850"
                                        )}
                                        disabled={isBlInvoiced || !isOwner}
                                      >
                                        {isBlInvoiced ? (
                                          <>
                                            <Lock className="w-4 h-4 text-sand-400" />
                                            Déjà Facturé
                                          </>
                                        ) : !isOwner ? (
                                          <>
                                            <Lock className="w-4 h-4 text-sand-400" />
                                            Non Autorisé
                                          </>
                                        ) : (
                                          <>
                                            <ArrowRight className="w-4 h-4 text-forest-800" />
                                            Convertir en Facture
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    )}

                                    {/* Payments Actions */}
                                    {(item.type === DocumentTypes.customerDeliveryNote ||
                                      item.type === DocumentTypes.customerInvoice) && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setDocForPayment({
                                              documentId: item.id,
                                              documentNumber: item.docnumber,
                                              totalAmount: item.total_net_ttc || 0,
                                              remainingAmount: item.remaining_balance,
                                              totalCreditNotes: item.total_credit_notes || 0,
                                              withholdingtax: item.withholdingtax,
                                              holdingtax: item.holdingtax,
                                              totalNetPayable: item.total_net_payable,
                                              customerId: item.counterpart?.id,
                                              customerName: item.counterpart?.name || `${item.counterpart?.firstname || ''} ${item.counterpart?.lastname || ''}`.trim() || 'Client sans nom'
                                            })
                                          }
                                          className="gap-2 font-semibold text-amber-800 cursor-pointer hover:bg-amber-50"
                                        >
                                          <CreditCard className="w-4 h-4" /> Règlement
                                        </DropdownMenuItem>
                                        {item.counterpart?.id && (
                                          <DropdownMenuItem
                                            onClick={() => setCustomerIdForRecouvrement(item.counterpart!.id)}
                                            className="gap-2 font-semibold text-emerald-800 cursor-pointer hover:bg-emerald-50"
                                          >
                                            <DollarSign className="w-4 h-4" /> Recouvrement
                                          </DropdownMenuItem>
                                        )}
                                      </>
                                    )}

                                    {/* Delete action — only for users with canDelete on sales */}
                                    {hasPermission('sales', 'canDelete') && (
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(item.id)}
                                        disabled={!isOwner}
                                        className={cn("gap-2 font-semibold cursor-pointer", !isOwner ? "text-sand-400 cursor-not-allowed hover:bg-transparent" : "text-red-600 hover:text-red-700 hover:bg-red-50")}
                                      >
                                        <Trash2 className="w-4 h-4" /> Supprimer
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <ChevronDown
                                  className={cn(
                                    'w-4 h-4 text-sand-300 transition-transform duration-300',
                                    expandedId === item.id && 'rotate-180'
                                  )}
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Step-Timeline Tracker */}
                          <AnimatePresence>
                            {expandedId === item.id && (
                              <tr>
                                <td colSpan={activeTab === 'bl' || activeTab === 'invoice' ? 10 : 9} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-sand-50/20"
                                  >
                                    <div className="p-8 border-b border-sand-100/60">
                                      {/* Unified dynamic cycle stepper */}
                                      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 relative">
                                        {/* Background Track Line */}
                                        <div className="absolute top-5 left-[-20px] right-[-20px] h-[3px] bg-sand-200/80 rounded-full z-0" />
                                        
                                        {/* Active Progress Track Line */}
                                        <div 
                                          className="absolute top-5 left-[-20px] h-[3px] bg-forest-950 rounded-full z-0 transition-all duration-500 ease-in-out" 
                                          style={{ 
                                            width: 
                                              item.type === DocumentTypes.customerInvoice 
                                                ? 'calc(100% + 40px)' 
                                                : item.type === DocumentTypes.customerDeliveryNote 
                                                ? (isBlInvoiced ? 'calc(100% + 40px)' : 'calc(66.66% + 20px)') 
                                                : item.type === DocumentTypes.customerOrder 
                                                ? 'calc(33.33% + 20px)' 
                                                : '20px' 
                                          }}
                                        />
                                        {[
                                          {
                                            label: 'Devis',
                                            icon: FileText,
                                            type: DocumentTypes.customerQuote,
                                            active: item.type === DocumentTypes.customerQuote
                                          },
                                          {
                                            label: 'Commande',
                                            icon: Clock,
                                            type: DocumentTypes.customerOrder,
                                            active: item.type === DocumentTypes.customerOrder
                                          },
                                          {
                                            label: 'Livraison',
                                            icon: CheckCircle2,
                                            type: DocumentTypes.customerDeliveryNote,
                                            active: item.type === DocumentTypes.customerDeliveryNote
                                          },
                                          {
                                            label: 'Facturation',
                                            icon: RotateCcw,
                                            type: DocumentTypes.customerInvoice,
                                            active: item.type === DocumentTypes.customerInvoice
                                          }
                                        ].map((step, idx) => {
                                          const isCompleted =
                                            (item.type === DocumentTypes.customerInvoice && idx <= 3) ||
                                            (item.type === DocumentTypes.customerDeliveryNote && (idx <= 2 || (idx === 3 && isBlInvoiced))) ||
                                            (item.type === DocumentTypes.customerOrder && idx <= 1) ||
                                            (item.type === DocumentTypes.customerQuote && idx === 0);

                                          // Resolve document info for this step
                                          const docInfo = (() => {
                                            if (item.type === step.type) {
                                              return {
                                                docnumber: item.docnumber || 'Brouillon',
                                                date: item.creationdate,
                                                isCurrent: true
                                              };
                                            }
                                            const parent = item.parentdocuments?.find((d: any) => d.type === step.type);
                                            if (parent) {
                                              return {
                                                docnumber: parent.docnumber,
                                                date: parent.creationdate,
                                                isCurrent: false
                                              };
                                            }
                                            const child = item.childdocuments?.find((d: any) => d.type === step.type);
                                            if (child) {
                                              return {
                                                docnumber: child.docnumber,
                                                date: child.creationdate,
                                                isCurrent: false
                                              };
                                            }
                                            return null;
                                          })();

                                          return (
                                            <div
                                              key={step.label}
                                              className="flex flex-col items-center gap-1.5 bg-transparent z-10 w-28 text-center"
                                            >
                                              <div
                                                className={cn(
                                                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative',
                                                  isCompleted
                                                    ? 'bg-forest-950 border-forest-950 text-white'
                                                    : step.active
                                                    ? 'bg-white border-forest-950 text-forest-950 shadow-md shadow-forest-950/15'
                                                    : 'bg-white border-sand-200 text-sand-300'
                                                )}
                                              >
                                                <step.icon className="w-5 h-5" />
                                                
                                                {/* Subtle current document indicator */}
                                                {docInfo?.isCurrent && (
                                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-forest-500"></span>
                                                  </span>
                                                )}
                                              </div>
                                              
                                              <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-sand-600">
                                                  {step.label}
                                                </span>
                                                
                                                {docInfo ? (
                                                  <div className="flex flex-col items-center mt-1">
                                                    <span className={cn(
                                                      "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none",
                                                      docInfo.isCurrent
                                                        ? "bg-forest-50 text-forest-800 border-forest-100"
                                                        : "bg-sand-100/60 text-sand-700 border-sand-200/50"
                                                    )}>
                                                      {docInfo.docnumber}
                                                    </span>
                                                    {docInfo.date && (
                                                      <span className="text-[8px] text-sand-400 font-mono mt-0.5">
                                                        {new Date(docInfo.date).toLocaleDateString('fr-FR')}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-[8px] text-sand-400 font-semibold italic mt-1 bg-sand-50/50 px-1 py-0.5 rounded border border-sand-100/50">
                                                    {isCompleted ? 'Direct' : 'En attente'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Quick items preview */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div className="space-y-3">
                                          <h4 className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">
                                            Aperçu des Articles
                                          </h4>
                                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                                            {item.merchandises?.map((row: any, rIdx: number) => (
                                              <div
                                                key={rIdx}
                                                className="bg-white p-3 rounded-xl border border-sand-200/50 flex items-center justify-between"
                                              >
                                                <div>
                                                  <div className="text-xs font-bold text-sand-800">
                                                    {row.article?.description}
                                                  </div>
                                                  <div className="text-[10px] text-sand-400 font-mono">
                                                    {row.article?.reference}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-xs font-bold text-sand-900">
                                                    {row.quantity} {row.article?.iswood ? 'M³' : 'u'}
                                                  </div>
                                                  <div className="text-[10px] text-sand-400 font-mono">
                                                    {(row.unit_price_ht || 0).toFixed(3)} DT
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="space-y-3 border-l border-sand-150 pl-8">
                                          <h4 className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">
                                            Notes &amp; Métadonnées
                                          </h4>
                                          <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                              <div className="text-[10px] font-semibold text-sand-400 uppercase mb-0.5">
                                                Date d&apos;édition
                                              </div>
                                              <div className="font-bold text-sand-800">
                                                {new Date(item.creationdate!).toLocaleDateString('fr-FR')}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] font-semibold text-sand-400 uppercase mb-0.5">
                                                Dépôt / Site
                                              </div>
                                              <div className="font-bold text-sand-800">
                                                {item.sales_site?.gov || 'Générique'}
                                              </div>
                                            </div>
                                            {item.transporter && (
                                              <div>
                                                <div className="text-[10px] font-semibold text-sand-400 uppercase mb-0.5">
                                                  Transporteur
                                                </div>
                                                <div className="font-bold text-sand-800">
                                                  {item.transporter.fullname}
                                                </div>
                                              </div>
                                            )}
                                            {item.description && (
                                              <div className="col-span-2">
                                                <div className="text-[10px] font-semibold text-sand-400 uppercase mb-0.5">
                                                  Observations
                                                </div>
                                                <p className="text-sand-600 leading-relaxed font-medium">
                                                  {item.description}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })
                    ) : (
                      <tr>
                        <td colSpan={activeTab === 'invoice' ? 11 : activeTab === 'bl' ? 10 : 9} className="py-24 text-center text-sand-400">
                          Aucun document de vente trouvé pour cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Floating Detailed Document View */}
      <DocumentDetailDrawer
        isOpen={selectedDocIdForDetail !== null}
        documentId={selectedDocIdForDetail}
        onClose={() => setSelectedDocIdForDetail(null)}
        onNavigateToRelated={(id) => setSelectedDocIdForDetail(id)}
        onPrint={(doc) => {
          setPrintDoc({
            doc,
            type: doc.type === DocumentTypes.customerInvoice ? 'invoice' : 'bl'
          });
        }}
      />

      {/* Print Option Dialog */}
      <PrintVariantDialog
        isOpen={printDoc !== null}
        onClose={() => setPrintDoc(null)}
        document={printDoc?.doc}
        docType={printDoc?.type}
      />

      {/* Print List Dialog */}
      <PrintVariantDialog
        isOpen={isPrintListModalOpen}
        onClose={() => setIsPrintListModalOpen(false)}
        docType="document-list"
        documentsList={filteredDocuments}
        listContext="sales"
        listTitle={
          activeTab === 'invoice' ? 'Factures' :
          activeTab === 'bl' ? 'Bons de Livraison' :
          activeTab === 'order' ? 'Commandes' : 'Devis'
        }
      />

      {/* Payment Confirmation Drawer */}
      {docForPayment && (
        <PaymentModal
          isOpen={docForPayment !== null}
          data={docForPayment}
          onClose={() => setDocForPayment(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Customer Recouvrement Modal */}
      {customerIdForRecouvrement !== null && (
        <CustomerRecouvrementDialog
          open={customerIdForRecouvrement !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCustomerIdForRecouvrement(null);
              refetch();
            }
          }}
          customerId={customerIdForRecouvrement}
        />
      )}

      {/* RS Withholding Tax Modal */}
      {docForRS && (
        <WithholdingTaxModal
          isOpen={docForRS !== null}
          document={docForRS}
          onClose={() => setDocForRS(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      <CustomerBatchConversionModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          setActiveTab('invoice');
          refetch();
        }}
      />

      <CustomerSingleBatchConversionModal
        isOpen={isSingleBatchModalOpen}
        onClose={() => setIsSingleBatchModalOpen(false)}
        onSuccess={() => {
          setActiveTab('invoice');
          refetch();
        }}
      />

      {/* Single BL → Invoice Conversion Modal (mirrors Angular DocumentConversionModalComponent) */}
      <BLToInvoiceModal
        bl={blForConversion}
        onClose={() => setBlForConversion(null)}
        onSuccess={() => {
          // Invalidate the documents cache, switch to invoice tab, and refetch
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          setActiveTab('invoice');
          refetch();
        }}
      />
    </DashboardLayout>
  );
}
