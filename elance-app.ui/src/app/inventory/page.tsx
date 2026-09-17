'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { useInventories, useValidateInventory, useCreateInventory } from '@/hooks/use-inventory';
import { useStockBySite } from '@/hooks/use-stock';
import { UncountedStockDialog } from '@/components/inventory/uncounted-stock-dialog';
import { ExcelInventoryDialog } from '@/components/inventory/excel-inventory-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  PlusCircle, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Loader2,
  SearchCode,
  FileSpreadsheet,
  Pencil,
  Printer,
  Filter,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocStatus, Document } from '@/types/document';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { PrintVariantDialog } from '@/components/print/print-trigger-button';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Calculates the exact start and end date of the previous calendar month.
 * 
 * Why:
 * The requirement specifies that upon opening the inventory page, the view defaults to the previous calendar month.
 * Using JS Date mechanics:
 * - `new Date(year, month - 1, 1)` calculates the first day of the prior month.
 * - `new Date(year, month, 0)` calculates the last day of the prior month (day 0 wraps to previous month end).
 * Negative month values (e.g. month 0 - 1 in January) automatically decrement the year to December of the previous year.
 * 
 * Returns strings formatted as 'yyyy-MM-dd' for HTML date inputs.
 */
function getDefaultPreviousMonthRange(): { start: string; end: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed: 0 = January, 8 = September

  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = new Date(currentYear, currentMonth, 0);

  return {
    start: format(firstDay, 'yyyy-MM-dd'),
    end: format(lastDay, 'yyyy-MM-dd')
  };
}

function InventoryListContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasAnyPermission } = usePermissionGuard();

  React.useEffect(() => {
    if (!hasAnyPermission('inventory')) {
      toast.error("Vous n'avez pas l'autorisation d'accéder à l'inventaire.");
      router.replace('/dashboard');
    }
  }, [hasAnyPermission, router]);

  // NOTE: C# API InventoryController.GetInventories() returns all non-deleted inventories without server-side filter params.
  // We perform client-side filtering on the returned collection to preserve backend contract and caching.
  const { data: inventories = [], isLoading } = useInventories();
  const { mutate: validateInventory, isPending: isValidating } = useValidateInventory();
  
  // Compute the default previous calendar month scope once upon mount
  const defaultDateRange = React.useMemo(() => getDefaultPreviousMonthRange(), []);

  // Filter 1: Show / Hide validated inventories (default: enabled)
  const [showValidated, setShowValidated] = useState<boolean>(true);

  // Filter 2 & 3: Date inputs state (bound to user date pickers)
  const [startDate, setStartDate] = useState<string>(defaultDateRange.start);
  const [endDate, setEndDate] = useState<string>(defaultDateRange.end);

  // Applied date filters (committed on "Appliquer" or "Réinitialiser")
  const [appliedStartDate, setAppliedStartDate] = useState<string>(defaultDateRange.start);
  const [appliedEndDate, setAppliedEndDate] = useState<string>(defaultDateRange.end);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [inventoryToValidate, setInventoryToValidate] = useState<Document | null>(null);
  const [isUncountedDialogOpen, setIsUncountedDialogOpen] = useState(false);
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [selectedInventoryForPrint, setSelectedInventoryForPrint] = useState<Document | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const handlePrintInventory = (inv: Document) => {
    setSelectedInventoryForPrint(inv);
    setIsPrintOpen(true);
  };

  const expandedInventory = inventories.find(inv => inv.id === expandedId);
  const { data: siteStock = [], isLoading: isLoadingStock } = useStockBySite(
    expandedInventory?.sales_site ? { id: expandedInventory.sales_site.id } : null
  );

  const isManager = user?.role?.toLowerCase() === 'manager' || user?.role?.toLowerCase() === 'admin';

  // Apply custom date filter with validation
  const handleApplyFilter = () => {
    // Validate that Date début <= Date fin
    if (startDate && endDate && startDate > endDate) {
      toast.error('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  // Reset filter scope to previous calendar month and re-enable validated records
  const handleResetFilter = () => {
    const range = getDefaultPreviousMonthRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setAppliedStartDate(range.start);
    setAppliedEndDate(range.end);
    setShowValidated(true);
    toast.info('Filtres réinitialisés au mois précédent.');
  };

  // Memoized filtered inventory collection according to status and date scope
  const filteredInventories = React.useMemo(() => {
    return inventories.filter((inv) => {
      // 1. Status Filter: Hide validated if showValidated is toggled off
      // NOTE: C# backend DocStatus enum: DocStatus.Validated = 12
      const isValidated = inv.docstatus === DocStatus.Validated;
      if (!showValidated && isValidated) {
        return false;
      }

      // 2. Date Scope Filter: Compare creation date to applied range
      if (!inv.creationdate) {
        return false;
      }

      const invDate = new Date(inv.creationdate);
      if (isNaN(invDate.getTime())) {
        return false;
      }

      // Convert to local YYYY-MM-DD string to avoid timezone day-shift errors
      const invDateStr = format(invDate, 'yyyy-MM-dd');

      if (appliedStartDate && invDateStr < appliedStartDate) {
        return false;
      }
      if (appliedEndDate && invDateStr > appliedEndDate) {
        return false;
      }

      return true;
    });
  }, [inventories, showValidated, appliedStartDate, appliedEndDate]);

  const handleValidate = () => {
    if (inventoryToValidate) {
      validateInventory(inventoryToValidate.id, {
        onSuccess: () => {
          setInventoryToValidate(null);
        }
      });
    }
  };

  const getDiffBadge = (counted: number, stock: number) => {
    const diff = counted - stock;
    const diffText = diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
    
    if (diff === 0) {
      return <Badge className="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 font-mono text-[10px]">{diffText}</Badge>;
    }
    if (diff > 0) {
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-mono text-[10px]">{diffText}</Badge>;
    }
    return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-mono text-[10px]">{diffText}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
          Chargement des inventaires...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/stock')}
            className="h-10 w-10 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-amber-500" />
              Inventaires Physiques
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 leading-normal">
              Gestion et validation des contrôles de stocks physiques.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsExcelDialogOpen(true)}
            className="h-11 px-5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 dark:hover:bg-slate-800 rounded-lg gap-2 font-semibold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-corp-blue-600" />
            Import / Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsUncountedDialogOpen(true)}
            className="h-11 px-5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 dark:hover:bg-slate-800 rounded-lg gap-2 font-semibold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <SearchCode className="h-4 w-4 text-amber-500" />
            Vérifier Oublis
          </Button>
          <Button
            onClick={() => router.push('/inventory/new')}
            className="h-11 px-5 bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-lg gap-2 font-semibold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Nouvel Inventaire
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Controls: Switch & Date Range Pickers */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 1. Afficher les inventaires validés Switch */}
            <div className="flex items-center space-x-2.5">
              <Switch
                id="filter-show-validated"
                checked={showValidated}
                onCheckedChange={setShowValidated}
              />
              <Label
                htmlFor="filter-show-validated"
                className="text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer select-none"
              >
                Afficher les inventaires validés
              </Label>
            </div>

            <div className="hidden sm:block h-4 w-px bg-stone-200 dark:bg-stone-800" />

            {/* 2 & 3. Custom Date Range Pickers */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-start-date" className="text-xs font-medium text-stone-500 dark:text-stone-400 whitespace-nowrap">
                  Date début :
                </Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="h-9 w-38 text-xs font-mono rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-stone-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="filter-end-date" className="text-xs font-medium text-stone-500 dark:text-stone-400 whitespace-nowrap">
                  Date fin :
                </Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="h-9 w-38 text-xs font-mono rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Right Controls: Actions & Count */}
          <div className="flex items-center gap-2 self-start sm:self-end lg:self-auto">
            <Button
              variant="default"
              size="sm"
              onClick={handleApplyFilter}
              className="h-9 px-4 bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider shadow-2xs gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Appliquer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilter}
              className="h-9 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 text-xs font-medium gap-1.5"
              title="Réinitialiser au mois précédent"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              Réinitialiser
            </Button>
            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono ml-1">
              ({filteredInventories.length} / {inventories.length})
            </span>
          </div>
        </div>
      </div>

      {inventories.length === 0 ? (
        <Card className="bg-stone-50/50 dark:bg-stone-900/10 border-dashed border-2 border-stone-200 dark:border-stone-800">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <ClipboardList className="h-12 w-12 text-stone-300 dark:text-stone-700" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">Aucun inventaire</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Commencez par ajouter un nouvel inventaire physique pour ajuster vos stocks.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/inventory/new')}
              className="mt-4 h-11 rounded-lg text-sm font-medium border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800"
            >
              Créer un inventaire
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm overflow-hidden">
          {filteredInventories.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <Filter className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Aucun inventaire trouvé
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  Aucun inventaire ne correspond à la période sélectionnée ou aux critères de filtrage.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="h-8 px-3 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 rounded-lg gap-1.5"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" />
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                    <th className="p-4 pl-6">Référence</th>
                    <th className="p-4">Site de Vente</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Créé par</th>
                    <th className="p-4 text-center">Statut</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                  {filteredInventories.map((inv) => {
                    const isExpanded = expandedId === inv.id;
                    const isValidated = inv.docstatus === DocStatus.Validated;
                  
                  return (
                    <React.Fragment key={inv.id}>
                      <tr 
                        className={cn(
                          "hover:bg-stone-50/30 transition-colors cursor-pointer",
                          isExpanded && "bg-stone-50/50 dark:bg-stone-900/50"
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      >
                        <td className="p-4 pl-6 font-mono font-bold text-stone-900 dark:text-stone-50">
                          {inv.docnumber || `INV-${inv.id}`}
                        </td>
                        <td className="p-4 text-stone-600 dark:text-stone-300">
                          {inv.sales_site?.address || '—'}
                        </td>
                        <td className="p-4 text-stone-500">
                          {format(new Date(inv.creationdate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </td>
                        <td className="p-4 text-stone-600 dark:text-stone-300">
                          {inv.appuser?.person 
                            ? `${inv.appuser.person.firstname || ''} ${inv.appuser.person.lastname || ''}`.trim() 
                            : (inv.appuser?.login || '—')}
                        </td>
                        <td className="p-4 text-center">
                          {isValidated ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[9px] uppercase font-bold tracking-wider">
                              Validé
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[9px] uppercase font-bold tracking-wider">
                              En attente
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintInventory(inv);
                              }}
                              className="h-7 text-[10px] uppercase font-bold tracking-wider border-corp-blue-200 text-corp-blue-700 hover:bg-corp-blue-50 dark:border-corp-blue-800 dark:text-corp-blue-300 dark:hover:bg-corp-blue-900/30 gap-1 shadow-2xs"
                              title="Imprimer / Exporter la fiche d'inventaire en PDF"
                            >
                              <Printer className="h-3 w-3 text-corp-blue-600" />
                              Imprimer
                            </Button>
                            {!isValidated && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/inventory/${inv.id}/edit`);
                                }}
                                className="h-7 text-[10px] uppercase font-bold tracking-wider border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 gap-1"
                              >
                                <Pencil className="h-3 w-3 text-slate-500" />
                                Éditer
                              </Button>
                            )}
                            {!isValidated && isManager && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInventoryToValidate(inv);
                                }}
                                className="h-7 text-[10px] uppercase font-bold tracking-wider border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                              >
                                Valider
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0 border-b border-stone-200/50 dark:border-stone-800">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden bg-stone-50/80 dark:bg-stone-900/30"
                              >
                                <div className="p-6 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Détails des articles</h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintInventory(inv);
                                      }}
                                      className="h-7 text-[10px] uppercase font-bold tracking-wider border-corp-blue-200 text-corp-blue-700 hover:bg-corp-blue-50 dark:border-corp-blue-800 dark:text-corp-blue-300 dark:hover:bg-corp-blue-900/30 gap-1.5"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-corp-blue-600" />
                                      Imprimer / PDF
                                    </Button>
                                  </div>
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="text-[10px] uppercase tracking-wider text-stone-500 border-b border-stone-200 dark:border-stone-800 pb-2">
                                        <th className="pb-2 font-medium w-1/3">Article</th>
                                        <th className="pb-2 font-medium">Ref Colis</th>
                                        <th className="pb-2 font-medium text-right">Stock Actuel</th>
                                        <th className="pb-2 font-medium text-right">Compté</th>
                                        <th className="pb-2 font-medium text-right">Différence</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                                      {inv.merchandises?.map((m: any, idx: number) => {
                                        // Match the merchandise line with the fetched real-time stock
                                        const matchedStock = siteStock.find(s => 
                                          s.articleId === m.article?.id && 
                                          s.packageReference === m.packagereference
                                        );
                                        const stockQty = matchedStock ? matchedStock.stockQuantity : 0;
                                        
                                        // Color logic for the row or text
                                        let diffClass = "text-stone-600 dark:text-stone-300";
                                        if (m.quantity < stockQty) diffClass = "text-amber-600 dark:text-amber-500 font-medium";
                                        if (m.quantity > stockQty) diffClass = "text-emerald-600 dark:text-emerald-500 font-medium";
                                        
                                        return (
                                          <tr key={idx} className={diffClass}>
                                            <td className="py-2.5">
                                              <div className="font-mono font-bold text-stone-900 dark:text-stone-100">{m.article?.reference}</div>
                                              <div className="text-[10px] text-stone-400 truncate max-w-xs">{m.article?.description}</div>
                                            </td>
                                            <td className="py-2.5 font-mono text-[11px]">{m.packagereference}</td>
                                            <td className="py-2.5 text-right font-mono text-stone-400">{stockQty.toFixed(3)}</td>
                                            <td className="py-2.5 text-right font-mono font-bold">{m.quantity?.toFixed(3)}</td>
                                            <td className="py-2.5 text-right">
                                              {getDiffBadge(m.quantity, stockQty)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {(!inv.merchandises || inv.merchandises.length === 0) && (
                                        <tr>
                                          <td colSpan={5} className="py-4 text-center text-stone-400 italic text-[10px]">
                                            Aucun article répertorié.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )}

      {/* Validation Confirm Dialog */}
      <Dialog open={!!inventoryToValidate} onOpenChange={() => setInventoryToValidate(null)}>
        <DialogContent className="sm:max-w-md w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Confirmer la validation
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-500 dark:text-stone-400 pt-2 leading-relaxed">
              La validation de l'inventaire <strong className="text-stone-800 dark:text-stone-200 font-semibold">{inventoryToValidate?.docnumber}</strong> écrasera les quantités en stock actuelles par les valeurs comptées. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setInventoryToValidate(null)}
              className="text-sm font-medium border-stone-200 dark:border-stone-800"
              disabled={isValidating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirmer Validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uncounted Stock Dialog */}
      <UncountedStockDialog 
        open={isUncountedDialogOpen} 
        onOpenChange={setIsUncountedDialogOpen}
        inventories={inventories}
      />

      <ExcelInventoryDialog 
        isOpen={isExcelDialogOpen}
        onClose={() => setIsExcelDialogOpen(false)}
      />

      {/* Print Registered Physical Inventory PDF Dialog */}
      <PrintVariantDialog
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setSelectedInventoryForPrint(null);
        }}
        docType="inventory"
        document={selectedInventoryForPrint}
      />
    </div>
  );
}

export default function InventoryListPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="py-24 flex flex-col justify-center items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Chargement...</span>
        </div>
      }>
        <InventoryListContent />
      </Suspense>
    </DashboardLayout>
  );
}

