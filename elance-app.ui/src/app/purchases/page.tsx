'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Download,
  ChevronDown,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  BadgeCheck,
  Lock,
  LockOpen,
  Layers,
  Landmark,
  FileText,
  RotateCcw,
  AlertTriangle,
  Coins,
  ChevronUp,
  LayoutDashboard,
  Gavel
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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/use-auth-store';

// Hooks & Services
import {
  useDocumentsByTypeFiltered,
  useParentsWithChildren,
  useDeleteDocument
} from '@/hooks/use-documents';
import { useSuppliers } from '@/hooks/use-suppliers';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes, DocStatus, BillingStatus, Document } from '@/types/document';

// Shared / Modular Components
import { DocumentDetailDrawer } from '@/components/sales/document-detail-drawer';
import { WithholdingTaxModal } from '@/components/sales/withholding-tax-modal';
import { SupplierReceiptToInvoiceModal } from '@/components/purchases/supplier-receipt-to-invoice-modal';
import { SupplierCreditNoteModal } from '@/components/purchases/supplier-credit-note-modal';

// Month names list for period filters
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

export default function PurchasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  // Search & Expansion States
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Month & Year Filter State (initialized to current period)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const selectedMonthIdx = currentDate.getMonth(); // 0-11
  const selectedYear = currentDate.getFullYear();

  // Day filter state - default to 0 (meaning all days of the month are listed)
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Supplier filter state - default to "all" (client-side filtering)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // Active Tab: Commandes, Réceptions, Factures, Avoirs
  const [activeTab, setActiveTab] = useState<string>('invoice');

  // Selected Receipts (BRs) for Batch Invoicing
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<number[]>([]);

  // Modals & Details State
  const [selectedDocIdForDetail, setSelectedDocIdForDetail] = useState<number | null>(null);
  const [docForRS, setDocForRS] = useState<Document | null>(null);
  const [invoiceForCreditNote, setInvoiceForCreditNote] = useState<Document | null>(null);
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Resolves total days count in selected month to validate daily filters
  const getDaysCountInMonth = (year: number, monthIdx: number) => {
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  // Adjust selected day if it exceeds the max days of a newly switched month
  useEffect(() => {
    if (selectedDay > 0) {
      const maxDays = getDaysCountInMonth(selectedYear, selectedMonthIdx);
      if (selectedDay > maxDays) {
        setSelectedDay(maxDays);
      }
    }
  }, [selectedMonthIdx, selectedYear, selectedDay]);

  // Tab → Document Types mapper
  const tabToDocType = (tab: string): DocumentTypes => {
    switch (tab) {
      case 'order':
        return DocumentTypes.supplierOrder;
      case 'receipt':
        return DocumentTypes.supplierReceipt;
      case 'invoice':
        return DocumentTypes.supplierInvoice;
      case 'credit-note':
        return DocumentTypes.supplierInvoiceReturn;
      default:
        return DocumentTypes.supplierInvoice;
    }
  };

  const docType = tabToDocType(activeTab);

  // Fetch Documents filtered by date using React Query
  const { data: documents, isLoading, refetch } = useDocumentsByTypeFiltered({
    typeDoc: docType,
    month: selectedMonthIdx + 1,
    year: selectedYear,
    day: selectedDay > 0 ? selectedDay : 0
  });

  // Fetch Parent-Child Document relationships for expansion rendering
  const { data: parentsWithChildren, isLoading: loadingRelations } = useParentsWithChildren();

  // Fetch list of suppliers for client-side drop-down filtering
  const { data: suppliers = [] } = useSuppliers();

  // Soft Delete mutation
  const deleteDocMutation = useDeleteDocument();

  // Navigation: Period increments
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

  // Soft Deletion handler
  const handleDelete = async (id: number) => {
    if (confirm('Voulez-vous vraiment supprimer ce document d’achat ? Cette action est irréversible.')) {
      try {
        await deleteDocMutation.mutateAsync(id);
        refetch();
      } catch (err) {
        toast.error('Erreur lors de la suppression du document.');
      }
    }
  };

  // PDF Download handler
  const handleDownloadPdf = async (doc: Document) => {
    try {
      const blob = await documentService.downloadPdf(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Achat_${doc.docnumber || doc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Le téléchargement du PDF a commencé.');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      toast.error('Erreur lors de l’exportation du PDF.');
    }
  };

  // Supplier invoice conversions handlers
  const triggerSingleReceiptInvoicing = (receiptDoc: Document) => {
    setSelectedReceiptIds([receiptDoc.id]);
    setIsBatchModalOpen(true);
  };

  const triggerBatchInvoicing = () => {
    if (selectedReceiptIds.length === 0) return;
    setIsBatchModalOpen(true);
  };

  // Relationship filters for expanded Invoice panel (maps parentsWithChildren relationships)
  const getAssociatedReceipts = (invoiceId: number): any[] => {
    if (!parentsWithChildren) return [];
    const rel = parentsWithChildren.find((r) => r.parentDocument?.id === invoiceId);
    return rel?.childDocuments?.filter((d: any) => d.type === DocumentTypes.supplierReceipt) || [];
  };

  const getAssociatedCreditNotes = (invoiceId: number): any[] => {
    if (!parentsWithChildren) return [];
    const rel = parentsWithChildren.find((r) => r.parentDocument?.id === invoiceId);
    return rel?.childDocuments?.filter((d: any) => d.type === DocumentTypes.supplierInvoiceReturn) || [];
  };

  // Client-Side filtering: search terms + supplier drop-down selection
  const filteredDocuments = useMemo(() => {
    return (documents || [])
      .filter((doc) => {
        const term = searchTerm.toLowerCase();
        const supplierName = (
          doc.counterpart?.name || 
          `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`
        ).toLowerCase();

        const matchesSearch =
          doc.docnumber?.toLowerCase().includes(term) ||
          supplierName.includes(term) ||
          (doc.supplierReference || '').toLowerCase().includes(term) ||
          doc.description?.toLowerCase().includes(term);

        const matchesSupplier =
          selectedSupplierId === 'all' || 
          doc.counterpart?.id === Number(selectedSupplierId);

        return matchesSearch && matchesSupplier;
      })
      .sort((a, b) => (b.docnumber || '').localeCompare(a.docnumber || ''));
  }, [documents, searchTerm, selectedSupplierId]);

  // Compute live aggregates of selected receipts for batch validation
  const selectedReceipts = useMemo(() => {
    return (documents || []).filter((doc) => selectedReceiptIds.includes(doc.id));
  }, [documents, selectedReceiptIds]);

  // Determine if the batch conversion trigger is active and valid (same supplier + non-invoiced)
  const isBatchTriggerValid = useMemo(() => {
    if (selectedReceipts.length === 0) return false;
    const firstSupplierId = selectedReceipts[0]?.counterpart?.id;
    return selectedReceipts.every(
      (r) => 
        r.counterpart?.id === firstSupplierId && 
        r.billingstatus !== BillingStatus.Billed && 
        !r.isinvoiced
    );
  }, [selectedReceipts]);

  // Selected supplier name for display in SelectTrigger
  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === 'all') return 'Tous les Fournisseurs';
    const found = suppliers.find((s: any) => s.id.toString() === selectedSupplierId);
    return found ? (found.name || `${found.firstname || ''} ${found.lastname || ''}`) : 'Tous les Fournisseurs';
  }, [selectedSupplierId, suppliers]);

  // Dynamic KPI counters tailored to active workspace and tab calculations
  const kpiData = useMemo(() => {
    const list = filteredDocuments;
    if (activeTab === 'invoice') {
      return list.reduce(
        (acc, curr) => {
          acc.ht += curr.total_ht_net_doc || 0;
          acc.tva += curr.total_tva_doc || 0;
          acc.ttc += curr.total_net_ttc || 0;
          acc.avoirs += curr.total_credit_notes || 0;
          acc.payable += curr.total_net_payable ?? curr.total_net_ttc ?? 0;
          acc.remaining += curr.remaining_balance || 0;
          return acc;
        },
        { ht: 0, tva: 0, ttc: 0, avoirs: 0, payable: 0, remaining: 0 }
      );
    } else {
      // General Tab counters
      return list.reduce(
        (acc, curr) => {
          acc.ht += curr.total_ht_net_doc || 0;
          acc.ttc += curr.total_net_ttc || 0;
          return acc;
        },
        { ht: 0, tva: 0, ttc: 0, avoirs: 0, payable: 0, remaining: 0 }
      );
    }
  }, [filteredDocuments, activeTab]);

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section: spatial tension layout with deep slate/amber styling */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-950/10 text-amber-900 rounded-xl">
                <LayoutDashboard className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase font-mono">
                Acquisitions &amp; Logistique
              </span>
            </div>
            <h1 className="text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
              Gestion des Achats
            </h1>
            <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
              Pilotez l’intégralité de la chaîne d’approvisionnement : commandes fournisseurs, réceptions de marchandises (BR), factures et avoirs financiers.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link href="/purchases/approvals" passHref>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
                >
                  <Gavel className="w-4 h-4 text-amber-700 animate-pulse" /> Approbations
                </Button>
              </Link>
            )}
            <Link href="/purchases/payments" passHref>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
              >
                <Coins className="w-4 h-4" /> Règlements Fournisseurs
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-11 rounded-xl bg-amber-900 text-white hover:bg-amber-950 font-bold shadow-lg shadow-amber-900/10 gap-2 flex items-center transition-all duration-300">
                  <Plus className="w-4 h-4" /> Nouveau Document
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-100 w-48 shadow-xl">
                <DropdownMenuItem onClick={() => router.push('/purchases/order/new')} className="font-bold text-slate-800 gap-2 cursor-pointer">
                  <Clock className="w-4 h-4 text-amber-700" /> Commande Fournisseur
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/purchases/receipt/new')} className="font-bold text-slate-800 gap-2 cursor-pointer">
                  <Package className="w-4 h-4 text-amber-700" /> Bon de Réception (BR)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/purchases/invoice/new')} className="font-bold text-slate-800 gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-amber-700" /> Facture Fournisseur
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setInvoiceForCreditNote(null); setIsCreditNoteModalOpen(true); }} className="font-bold text-slate-800 gap-2 cursor-pointer">
                  <RotateCcw className="w-4 h-4 text-amber-700" /> Avoir Fournisseur
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dynamic Period Navigator Card */}
        <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-[24px] bg-white overflow-hidden border">
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-left">
                <h2 className="text-lg font-serif font-bold text-amber-50">
                  {MONTHS[selectedMonthIdx]} {selectedYear}
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Période d&apos;activité comptable
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-xl transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Day of Month Filter Bar */}
            <div className="flex items-center gap-2 bg-slate-850/50 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
              <Button
                variant={selectedDay === 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedDay(0)}
                className={cn(
                  'rounded-xl h-8 px-4 text-xs font-bold font-mono transition-all',
                  selectedDay === 0
                    ? 'bg-amber-700 text-white hover:bg-amber-800'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                TOUT LE MOIS
              </Button>
              <Separator orientation="vertical" className="h-4 bg-slate-800" />
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: getDaysCountInMonth(selectedYear, selectedMonthIdx) },
                  (_, i) => i + 1
                ).map((day) => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'rounded-xl h-8 w-8 text-xs font-bold font-mono p-0 transition-all',
                      selectedDay === day
                        ? 'bg-amber-700 text-white hover:bg-amber-800'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="px-6 py-2 bg-slate-50 overflow-x-auto flex items-center gap-1 justify-center border-t border-slate-100">
            {MONTHS.map((m, idx) => (
              <Button
                key={m}
                variant={selectedMonthIdx === idx ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setCurrentDate((prev) => {
                    const d = new Date(prev);
                    d.setMonth(idx);
                    return d;
                  });
                }}
                className={cn(
                  'rounded-xl h-9 px-4 font-bold text-xs transition-colors',
                  selectedMonthIdx === idx
                    ? 'bg-amber-900 text-white hover:bg-amber-950 shadow-sm'
                    : 'text-slate-400 hover:text-amber-900 hover:bg-amber-50/50'
                )}
              >
                {m.substring(0, 3)}
              </Button>
            ))}
          </div>
        </Card>

        {/* Financial Counterparts & Status KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Volume HT Net
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-mono font-bold text-slate-800">{fmt(kpiData.ht)}</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">DT</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-amber-700 h-full w-[65%]" />
            </div>
          </Card>

          {activeTab === 'invoice' ? (
            <>
              <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Volume TVA
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-slate-800">{fmt(kpiData.tva)}</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">DT</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-750 h-full w-[45%]" />
                </div>
              </Card>

              <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Total TTC
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-amber-900">{fmt(kpiData.ttc)}</span>
                  <span className="text-[10px] font-bold text-amber-900/60 font-mono">DT</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-900 h-full w-[80%]" />
                </div>
              </Card>

              <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Avoirs financiers
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-rose-600">-{fmt(kpiData.avoirs)}</span>
                  <span className="text-[10px] font-bold text-rose-400 font-mono">DT</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-rose-500 h-full w-[20%]" />
                </div>
              </Card>

              <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Reste à payer
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-slate-900">{fmt(kpiData.remaining)}</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">DT</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-900 h-full w-[70%]" />
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="rounded-[20px] border-slate-100 shadow-sm bg-white p-5 space-y-2 border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Total TTC Cumulé
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-mono font-bold text-amber-900">{fmt(kpiData.ttc)}</span>
                  <span className="text-[10px] font-bold text-amber-950 font-mono">DT</span>
                </div>
              </Card>
              <Card className="rounded-[20px] border-slate-150 shadow-sm bg-white p-5 space-y-2 border border-dashed col-span-3 flex items-center justify-center text-xs text-slate-400 font-serif italic">
                Activez l&apos;onglet Factures pour voir le détail des règlements et avoirs.
              </Card>
            </>
          )}
        </div>

        {/* Workspace Card: Search filters & dynamic data table */}
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white border">
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setExpandedId(null);
            setSelectedReceiptIds([]);
          }} className="w-full">
            
            {/* Custom styled Tabs Header */}
            <CardHeader className="border-b border-slate-100 p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <TabsList className="bg-slate-100 p-1 rounded-2xl w-fit flex h-11 border border-slate-200/50">
                  <TabsTrigger
                    value="order"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-5 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" /> Commandes
                  </TabsTrigger>
                  <TabsTrigger
                    value="receipt"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-5 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" /> Réceptions / BR
                  </TabsTrigger>
                  <TabsTrigger
                    value="invoice"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-5 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Factures
                  </TabsTrigger>
                  <TabsTrigger
                    value="credit-note"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-5 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Avoirs Fournisseurs
                  </TabsTrigger>
                </TabsList>

                {/* Batch Actions Bar for BRs */}
                {activeTab === 'receipt' && selectedReceiptIds.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 p-1.5 bg-amber-550/5 border border-amber-900/10 rounded-2xl"
                  >
                    <span className="text-xs font-bold text-amber-900 font-sans px-2">
                      {selectedReceiptIds.length} Bons de Réception sélectionnés
                    </span>
                    <Button
                      size="sm"
                      onClick={triggerBatchInvoicing}
                      disabled={!isBatchTriggerValid}
                      className={cn(
                        'rounded-xl text-xs font-bold shadow-sm',
                        isBatchTriggerValid
                          ? 'bg-amber-900 hover:bg-amber-950 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border'
                      )}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      Facturer la sélection
                    </Button>
                    {!isBatchTriggerValid && (
                      <span className="text-[10px] text-red-600 font-bold max-w-xs leading-none mr-2">
                        Tous les BR doivent appartenir au même fournisseur.
                      </span>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher par numéro de document, référence fournisseur, observations..."
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-[#fafafa] text-xs font-semibold focus:border-amber-900 focus:ring-amber-900 transition-all focus:bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <Select value={selectedSupplierId} onValueChange={(val) => setSelectedSupplierId(val || 'all')}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-[#fafafa] text-xs font-semibold focus:ring-amber-900 w-full">
                        <SelectValue placeholder="Filtrer par Fournisseur">
                          {selectedSupplierName}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg">
                        <SelectItem value="all" label="Tous les Fournisseurs" className="text-xs font-bold">
                          Tous les Fournisseurs
                        </SelectItem>
                        {suppliers.map((s: any) => {
                          const name = s.name || `${s.firstname || ''} ${s.lastname || ''}`;
                          return (
                            <SelectItem key={s.id} value={s.id.toString()} label={name} className="text-xs">
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />
                  
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-950/5 border border-amber-900/10 rounded-xl text-xs font-bold text-amber-900">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <span>{filteredDocuments.length} Documents trouvés</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Data Table */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      
                      {/* Checkbox column only on receipt/BR tab */}
                      {activeTab === 'receipt' && (
                        <th className="p-4 w-12 text-center">
                          <input
                            type="checkbox"
                            className="accent-amber-900 rounded cursor-pointer size-3.5"
                            checked={
                              filteredDocuments.length > 0 &&
                              selectedReceiptIds.length === filteredDocuments.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReceiptIds(filteredDocuments.map((d) => d.id));
                              } else {
                                setSelectedReceiptIds([]);
                              }
                            }}
                          />
                        </th>
                      )}
                      
                      {/* Toggle Expand column for invoice and order tabs */}
                      {(activeTab === 'invoice' || activeTab === 'order') && <th className="p-4 w-10"></th>}

                      <th className="p-4">N° Document</th>
                      
                      {activeTab === 'invoice' && <th className="p-4">Réf. Fournisseur</th>}

                      <th className="p-4">Date</th>
                      <th className="p-4">Fournisseur</th>
                      <th className="p-4 text-right">Total HT</th>
                      <th className="p-4 text-right">Total TTC</th>
                      <th className="p-4 text-center">Statut</th>

                      {activeTab === 'receipt' && <th className="p-4 text-center">Facturation</th>}
                      {activeTab === 'invoice' && <th className="p-4 text-center">Retenue (RS)</th>}

                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={activeTab === 'invoice' ? 10 : activeTab === 'receipt' ? 9 : activeTab === 'order' ? 8 : 7}
                          className="py-24 text-center text-slate-400 italic"
                        >
                          Chargement des documents d&apos;achat en cours...
                        </td>
                      </tr>
                    ) : filteredDocuments.length > 0 ? (
                      filteredDocuments.map((item) => {
                        const isExpanded = expandedId === item.id;
                        
                        // Associated children details for expanded Row
                        const associatedBRs = getAssociatedReceipts(item.id);
                        const associatedAvoirs = getAssociatedCreditNotes(item.id);

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={cn(
                                'group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer border-slate-50',
                                isExpanded && 'bg-amber-950/[0.02]'
                              )}
                              onClick={() => {
                                if (activeTab === 'invoice' || activeTab === 'order') {
                                  setExpandedId(isExpanded ? null : item.id);
                                } else {
                                  setSelectedDocIdForDetail(item.id);
                                }
                              }}
                            >
                              {/* Checkbox selector for receipt/BR batch conversions */}
                              {activeTab === 'receipt' && (
                                <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="accent-amber-900 rounded cursor-pointer size-3.5"
                                    checked={selectedReceiptIds.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedReceiptIds((prev) => [...prev, item.id]);
                                      } else {
                                        setSelectedReceiptIds((prev) =>
                                          prev.filter((id) => id !== item.id)
                                        );
                                      }
                                    }}
                                  />
                                </td>
                              )}

                              {/* Toggle expand button for invoice and order tabs */}
                              {(activeTab === 'invoice' || activeTab === 'order') && (
                                <td className="p-4 text-center">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
                                  )}
                                </td>
                              )}

                              <td className="p-4">
                                <span className="font-bold text-slate-900 block group-hover:text-amber-900 transition-colors">
                                  {item.docnumber || 'Brouillon'}
                                </span>
                              </td>

                              {activeTab === 'invoice' && (
                                <td className="p-4">
                                  <span className="font-mono font-medium text-slate-500">
                                    {item.supplierReference || '--'}
                                  </span>
                                </td>
                              )}

                              <td className="p-4">
                                <span className="font-mono font-medium text-slate-500">
                                  {new Date(item.creationdate).toLocaleDateString('fr-FR')}
                                </span>
                              </td>

                              <td className="p-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/50 text-[9px] flex items-center justify-center">
                                    {item.counterpart?.name ? item.counterpart.name.charAt(0) : 'F'}
                                  </span>
                                  <span>
                                    {item.counterpart?.name ||
                                      `${item.counterpart?.firstname || ''} ${
                                        item.counterpart?.lastname || ''
                                      }`}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-right font-mono font-medium">
                                {fmt(item.total_ht_net_doc || 0)}
                              </td>

                              <td className="p-4 text-right font-mono font-bold text-amber-950">
                                {fmt(item.total_net_ttc || 0)}
                              </td>

                              <td className="p-4 text-center">
                                <Badge
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 font-bold text-[9px] tracking-wide uppercase',
                                    (item.docstatus === DocStatus.Validated || item.docstatus === DocStatus.Completed || item.docstatus === DocStatus.Approved)
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                                      : item.docstatus === DocStatus.PendingApproval
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200/50'
                                      : item.docstatus === DocStatus.Rejected
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200/50'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200/50'
                                  )}
                                >
                                  {item.docstatus === DocStatus.Validated || item.docstatus === DocStatus.Completed
                                    ? 'Validé'
                                    : item.docstatus === DocStatus.Approved
                                    ? 'Approuvé'
                                    : item.docstatus === DocStatus.PendingApproval
                                    ? 'En attente'
                                    : item.docstatus === DocStatus.Rejected
                                    ? 'Rejetée'
                                    : 'Brouillon'}
                                </Badge>
                              </td>

                              {/* BR billing lock indicators */}
                              {activeTab === 'receipt' && (
                                <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  {item.isinvoiced || item.billingstatus === BillingStatus.Billed ? (
                                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-full font-bold text-[9px] gap-1 flex items-center w-fit mx-auto px-2">
                                      <Lock className="w-3 h-3 text-emerald-600" /> Facturé
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200/50 rounded-full font-bold text-[9px] gap-1 flex items-center w-fit mx-auto px-2">
                                      <LockOpen className="w-3 h-3 text-amber-600" /> Non Facturé
                                    </Badge>
                                  )}
                                </td>
                              )}

                              {/* Withholding tax RS applied status */}
                              {activeTab === 'invoice' && (
                                <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  {item.withholdingtax ? (
                                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-full font-bold text-[9px] w-fit mx-auto px-2">
                                      RS Appliqué
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic font-medium">Non appliqué</span>
                                  )}
                                </td>
                              )}

                              {/* Actions Dropdown */}
                              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedDocIdForDetail(item.id)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-800"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800"
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-100 w-44 shadow-lg">
                                      <DropdownMenuItem
                                        onClick={() => setSelectedDocIdForDetail(item.id)}
                                        className="gap-2 font-bold text-slate-800 cursor-pointer"
                                      >
                                        <FileText className="w-4 h-4 text-slate-500" /> Afficher Détails
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        onClick={() => handleDownloadPdf(item)}
                                        className="gap-2 font-bold text-slate-800 cursor-pointer"
                                      >
                                        <FileDown className="w-4 h-4 text-slate-500" /> Télécharger PDF
                                      </DropdownMenuItem>

                                      {item.counterpart && (
                                        <DropdownMenuItem
                                          onClick={() => router.push(`/purchases/payments?supplierId=${item.counterpart.id}`)}
                                          className="gap-2 font-bold text-slate-800 cursor-pointer"
                                        >
                                          <Coins className="w-4 h-4 text-slate-500" /> Règlements
                                        </DropdownMenuItem>
                                      )}

                                      {/* Invoice withholding tax trigger (only if validation is complete and RS is not applied yet) */}
                                      {activeTab === 'invoice' && !item.withholdingtax && (
                                        <DropdownMenuItem
                                          onClick={() => setDocForRS(item)}
                                          className="gap-2 font-bold text-slate-800 cursor-pointer"
                                        >
                                          <Landmark className="w-4 h-4 text-amber-700" /> Appliquer RS (RS)
                                        </DropdownMenuItem>
                                      )}

                                      {/* Invoice credit note generation trigger */}
                                      {activeTab === 'invoice' && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setInvoiceForCreditNote(item);
                                            setIsCreditNoteModalOpen(true);
                                          }}
                                          className="gap-2 font-bold text-slate-800 cursor-pointer"
                                        >
                                          <RotateCcw className="w-4 h-4 text-amber-700" /> Générer Avoir
                                        </DropdownMenuItem>
                                      )}

                                      {/* Receipt conversion trigger (only if not invoiced yet) */}
                                      {activeTab === 'receipt' && !item.isinvoiced && item.billingstatus !== BillingStatus.Billed && (
                                        <DropdownMenuItem
                                          onClick={() => triggerSingleReceiptInvoicing(item)}
                                          className="gap-2 font-bold text-amber-800 cursor-pointer"
                                        >
                                          <Layers className="w-4 h-4 text-amber-700" /> Facturer le BR
                                        </DropdownMenuItem>
                                      )}

                                      <DropdownMenuItem
                                        onClick={() => handleDelete(item.id)}
                                        className="gap-2 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" /> Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>

                            {/* Detailed Row Expansion for Supplier Invoices */}
                            {activeTab === 'invoice' && isExpanded && (
                              <tr>
                                <td colSpan={10} className="p-0">
                                  <AnimatePresence initial={false}>
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden bg-slate-50/40 border-y border-slate-100"
                                    >
                                      <div className="p-6 md:p-8 space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                          
                                          {/* Associated BRs subsection */}
                                          <div className="space-y-3">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                              <Layers className="w-3.5 h-3.5 text-amber-700" /> Bons de Réception Associés
                                            </h4>
                                            
                                            {associatedBRs.length > 0 ? (
                                              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                                {associatedBRs.map((br: any, brIdx: number) => (
                                                  <div
                                                    key={br.id}
                                                    className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between hover:border-amber-900/20 transition-all"
                                                  >
                                                    <div className="space-y-0.5">
                                                      <div className="text-xs font-bold text-slate-900">
                                                        {br.docnumber}
                                                      </div>
                                                      <div className="text-[10px] text-slate-400 font-medium">
                                                        Date: {br.creationdate ? new Date(br.creationdate).toLocaleDateString('fr-FR') : '--'}
                                                      </div>
                                                    </div>
                                                    <div className="text-right space-y-0.5">
                                                      <div className="text-xs font-bold text-amber-950 font-mono">
                                                        {fmt(br.total_net_ttc || 0)} DT
                                                      </div>
                                                      <div className="text-[10px] text-slate-400 font-mono">
                                                        {fmt(br.total_ht_net_doc || 0)} DT HT
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="py-8 text-center text-xs text-slate-400 italic bg-white border border-slate-150 border-dashed rounded-2xl">
                                                Aucun bon de réception associé à cette facture.
                                              </div>
                                            )}
                                          </div>

                                          {/* Associated Credit Notes subsection */}
                                          <div className="space-y-3 lg:border-l lg:border-slate-200 lg:pl-8">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Avoirs Financiers Appliqués
                                            </h4>

                                            {associatedAvoirs.length > 0 ? (
                                              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                                {associatedAvoirs.map((credit: any, creditIdx: number) => (
                                                  <div
                                                    key={credit.id}
                                                    className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between hover:border-rose-900/20 transition-all"
                                                  >
                                                    <div className="space-y-0.5">
                                                      <div className="text-xs font-bold text-slate-900">
                                                        {credit.docnumber}
                                                      </div>
                                                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                                                        {credit.description}
                                                      </p>
                                                    </div>
                                                    <div className="text-right space-y-0.5">
                                                      <div className="text-xs font-bold text-rose-600 font-mono">
                                                        -{fmt(credit.total_net_ttc || 0)} DT
                                                      </div>
                                                      <div className="text-[10px] text-slate-400 font-mono">
                                                        Date: {credit.creationdate ? new Date(credit.creationdate).toLocaleDateString('fr-FR') : '--'}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="py-8 text-center text-xs text-slate-400 italic bg-white border border-slate-150 border-dashed rounded-2xl">
                                                Aucun avoir financier appliqué sur cette facture.
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Observations section */}
                                        {item.description && (
                                          <div className="bg-amber-950/[0.01] border border-amber-900/5 rounded-2xl p-4 space-y-1">
                                            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-widest block font-mono">
                                              Observations / Commentaires
                                            </span>
                                            <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                              {item.description}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </AnimatePresence>
                                </td>
                              </tr>
                            )}

                            {/* Detailed Row Expansion for Supplier Orders */}
                            {activeTab === 'order' && isExpanded && (
                              <tr>
                                <td colSpan={8} className="p-0">
                                  <AnimatePresence initial={false}>
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden bg-slate-50/40 border-y border-slate-100"
                                    >
                                      <div className="p-6 md:p-8 space-y-6">
                                        
                                        {/* Procurement Stepper */}
                                        <div className="relative flex items-center justify-between max-w-3xl mx-auto mb-10">
                                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0"></div>
                                          
                                          {/* Step 1: Commande */}
                                          <div className={cn(
                                            "relative z-10 flex flex-col items-center gap-2",
                                            item.docstatus !== DocStatus.Abandoned && item.docstatus !== DocStatus.Deleted ? "opacity-100" : "opacity-50"
                                          )}>
                                            <div className={cn(
                                              "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                              item.docstatus !== DocStatus.Abandoned && item.docstatus !== DocStatus.Deleted 
                                                ? "bg-amber-900 border-amber-900 text-white shadow-lg" 
                                                : "bg-slate-100 border-slate-300 text-slate-400"
                                            )}>
                                              <Clock className="w-5 h-5" />
                                            </div>
                                            <div className="text-center">
                                              <span className="text-[10px] font-bold text-slate-900 block uppercase tracking-widest font-mono">Commande</span>
                                              <span className="text-[10px] font-medium text-slate-500">{item.docnumber}</span>
                                            </div>
                                          </div>

                                          {/* Step 2: Réception */}
                                          <div className={cn(
                                            "relative z-10 flex flex-col items-center gap-2",
                                            item.docstatus === DocStatus.PartiallyDelivered || item.docstatus === DocStatus.Delivered ? "opacity-100" : "opacity-50"
                                          )}>
                                            <div className={cn(
                                              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                                              item.docstatus === DocStatus.Delivered ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" :
                                              item.docstatus === DocStatus.PartiallyDelivered ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md" :
                                              "bg-white border-slate-300 text-slate-400"
                                            )}>
                                              {item.docstatus === DocStatus.Delivered ? <CheckCircle2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                                            </div>
                                            <div className="text-center flex flex-col items-center">
                                              <span className="text-[10px] font-bold text-slate-900 block uppercase tracking-widest font-mono">Réception</span>
                                              {item.docstatus === DocStatus.Delivered ? (
                                                <span className="text-[10px] font-bold text-emerald-600">Réceptionné</span>
                                              ) : item.docstatus === DocStatus.PartiallyDelivered ? (
                                                <span className="text-[10px] font-bold text-amber-600">Partielle</span>
                                              ) : (
                                                <span className="text-[10px] font-medium text-slate-500">En attente</span>
                                              )}
                                              {item.childdocuments && item.childdocuments.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                  {item.childdocuments.map((child: any) => (
                                                    <div key={child.id} className="text-[9px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                      {child.docnumber}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {item.docstatus !== DocStatus.Delivered && item.docstatus !== DocStatus.Abandoned && item.docstatus !== DocStatus.Deleted && (
                                                <Button 
                                                  variant="link" 
                                                  className="h-auto p-0 text-[10px] text-amber-700 font-bold mt-1"
                                                  onClick={(e) => { e.stopPropagation(); router.push(`/purchases/receipt/new?orderId=${item.id}`); }}
                                                >
                                                  {item.docstatus === DocStatus.PartiallyDelivered ? 'Compléter réception' : 'Créer un bon de réception'}
                                                </Button>
                                              )}
                                            </div>
                                          </div>

                                          {/* Step 3: Facturation */}
                                          <div className={cn(
                                            "relative z-10 flex flex-col items-center gap-2",
                                            item.isinvoiced ? "opacity-100" : "opacity-50"
                                          )}>
                                            <div className={cn(
                                              "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                              item.isinvoiced ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" : "bg-white border-slate-300 text-slate-400"
                                            )}>
                                              <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="text-center">
                                              <span className="text-[10px] font-bold text-slate-900 block uppercase tracking-widest font-mono">Facturation</span>
                                              {item.isinvoiced ? (
                                                <span className="text-[10px] font-bold text-emerald-600">Facture générée</span>
                                              ) : (
                                                <span className="text-[10px] font-medium text-slate-500">Non facturé</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Articles Grid */}
                                        <div>
                                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                                            <Layers className="w-3.5 h-3.5 text-amber-700" /> Articles de la commande
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {item.merchandises?.map((m: any, idx: number) => {
                                              const qty = m.quantity || 0;
                                              const qtyDelivered = m.quantity_delivered || 0;
                                              const qtyRemaining = m.quantity_remaining !== undefined ? m.quantity_remaining : Math.max(0, qty - qtyDelivered);
                                              const progressPercent = qty > 0 ? Math.min(100, (qtyDelivered / qty) * 100) : 0;
                                              const isDone = qtyRemaining <= 0;
                                              
                                              return (
                                                <div key={m.id || idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-900/20 transition-all flex flex-col justify-between">
                                                  <div className="mb-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                      <span className="text-xs font-bold text-slate-900 font-mono">#{idx + 1} {m.article?.reference}</span>
                                                      <span className="text-xs font-bold text-amber-950 font-mono">{fmt(m.cost_ttc || 0)} DT</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 line-clamp-2">{m.description || m.article?.description}</p>
                                                  </div>
                                                  
                                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div className="bg-slate-50 rounded-lg p-2 flex flex-col">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qté Cmd</span>
                                                      <span className="text-xs font-bold text-slate-700 font-mono">{fmt(qty)}</span>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-2 flex flex-col">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">P.U HT</span>
                                                      <span className="text-xs font-bold text-slate-700 font-mono">{fmt(m.unit_price_ht || 0)}</span>
                                                    </div>
                                                  </div>

                                                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                                    <div className="flex justify-between items-end">
                                                      <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Réceptionné</span>
                                                        <span className="text-xs font-bold text-emerald-600 font-mono">{fmt(qtyDelivered)}</span>
                                                      </div>
                                                      {isDone ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">Soldé</span>
                                                      ) : (
                                                        <div className="flex flex-col items-end">
                                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reste</span>
                                                          <span className="text-xs font-bold text-amber-600 font-mono">{fmt(qtyRemaining)}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                      <div 
                                                        className={cn(
                                                          "h-full transition-all duration-500",
                                                          isDone ? "bg-emerald-500" : "bg-amber-500"
                                                        )}
                                                        style={{ width: `${progressPercent}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        
                                      </div>
                                    </motion.div>
                                  </AnimatePresence>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={activeTab === 'invoice' ? 10 : activeTab === 'receipt' ? 9 : activeTab === 'order' ? 8 : 7}
                          className="py-24 text-center text-slate-400 italic font-medium"
                        >
                          Aucun document trouvé pour la période sélectionnée.
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

      {/* Floating Detailed Document Drawer view */}
      <DocumentDetailDrawer
        isOpen={selectedDocIdForDetail !== null}
        documentId={selectedDocIdForDetail}
        onClose={() => setSelectedDocIdForDetail(null)}
        onNavigateToRelated={(id) => setSelectedDocIdForDetail(id)}
      />

      {/* RS Withholding Tax Modal Dialog */}
      {docForRS && (
        <WithholdingTaxModal
          isOpen={docForRS !== null}
          document={docForRS}
          onClose={() => setDocForRS(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            refetch();
          }}
        />
      )}

      {/* Batch Conversion BR → Invoice Modal Dialog */}
      <SupplierReceiptToInvoiceModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setSelectedReceiptIds([]);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          setActiveTab('invoice');
          refetch();
        }}
        selectedReceipts={selectedReceipts}
      />

      {/* Credit Note creation Modal Dialog */}
      <SupplierCreditNoteModal
        isOpen={isCreditNoteModalOpen}
        onClose={() => {
          setIsCreditNoteModalOpen(false);
          setInvoiceForCreditNote(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          refetch();
        }}
        parentInvoice={invoiceForCreditNote}
      />
    </DashboardLayout>
  );
}
