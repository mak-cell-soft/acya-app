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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppVariables } from "@/hooks/use-app-variables";
import { Article } from "@/types/article";
import { ListOfLength } from "@/types/document";
import { TreeDeciduous, Info, Check, X, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

/**
 * Interface representing the detailed length stock returned by backend
 */
interface LengthStockDetail {
  id: number;
  lengthId: number;
  lengthName: string;
  remainingPieces: number;
}

interface WoodLengthsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  currentLengths: ListOfLength[];
  availableStockDetails: LengthStockDetail[];
  isPurchase?: boolean;
  onSave: (lengths: ListOfLength[], totalQuantity: number) => void;
}

/**
 * WoodLengthsDialog
 * Renders a highly polished visual form for entering wood pieces per length.
 * Automatically computes volume (M3) = pieces * length * thickness * width.
 * 
 * 💬 Angular-to-React Porting Assumptions & API Contracts:
 * - In C#, tbl_appvariable holds thickness, width, and lengths as strings.
 * - Thickness name is in mm (e.g. "25") but value is in meters ("0.0250").
 * - Width name is in mm (e.g. "150") but value is in meters ("0.1500").
 * - Length name is in cm (e.g. "300") but value is in meters ("3.0000").
 * - Due to this perfect DB decimal formatting, direct multiplication yields cubic meters (M3) naturally!
 */
export function WoodLengthsDialog({
  isOpen,
  onClose,
  article,
  currentLengths,
  availableStockDetails,
  isPurchase = false,
  onSave
}: WoodLengthsDialogProps) {
  // Load the Length master list from API via useAppVariables
  const { data: allLengthsMasterList } = useAppVariables('Length');

  const [thicknessStr, setThicknessStr] = useState<string>('0');
  const [widthStr, setWidthStr] = useState<string>('0');

  // Rows of length inputs
  const [rows, setRows] = useState<ListOfLength[]>([]);

  // Parse and display thickness & width values from article details
  useEffect(() => {
    if (article) {
      const thickValue = article.thickness?.value || '0';
      const widthValue = article.width?.value || '0';
      setThicknessStr(thickValue.toString());
      setWidthStr(widthValue.toString());
    }
  }, [article]);

  // Parse article.lengths (e.g. "[270, 300, 330]") and construct rows
  const parsedLengthsNames = useMemo(() => {
    if (!article?.lengths) return [];
    // Strip surrounding brackets & split by comma
    return article.lengths
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }, [article?.lengths]);

  // Build rows structure matching existing lengths or initial setup
  useEffect(() => {
    if (!isOpen || !allLengthsMasterList) return;

    // Filter master list to only include length variables allowed for this article
    const allowedLengthVariables = allLengthsMasterList.filter(appVar => 
      parsedLengthsNames.includes(appVar.name)
    );

    // Build lengths array
    const initialRows = allowedLengthVariables.map(lenVar => {
      // Find pieces already entered in currentLengths if editing
      const existing = currentLengths.find(l => l.length?.id === lenVar.id);
      const pieces = existing ? existing.nbpieces : 0;

      // Find available pieces in stock details for this length
      const stockDetail = availableStockDetails?.find(s => 
        s.lengthName === lenVar.name || (s as any).LengthName === lenVar.name
      );
      const availablePieces = stockDetail 
        ? (stockDetail.remainingPieces ?? (stockDetail as any).RemainingPieces ?? 0) 
        : 0;

      // Calculate thickness and width values for volume
      const lengthVal = parseFloat(lenVar.value?.toString().replace(',', '.') || '0');
      const thicknessVal = parseFloat(thicknessStr.replace(',', '.') || '0');
      const widthVal = parseFloat(widthStr.replace(',', '.') || '0');
      const quantity = parseFloat((pieces * lengthVal * thicknessVal * widthVal).toFixed(3));

      return {
        id: existing?.id || 0,
        nbpieces: pieces,
        length: lenVar,
        quantity: quantity,
        availablePieces: availablePieces
      } as ListOfLength;
    });

    // Sort descending by length value
    initialRows.sort((a, b) => {
      const valA = parseFloat(a.length.value?.toString() || '0');
      const valB = parseFloat(b.length.value?.toString() || '0');
      return valB - valA;
    });

    setRows(initialRows);
  }, [isOpen, allLengthsMasterList, parsedLengthsNames, currentLengths, availableStockDetails, thicknessStr, widthStr]);

  // Handle number of pieces change for a specific length row
  const handlePiecesChange = (index: number, val: string) => {
    const parsedPieces = parseInt(val, 10) || 0;
    const cleanPieces = parsedPieces < 0 ? 0 : parsedPieces;

    setRows(prevRows => {
      const updated = [...prevRows];
      const row = updated[index];
      
      row.nbpieces = cleanPieces;

      // Calculate quantity (volume in M3)
      const lengthVal = parseFloat(row.length.value?.toString().replace(',', '.') || '0');
      const thicknessVal = parseFloat(thicknessStr.replace(',', '.') || '0');
      const widthVal = parseFloat(widthStr.replace(',', '.') || '0');
      
      row.quantity = parseFloat((cleanPieces * lengthVal * thicknessVal * widthVal).toFixed(4));
      return updated;
    });
  };

  // Compute overall total pieces and total volume (M3)
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.pieces += row.nbpieces || 0;
        acc.volume += row.quantity || 0;
        return acc;
      },
      { pieces: 0, volume: 0 }
    );
  }, [rows]);

  // Form validations for stock limits in client sales mode
  const validationErrors = useMemo(() => {
    if (isPurchase) return [];
    return rows
      .filter(row => row.nbpieces > row.availablePieces)
      .map(row => `Longueur ${row.length.name}: ${row.nbpieces} pièces demandées mais seulement ${row.availablePieces} de disponible.`);
  }, [rows, isPurchase]);

  const handleSubmit = () => {
    if (validationErrors.length > 0) return;
    onSave(rows, parseFloat(totals.volume.toFixed(3)));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl md:max-w-4xl rounded-xl border-corp-blue-100 bg-white/95 backdrop-blur-md shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-corp-blue-100 flex items-center justify-center text-corp-blue-600 shadow-md">
              <TreeDeciduous className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-corp-blue-900">
                Saisie des Longueurs - M³
              </DialogTitle>
              <DialogDescription className="text-sand-400 font-medium text-xs mt-0.5 animate-pulse">
                Spécifiez le nombre de pièces par longueur pour calculer le volume total.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Section: Article Info & Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sand-50/50 p-4 rounded-2xl border border-corp-blue-50/60 mb-5">
          <div className="md:col-span-1">
            <span className="text-[0.6rem] font-bold text-sand-400 uppercase tracking-wider block">Article</span>
            <span className="font-bold text-corp-blue-900 text-sm">{article?.reference}</span>
            <span className="text-xs text-sand-600 font-medium block truncate">{article?.description}</span>
          </div>
          <div>
            <span className="text-[0.6rem] font-bold text-sand-400 uppercase tracking-wider block">Épaisseur</span>
            <span className="font-bold text-corp-blue-800 text-sm">
              {article?.thickness?.name || '—'} <span className="text-xs font-normal text-sand-400">mm ({thicknessStr} m)</span>
            </span>
          </div>
          <div>
            <span className="text-[0.6rem] font-bold text-sand-400 uppercase tracking-wider block">Largeur</span>
            <span className="font-bold text-corp-blue-800 text-sm">
              {article?.width?.name || '—'} <span className="text-xs font-normal text-sand-400">mm ({widthStr} m)</span>
            </span>
          </div>
        </div>

        {/* Validation Alert */}
        {validationErrors.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold mb-4 flex items-start gap-2.5 animate-in shake duration-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="block font-bold">Erreur de stock insuffisant :</span>
              <ul className="list-disc pl-4 space-y-0.5 font-medium">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Lengths Table */}
        <div className="border border-corp-blue-50/50 rounded-2xl overflow-hidden bg-white/50 max-h-[300px] overflow-y-auto mb-6 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-sand-50/70 border-b border-corp-blue-50/60 sticky top-0 backdrop-blur-sm z-10">
                <th className="p-3.5 font-bold text-sand-400 uppercase tracking-wider">Longueur (cm)</th>
                <th className="p-3.5 font-bold text-sand-400 uppercase tracking-wider text-center">Nbr Pièces</th>
                <th className="p-3.5 font-bold text-sand-400 uppercase tracking-wider text-right">Volume (M³)</th>
                {!isPurchase && (
                  <th className="p-3.5 font-bold text-sand-400 uppercase tracking-wider text-center">Dispo</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-blue-50/40">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={isPurchase ? 3 : 4} className="p-8 text-center text-sand-400 font-medium italic">
                    Aucune longueur disponible configurée sur cet article.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const hasStockError = !isPurchase && row.nbpieces > row.availablePieces;
                  return (
                    <tr key={row.length.id} className="hover:bg-corp-blue-50/20 transition-all duration-200">
                      <td className="p-3.5 font-bold text-corp-blue-900">
                        {row.length.name} cm <span className="text-[0.65rem] text-sand-400 font-normal">({row.length.value} m)</span>
                      </td>
                      <td className="p-2 text-center w-36">
                        <Input
                          type="number"
                          className={`h-9 rounded-lg text-center font-bold text-xs focus:ring-corp-blue-600 transition-all ${
                            hasStockError 
                              ? 'border-rose-300 bg-rose-50 text-rose-950 focus:border-rose-500' 
                              : 'border-corp-blue-100/70 bg-white focus:border-corp-blue-600'
                          }`}
                          value={row.nbpieces || ''}
                          onChange={(e) => handlePiecesChange(idx, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3.5 text-right font-bold text-corp-blue-800">
                        {row.quantity.toFixed(4)} M³
                      </td>
                      {!isPurchase && (
                        <td className="p-3.5 text-center">
                          <Badge className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${
                            row.availablePieces > 0 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {row.availablePieces} pcs
                          </Badge>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dialog Footer with summary */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between border-t border-corp-blue-50/60 pt-4 gap-4">
          <div className="flex items-center gap-6 self-start text-xs font-bold text-corp-blue-900">
            <div>
              <span className="text-sand-400 block text-[0.65rem] uppercase tracking-wider">Total Pièces</span>
              <span className="text-base font-bold text-corp-blue-900">{totals.pieces} pcs</span>
            </div>
            <div>
              <span className="text-sand-400 block text-[0.65rem] uppercase tracking-wider">Volume Total</span>
              <span className="text-base font-bold text-corp-blue-900">{totals.volume.toFixed(3)} M³</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-corp-blue-100 hover:bg-corp-blue-50 font-bold" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button
              className="bg-corp-blue-600 hover:bg-corp-blue-800 text-white font-bold shadow-lg shadow-corp-blue-600/20"
              onClick={handleSubmit}
              disabled={validationErrors.length > 0}
            >
              <Check className="w-4 h-4 mr-2" /> Confirmer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


