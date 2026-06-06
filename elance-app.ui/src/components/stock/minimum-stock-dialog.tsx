'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { stockService } from '@/services/components/stock.service';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MinimumStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockId: number | null;
  articleReference: string;
  articleDescription: string;
  currentMinStock: number;
}

export function MinimumStockDialog({
  isOpen,
  onClose,
  onSuccess,
  stockId,
  articleReference,
  articleDescription,
  currentMinStock,
}: MinimumStockDialogProps) {
  const [minStock, setMinStock] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMinStock(currentMinStock.toString());
    }
  }, [isOpen, currentMinStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockId) return;

    const value = parseFloat(minStock);
    if (isNaN(value) || value < 0) {
      toast.error('Veuillez entrer une valeur numérique valide (supérieure ou égale à 0).');
      return;
    }

    try {
      setSubmitting(true);
      await stockService.updateMinimumStock(stockId, value);
      toast.success('Seuil de stock minimum mis à jour avec succès.');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update minimum stock:', err);
      toast.error('Erreur lors de la mise à jour du seuil de stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-stone-50 dark:bg-stone-900 border border-stone-200/85 dark:border-stone-800/85 shadow-2xl rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
              Ajuster le Seuil Minimum
            </DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
              Définir la quantité de sécurité sous laquelle le système déclenche une alerte de stock bas pour cette référence.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="bg-stone-100/60 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200/30 dark:border-stone-700/30 space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold">Article</span>
                <span className="font-mono text-xs font-semibold text-stone-700 dark:text-stone-300">{articleReference}</span>
              </div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-tight truncate">
                {articleDescription}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-stock-input" className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">
                Seuil de Stock Minimum
              </Label>
              <div className="relative">
                <Input
                  id="min-stock-input"
                  type="number"
                  step="any"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="0.00"
                  className="pl-4 pr-12 py-6 font-mono text-base font-bold bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/80 transition-all rounded-xl"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs uppercase text-stone-400 dark:text-stone-500 font-semibold pointer-events-none">
                  Unité
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-stone-200/50 dark:border-stone-800/50 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="py-5 px-5 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-all border-stone-200/80 dark:border-stone-800 text-xs font-semibold uppercase tracking-wider"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="py-5 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-stone-50 dark:hover:bg-stone-200 dark:text-stone-950 text-white transition-all text-xs font-semibold uppercase tracking-wider gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Enregistrer le Seuil'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


