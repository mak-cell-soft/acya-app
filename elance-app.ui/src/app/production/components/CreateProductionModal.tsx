'use client';

import React, { useState, useEffect } from 'react';
import { ProductionModal } from './ProductionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Factory, Plus, Trash2, Calendar, MapPin, Layers, Sparkles } from 'lucide-react';
import { useCreateProductionOrder } from '@/hooks/use-production';
import { salesSitesService } from '@/services/components/salessites.service';
import { merchandiseService } from '@/services/components/merchandise.service';
import { CreateProductionOrderInput } from '@/types/production';

interface CreateProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepFormItem {
  stepNumber: number;
  name: string;
  description: string;
  laborCost: number;
  otherCost: number;
  plannedOutputQuantity: number;
  inputs: {
    merchandiseId: number;
    plannedQuantity: number;
    unitCost?: number;
  }[];
}

export function CreateProductionModal({ isOpen, onClose }: CreateProductionModalProps) {
  const createOrderMutation = useCreateProductionOrder();

  const [sites, setSites] = useState<{ id: number; address: string }[]>([]);
  const [merchandises, setMerchandises] = useState<{ id: number; packageReference?: string; description?: string }[]>([]);

  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [salesSiteId, setSalesSiteId] = useState<number | null>(null);
  const [plannedStartDate, setPlannedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [plannedOutputQuantity, setPlannedOutputQuantity] = useState<number>(1);

  const [steps, setSteps] = useState<StepFormItem[]>([
    {
      stepNumber: 1,
      name: 'Découpe & Façonnage',
      description: '',
      laborCost: 0,
      otherCost: 0,
      plannedOutputQuantity: 1,
      inputs: [],
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      salesSitesService.getAll().then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setSites(list);
        if (list.length > 0 && !salesSiteId) {
          setSalesSiteId(list[0].id);
        }
      });

      merchandiseService.getAll().then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setMerchandises(list);
      });

      // Suggest reference
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rnd = Math.floor(100 + Math.random() * 900);
      setReference(`OF-${todayStr}-${rnd}`);
    }
  }, [isOpen]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        name: `Étape ${prev.length + 1}`,
        description: '',
        laborCost: 0,
        otherCost: 0,
        plannedOutputQuantity,
        inputs: [],
      },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const updateStepField = (index: number, field: keyof StepFormItem, value: any) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addInputToStep = (stepIndex: number) => {
    if (merchandises.length === 0) return;
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex
          ? {
              ...s,
              inputs: [
                ...s.inputs,
                {
                  merchandiseId: merchandises[0].id,
                  plannedQuantity: 1,
                  unitCost: 0,
                },
              ],
            }
          : s
      )
    );
  };

  const removeInputFromStep = (stepIndex: number, inputIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex
          ? {
              ...s,
              inputs: s.inputs.filter((_, idx) => idx !== inputIndex),
            }
          : s
      )
    );
  };

  const updateInputField = (stepIndex: number, inputIndex: number, field: string, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex
          ? {
              ...s,
              inputs: s.inputs.map((inp, idx) => (idx === inputIndex ? { ...inp, [field]: value } : inp)),
            }
          : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesSiteId) return;

    const payload: CreateProductionOrderInput = {
      reference: reference.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      salesSiteId,
      plannedStartDate: new Date(plannedStartDate).toISOString(),
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate).toISOString() : undefined,
      plannedOutputQuantity: plannedOutputQuantity > 0 ? plannedOutputQuantity : 1,
      steps: steps.map((s) => ({
        stepNumber: s.stepNumber,
        name: s.name,
        description: s.description || undefined,
        laborCost: s.laborCost,
        otherCost: s.otherCost,
        plannedOutputQuantity: s.plannedOutputQuantity,
        inputs: s.inputs.map((inp) => ({
          merchandiseId: inp.merchandiseId,
          plannedQuantity: inp.plannedQuantity,
          unitCost: inp.unitCost,
        })),
      })),
    };

    await createOrderMutation.mutateAsync(payload);
    onClose();
  };

  return (
    <ProductionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un Ordre de Fabrication"
      subtitle="Configurez l'ordre, le site de stockage et la chaîne de transformation multi-étapes."
      icon={<Factory className="w-5 h-5 text-amber-400" />}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <Label className="text-xs text-slate-700 font-bold">Référence *</Label>
            <div className="relative mt-1.5">
              <Input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="text-xs font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-corp-blue-600" /> Site / Dépôt Stock *
            </Label>
            <select
              value={salesSiteId ?? ''}
              onChange={(e) => setSalesSiteId(parseInt(e.target.value))}
              required
              className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-corp-blue-500"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.address}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-slate-700 font-bold">Quantité Finale Produite Prévue *</Label>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={plannedOutputQuantity}
              onChange={(e) => setPlannedOutputQuantity(parseFloat(e.target.value) || 1)}
              className="mt-1.5 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date Début Prévue *
            </Label>
            <Input
              type="date"
              required
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
              className="mt-1.5 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date Fin Estimée
            </Label>
            <Input
              type="date"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
              className="mt-1.5 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-700 font-bold">Désignation / Intitulé</Label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Fabrication de panneaux chêne"
              className="mt-1.5 text-xs"
            />
          </div>
        </div>

        {/* Steps Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-corp-blue-600" />
                Étapes de Fabrication & Matières Consommées
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Décrivez chaque étape et les matières premières qu'elle consomme.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              className="h-8 text-xs gap-1.5 border-slate-300 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une étape
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, sIdx) => (
              <div
                key={sIdx}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4 relative"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {step.stepNumber}
                    </span>
                    <Input
                      type="text"
                      required
                      placeholder="Nom de l'étape (ex: Découpe, Rabotage, Assemblage)"
                      value={step.name}
                      onChange={(e) => updateStepField(sIdx, 'name', e.target.value)}
                      className="text-xs font-bold max-w-sm h-8"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(sIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Supprimer cette étape"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Costs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-500">Main d'Œuvre (TND)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={step.laborCost}
                      onChange={(e) => updateStepField(sIdx, 'laborCost', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500">Autres Frais (TND)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={step.otherCost}
                      onChange={(e) => updateStepField(sIdx, 'otherCost', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px] text-slate-500">Note sur l'étape</Label>
                    <Input
                      type="text"
                      value={step.description}
                      onChange={(e) => updateStepField(sIdx, 'description', e.target.value)}
                      placeholder="Instructions spécifiques pour les opérateurs..."
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Inputs for this step */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Matières consommées ({step.inputs.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => addInputToStep(sIdx)}
                      className="text-[11px] text-corp-blue-600 hover:text-corp-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Ajouter matière
                    </button>
                  </div>

                  {step.inputs.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-1">
                      Aucune matière première associée à cette étape pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {step.inputs.map((inp, inpIdx) => (
                        <div key={inpIdx} className="flex items-center gap-2">
                          <select
                            value={inp.merchandiseId}
                            onChange={(e) =>
                              updateInputField(sIdx, inpIdx, 'merchandiseId', parseInt(e.target.value))
                            }
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium"
                          >
                            {merchandises.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.packageReference ? `[${m.packageReference}] ` : ''}
                                {m.description || `Lot #${m.id}`}
                              </option>
                            ))}
                          </select>

                          <div className="w-28">
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              required
                              placeholder="Qté"
                              value={inp.plannedQuantity}
                              onChange={(e) =>
                                updateInputField(
                                  sIdx,
                                  inpIdx,
                                  'plannedQuantity',
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div className="w-24">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="Prix U"
                              value={inp.unitCost ?? 0}
                              onChange={(e) =>
                                updateInputField(
                                  sIdx,
                                  inpIdx,
                                  'unitCost',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeInputFromStep(sIdx, inpIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 text-xs">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={createOrderMutation.isPending || !salesSiteId}
            className="h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-1.5 shadow-sm"
          >
            <Factory className="w-4 h-4 text-amber-400" />
            {createOrderMutation.isPending ? 'Création...' : 'Créer l’Ordre de Fabrication'}
          </Button>
        </div>
      </form>
    </ProductionModal>
  );
}
