'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TreeDeciduous, Loader2, X } from 'lucide-react';
import { stockService } from '@/services/components/stock.service';
import { articleService } from '@/services/components/article.service';
import { Stock } from '@/types/stock';

interface LengthStockDetail {
  id: number;
  lengthId: number;
  lengthName: string;
  remainingPieces: number;
  volumeM3?: number;
}

interface WoodStockDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: Stock | null;
}

// Helper to extract dimensions from package or article reference if missing in DB
// e.g. "RS1-50225-SODRA" -> "50225" -> thickness: 50, width: 225
function extractDimensionsFromRef(ref: string) {
  if (!ref) return null;
  const match = ref.match(/-(\d{4,6})-/);
  if (match) {
    const dims = match[1];
    let t = 0, w = 0;
    if (dims.length === 5) {
      t = parseInt(dims.substring(0, 2), 10);
      w = parseInt(dims.substring(2, 5), 10);
    } else if (dims.length === 4) {
      t = parseInt(dims.substring(0, 2), 10);
      w = parseInt(dims.substring(2, 4), 10);
    } else if (dims.length === 6) {
      t = parseInt(dims.substring(0, 3), 10);
      w = parseInt(dims.substring(3, 6), 10);
    }
    if (t > 0 && w > 0) return { thickness: t, width: w };
  }
  return null;
}

export function WoodStockDetailsDialog({
  isOpen,
  onClose,
  stock
}: WoodStockDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<LengthStockDetail[]>([]);
  const [fullArticle, setFullArticle] = useState<any>(null);

  useEffect(() => {
    if (isOpen && stock) {
      loadDetails();
    } else {
      setDetails([]);
    }
  }, [isOpen, stock]);

  const loadDetails = async () => {
    if (!stock?.merchandise?.article?.reference || !stock.site?.id || !stock.merchandise?.id) return;

    setLoading(true);
    try {
      const woodParams = {
        merchandiseRef: stock.merchandise.article.reference,
        salesSiteId: stock.site.id,
        merchandiseId: stock.merchandise.id
      };

      const [result, articleDetails] = await Promise.all([
        stockService.getWoodStockWithLengthDetails(woodParams),
        articleService.getById(stock.merchandise.article.id)
      ]);
      
      setFullArticle(articleDetails);

      // Fallback to extract from reference if they are missing in the database
      const fallbackDims = extractDimensionsFromRef(stock.merchandise.article.reference || '');

      let thicknessStr = articleDetails?.thickness?.value?.toString() || '';
      let widthStr = articleDetails?.width?.value?.toString() || '';
      
      let thicknessVal = 0;
      let widthVal = 0;

      if (thicknessStr) {
        thicknessVal = parseFloat(thicknessStr.replace(',', '.')) || 0;
      } else if (fallbackDims) {
        thicknessVal = fallbackDims.thickness / 1000;
        thicknessStr = thicknessVal.toString();
      }

      if (widthStr) {
        widthVal = parseFloat(widthStr.replace(',', '.')) || 0;
      } else if (fallbackDims) {
        widthVal = fallbackDims.width / 1000;
        widthStr = widthVal.toString();
      }

      // Determine display names in mm (if not in DB, use fallback integer)
      const displayThickness = articleDetails?.thickness?.name || (fallbackDims ? fallbackDims.thickness.toString() : '—');
      const displayWidth = articleDetails?.width?.name || (fallbackDims ? fallbackDims.width.toString() : '—');
      
      // We attach these directly to the state so we can display them easily in UI
      setFullArticle({
        ...articleDetails,
        _displayThickness: displayThickness,
        _displayWidth: displayWidth
      });

      const mappedDetails: LengthStockDetail[] = (result || []).map((d: any) => {
        const lengthName = d.lengthName ?? d.LengthName ?? '0';
        const lengthVal = parseFloat(lengthName.toString().replace(',', '.') || '0') / 100; // cm to m
        const pieces = d.remainingPieces ?? d.RemainingPieces ?? 0;
        const volumeM3 = parseFloat((pieces * lengthVal * thicknessVal * widthVal).toFixed(4));

        return {
          id: d.id ?? d.Id,
          lengthId: d.lengthId ?? d.LengthId,
          lengthName: lengthName,
          remainingPieces: pieces,
          volumeM3: volumeM3
        };
      });

      // Filter out rows with 0 remaining pieces and sort descending by length
      const filteredAndSorted = mappedDetails
        .filter(d => d.remainingPieces > 0)
        .sort((a, b) => parseFloat(b.lengthName) - parseFloat(a.lengthName));

      setDetails(filteredAndSorted);
    } catch (err) {
      console.error('Failed to load wood stock details by length:', err);
      setDetails([]);
      setFullArticle(null);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return details.reduce(
      (acc, row) => {
        acc.pieces += row.remainingPieces;
        acc.volume += row.volumeM3 || 0;
        return acc;
      },
      { pieces: 0, volume: 0 }
    );
  }, [details]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl rounded-xl border-stone-200 dark:border-stone-850 bg-white dark:bg-stone-950 shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shadow-md">
              <TreeDeciduous className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-stone-900 dark:text-stone-50">
                Détail des Longueurs Disponibles
              </DialogTitle>
              <DialogDescription className="text-stone-500 dark:text-stone-400 font-medium text-xs mt-0.5">
                Consultez le nombre exact de pièces par longueur pour ce colis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {stock && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-50 dark:bg-stone-900/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-850 mb-5">
            <div className="md:col-span-2">
              <span className="text-[0.6rem] font-bold text-stone-400 uppercase tracking-wider block">Article & Colis</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm block truncate">{stock.merchandise?.article?.reference}</span>
              <span className="text-xs text-stone-600 dark:text-stone-400 font-medium font-mono">{stock.merchandise?.packagereference || 'Standard'}</span>
            </div>
            <div>
              <span className="text-[0.6rem] font-bold text-stone-400 uppercase tracking-wider block">Épaisseur</span>
              <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                {fullArticle?._displayThickness || '—'} <span className="text-xs font-normal text-stone-400">mm</span>
              </span>
            </div>
            <div>
              <span className="text-[0.6rem] font-bold text-stone-400 uppercase tracking-wider block">Largeur</span>
              <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                {fullArticle?._displayWidth || '—'} <span className="text-xs font-normal text-stone-400">mm</span>
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-stone-500 uppercase tracking-widest font-bold">Recherche des longueurs...</span>
          </div>
        ) : (
          <div className="border border-stone-200/60 dark:border-stone-850 rounded-2xl overflow-hidden bg-white dark:bg-stone-950/50 max-h-[300px] overflow-y-auto mb-6 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/70 dark:bg-stone-900/40 border-b border-stone-200/60 dark:border-stone-800 sticky top-0 backdrop-blur-sm z-10">
                  <th className="p-3.5 font-bold text-stone-500 uppercase tracking-wider">Longueur</th>
                  <th className="p-3.5 font-bold text-stone-500 uppercase tracking-wider text-center">Nbr Pièces Dispo</th>
                  <th className="p-3.5 font-bold text-stone-500 uppercase tracking-wider text-right">Volume (M³)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-stone-400 font-medium italic">
                      Aucune pièce disponible trouvée pour ce colis.
                    </td>
                  </tr>
                ) : (
                  details.map((row) => (
                    <tr key={row.lengthId} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/20 transition-all duration-200">
                      <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">
                        {row.lengthName} cm <span className="text-[0.65rem] text-stone-400 font-normal">({(parseFloat(row.lengthName)/100).toFixed(2)} m)</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold">
                          {row.remainingPieces} pcs
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-stone-800 dark:text-stone-200">
                        {row.volumeM3?.toFixed(4)} M³
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between border-t border-stone-200/60 dark:border-stone-850 pt-4 gap-4">
          {!loading && details.length > 0 ? (
            <div className="flex items-center gap-6 self-start text-xs font-bold text-stone-900 dark:text-stone-100">
              <div>
                <span className="text-stone-400 block text-[0.65rem] uppercase tracking-wider">Total Pièces</span>
                <span className="text-base font-bold text-stone-900 dark:text-stone-50">{totals.pieces} pcs</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[0.65rem] uppercase tracking-wider">Volume Total</span>
                <span className="text-base font-bold text-stone-900 dark:text-stone-50">{totals.volume.toFixed(3)} M³</span>
              </div>
            </div>
          ) : <div />}
          <Button variant="outline" className="border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 font-bold rounded-xl" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
