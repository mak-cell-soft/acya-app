'use client';

import React, { useState } from 'react';
import { ProductionOrder, ProductionStep } from '@/types/production';
import { StepStatusBadge } from '../components/ProductionStatusBadge';
import { CompleteStepModal } from '../components/CompleteStepModal';
import { QuickMerchandiseModal } from '../components/QuickMerchandiseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  PackagePlus,
  Sparkles,
  Package,
  Boxes,
  Clock,
  Coins,
} from 'lucide-react';
import {
  useAddProductionStep,
  useDeleteProductionStep,
  useAddProductionInput,
  useDeleteProductionInput,
} from '@/hooks/use-production';
import { merchandiseService } from '@/services/components/merchandise.service';
import { motion } from 'framer-motion';

interface StepsTabProps {
  order: ProductionOrder;
}

export function StepsTab({ order }: StepsTabProps) {
  const addStepMutation = useAddProductionStep();
  const deleteStepMutation = useDeleteProductionStep();
  const addInputMutation = useAddProductionInput();
  const deleteInputMutation = useDeleteProductionInput();

  const [selectedStepForComplete, setSelectedStepForComplete] = useState<ProductionStep | null>(null);
  const [selectedStepForQuickMerch, setSelectedStepForQuickMerch] = useState<ProductionStep | null>(null);

  // Quick add input form state
  const [activeStepForAddInput, setActiveStepForAddInput] = useState<number | null>(null);
  const [merchandises, setMerchandises] = useState<{ id: number; packageReference?: string; description?: string }[]>([]);
  const [selectedMerchandiseId, setSelectedMerchandiseId] = useState<number | null>(null);
  const [inputQuantity, setInputQuantity] = useState<number>(1);
  const [inputUnitCost, setInputUnitCost] = useState<number>(0);

  // Quick add step state
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepLabor, setNewStepLabor] = useState(0);
  const [newStepOther, setNewStepOther] = useState(0);

  const isFinalized = order.status === 'Validated' || order.status === 'Cancelled';

  const handleOpenAddInput = (stepId: number) => {
    setActiveStepForAddInput(stepId);
    if (merchandises.length === 0) {
      merchandiseService.getAll().then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setMerchandises(list);
        if (list.length > 0) setSelectedMerchandiseId(list[0].id);
      });
    }
  };

  const handleConfirmAddInput = async (stepId: number) => {
    if (!selectedMerchandiseId) return;
    await addInputMutation.mutateAsync({
      orderId: order.id,
      stepId,
      data: {
        merchandiseId: selectedMerchandiseId,
        plannedQuantity: inputQuantity > 0 ? inputQuantity : 1,
        unitCost: inputUnitCost > 0 ? inputUnitCost : undefined,
      },
    });
    setActiveStepForAddInput(null);
    setInputQuantity(1);
    setInputUnitCost(0);
  };

  const handleConfirmAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) return;

    await addStepMutation.mutateAsync({
      orderId: order.id,
      data: {
        name: newStepName.trim(),
        laborCost: newStepLabor,
        otherCost: newStepOther,
        plannedOutputQuantity: order.plannedOutputQuantity,
      },
    });

    setIsAddStepOpen(false);
    setNewStepName('');
    setNewStepLabor(0);
    setNewStepOther(0);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-corp-blue-600" />
            Chaîne de Transformation ({order.steps.length} étapes)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivez le flux de matières d'étape en étape jusqu'au produit fini.
          </p>
        </div>

        {!isFinalized && (
          <Button
            size="sm"
            onClick={() => setIsAddStepOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" /> Ajouter une étape
          </Button>
        )}
      </div>

      {/* Add Step Inline Form */}
      {isAddStepOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 rounded-xl bg-slate-50 border border-slate-300 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Nouvelle Étape de Fabrication</span>
            <button onClick={() => setIsAddStepOpen(false)} className="text-slate-400 hover:text-slate-600">
              Annuler
            </button>
          </div>
          <form onSubmit={handleConfirmAddStep} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <Label className="text-[11px] text-slate-600">Nom de l'étape *</Label>
              <Input
                type="text"
                required
                placeholder="ex: Finition, Vernissage..."
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Main d'Œuvre (TND)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={newStepLabor}
                onChange={(e) => setNewStepLabor(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Autres Frais (TND)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={newStepOther}
                onChange={(e) => setNewStepOther(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div className="sm:col-span-4 flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddStepOpen(false)} className="h-8 text-xs">
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={addStepMutation.isPending} className="h-8 text-xs bg-corp-blue-600 text-white font-semibold">
                Enregistrer l'étape
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Steps List */}
      <div className="space-y-4">
        {order.steps.map((step, idx) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
          >
            {/* Step Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                  {step.stepNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{step.name}</h4>
                    <StepStatusBadge status={step.status} />
                  </div>
                  {step.description && <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>}
                </div>
              </div>

              {/* Step Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isFinalized && step.status !== 'Completed' && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedStepForComplete(step)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 gap-1.5 shadow-xs active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terminer l'étape
                  </Button>
                )}

                {!isFinalized && order.steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer l'étape ${step.name} ?`)) {
                        deleteStepMutation.mutate({ stepId: step.id, orderId: order.id });
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Supprimer cette étape"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Step Costs & Outputs Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-500 text-[11px]">Coût Main d'Œuvre : </span>
                  <strong className="font-mono text-slate-900">
                    {(step.laborCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-500 text-[11px]">Autres Frais : </span>
                  <strong className="font-mono text-slate-900">
                    {(step.otherCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="text-right">
                  <span className="text-slate-500 text-[11px]">Coût Total Étape : </span>
                  <strong className="font-mono font-bold text-corp-blue-700">
                    {(step.totalStepCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>
            </div>

            {/* Output Product Card */}
            <div className="p-3.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      Produit Sortant de l'Étape :
                    </span>
                    {step.outputMerchandiseRef ? (
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {step.outputMerchandiseRef}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Non assigné</span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {step.outputMerchandiseDesignation || 'Lot semi-fini ou article transformé.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Quantité Produite : </span>
                  <span className="font-mono font-bold text-slate-900">
                    {step.actualOutputQuantity ?? step.plannedOutputQuantity} U
                  </span>
                </div>

                {!isFinalized && !step.outputMerchandiseRef && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStepForQuickMerch(step)}
                    className="h-7 text-[11px] border-amber-300 text-amber-900 bg-white hover:bg-amber-50 gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" /> Créer lot sortie (Q3)
                  </Button>
                )}
              </div>
            </div>

            {/* Step Consumed Inputs */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-corp-blue-600" />
                  Matières Consommées ({step.inputs.length})
                </span>

                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddInput(step.id)}
                    className="text-xs text-corp-blue-600 hover:text-corp-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter matière
                  </button>
                )}
              </div>

              {/* Quick Add Input Form */}
              {activeStepForAddInput === step.id && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-end gap-2 text-xs">
                  <div className="flex-1 w-full">
                    <Label className="text-[11px] text-slate-600">Sélectionner la matière (Catalogue)</Label>
                    <select
                      value={selectedMerchandiseId ?? ''}
                      onChange={(e) => setSelectedMerchandiseId(parseInt(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {merchandises.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.packageReference ? `[${m.packageReference}] ` : ''}
                          {m.description || `Lot #${m.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <Label className="text-[11px] text-slate-600">Quantité</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(parseFloat(e.target.value) || 1)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div className="w-28">
                    <Label className="text-[11px] text-slate-600">Prix U (TND)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={inputUnitCost}
                      onChange={(e) => setInputUnitCost(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleConfirmAddInput(step.id)}
                      disabled={addInputMutation.isPending}
                      className="h-8 text-xs bg-corp-blue-600 text-white"
                    >
                      Valider
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStepForAddInput(null)}
                      className="h-8 text-xs"
                    >
                      X
                    </Button>
                  </div>
                </div>
              )}

              {/* Inputs Table */}
              {step.inputs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  Aucune matière déclarée pour cette étape.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {step.inputs.map((input) => (
                    <div
                      key={input.id}
                      className="p-3 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900">
                          {input.merchandiseRef || `Lot #${input.merchandiseId}`}
                        </span>
                        <span className="text-slate-500 ml-2">
                          — {input.merchandiseDesignation || 'Matière première'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-slate-400 text-[11px]">Consommation : </span>
                          <strong className="font-mono text-slate-900">
                            {input.actualQuantity ?? input.plannedQuantity} {input.unit || 'U'}
                          </strong>
                          {input.actualQuantity !== undefined && input.actualQuantity !== input.plannedQuantity && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              (Prévu: {input.plannedQuantity})
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 text-[11px]">Coût : </span>
                          <strong className="font-mono text-slate-900">
                            {(input.totalCost ?? 0).toFixed(3)} TND
                          </strong>
                        </div>

                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer cette matière de l’étape ?')) {
                                deleteInputMutation.mutate({ inputId: input.id, orderId: order.id });
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Supprimer la matière"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Complete Step Modal */}
      <CompleteStepModal
        isOpen={!!selectedStepForComplete}
        onClose={() => setSelectedStepForComplete(null)}
        orderId={order.id}
        step={selectedStepForComplete}
      />

      {/* Quick Merchandise Modal */}
      <QuickMerchandiseModal
        isOpen={!!selectedStepForQuickMerch}
        onClose={() => setSelectedStepForQuickMerch(null)}
        onCreated={(merchId, ref, desig) => {
          if (selectedStepForQuickMerch) {
            // Update the step with the newly created merchandise
            order.steps.forEach((s) => {
              if (s.id === selectedStepForQuickMerch.id) {
                s.outputMerchandiseId = merchId;
                s.outputMerchandiseRef = ref;
                s.outputMerchandiseDesignation = desig;
              }
            });
          }
        }}
      />
    </div>
  );
}
