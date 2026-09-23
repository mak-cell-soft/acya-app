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
  Gavel,
  SlidersHorizontal,
  X,
  CalendarRange
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
import { usePermissionGuard } from '@/hooks/use-permission-guard';
// NOTE: useAuthStore is no longer needed here — permissions are now handled by usePermissionGuard

// Hooks & Services
import {
  useDocumentsByTypeFiltered,
  usePurchaseDeepSearch,
  useParentsWithChildren,
  useDeleteDocument
} from '@/hooks/use-documents';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useArticles } from '@/hooks/use-articles';
import { TablePagination } from '@/components/shared/table-pagination';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes, DocStatus, BillingStatus, Document, PurchaseSearchFilter } from '@/types/document';
import { Article, ArticleType } from '@/types/article';

// Shared / Modular Components
import { DocumentDetailDrawer } from '@/components/sales/document-detail-drawer';
import { WithholdingTaxModal } from '@/components/sales/withholding-tax-modal';
import { TejRsDialog } from '@/components/tej/tej-rs-dialog';
import { SupplierReceiptToInvoiceModal } from '@/components/purchases/supplier-receipt-to-invoice-modal';
import { SupplierCreditNoteModal } from '@/components/purchases/supplier-credit-note-modal';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { HoldingTaxListPanel } from '@/components/purchases/holding-tax-list-panel';

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

// Helper to compute default period: current date minus 3 months -> current date
const getDefaultDateRange = () => {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(now.getMonth() - 3);
  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return {
    startDate: toISO(past),
    endDate: toISO(now)
  };
};

export default function PurchasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Use the centralised permission guard instead of a raw role check, so that fine-grained
  // permissions (set per user via the Permissions panel) are respected for 'purchases'
  const { hasPermission, hasAnyPermission } = usePermissionGuard();

  useEffect(() => {
    if (!hasAnyPermission('purchases')) {
      toast.error("Vous n'avez pas l'autorisation d'accéder aux achats.");
      router.replace('/dashboard');
    }
  }, [hasAnyPermission, router]);

  // Search & Expansion States
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Deep Search Panel & Execution States
  const [isDeepSearchOpen, setIsDeepSearchOpen] = useState(false);
  const [isDeepSearchActive, setIsDeepSearchActive] = useState(false);

  // Deep Search Criteria States
  const [deepSearchRef, setDeepSearchRef] = useState('');
  const [deepSearchSupplierRef, setDeepSearchSupplierRef] = useState('');
  const [deepSearchSupplierId, setDeepSearchSupplierId] = useState<string>('all');
  const [deepSearchArticle, setDeepSearchArticle] = useState<Article | null>(null);
  const [articleSearchTerm, setArticleSearchTerm] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);
  const [deepSearchStartDate, setDeepSearchStartDate] = useState(() => getDefaultDateRange().startDate);
  const [deepSearchEndDate, setDeepSearchEndDate] = useState(() => getDefaultDateRange().endDate);

  // Submitted criteria driving the server-side React Query hook
  const [activeSearchCriteria, setActiveSearchCriteria] = useState<PurchaseSearchFilter>({
    startDate: `${getDefaultDateRange().startDate}T00:00:00Z`,
    endDate: `${getDefaultDateRange().endDate}T23:59:59Z`,
  });

  const [deepSearchPage, setDeepSearchPage] = useState(1);
  const [deepSearchPageSize, setDeepSearchPageSize] = useState(15);

  // Month & Year Filter State (initialized to current period)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const selectedMonthIdx = currentDate.getMonth(); // 0-11
  const selectedYear = currentDate.getFullYear();

  // Day filter state - default to 0 (meaning all days of the month are listed)
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Supplier filter state - default to "all" (client-side filtering)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // Active Tab: Commandes, Réceptions, Factures, Avoirs
  const [activeTab, setActiveTab] = useState<string>('receipt');

  // Selected Receipts (BRs) for Batch Invoicing
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<number[]>([]);

  // Modals & Details State
  const [selectedDocIdForDetail, setSelectedDocIdForDetail] = useState<number | null>(null);
  const [docForRS, setDocForRS] = useState<Document | null>(null);
  const [invoiceForCreditNote, setInvoiceForCreditNote] = useState<Document | null>(null);
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPrintListModalOpen, setIsPrintListModalOpen] = useState(false);
  // Controls visibility of the RS (Holding Tax) list side-panel
  const [isRsPanelOpen, setIsRsPanelOpen] = useState(false);

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
      case 'return':
        return DocumentTypes.supplierMerchandiseReturn;
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

  // Fetch catalog articles for Deep Search article/merchandise picker
  const { data: rawArticles = [] } = useArticles();
  const allArticles = useMemo(
    () => rawArticles.filter(art => Number(art.type) !== ArticleType.Service),
    [rawArticles]
  );

  // Filtered articles list based on user search term in Deep Search panel
  const filteredArticlesForSearch = useMemo(() => {
    if (!articleSearchTerm.trim()) return allArticles;
    const term = articleSearchTerm.toLowerCase();
    return allArticles.filter(
      (a: Article) =>
        a.reference.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term))
    );
  }, [allArticles, articleSearchTerm]);

  // Server-side Deep Search query (executes when isDeepSearchActive is true)
  const {
    data: deepSearchData,
    isLoading: isDeepSearchLoading,
    refetch: refetchDeepSearch
  } = usePurchaseDeepSearch(
    {
      ...activeSearchCriteria,
      documentType: docType,
      page: deepSearchPage,
      pageSize: deepSearchPageSize
    },
    isDeepSearchActive
  );

  // Synchronize active tab document type with active Deep Search criteria
  useEffect(() => {
    if (isDeepSearchActive) {
      setDeepSearchPage(1);
      setActiveSearchCriteria((prev) => ({
        ...prev,
        documentType: tabToDocType(activeTab)
      }));
    }
  }, [activeTab, isDeepSearchActive]);

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
        if (isDeepSearchActive) {
          refetchDeepSearch();
        } else {
          refetch();
        }
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

  // Client-Side filtering: search terms + supplier drop-down selection (used in default month mode)
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

  // Active documents displayed in the table (switches between Deep Search server results and month-filtered)
  const displayedDocuments = useMemo(() => {
    if (isDeepSearchActive) {
      return deepSearchData?.items || [];
    }
    return filteredDocuments;
  }, [isDeepSearchActive, deepSearchData, filteredDocuments]);

  // Unified loading state
  const isListLoading = isDeepSearchActive ? isDeepSearchLoading : isLoading;

  // Total count across all pages or current month
  const totalDocumentsCount = isDeepSearchActive ? (deepSearchData?.totalCount || 0) : filteredDocuments.length;

  // Deep Search action handlers
  const handleExecuteDeepSearch = () => {
    if (deepSearchStartDate && deepSearchEndDate && deepSearchStartDate > deepSearchEndDate) {
      toast.error('La date de début ne peut pas être supérieure à la date de fin.');
      return;
    }

    setDeepSearchPage(1);
    setActiveSearchCriteria({
      reference: deepSearchRef.trim() || undefined,
      supplierReference: deepSearchSupplierRef.trim() || undefined,
      supplierId: deepSearchSupplierId !== 'all' ? Number(deepSearchSupplierId) : undefined,
      articleId: deepSearchArticle ? deepSearchArticle.id : undefined,
      startDate: deepSearchStartDate ? `${deepSearchStartDate}T00:00:00Z` : undefined,
      endDate: deepSearchEndDate ? `${deepSearchEndDate}T23:59:59Z` : undefined,
      documentType: docType
    });
    setIsDeepSearchActive(true);
    toast.success('Recherche avancée exécutée.');
  };

  const handleResetDeepSearch = () => {
    const def = getDefaultDateRange();
    setDeepSearchRef('');
    setDeepSearchSupplierRef('');
    setDeepSearchSupplierId('all');
    setDeepSearchArticle(null);
    setArticleSearchTerm('');
    setIsArticleDropdownOpen(false);
    setDeepSearchStartDate(def.startDate);
    setDeepSearchEndDate(def.endDate);
    setDeepSearchPage(1);

    setActiveSearchCriteria({
      startDate: `${def.startDate}T00:00:00Z`,
      endDate: `${def.endDate}T23:59:59Z`,
      documentType: docType
    });
    setIsDeepSearchActive(false);
    toast.info('Critères réinitialisés au mode standard.');
  };

  const handleExitDeepSearch = () => {
    setIsDeepSearchActive(false);
  };

  // Compute live aggregates of selected receipts for batch validation
  const selectedReceipts = useMemo(() => {
    return displayedDocuments.filter((doc) => selectedReceiptIds.includes(doc.id));
  }, [displayedDocuments, selectedReceiptIds]);

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

  // Selected supplier name for display in SelectTrigger (Standard filter)
  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === 'all') return 'Tous les Fournisseurs';
    const found = suppliers.find((s: any) => s.id.toString() === selectedSupplierId);
    return found ? (found.name || `${found.firstname || ''} ${found.lastname || ''}`) : 'Tous les Fournisseurs';
  }, [selectedSupplierId, suppliers]);

  // Selected supplier name for Deep Search SelectTrigger
  const deepSearchSupplierName = useMemo(() => {
    if (deepSearchSupplierId === 'all') return 'Tous les Fournisseurs';
    const found = suppliers.find((s: any) => s.id.toString() === deepSearchSupplierId);
    return found ? (found.name || `${found.firstname || ''} ${found.lastname || ''}`) : 'Tous les Fournisseurs';
  }, [deepSearchSupplierId, suppliers]);

  // Dynamic KPI counters tailored to active workspace and tab calculations
  const kpiData = useMemo(() => {
    const list = displayedDocuments;
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
  }, [displayedDocuments, activeTab]);

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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestion des Achats
            </h1>
            <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
              Pilotez vos commandes, réceptions, factures et avoirs fournisseurs.
            </p>
          </div>

          <div className="flex flex-wrap lg:justify-end items-center gap-3 shrink-0">
            {/* Approbations link — only admin-level users should access approval workflows */}
            {hasPermission('purchases', 'canAdd') && (
              <Link href="/purchases/approvals" passHref>
                <Button
                  variant="outline"
                  className="h-11 border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
                >
                  <Gavel className="w-4 h-4 text-amber-700 animate-pulse" /> Approbations
                </Button>
              </Link>
            )}
            <Link href="/purchases/payments" passHref>
              <Button
                variant="outline"
                className="h-11 border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
              >
                <Coins className="w-4 h-4" /> Règlements Fournisseurs
              </Button>
            </Link>
            {/* Opens the RS list side-panel for the current accounting period */}
            <Button
              onClick={() => setIsRsPanelOpen(true)}
              variant="outline"
              className="h-11 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50 gap-2 flex items-center transition-all duration-300"
            >
              <Landmark className="w-4 h-4" /> Retenues à la Source
            </Button>
            <Button
              onClick={() => setIsPrintListModalOpen(true)}
              variant="outline"
              className="h-11 rounded-xl border-amber-900/20 text-amber-900 font-bold hover:bg-amber-50 gap-2 flex items-center transition-all duration-300"
            >
              <Printer className="w-4 h-4" /> Imprimer la liste
            </Button>
            {/* Deep Search Toggle Button */}
            <Button
              onClick={() => setIsDeepSearchOpen((prev) => !prev)}
              variant="outline"
              className={cn(
                "h-11 rounded-xl font-bold gap-2 flex items-center transition-all duration-300",
                isDeepSearchActive
                  ? "bg-amber-900 text-white border-amber-900 hover:bg-amber-950 shadow-md shadow-amber-900/20"
                  : isDeepSearchOpen
                    ? "bg-amber-50 text-amber-950 border-amber-900/40"
                    : "border-amber-900/20 text-amber-900 hover:bg-amber-50"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>Recherche Avancée</span>
              {isDeepSearchActive && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-amber-950 text-[10px] font-mono font-bold leading-none">
                  Actif
                </span>
              )}
            </Button>
            {/* Primary create dropdown — hidden unless user has canAdd permission on purchases */}
            {hasPermission('purchases', 'canAdd') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-11 bg-amber-900 text-white hover:bg-amber-950 font-bold shadow-lg shadow-amber-900/10 gap-2 flex items-center transition-all duration-300">
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
                    <RotateCcw className="w-4 h-4 text-amber-700" /> Avoir Financier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/purchases/return/new')} className="font-bold text-slate-800 gap-2 cursor-pointer">
                    <RotateCcw className="w-4 h-4 text-amber-700" /> Retour Marchandise
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Deep Search Collapsible Panel */}
        <AnimatePresence>
          {isDeepSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Card className="border border-amber-900/20 shadow-xl shadow-amber-950/5 rounded-2xl bg-white overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-corp-blue-950 via-corp-blue-900 to-amber-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight">Recherche Avancée — Achats</h3>
                      <p className="text-xs text-amber-200/80 font-medium">
                        Filtrez vos factures et documents par référence, fournisseur, marchandise/article et période
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDeepSearchActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetDeepSearch}
                        className="text-xs text-amber-200 hover:text-white hover:bg-white/10 h-8 rounded-lg gap-1.5 font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsDeepSearchOpen(false)}
                      className="text-white hover:bg-white/10 h-8 w-8 p-0 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* 1. Référence Elance */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-700" /> N° Facture / Réf Elance
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Ex: FA-2026-00125 ou 00125..."
                          value={deepSearchRef}
                          onChange={(e) => setDeepSearchRef(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleExecuteDeepSearch(); }}
                          className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:border-amber-900 pr-8"
                        />
                        {deepSearchRef && (
                          <button
                            type="button"
                            onClick={() => setDeepSearchRef('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Référence Fournisseur */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-700" /> Réf. Facture Fournisseur
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Ex: FOU-45872 ou 45872..."
                          value={deepSearchSupplierRef}
                          onChange={(e) => setDeepSearchSupplierRef(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleExecuteDeepSearch(); }}
                          className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:border-amber-900 pr-8"
                        />
                        {deepSearchSupplierRef && (
                          <button
                            type="button"
                            onClick={() => setDeepSearchSupplierRef('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. Fournisseur */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-700" /> Fournisseur
                      </label>
                      <Select value={deepSearchSupplierId} onValueChange={(val) => setDeepSearchSupplierId(val || 'all')}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:ring-amber-900">
                          <SelectValue placeholder="Tous les fournisseurs">
                            {deepSearchSupplierName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl max-h-60">
                          <SelectItem value="all" className="text-xs font-bold">
                            Tous les Fournisseurs
                          </SelectItem>
                          {suppliers.map((s: any) => {
                            const name = s.name || `${s.firstname || ''} ${s.lastname || ''}`;
                            return (
                              <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                                {name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 4. Marchandise / Article Filter */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-700" /> Marchandise / Article
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Rechercher par référence ou nom d'article..."
                          value={deepSearchArticle ? `${deepSearchArticle.reference} - ${deepSearchArticle.description || ''}` : articleSearchTerm}
                          onChange={(e) => {
                            setArticleSearchTerm(e.target.value);
                            if (deepSearchArticle) setDeepSearchArticle(null);
                            setIsArticleDropdownOpen(true);
                          }}
                          onFocus={() => setIsArticleDropdownOpen(true)}
                          className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:border-amber-900 pr-8"
                        />
                        {(deepSearchArticle || articleSearchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeepSearchArticle(null);
                              setArticleSearchTerm('');
                              setIsArticleDropdownOpen(false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Searchable Article Dropdown */}
                      {isArticleDropdownOpen && filteredArticlesForSearch.length > 0 && !deepSearchArticle && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-xl z-[999] divide-y divide-slate-100">
                          {filteredArticlesForSearch.slice(0, 10).map((art) => (
                            <button
                              key={art.id}
                              type="button"
                              onClick={() => {
                                setDeepSearchArticle(art);
                                setIsArticleDropdownOpen(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-amber-50/60 transition-colors flex items-center justify-between"
                            >
                              <div className="truncate mr-2">
                                <span className="text-xs font-mono font-bold text-slate-900 block">{art.reference}</span>
                                <span className="text-[10px] text-slate-400 block truncate">{art.description || '--'}</span>
                              </div>
                              <Badge variant="outline" className="text-[9px] uppercase shrink-0 font-mono">
                                {art.unit || 'Pcs'}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5. Date Début */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" /> Période : Date Début
                      </label>
                      <Input
                        type="date"
                        value={deepSearchStartDate}
                        onChange={(e) => setDeepSearchStartDate(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:border-amber-900 font-mono"
                      />
                    </div>

                    {/* 6. Date Fin */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" /> Période : Date Fin
                      </label>
                      <Input
                        type="date"
                        value={deepSearchEndDate}
                        onChange={(e) => setDeepSearchEndDate(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:border-amber-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Search / Reset Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] font-mono text-slate-400">
                      Période par défaut : année en cours + 3 derniers mois (combinable avec tous les filtres)
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetDeepSearch}
                        className="h-10 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 flex-1 sm:flex-none gap-1.5 px-4"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Réinitialiser
                      </Button>
                      <Button
                        type="button"
                        onClick={handleExecuteDeepSearch}
                        className="h-10 rounded-xl text-xs font-bold bg-amber-900 hover:bg-amber-950 text-white shadow-md shadow-amber-950/10 flex-1 sm:flex-none gap-1.5 px-6"
                      >
                        <Search className="w-3.5 h-3.5" /> Lancer la recherche
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Period Navigator Card */}
        <Card className="border-slate-100 shadow-md shadow-slate-900/5 rounded-xl bg-white overflow-hidden border">
          <div className="px-6 py-4 bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="text-corp-blue-800 hover:bg-corp-blue-100 hover:text-corp-blue-950 h-9 w-9 transition-colors rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-left">
                <h2 className="text-xl font-extrabold text-corp-blue-950 tracking-tight">
                  {MONTHS[selectedMonthIdx]} {selectedYear}
                </h2>
                <p className="text-[10px] font-bold text-corp-blue-700/80 uppercase tracking-widest font-mono">
                  Période d&apos;activité comptable
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="text-corp-blue-800 hover:bg-corp-blue-100 hover:text-corp-blue-950 h-9 w-9 transition-colors rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Day of Month Filter Bar */}
            <div className="flex items-center gap-2 bg-slate-850/50 p-1.5 rounded-2xl border border-corp-blue-100 overflow-x-auto max-w-full">
              <Button
                variant={selectedDay === 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedDay(0)}
                className={cn(
                  'rounded-xl h-8 px-4 text-xs font-bold font-mono transition-all',
                  selectedDay === 0
                    ? 'bg-amber-700 text-white hover:bg-amber-800'
                    : 'text-slate-600 hover:text-white hover:bg-white/5'
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
              <Card className="rounded-[20px] border-slate-150 shadow-sm bg-white p-5 space-y-2 border border-dashed col-span-3 flex items-center justify-center text-xs text-slate-400 italic">
                Activez l&apos;onglet Factures pour voir le détail des règlements et avoirs.
              </Card>
            </>
          )}
        </div>

        {/* Workspace Card: Search filters & dynamic data table */}
        <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-xl overflow-hidden bg-white border">
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
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-4 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 group"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Commandes</span>
                    {hasPermission('purchases', 'canAdd') && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nouvelle Commande Fournisseur"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/purchases/order/new');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            router.push('/purchases/order/new');
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-amber-900/60 hover:bg-amber-800 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer ml-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="receipt"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-4 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 group"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Réceptions / BR</span>
                    {hasPermission('purchases', 'canAdd') && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nouveau Bon de Réception (BR)"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/purchases/receipt/new');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            router.push('/purchases/receipt/new');
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-amber-900/60 hover:bg-amber-800 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer ml-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="invoice"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-4 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 group"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Factures</span>
                    {hasPermission('purchases', 'canAdd') && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nouvelle Facture Fournisseur"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/purchases/invoice/new');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            router.push('/purchases/invoice/new');
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-amber-900/60 hover:bg-amber-800 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer ml-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="credit-note"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-4 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 group"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Avoir Financier</span>
                    {hasPermission('purchases', 'canAdd') && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nouvel Avoir Financier"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceForCreditNote(null);
                          setIsCreditNoteModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setInvoiceForCreditNote(null);
                            setIsCreditNoteModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-amber-900/60 hover:bg-amber-800 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer ml-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="return"
                    className="rounded-xl h-9 font-bold text-xs tracking-wide px-4 data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 group"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retour Marchandise</span>
                    {hasPermission('purchases', 'canAdd') && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nouveau Retour Marchandise"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/purchases/return/new');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            router.push('/purchases/return/new');
                          }
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-md text-amber-900/60 hover:bg-amber-800 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer ml-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
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
                    <span>{totalDocumentsCount} Document(s) trouvé(s)</span>
                  </div>
                </div>
              </div>

              {/* Active Criteria Chips Bar when Deep Search is running */}
              {isDeepSearchActive && (
                <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Search className="w-3.5 h-3.5 text-amber-700" /> Filtres actifs :
                    </span>
                    {activeSearchCriteria.reference && (
                      <Badge className="bg-white border-amber-300 text-amber-950 text-xs font-mono font-bold gap-1 py-1 shadow-sm">
                        <span>Réf: {activeSearchCriteria.reference}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            setDeepSearchRef('');
                            setActiveSearchCriteria((prev) => ({ ...prev, reference: undefined }));
                          }}
                        />
                      </Badge>
                    )}
                    {activeSearchCriteria.supplierReference && (
                      <Badge className="bg-white border-amber-300 text-amber-950 text-xs font-mono font-bold gap-1 py-1 shadow-sm">
                        <span>Réf Fourn: {activeSearchCriteria.supplierReference}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            setDeepSearchSupplierRef('');
                            setActiveSearchCriteria((prev) => ({ ...prev, supplierReference: undefined }));
                          }}
                        />
                      </Badge>
                    )}
                    {activeSearchCriteria.supplierId && (
                      <Badge className="bg-white border-amber-300 text-amber-950 text-xs font-mono font-bold gap-1 py-1 shadow-sm">
                        <span>Fournisseur: {deepSearchSupplierName}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            setDeepSearchSupplierId('all');
                            setActiveSearchCriteria((prev) => ({ ...prev, supplierId: undefined }));
                          }}
                        />
                      </Badge>
                    )}
                    {activeSearchCriteria.articleId && deepSearchArticle && (
                      <Badge className="bg-white border-amber-300 text-amber-950 text-xs font-mono font-bold gap-1 py-1 shadow-sm">
                        <span>Article: {deepSearchArticle.reference}</span>
                        <X
                          className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            setDeepSearchArticle(null);
                            setActiveSearchCriteria((prev) => ({ ...prev, articleId: undefined }));
                          }}
                        />
                      </Badge>
                    )}
                    {deepSearchStartDate && deepSearchEndDate && (
                      <Badge className="bg-white border-amber-300 text-amber-950 text-xs font-mono font-bold gap-1 py-1 shadow-sm">
                        <CalendarRange className="w-3.5 h-3.5 text-amber-700 mr-0.5" />
                        <span>Du {deepSearchStartDate} au {deepSearchEndDate}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleExitDeepSearch}
                      className="h-7 text-xs text-slate-600 hover:text-slate-900 font-bold px-2.5 rounded-lg hover:bg-white/60"
                    >
                      Quitter la recherche
                    </Button>
                  </div>
                </div>
              )}
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
                              displayedDocuments.length > 0 &&
                              selectedReceiptIds.length === displayedDocuments.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReceiptIds(displayedDocuments.map((d) => d.id));
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

                      {(activeTab === 'invoice' || activeTab === 'receipt' || activeTab === 'return') && (
                        <th className="p-4">{activeTab === 'invoice' ? 'Réf. Fournisseur' : activeTab === 'return' ? 'Réf. Retour / Origine' : 'Réf. BL Fournisseur'}</th>
                      )}

                      <th className="p-4">Date</th>
                      <th className="p-4">Fournisseur</th>
                      <th className="p-4 text-right">Total HT</th>
                      <th className="p-4 text-right">Total TTC</th>
                      {activeTab === 'invoice' && <th className="p-4 text-right">Paiement</th>}
                      <th className="p-4 text-center">Statut</th>

                      {activeTab === 'receipt' && <th className="p-4 text-center">Facturation</th>}
                      {activeTab === 'invoice' && <th className="p-4 text-center">Retenue (RS)</th>}

                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isListLoading ? (
                      <tr>
                        <td
                          colSpan={activeTab === 'invoice' ? 11 : activeTab === 'receipt' ? 10 : (activeTab === 'order' || activeTab === 'return') ? 8 : 7}
                          className="py-24 text-center text-slate-400 italic"
                        >
                          Chargement des documents d&apos;achat en cours...
                        </td>
                      </tr>
                    ) : displayedDocuments.length > 0 ? (
                      displayedDocuments.map((item) => {
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
                                  {item.docnumber || 'En cours'}
                                </span>
                              </td>

                              {(activeTab === 'invoice' || activeTab === 'receipt' || activeTab === 'return') && (
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
                                      `${item.counterpart?.firstname || ''} ${item.counterpart?.lastname || ''
                                      }`}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 text-right font-mono font-medium">
                                {fmt(item.total_ht_net_doc || 0)}
                              </td>

                              <td className="p-4 text-right">
                                <span className="font-mono font-bold text-amber-950 block">
                                  {fmt(item.total_net_payable ?? item.total_net_ttc ?? 0)}
                                </span>
                                {item.total_net_payable !== undefined && item.total_net_payable !== item.total_net_ttc && (
                                  <div className="flex flex-col items-end gap-1 mt-1">
                                    <span className="text-[10px] text-slate-400 font-mono leading-none">
                                      TTC: {fmt(item.total_net_ttc ?? 0)}
                                    </span>
                                    <span className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                                      item.holdingtax?.issigned
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                    )}>
                                      RS {item.holdingtax?.taxpercentage}%
                                      {item.holdingtax?.issigned && " ✓"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {activeTab === 'invoice' && (
                                <td className="p-4 text-right space-y-1">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                                      Payé
                                    </span>
                                    <span className="font-mono text-xs font-bold text-emerald-800">
                                      {fmt(item.total_paid ?? 0)}
                                    </span>
                                  </div>
                                  {(item.total_credit_notes ?? 0) > 0 && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600">
                                        Avoir
                                      </span>
                                      <span className="font-mono text-xs font-bold text-rose-700">
                                        -{fmt(item.total_credit_notes ?? 0)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                      Reste
                                    </span>
                                    <span className={cn(
                                      "font-mono text-xs font-bold",
                                      (item.remaining_balance ?? 0) > 0 ? "text-red-700" : "text-emerald-700"
                                    )}>
                                      {fmt(item.remaining_balance ?? 0)}
                                    </span>
                                  </div>
                                </td>
                              )}

                              <td className="p-4 text-center">
                                <Badge
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 font-bold text-[9px] tracking-wide uppercase',
                                    (item.docstatus === DocStatus.Validated || item.docstatus === DocStatus.Completed || item.docstatus === DocStatus.Approved || item.docstatus === DocStatus.Delivered)
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                                      : item.docstatus === DocStatus.PendingApproval
                                        ? 'bg-blue-50 text-blue-800 border border-blue-200/50'
                                        : item.docstatus === DocStatus.Rejected
                                          ? 'bg-rose-50 text-rose-800 border border-rose-200/50'
                                          : item.docstatus === DocStatus.PartiallyDelivered
                                            ? 'bg-teal-50 text-teal-800 border border-teal-200/50'
                                            : (activeTab === 'receipt' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50' : activeTab === 'return' ? 'bg-purple-50 text-purple-800 border border-purple-200/50' : 'bg-amber-50 text-amber-800 border border-amber-200/50')
                                  )}
                                >
                                  {item.docstatus === DocStatus.Validated || item.docstatus === DocStatus.Completed
                                    ? 'Validé'
                                    : item.docstatus === DocStatus.Delivered
                                      ? 'Livrée'
                                      : item.docstatus === DocStatus.PartiallyDelivered
                                        ? 'Partielle'
                                        : item.docstatus === DocStatus.Approved
                                          ? 'Approuvé'
                                          : item.docstatus === DocStatus.PendingApproval
                                            ? 'En attente'
                                            : item.docstatus === DocStatus.Rejected
                                              ? 'Rejetée'
                                              : (activeTab === 'receipt' ? 'Livrée' : activeTab === 'return' ? 'Retourné' : 'En cours')}
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
                                  {item.withholdingtax && item.holdingtax ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Badge className={cn(
                                        "rounded-full px-2.5 py-0.5 font-bold text-[9px] tracking-wide uppercase",
                                        item.holdingtax.issigned
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                                          : "bg-amber-50 text-amber-800 border border-amber-200/50"
                                      )}>
                                        RS {item.holdingtax.taxpercentage}%
                                      </Badge>
                                      <span className={cn(
                                        "text-[9px] font-bold",
                                        item.holdingtax.issigned ? "text-emerald-600" : "text-amber-700"
                                      )}>
                                        {item.holdingtax.issigned ? "✓ Signé" : "En attente"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic font-medium">—</span>
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

                                      {/* Edit action — only for receipts */}
                                      {activeTab === 'receipt' && !item.isinvoiced && hasPermission('purchases', 'canUpdate') && (
                                        <DropdownMenuItem
                                          onClick={() => router.push(`/purchases/receipt/${item.id}/edit`)}
                                          className="gap-2 font-bold text-slate-800 cursor-pointer"
                                        >
                                          <Edit className="w-4 h-4 text-slate-500" /> Modifier BR
                                        </DropdownMenuItem>
                                      )}


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

                                       {/* Return Merchandise trigger for Receipt and Invoice */}
                                       {hasPermission('purchases', 'canAdd') && (activeTab === 'receipt' || activeTab === 'invoice') && (
                                         <DropdownMenuItem
                                           onClick={() => {
                                             if (activeTab === 'receipt') {
                                               router.push(`/purchases/return/new?fromReceiptId=${item.id}`);
                                             } else {
                                               router.push(`/purchases/return/new?fromInvoiceId=${item.id}`);
                                             }
                                           }}
                                           className="gap-2 font-bold text-amber-800 cursor-pointer hover:bg-amber-50"
                                         >
                                           <RotateCcw className="w-4 h-4 text-amber-700" /> Retour Marchandise
                                         </DropdownMenuItem>
                                       )}

                                       {/* Edit return document */}
                                       {activeTab === 'return' && hasPermission('purchases', 'canUpdate') && (
                                         <DropdownMenuItem
                                           onClick={() => router.push(`/purchases/return/${item.id}/edit`)}
                                           className="gap-2 font-bold text-slate-800 cursor-pointer hover:bg-slate-50"
                                         >
                                           <Edit className="w-4 h-4 text-slate-500" /> Modifier Retour
                                         </DropdownMenuItem>
                                       )}

                                      {/* Delete action — only for users with canDelete on purchases */}
                                      {hasPermission('purchases', 'canDelete') && (
                                        <DropdownMenuItem
                                          onClick={() => handleDelete(item.id)}
                                          className="gap-2 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" /> Supprimer
                                        </DropdownMenuItem>
                                      )}
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
                          colSpan={activeTab === 'invoice' ? 11 : activeTab === 'receipt' ? 10 : (activeTab === 'order' || activeTab === 'return') ? 8 : 7}
                          className="py-24 text-center text-slate-400 italic font-medium"
                        >
                          {isDeepSearchActive
                            ? 'Aucun document d’achat ne correspond à vos critères de recherche avancée.'
                            : 'Aucun document trouvé pour la période sélectionnée.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-side Table Pagination for Deep Search */}
              {isDeepSearchActive && (deepSearchData?.totalCount || 0) > 0 && (
                <TablePagination
                  currentPage={deepSearchPage}
                  totalItems={deepSearchData?.totalCount || 0}
                  pageSize={deepSearchPageSize}
                  onPageChange={(page) => setDeepSearchPage(page)}
                  onPageSizeChange={(size) => {
                    setDeepSearchPageSize(size);
                    setDeepSearchPage(1);
                  }}
                  pageSizeOptions={[15, 30, 50, 100]}
                />
              )}
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

      {/* RS Withholding Tax Modal Dialog (TEJ Integration) */}
      {docForRS && (
        <TejRsDialog
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

      {/* Print List Dialog */}
      <PrintVariantDialog
        isOpen={isPrintListModalOpen}
        onClose={() => setIsPrintListModalOpen(false)}
        docType="document-list"
        documentsList={filteredDocuments}
        listContext="purchases"
        listTitle={
          activeTab === 'invoice' ? 'Factures' :
          activeTab === 'receipt' ? 'Bons de Réception' :
          activeTab === 'order' ? 'Commandes' :
          activeTab === 'return' ? 'Retours Fournisseurs' : 'Avoirs'
        }
      />

      {/* RS (Holding Tax) list side-panel — filterable by month with dual search */}
      <HoldingTaxListPanel
        isOpen={isRsPanelOpen}
        onClose={() => setIsRsPanelOpen(false)}
      />
    </DashboardLayout>
  );
}



