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
import { LayoutGrid, Info, Check, X } from 'lucide-react';

interface GlassSurfaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  currentValue?: { nbpieces: number; height: number; width: number };
  onSave: (nbpieces: number, height: number, width: number, totalSurface: number) => void;
}

export function GlassSurfaceDialog({
  isOpen,
  onClose,
  article,
  currentValue,
  onSave
}: GlassSurfaceDialogProps) {
  const [nbpieces, setNbpieces] = useState<number>(1);
  const [height, setHeight] = useState<string>('0');
  const [width, setWidth] = useState<string>('0');

  // Load existing values when opening dialog
  useEffect(() => {
    if (isOpen) {
      if (currentValue && (currentValue.nbpieces > 0 || currentValue.height > 0 || currentValue.width > 0)) {
        setNbpieces(currentValue.nbpieces);
        setHeight(currentValue.height.toString());
        setWidth(currentValue.width.toString());
      } else {
        // Default values
        setNbpieces(1);
        setHeight('0');
        setWidth('0');
      }
    }
  }, [isOpen, currentValue]);

  // Compute live surface area
  const totalSurface = useMemo(() => {
    const h = parseFloat(height.replace(',', '.')) || 0;
    const w = parseFloat(width.replace(',', '.')) || 0;
    const pieces = nbpieces || 0;
    return parseFloat((pieces * h * w).toFixed(3));
  }, [nbpieces, height, width]);

  const isValid = useMemo(() => {
    const h = parseFloat(height.replace(',', '.')) || 0;
    const w = parseFloat(width.replace(',', '.')) || 0;
    const pieces = nbpieces || 0;
    return pieces > 0 && h > 0 && w > 0;
  }, [nbpieces, height, width]);

  const handleSubmit = () => {
    if (!isValid) return;
    const h = parseFloat(height.replace(',', '.')) || 0;
    const w = parseFloat(width.replace(',', '.')) || 0;
    onSave(nbpieces, h, w, totalSurface);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg rounded-xl border-corp-blue-100 bg-white/95 backdrop-blur-md shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-corp-blue-100 flex items-center justify-center text-corp-blue-600 shadow-md">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-corp-blue-900">
                Saisie de la Surface - M²
              </DialogTitle>
              <DialogDescription className="text-sand-400 font-medium text-xs mt-0.5 animate-pulse">
                Spécifiez les dimensions et le nombre de pièces pour calculer la surface en M².
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Section: Article Info */}
        <div className="bg-sand-50/50 p-4 rounded-2xl border border-corp-blue-50/60 mb-5">
          <span className="text-[0.6rem] font-bold text-sand-400 uppercase tracking-wider block">Article</span>
          <span className="font-bold text-corp-blue-900 text-sm">{article?.reference}</span>
          <span className="text-xs text-sand-600 font-medium block truncate">{article?.description}</span>
        </div>

        {/* Entry fields */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest block mb-1.5">
                Nbr Pièces
              </label>
              <Input
                type="number"
                min="1"
                className="h-10 rounded-xl text-center font-bold border-corp-blue-100/70 bg-white focus:ring-corp-blue-600 focus:border-corp-blue-600"
                value={nbpieces || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setNbpieces(val < 0 ? 0 : val);
                }}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest block mb-1.5">
                Hauteur (m)
              </label>
              <Input
                type="text"
                className="h-10 rounded-xl text-center font-bold border-corp-blue-100/70 bg-white focus:ring-corp-blue-600 focus:border-corp-blue-600"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest block mb-1.5">
                Largeur (m)
              </label>
              <Input
                type="text"
                className="h-10 rounded-xl text-center font-bold border-corp-blue-100/70 bg-white focus:ring-corp-blue-600 focus:border-corp-blue-600"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Dialog Footer with summary */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between border-t border-corp-blue-50/60 pt-4 gap-4">
          <div className="flex items-center gap-6 self-start text-xs font-bold text-corp-blue-900">
            <div>
              <span className="text-sand-400 block text-[0.65rem] uppercase tracking-wider">Surface Calculée</span>
              <span className="text-lg font-extrabold text-corp-blue-900">{totalSurface.toFixed(3)} M²</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-corp-blue-100 hover:bg-corp-blue-50 font-bold rounded-full text-xs" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button
              className="bg-corp-blue-600 hover:bg-corp-blue-800 text-white font-bold shadow-lg shadow-corp-blue-600/20 rounded-full text-xs"
              onClick={handleSubmit}
              disabled={!isValid}
            >
              <Check className="w-4 h-4 mr-2" /> Confirmer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
