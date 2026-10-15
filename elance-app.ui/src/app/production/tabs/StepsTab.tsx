'use client';

import React, { useState } from 'react';
import { ProductionOrder, ProductionStep } from '@/types/production';
import { StepStatusBadge } from '../components/ProductionStatusBadge';
import { CompleteStepModal } from '../components/CompleteStepModal';
import { QuickMerchandiseModal } from '../components/QuickMerchandiseModal';
import { StepWorkersModal } from '../components/StepWorkersModal';
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
  Users,
  Pencil,
} from 'lucide-react';
import {
  useAddProductionStep,
  useUpdateProductionStep,
  useDeleteProductionStep,
  useAddProductionInput,
  useDeleteProductionInput,
} from '@/hooks/use-production';
import { merchandiseService } from '@/services/components/merchandise.service';
import { motion } from 'framer-motion';
import { EditStepModal } from '../components/EditStepModal';
import { DeleteConfirmDialog } from '@/components/articles/delete-confirm-dialog';

interface StepsTabProps {
  order: ProductionOrder;
}

export function StepsTab({ order }: StepsTabProps) {
  const addStepMutation = useAddProductionStep();
  const updateStepMutation = useUpdateProductionStep();
  const deleteStepMutation = useDeleteProductionStep();
  const addInputMutation = useAddProductionInput();
  const deleteInputMutation = useDeleteProductionInput();

  const [selectedStepForComplete, setSelectedStepForComplete] = useState<ProductionStep | null>(null);
  const [selectedStepForQuickMerch, setSelectedStepForQuickMerch] = useState<ProductionStep | null>(null);
  const [selectedStepForWorkers, setSelectedStepForWorkers] = useState<ProductionStep | null>(null);
  const [selectedStepForEdit, setSelectedStepForEdit] = useState<ProductionStep | null>(null);
  const [deleteStepConfirm, setDeleteStepConfirm] = useState<ProductionStep | null>(null);
  const [deleteInputConfirm, setDeleteInputConfirm] = useState<{ id: number; designation: string } | null>(null);

  // Quick add input form state
  const [activeStepForAddInput, setActiveStepForAddInput] = useState<number | null>(null);
  const [merchandises, setMerchandises] = useState<{
    id: number;
    packageReference?: string;
    description?: string;
    cost_ht?: number;
    unit_price_ht?: number;
    article?: {
      id?: number;
      description?: string;
      lastpurchaseprice_ttc?: number;
      sellprice_ht?: number;
      unit?: string;
    };
  }[]>([]);
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
        if (list.length > 0) {
          setSelectedMerchandiseId(list[0].id);
          const initialCost = list[0].cost_ht ?? list[0].article?.lastpurchaseprice_ttc ?? 0;
          setInputUnitCost(Number(initialCost) || 0);
        }
      });
    } else if (selectedMerchandiseId) {
      const selected = merchandises.find((m) => m.id === selectedMerchandiseId);
      const initialCost = selected?.cost_ht ?? selected?.article?.lastpurchaseprice_ttc ?? 0;
      setInputUnitCost(Number(initialCost) || 0);
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStepForWorkers(step)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-8 gap-1.5 shadow-xs"
                >
                  <Users className="w-3.5 h-3.5 text-corp-blue-600" />
                  Ouvriers & Pointage
                </Button>

                {!isFinalized && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStepForEdit(step)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-8 gap-1.5 shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    Éditer l'étape
                  </Button>
                )}

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
                    onClick={() => setDeleteStepConfirm(step)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Supprimer cette étape"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Step Costs & Outputs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 text-[11px] block">Forfait Manuel</span>
                  <strong className="font-mono text-slate-900">
                    {(step.laborCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-slate-500 text-[11px] block">MO Ouvriers (Réel)</span>
                  <strong className="font-mono text-blue-700">
                    {(step.employeeLaborCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 text-[11px] block">Autres Frais</span>
                  <strong className="font-mono text-slate-900">
                    {(step.otherCost ?? 0).toFixed(3)} TND
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="text-right">
                  <span className="text-slate-500 text-[11px] block">Coût Total Étape</span>
                  <strong className="font-mono font-bold text-corp-blue-700 text-sm">
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
                      onChange={(e) => {
                        const newId = parseInt(e.target.value);
                        setSelectedMerchandiseId(newId);
                        const selected = merchandises.find((m) => m.id === newId);
                        const newCost = selected?.cost_ht ?? selected?.article?.lastpurchaseprice_ttc ?? 0;
                        setInputUnitCost(Number(newCost) || 0);
                      }}
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
                            onClick={() =>
                              setDeleteInputConfirm({
                                id: input.id,
                                designation: input.merchandiseDesignation || input.merchandiseRef || 'cette matière',
                              })
                            }
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

      {/* Edit Step Modal */}
      <EditStepModal
        isOpen={!!selectedStepForEdit}
        onClose={() => setSelectedStepForEdit(null)}
        orderId={order.id}
        step={selectedStepForEdit}
        isFinalized={isFinalized}
      />

      {/* Quick Merchandise Modal with Backend Persistence */}
      <QuickMerchandiseModal
        isOpen={!!selectedStepForQuickMerch}
        onClose={() => setSelectedStepForQuickMerch(null)}
        onCreated={async (merchId, ref, desig) => {
          if (selectedStepForQuickMerch) {
            try {
              await updateStepMutation.mutateAsync({
                stepId: selectedStepForQuickMerch.id,
                orderId: order.id,
                data: {
                  name: selectedStepForQuickMerch.name,
                  description: selectedStepForQuickMerch.description,
                  stepNumber: selectedStepForQuickMerch.stepNumber,
                  startDate: selectedStepForQuickMerch.startDate,
                  endDate: selectedStepForQuickMerch.endDate,
                  laborCost: selectedStepForQuickMerch.laborCost,
                  otherCost: selectedStepForQuickMerch.otherCost,
                  outputMerchandiseId: merchId,
                  plannedOutputQuantity: selectedStepForQuickMerch.plannedOutputQuantity,
                  actualOutputQuantity: selectedStepForQuickMerch.actualOutputQuantity,
                },
              });
              // Update local step reference for immediate UI feedback
              order.steps.forEach((s) => {
                if (s.id === selectedStepForQuickMerch.id) {
                  s.outputMerchandiseId = merchId;
                  s.outputMerchandiseRef = ref;
                  s.outputMerchandiseDesignation = desig;
                }
              });
              setSelectedStepForQuickMerch(null);
            } catch (err) {
              console.error('Erreur lors de la persistance du produit de sortie :', err);
            }
          }
        }}
      />

      {/* Step Workers & Labor Modal */}
      <StepWorkersModal
        isOpen={!!selectedStepForWorkers}
        onClose={() => setSelectedStepForWorkers(null)}
        order={order}
        step={selectedStepForWorkers}
      />

      {/* Delete Step Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteStepConfirm}
        onClose={() => setDeleteStepConfirm(null)}
        onConfirm={async () => {
          if (deleteStepConfirm) {
            await deleteStepMutation.mutateAsync({ stepId: deleteStepConfirm.id, orderId: order.id });
            setDeleteStepConfirm(null);
          }
        }}
        title={`Supprimer l'étape ${deleteStepConfirm?.name}`}
        description="Êtes-vous sûr de vouloir supprimer cette étape de fabrication ? Les matières consommées associées à cette étape seront également retirées."
        isLoading={deleteStepMutation.isPending}
      />

      {/* Delete Input (Material) Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteInputConfirm}
        onClose={() => setDeleteInputConfirm(null)}
        onConfirm={async () => {
          if (deleteInputConfirm) {
            await deleteInputMutation.mutateAsync({ inputId: deleteInputConfirm.id, orderId: order.id });
            setDeleteInputConfirm(null);
          }
        }}
        title="Supprimer la matière première"
        description={`Êtes-vous sûr de vouloir retirer "${deleteInputConfirm?.designation}" de l'étape ?`}
        isLoading={deleteInputMutation.isPending}
      />
    </div>
  );
}
