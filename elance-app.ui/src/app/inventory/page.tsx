'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { useInventories, useValidateInventory, useCreateInventory } from '@/hooks/use-inventory';
import { useStockBySite } from '@/hooks/use-stock';
import { UncountedStockDialog } from '@/components/inventory/uncounted-stock-dialog';
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
  SearchCode
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
import { cn } from '@/lib/utils';

function InventoryListContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: inventories = [], isLoading } = useInventories();
  const { mutate: validateInventory, isPending: isValidating } = useValidateInventory();
  
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [inventoryToValidate, setInventoryToValidate] = useState<Document | null>(null);
  const [isUncountedDialogOpen, setIsUncountedDialogOpen] = useState(false);

  const expandedInventory = inventories.find(inv => inv.id === expandedId);
  const { data: siteStock = [], isLoading: isLoadingStock } = useStockBySite(
    expandedInventory?.sales_site ? { id: expandedInventory.sales_site.id } : null
  );

  const isManager = user?.role?.toLowerCase() === 'manager' || user?.role?.toLowerCase() === 'admin';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/stock')}
            className="h-10 w-10 p-0 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-850"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tracking-tight flex items-center gap-2">
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
            onClick={() => setIsUncountedDialogOpen(true)}
            className="h-11 px-5 bg-white hover:bg-stone-50 text-stone-900 border-stone-200 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-50 dark:hover:bg-stone-800 rounded-xl gap-2 font-semibold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <SearchCode className="h-4 w-4 text-amber-500" />
            Vérifier Oublis
          </Button>
          <Button
            onClick={() => router.push('/inventory/new')}
            className="h-11 px-5 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-900 rounded-xl gap-2 font-semibold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Nouvel Inventaire
          </Button>
        </div>
      </div>

      {inventories.length === 0 ? (
        <Card className="bg-stone-50/50 dark:bg-stone-900/10 border-dashed border-2 border-stone-200 dark:border-stone-800">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <ClipboardList className="h-12 w-12 text-stone-300 dark:text-stone-700" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider font-serif">Aucun inventaire</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Commencez par ajouter un nouvel inventaire physique pour ajuster vos stocks.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/inventory/new')}
              className="mt-4 text-xs font-bold uppercase tracking-wider border-stone-200 dark:border-stone-800"
            >
              Créer un inventaire
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                  <th className="p-4 pl-6">Référence</th>
                  <th className="p-4">Site de Vente</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                {inventories.map((inv) => {
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
                              className="h-7 w-7 p-0 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400"
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
                            <td colSpan={5} className="p-0 border-b border-stone-200/50 dark:border-stone-800">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden bg-stone-50/80 dark:bg-stone-900/30"
                              >
                                <div className="p-6 space-y-4">
                                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Détails des articles</h4>
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
        </Card>
      )}

      {/* Validation Confirm Dialog */}
      <Dialog open={!!inventoryToValidate} onOpenChange={() => setInventoryToValidate(null)}>
        <DialogContent className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer la validation
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 pt-2 leading-relaxed">
              La validation de l'inventaire <strong>{inventoryToValidate?.docnumber}</strong> écrasera les quantités en stock actuelles par les valeurs comptées. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setInventoryToValidate(null)}
              className="text-xs font-bold uppercase tracking-wider border-stone-200 dark:border-stone-800"
              disabled={isValidating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider"
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
