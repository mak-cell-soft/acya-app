import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useStockBySite } from '@/hooks/use-stock';
import { useCreateInventory } from '@/hooks/use-inventory';
import { Document, DocStatus } from '@/types/document';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UncountedStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventories: Document[];
}

export function UncountedStockDialog({ open, onOpenChange, inventories }: UncountedStockDialogProps) {
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());

  const selectedInv = inventories.find(inv => inv.id.toString() === selectedInvId);
  const site = selectedInv?.sales_site;
  
  const { data: siteStock = [], isLoading: isLoadingStock } = useStockBySite(site ? { id: site.id } : null);
  const { mutate: createInventory, isPending: isCreating } = useCreateInventory();

  // Filter out stock that has been counted in the selected inventory
  const uncountedStocks = useMemo(() => {
    if (!selectedInv || !siteStock.length) return [];
    
    return siteStock.filter(stock => {
      if (stock.stockQuantity <= 0) return false; // Only care about positive stock that wasn't counted
      
      const isCounted = selectedInv.merchandises?.some((m: any) => 
        m.article?.id === stock.articleId && 
        m.packagereference === stock.packageReference
      );
      
      return !isCounted;
    });
  }, [selectedInv, siteStock]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStockIds(new Set(uncountedStocks.map(s => `${s.articleId}-${s.packageReference}`)));
    } else {
      setSelectedStockIds(new Set());
    }
  };

  const handleToggleStock = (stockKey: string, checked: boolean) => {
    const newSet = new Set(selectedStockIds);
    if (checked) newSet.add(stockKey);
    else newSet.delete(stockKey);
    setSelectedStockIds(newSet);
  };

  const handleGenerateZeroInventory = () => {
    if (!selectedInv || selectedStockIds.size === 0) return;

    const stocksToZero = uncountedStocks.filter(s => selectedStockIds.has(`${s.articleId}-${s.packageReference}`));
    
    const newDocument = {
      description: `Régularisation Oublis - Suite à l'inventaire ${selectedInv.docnumber || selectedInv.id}`,
      sales_site: selectedInv.sales_site,
      updatedbyid: selectedInv.updatedbyid,
      merchandises: stocksToZero.map(stock => ({
        article: { id: stock.articleId },
        packagereference: stock.packageReference,
        quantity: 0,
        description: 'Mise à zéro (non inventorié)',
        lisoflengths: []
      }))
    };

    createInventory(newDocument as any, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedInvId('');
        setSelectedStockIds(new Set());
      }
    });
  };

  const pendingInventories = inventories.filter(inv => inv.docstatus !== DocStatus.Validated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Vérifier le stock non inventorié
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500 pt-2">
            Sélectionnez un inventaire en cours. Le système identifiera les articles en stock qui n'ont pas été comptés dans cet inventaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Inventaire de référence
            </label>
            <Select value={selectedInvId} onValueChange={(val) => setSelectedInvId(val || '')}>
              <SelectTrigger className="w-full text-xs h-10">
                <SelectValue placeholder="Sélectionnez un inventaire...">
                  {selectedInv ? `${selectedInv.docnumber || `INV-${selectedInv.id}`} - ${selectedInv.sales_site?.address || 'Site inconnu'}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pendingInventories.map(inv => {
                  const displayText = `${inv.docnumber || `INV-${inv.id}`} - ${inv.sales_site?.address || 'Site inconnu'}`;
                  return (
                    <SelectItem key={inv.id} value={inv.id.toString()}>
                      {displayText}
                    </SelectItem>
                  );
                })}
                {pendingInventories.length === 0 && (
                  <SelectItem value="none" disabled>Aucun inventaire en cours</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedInvId && (
            <div className="mt-4 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <div className="bg-stone-50 dark:bg-stone-900/50 p-3 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Articles non comptés ({uncountedStocks.length})
                </span>
                {uncountedStocks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedStockIds.size === uncountedStocks.length && uncountedStocks.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <label htmlFor="select-all" className="text-[10px] uppercase font-bold text-stone-500 cursor-pointer">
                      Tout sélectionner
                    </label>
                  </div>
                )}
              </div>
              
              <div className="max-h-60 overflow-y-auto p-2">
                {isLoadingStock ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                  </div>
                ) : uncountedStocks.length === 0 ? (
                  <div className="text-center p-8 text-xs text-stone-500 italic">
                    Tout le stock existant a été compté dans cet inventaire.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {uncountedStocks.map(stock => {
                      const uniqueKey = `${stock.articleId}-${stock.packageReference}`;
                      return (
                      <div key={uniqueKey} className="flex items-center gap-3 p-2 hover:bg-stone-50 dark:hover:bg-stone-900 rounded-lg transition-colors">
                        <Checkbox 
                          id={`stock-${uniqueKey}`}
                          checked={selectedStockIds.has(uniqueKey)}
                          onCheckedChange={(checked) => handleToggleStock(uniqueKey, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`stock-${uniqueKey}`} className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100 cursor-pointer block truncate">
                            {stock.articleReference}
                          </label>
                          <div className="text-[10px] text-stone-500 font-mono">
                            Colis: {stock.packageReference} | Stock théorique: <span className="font-bold text-amber-600">{stock.stockQuantity.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold uppercase tracking-wider border-stone-200 dark:border-stone-800"
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerateZeroInventory}
            disabled={isCreating || selectedStockIds.size === 0}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Générer Inventaire de Mise à Zéro ({selectedStockIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
