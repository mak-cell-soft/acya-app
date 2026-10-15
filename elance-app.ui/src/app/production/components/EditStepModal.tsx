'use client';

import React, { useState, useEffect } from 'react';
import { ProductionStep } from '@/types/production';
import { ProductionModal } from './ProductionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Layers, Coins, Package, Info, AlertTriangle } from 'lucide-react';
import { useUpdateProductionStep } from '@/hooks/use-production';
import { merchandiseService } from '@/services/components/merchandise.service';

interface EditStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  step: ProductionStep | null;
  isFinalized?: boolean;
}

export function EditStepModal({
  isOpen,
  onClose,
  orderId,
  step,
  isFinalized = false,
}: EditStepModalProps) {
  const updateStepMutation = useUpdateProductionStep();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plannedOutputQuantity, setPlannedOutputQuantity] = useState<number>(1);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [outputMerchandiseId, setOutputMerchandiseId] = useState<number | undefined>(undefined);
  const [merchandises, setMerchandises] = useState<{ id: number; packageReference?: string; description?: string }[]>([]);
  const [loadingMerch, setLoadingMerch] = useState(false);

  useEffect(() => {
    if (step) {
      setName(step.name || '');
      setDescription(step.description || '');
      setPlannedOutputQuantity(step.plannedOutputQuantity ?? 1);
      setLaborCost(step.laborCost ?? 0);
      setOtherCost(step.otherCost ?? 0);
      setOutputMerchandiseId(step.outputMerchandiseId ?? undefined);
    }
  }, [step]);

  useEffect(() => {
    if (isOpen && merchandises.length === 0) {
      setLoadingMerch(true);
      merchandiseService
        .getAll()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setMerchandises(list);
        })
        .catch((err) => console.error('Failed to load merchandises for step edit:', err))
        .finally(() => setLoadingMerch(false));
    }
  }, [isOpen, merchandises.length]);

  if (!step) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateStepMutation.mutateAsync({
      orderId,
      stepId: step.id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        stepNumber: step.stepNumber,
        startDate: step.startDate,
        endDate: step.endDate,
        laborCost: Number(laborCost) || 0,
        otherCost: Number(otherCost) || 0,
        outputMerchandiseId: outputMerchandiseId ? Number(outputMerchandiseId) : undefined,
        plannedOutputQuantity: Number(plannedOutputQuantity) > 0 ? Number(plannedOutputQuantity) : 1,
        actualOutputQuantity: step.actualOutputQuantity,
      },
    });

    onClose();
  };

  return (
    <ProductionModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Éditer l'étape ${step.stepNumber} : ${step.name}`}
      subtitle="Modifiez les paramètres de base, les coûts forfaitaires et l'article semi-fini généré."
      icon={<Pencil className="w-5 h-5 text-amber-400" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {isFinalized && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Cet ordre est finalisé (validé ou annulé). Les modifications d'étape sont verrouillées.</span>
          </div>
        )}

        {/* Step Name & Description */}
        <div className="space-y-3">
          <div>
            <Label className="text-slate-700 font-bold">Nom de l'étape *</Label>
            <Input
              type="text"
              required
              disabled={isFinalized}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Finition, Vernissage..."
              className="mt-1 h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-bold">Description / Instructions</Label>
            <Input
              type="text"
              disabled={isFinalized}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes ou spécifications techniques..."
              className="mt-1 h-9 text-xs"
            />
          </div>
        </div>

        {/* Planned Output Quantity & Output Merchandise */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <Label className="text-slate-700 font-bold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-corp-blue-600" />
              Quantité Prévue en Sortie
            </Label>
            <Input
              type="number"
              min="0.001"
              step="any"
              disabled={isFinalized}
              value={plannedOutputQuantity}
              onChange={(e) => setPlannedOutputQuantity(Number(e.target.value))}
              className="mt-1 h-9 text-xs font-mono"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-corp-blue-600" />
              Article Semi-Fini Sortie
            </Label>
            <select
              disabled={isFinalized || loadingMerch}
              value={outputMerchandiseId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setOutputMerchandiseId(val ? Number(val) : undefined);
              }}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-850 shadow-xs focus:outline-none focus:ring-1 focus:ring-corp-blue-500"
            >
              <option value="">-- Aucun / Non défini --</option>
              {merchandises.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.packageReference || `Article #${m.id}`} {m.description ? `— ${m.description}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Costs Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 pt-3">
          <div className="flex items-center justify-between text-slate-700 font-bold">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              Coûts Additionnels de l'Étape
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-600 font-medium">Coût Main-d'Œuvre Manuel / Forfaitaire (TND)</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                disabled={isFinalized}
                value={laborCost}
                onChange={(e) => setLaborCost(Number(e.target.value))}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-slate-600 font-medium">Autres Coûts Étape (TND)</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                disabled={isFinalized}
                value={otherCost}
                onChange={(e) => setOtherCost(Number(e.target.value))}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Separation of manual vs employee labor warning note */}
          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start gap-2 text-slate-600">
            <Info className="w-4 h-4 text-corp-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Distinction des coûts :</strong> Ce coût manuel forfaitaire s'applique directement au bilan de l'étape. Il n'écrase ni ne modifie les pointages horaires individuels des ouvriers affectés dans l'onglet <em>Ouvriers & Pointage</em>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs h-9 px-4 text-slate-600 hover:text-slate-800"
          >
            Annuler
          </Button>

          <Button
            type="submit"
            disabled={isFinalized || updateStepMutation.isPending || !name.trim()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-9 px-5 shadow-xs"
          >
            {updateStepMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </ProductionModal>
  );
}
