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
import { Article } from "@/types/article";
import { ListOfLength } from "@/types/document";
import { TreeDeciduous, Plus, Trash2, Check } from 'lucide-react';

interface BdRowItem {
  id?: number;
  nbpieces: number;
  longueurCm: number;
  totalLargeurCm: number;
  quantity: number;
}

interface WoodBdLengthsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  currentLengths: ListOfLength[];
  isPurchase?: boolean;
  onSave: (lengths: ListOfLength[], totalQuantity: number) => void;
}

/**
 * WoodBdLengthsDialog
 * Dialog specifically tailored for BD wood articles (Achat & Vente).
 * Inputs:
 *  - Nbre de pièces
 *  - Longueur (in cm, highly variable)
 *  - Total Largeur (in cm, highly variable)
 * Epaisseur is read from article.thickness (stored in meters, displayed in mm).
 * Formula: Quantité (M³) = Epaisseur (m) * (Longueur (cm) / 100) * (Total Largeur (cm) / 100)
 */
export function WoodBdLengthsDialog({
  isOpen,
  onClose,
  article,
  currentLengths,
  isPurchase = false,
  onSave
}: WoodBdLengthsDialogProps) {
  const [thicknessStr, setThicknessStr] = useState<string>('0');
  const [rows, setRows] = useState<BdRowItem[]>([]);

  // Parse thickness value from article
  useEffect(() => {
    if (article) {
      const thickValue = article.thickness?.value || '0';
      setThicknessStr(thickValue.toString());
    }
  }, [article]);

  // Load initial rows from currentLengths or default to 1 empty row
  useEffect(() => {
    if (!isOpen) return;

    if (currentLengths && currentLengths.length > 0) {
      const parsed = currentLengths.map(l => {
        const lenValCm = l.customLength || parseFloat(l.length?.name || l.length?.value || '0') || 0;
        const widthValCm = l.totalWidth || 0;
        return {
          id: l.id,
          nbpieces: l.nbpieces || 1,
          longueurCm: lenValCm,
          totalLargeurCm: widthValCm,
          quantity: l.quantity || 0
        };
      });
      setRows(parsed);
    } else {
      setRows([{ nbpieces: 1, longueurCm: 0, totalLargeurCm: 0, quantity: 0 }]);
    }
  }, [isOpen, currentLengths]);

  const thicknessM = useMemo(() => {
    return parseFloat(thicknessStr.replace(',', '.') || '0');
  }, [thicknessStr]);

  // Update row values
  const handleRowChange = (index: number, field: keyof BdRowItem, val: string) => {
    const numVal = parseFloat(val.replace(',', '.')) || 0;
    const cleanVal = numVal < 0 ? 0 : numVal;

    setRows(prevRows => {
      const updated = [...prevRows];
      const row = { ...updated[index], [field]: cleanVal };

      // Calculate quantity (M3) = Epaisseur (m) * Longueur (m) * Total Largeur (m)
      const lenM = row.longueurCm / 100;
      const widthM = row.totalLargeurCm / 100;
      const qty = thicknessM * lenM * widthM;
      row.quantity = parseFloat(qty.toFixed(4));

      updated[index] = row;
      return updated;
    });
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { nbpieces: 1, longueurCm: 0, totalLargeurCm: 0, quantity: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Totals
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.pieces += r.nbpieces || 0;
        acc.volume += r.quantity || 0;
        return acc;
      },
      { pieces: 0, volume: 0 }
    );
  }, [rows]);

  const handleSubmit = () => {
    const formattedLengths: ListOfLength[] = rows.map((r) => {
      const lenMStr = (r.longueurCm / 100).toString();
      return {
        id: r.id || 0,
        nbpieces: r.nbpieces,
        customLength: r.longueurCm,
        totalWidth: r.totalLargeurCm,
        quantity: parseFloat(r.quantity.toFixed(4)),
        length: {
          id: 0,
          nature: 'Length',
          name: `${r.longueurCm} cm`,
          value: lenMStr,
          isactive: true,
          isdefault: false,
          iseditable: true
        } as any,
        availablePieces: 99999
      };
    });

    onSave(formattedLengths, parseFloat(totals.volume.toFixed(4)));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-w-4xl rounded-3xl border-corp-blue-100 bg-white/95 backdrop-blur-md shadow-2xl p-7 overflow-hidden">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 flex items-center justify-center text-amber-700 shadow-sm border border-amber-200/50">
              <TreeDeciduous className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-corp-blue-950 tracking-tight">
                Saisie des Longueurs - BD (M³)
              </DialogTitle>
              <DialogDescription className="text-sand-500 font-medium text-xs mt-0.5">
                Spécifiez le nombre de pièces, la longueur et la largeur totale pour le bois BD.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Spec Info Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sand-50/70 p-4 rounded-2xl border border-corp-blue-100/60 mb-5">
          <div className="space-y-0.5">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block font-mono">Article BD</span>
            <span className="font-extrabold text-corp-blue-900 text-sm block">{article?.reference}</span>
            <span className="text-xs text-sand-600 font-medium block truncate">{article?.description}</span>
          </div>
          <div className="space-y-0.5 sm:text-right">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block font-mono">Épaisseur (Fixe)</span>
            <span className="font-extrabold text-amber-700 text-sm block">
              {article?.thickness?.name || '—'} <span className="text-xs font-normal text-sand-500">mm ({thicknessM} m)</span>
            </span>
          </div>
        </div>

        {/* Rows Table */}
        <div className="border border-corp-blue-100/80 rounded-2xl overflow-hidden bg-white max-h-[340px] overflow-y-auto mb-5 shadow-sm custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-sand-50/90 border-b border-corp-blue-100/70 sticky top-0 backdrop-blur-md z-10">
                <th className="py-3 px-4 font-bold text-sand-600 uppercase tracking-wider text-center w-36">Nbre de pièces</th>
                <th className="py-3 px-4 font-bold text-sand-600 uppercase tracking-wider text-center">Longueur (cm)</th>
                <th className="py-3 px-4 font-bold text-sand-600 uppercase tracking-wider text-center">Total Largeur (cm)</th>
                <th className="py-3 px-4 font-bold text-sand-600 uppercase tracking-wider text-right w-44">Quantité (M³)</th>
                <th className="py-3 px-3 font-bold text-sand-600 uppercase tracking-wider text-center w-14">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-blue-50/60">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-corp-blue-50/30 transition-colors">
                  <td className="p-2.5 text-center">
                    <Input
                      type="number"
                      min={1}
                      className="h-10 rounded-xl text-center font-bold text-xs border-corp-blue-100 focus:border-corp-blue-600 bg-white"
                      value={row.nbpieces || ''}
                      onChange={(e) => handleRowChange(idx, 'nbpieces', e.target.value)}
                      placeholder="1"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-10 rounded-xl text-center font-bold text-xs border-corp-blue-100 focus:border-corp-blue-600 bg-white"
                      value={row.longueurCm || ''}
                      onChange={(e) => handleRowChange(idx, 'longueurCm', e.target.value)}
                      placeholder="350"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-10 rounded-xl text-center font-bold text-xs border-corp-blue-100 focus:border-corp-blue-600 bg-white"
                      value={row.totalLargeurCm || ''}
                      onChange={(e) => handleRowChange(idx, 'totalLargeurCm', e.target.value)}
                      placeholder="85"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-extrabold text-corp-blue-900 text-sm whitespace-nowrap">
                    {row.quantity.toFixed(4)} M³
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={rows.length === 1}
                      onClick={() => handleRemoveRow(idx)}
                      className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-start mb-5">
          <Button
            type="button"
            onClick={handleAddRow}
            variant="outline"
            className="h-10 gap-2 text-xs font-bold border-dashed border-corp-blue-200 text-corp-blue-700 hover:bg-corp-blue-50 rounded-xl px-4"
          >
            <Plus className="w-4 h-4" />
            Ajouter une ligne
          </Button>
        </div>

        {/* Totals Summary */}
        <div className="bg-sand-50/80 p-4 rounded-2xl border border-corp-blue-100/70 flex items-center justify-between mb-6 shadow-sm">
          <div>
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block font-mono">Total Pièces</span>
            <span className="font-extrabold text-corp-blue-900 text-base">{totals.pieces} pcs</span>
          </div>
          <div className="text-right">
            <span className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest block font-mono">Volume Total Calculé</span>
            <span className="font-mono font-extrabold text-corp-blue-600 text-xl">{totals.volume.toFixed(4)} M³</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="font-bold text-sand-600 hover:bg-sand-100 rounded-xl h-11 px-5"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold rounded-xl h-11 px-7 shadow-lg shadow-corp-blue-600/20"
          >
            <Check className="w-4.5 h-4.5 mr-2" />
            Valider la quantité BD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
