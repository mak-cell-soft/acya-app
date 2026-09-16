'use client';

import React, { useState, useEffect } from 'react';
import { ProductionStep } from '@/types/production';
import { ProductionModal } from './ProductionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Factory, Package, ArrowDownRight, DollarSign } from 'lucide-react';
import { useCompleteProductionStep } from '@/hooks/use-production';

interface CompleteStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  step: ProductionStep | null;
}

export function CompleteStepModal({ isOpen, onClose, orderId, step }: CompleteStepModalProps) {
  const completeStepMutation = useCompleteProductionStep();

  const [actualOutputQuantity, setActualOutputQuantity] = useState<number>(1);
  const [actualLaborCost, setActualLaborCost] = useState<number>(0);
  const [actualOtherCost, setActualOtherCost] = useState<number>(0);
  const [inputsActual, setInputsActual] = useState<{ inputId: number; actualQuantity: number; unitCost?: number }[]>([]);

  useEffect(() => {
    if (step) {
      setActualOutputQuantity(step.actualOutputQuantity ?? step.plannedOutputQuantity ?? 1);
      setActualLaborCost(step.laborCost ?? 0);
      setActualOtherCost(step.otherCost ?? 0);
      setInputsActual(
        step.inputs.map((i) => ({
          inputId: i.id,
          actualQuantity: i.actualQuantity ?? i.plannedQuantity,
          unitCost: i.unitCost,
        }))
      );
    }
  }, [step]);

  if (!step) return null;

  const handleInputChange = (inputId: number, field: 'actualQuantity' | 'unitCost', value: number) => {
    setInputsActual((prev) =>
      prev.map((item) => (item.inputId === inputId ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeStepMutation.mutateAsync({
      orderId,
      stepId: step.id,
      data: {
        actualOutputQuantity,
        laborCost: actualLaborCost,
        otherCost: actualOtherCost,
        inputs: inputsActual,
      },
    });
    onClose();
  };

  return (
    <ProductionModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Finaliser l'étape ${step.stepNumber} : ${step.name}`}
      subtitle="Confirmez les quantités réelles consommées et produites pour cette étape (décision Q2)."
      icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step Output Section */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Package className="w-4 h-4 text-corp-blue-600" />
            Production & Rendement de l'étape
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Quantité Réelle Produite</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={actualOutputQuantity}
                  onChange={(e) => setActualOutputQuantity(parseFloat(e.target.value) || 0)}
                  className="pr-16 font-mono font-bold text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                  unités
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Prévue initialement : {step.plannedOutputQuantity} unités
              </p>
            </div>

            <div>
              <Label className="text-xs text-slate-600 font-medium">Produit / Lot Sortant</Label>
              <div className="mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold truncate">
                {step.outputMerchandiseRef ? (
                  <span>
                    {step.outputMerchandiseRef} — {step.outputMerchandiseDesignation || 'Semi-fini'}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Aucun lot stock intermédiaire déclaré</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inputs Consumed Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ArrowDownRight className="w-4 h-4 text-amber-600" />
              Matières Réellement Consommées ({step.inputs.length})
            </div>
          </div>

          {step.inputs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">Aucune matière déclarée sur cette étape.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {step.inputs.map((input) => {
                const currentActual = inputsActual.find((i) => i.inputId === input.id);
                return (
                  <div key={input.id} className="p-3 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">
                        {input.merchandiseRef || `Marchandise #${input.merchandiseId}`}
                      </p>
                      <p className="text-slate-500 text-[11px] truncate">
                        {input.merchandiseDesignation || 'Matière première'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Prévue: <span className="font-mono font-medium text-slate-700">{input.plannedQuantity} {input.unit || 'U'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <Label className="text-[10px] text-slate-400">Quantité Réelle</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={currentActual?.actualQuantity ?? input.plannedQuantity}
                          onChange={(e) =>
                            handleInputChange(input.id, 'actualQuantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-28 h-8 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400">Coût Unitaire (TND)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={currentActual?.unitCost ?? input.unitCost ?? 0}
                          onChange={(e) =>
                            handleInputChange(input.id, 'unitCost', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Labor & Other Cost Adjustments */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Frais Réels de l'étape
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Main d'Œuvre Réelle (TND)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={actualLaborCost}
                onChange={(e) => setActualLaborCost(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono font-bold"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Autres Frais / Usinage (TND)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={actualOtherCost}
                onChange={(e) => setActualOtherCost(parseFloat(e.target.value) || 0)}
                className="mt-1 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 text-xs">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={completeStepMutation.isPending}
            className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            {completeStepMutation.isPending ? 'Finalisation...' : 'Valider la fin de l’étape'}
          </Button>
        </div>
      </form>
    </ProductionModal>
  );
}
