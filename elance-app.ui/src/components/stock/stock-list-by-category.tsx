'use client';

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStockAll } from '@/hooks/use-stock';
import { stockService } from '@/services/components/stock.service';
import { Stock, StockCategoryGroup } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Building,
  Calendar,
  Layers,
  ChevronDown,
  Loader2,
  TreeDeciduous,
  FlameKindling
} from 'lucide-react';
import { toast } from 'sonner';

export function StockListByCategory() {
  const queryClient = useQueryClient();
  const { data: allStocks = [], isLoading, error } = useStockAll();

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Search input filtering
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog thresholds state
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [minStockValue, setMinStockValue] = useState<number>(0);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  // Group stocks by Category on frontend
  const groupedCategories = useMemo(() => {
    const groups: { [key: string]: { id: number; list: Stock[] } } = {};
    
    // Filter stocks first
    const q = searchQuery.toLowerCase().trim();
    const filtered = allStocks.filter(s => {
      if (!q) return true;
      const ref = s.merchandise?.article?.reference?.toLowerCase() || '';
      const desc = s.merchandise?.article?.description?.toLowerCase() || '';
      const pack = s.merchandise?.packagereference?.toLowerCase() || '';
      const site = s.site?.address?.toLowerCase() || s.site?.gov?.toLowerCase() || '';
      return ref.includes(q) || desc.includes(q) || pack.includes(q) || site.includes(q);
    });

    filtered.forEach(stock => {
      const categoryName = stock.merchandise?.article?.category?.description || 'Non classé';
      const categoryId = stock.merchandise?.article?.categoryid || 0;
      if (!groups[categoryName]) {
        groups[categoryName] = { id: categoryId, list: [] };
      }
      groups[categoryName].list.push(stock);
    });

    // Map to array & calculate unit totals
    return Object.entries(groups).map(([catName, info]) => {
      // Calculate distinct unit totals
      const totalsMap: { [unit: string]: number } = {};
      info.list.forEach(s => {
        const u = s.merchandise?.article?.unit || 'U';
        totalsMap[u] = (totalsMap[u] || 0) + s.quantity;
      });

      const unitTotals = Object.entries(totalsMap).map(([unit, total]) => ({
        unit,
        totalQuantity: total
      }));

      return {
        categoryName: catName,
        categoryId: info.id,
        stocks: info.list,
        unitTotals
      };
    });
  }, [allStocks, searchQuery]);

  // Handle setting thresholds
  const handleOpenThreshold = (stock: Stock) => {
    setSelectedStock(stock);
    setMinStockValue(stock.minimumstock || 0);
  };

  const handleSaveThreshold = async () => {
    if (!selectedStock) return;
    try {
      setIsUpdatingThreshold(true);
      await stockService.updateMinimumStock(selectedStock.id, minStockValue);
      toast.success('Seuil d\'alerte de stock mis à jour.');
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setSelectedStock(null);
    } catch (err) {
      console.error('Failed to update minimum stock threshold:', err);
      toast.error('Erreur lors de la mise à jour du seuil.');
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-stone-900 dark:text-stone-100" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
          Chargement de l'état des stocks...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-rose-500 font-serif italic text-xs">
        Erreur de récupération des stocks. Veuillez vérifier la connexion au serveur API.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Category header filters and sticky navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
        <div className="relative w-full sm:max-w-xs">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par Réf., Colis, Dépôt..."
            className="pl-9 h-10 bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        </div>

        {/* Dynamic scroll-to navigation chips */}
        <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto pb-1">
          {groupedCategories.map((group) => (
            <button
              key={group.categoryName}
              onClick={() => {
                const element = document.getElementById(`cat-sec-${group.categoryId}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-3 h-8 bg-stone-50 hover:bg-stone-100 dark:bg-stone-900/60 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-300 font-semibold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
            >
              {group.categoryId === 1 ? <TreeDeciduous className="h-3 w-3 text-amber-500" /> : <Layers className="h-3 w-3 text-stone-400" />}
              {group.categoryName}
              <Badge className="bg-stone-200/50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 text-[9px] px-1 h-4">
                {group.stocks.length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {groupedCategories.length === 0 ? (
        <Card className="border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/10">
          <CardContent className="p-12 text-center text-stone-400 italic text-xs font-serif">
            Aucun stock trouvé correspondant aux filtres spécifiés.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {groupedCategories.map((group) => (
            <section
              key={group.categoryName}
              id={`cat-sec-${group.categoryId}`}
              className="space-y-4 scroll-mt-24"
            >
              
              {/* Category SubHeader */}
              <div className="flex flex-row items-center justify-between border-b border-stone-200/60 dark:border-stone-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                    {group.categoryId === 1 ? (
                      <FlameKindling className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Layers className="h-4 w-4 text-stone-400" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">
                      {group.categoryName}
                    </h2>
                    <span className="text-[9px] text-stone-400 lowercase">
                      {group.stocks.length} fiches de stock répertoriées
                    </span>
                  </div>
                </div>

                {/* Category volume & totals banner */}
                <div className="flex flex-row gap-1.5">
                  {group.unitTotals.map((t) => (
                    <Badge
                      key={t.unit}
                      className="bg-stone-900 text-white dark:bg-stone-50 dark:text-stone-900 font-mono text-[10px] font-bold px-2 py-0.5"
                    >
                      {formatQuantity(t.totalQuantity, t.unit)} {t.unit}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white dark:bg-stone-900/20 border border-stone-200/60 dark:border-stone-800/60 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50/50 dark:bg-stone-900/40 border-b border-stone-200/50 dark:border-stone-800 text-[10px] uppercase tracking-wider font-bold text-stone-500">
                        <th className="p-3.5 pl-5">Réf. Article</th>
                        <th className="p-3.5">Libellé</th>
                        <th className="p-3.5">Réf. Paquet</th>
                        <th className="p-3.5">Dépôt</th>
                        <th className="p-3.5 text-right">Quantité</th>
                        <th className="p-3.5 text-right">Seuil Min.</th>
                        <th className="p-3.5 text-center">Statut</th>
                        <th className="p-3.5 pr-5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                      {group.stocks.map((stock) => {
                        const isAlert = stock.minimumstock > 0 && stock.quantity <= stock.minimumstock;
                        const isCritical = stock.quantity === 0;

                        return (
                          <tr 
                            key={stock.id} 
                            className={`hover:bg-stone-50/20 transition-colors ${
                              isCritical 
                                ? 'bg-rose-50/10 dark:bg-rose-955/5' 
                                : isAlert 
                                  ? 'bg-amber-50/10 dark:bg-amber-955/5' 
                                  : ''
                            }`}
                          >
                            
                            {/* Réf Article */}
                            <td className="p-3.5 pl-5 font-mono font-bold text-stone-900 dark:text-stone-50">
                              {stock.merchandise?.article?.reference || 'N/A'}
                            </td>

                            {/* Description */}
                            <td className="p-3.5 text-stone-500 max-w-[200px] truncate leading-normal">
                              {stock.merchandise?.article?.description || 'Aucun descriptif'}
                            </td>

                            {/* Package Ref */}
                            <td className="p-3.5 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                              {stock.merchandise?.packagereference || 'Standard'}
                            </td>

                            {/* Dépôt Site */}
                            <td className="p-3.5 text-stone-600 dark:text-stone-400">
                              <span className="flex items-center gap-1.5">
                                <Building className="h-3 w-3 text-stone-400" />
                                {stock.site?.gov || 'Central'} - {stock.site?.address || ''}
                              </span>
                            </td>

                            {/* Quantity */}
                            <td className="p-3.5 text-right font-mono font-bold">
                              <span className={isCritical ? 'text-rose-500' : isAlert ? 'text-amber-600' : 'text-emerald-600'}>
                                {formatQuantity(stock.quantity, stock.merchandise?.article?.unit)}
                              </span>
                              <span className="text-[10px] text-stone-400 font-sans font-medium ml-1">
                                {stock.merchandise?.article?.unit}
                              </span>
                            </td>

                            {/* Minimum Stock */}
                            <td className="p-3.5 text-right font-mono text-stone-500">
                              {stock.minimumstock > 0 ? (
                                <span>{formatQuantity(stock.minimumstock, stock.merchandise?.article?.unit)}</span>
                              ) : (
                                <span className="text-stone-300 italic">—</span>
                              )}
                            </td>

                            {/* Status badge */}
                            <td className="p-3.5 text-center">
                              {isCritical ? (
                                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-[9px] uppercase font-bold tracking-wider">
                                  Rupture
                                </Badge>
                              ) : isAlert ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[9px] uppercase font-bold tracking-wider">
                                  Seuil Alerte
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[9px] uppercase font-bold tracking-wider">
                                  Optimal
                                </Badge>
                              )}
                            </td>

                            {/* Actions / Settings threshold */}
                            <td className="p-3.5 pr-5 text-center">
                              <Button
                                variant="ghost"
                                onClick={() => handleOpenThreshold(stock)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-stone-100 text-stone-450 dark:hover:bg-stone-800"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Threshold Editor Dialog */}
      <Dialog open={!!selectedStock} onOpenChange={() => setSelectedStock(null)}>
        <DialogContent className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-250 dark:border-stone-850 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Modifier le Seuil d'Alerte
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Définir la quantité minimale pour laquelle une alerte visuelle sera déclenchée sur la fiche {selectedStock?.merchandise?.article?.reference}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="min-stock-input" className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Quantité Seuil Minimale ({selectedStock?.merchandise?.article?.unit})
              </Label>
              <Input
                id="min-stock-input"
                type="number"
                value={minStockValue}
                onChange={(e) => setMinStockValue(parseFloat(e.target.value) || 0)}
                className="h-11 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 font-mono font-bold text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedStock(null)}
              className="h-10 text-xs font-bold border-stone-200 dark:border-stone-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveThreshold}
              disabled={isUpdatingThreshold}
              className="h-10 text-xs font-bold bg-stone-900 text-white dark:bg-stone-50 dark:text-stone-900"
            >
              {isUpdatingThreshold ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

