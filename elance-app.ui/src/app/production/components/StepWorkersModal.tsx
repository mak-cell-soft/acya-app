'use client';

import React, { useState } from 'react';
import { ProductionOrder, ProductionStep, ProductionStepWorker, ProductionStepWorkLog } from '@/types/production';
import { ProductionModal } from './ProductionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Coins,
  Calculator,
  CheckCircle2,
  Info,
  Lock,
} from 'lucide-react';
import {
  useStepWorkers,
  useAddStepWorker,
  useUpdateStepWorker,
  useDeleteStepWorker,
  useStepWorkLogs,
  useAddStepWorkLog,
  useUpdateStepWorkLog,
  useDeleteStepWorkLog,
} from '@/hooks/use-production';
import { usePersons } from '@/hooks/use-team';
import {
  formatCalendarDate,
  getTodayCalendarDate,
  isStepLaborEditable,
  filterAvailableEmployees,
  computeStepLaborTotals,
} from '@/lib/production-labor-utils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface StepWorkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  step: ProductionStep | null;
}

export function StepWorkersModal({ isOpen, onClose, order, step }: StepWorkersModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'workers' | 'logs'>('workers');

  // React Query hooks for workers & logs
  const { data: stepWorkers = [], isLoading: isWorkersLoading } = useStepWorkers(step?.id);
  const { data: stepWorkLogs = [], isLoading: isLogsLoading } = useStepWorkLogs(step?.id);
  const { data: allPersons = [] } = usePersons();

  // Mutations
  const addWorkerMutation = useAddStepWorker();
  const updateWorkerMutation = useUpdateStepWorker();
  const deleteWorkerMutation = useDeleteStepWorker();

  const addLogMutation = useAddStepWorkLog();
  const updateLogMutation = useUpdateStepWorkLog();
  const deleteLogMutation = useDeleteStepWorkLog();

  // Add Worker Form State
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [plannedHours, setPlannedHours] = useState<number>(0);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<number>(0);
  const [workerNotes, setWorkerNotes] = useState<string>('');

  // Edit Worker Form State
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [editPlannedHours, setEditPlannedHours] = useState<number>(0);
  const [editDefaultHourlyRate, setEditDefaultHourlyRate] = useState<number>(0);
  const [editWorkerNotes, setEditWorkerNotes] = useState<string>('');

  // Add Work Log Form State
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [logStepWorkerId, setLogStepWorkerId] = useState<number | null>(null);
  const [logWorkDate, setLogWorkDate] = useState<string>(getTodayCalendarDate());
  const [logActualHours, setLogActualHours] = useState<number>(1);
  const [logHourlyRate, setLogHourlyRate] = useState<number | undefined>(undefined);
  const [logNotes, setLogNotes] = useState<string>('');

  // Edit Work Log Form State
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLogWorkDate, setEditLogWorkDate] = useState<string>('');
  const [editLogActualHours, setEditLogActualHours] = useState<number>(1);
  const [editLogHourlyRate, setEditLogHourlyRate] = useState<number | undefined>(undefined);
  const [editLogNotes, setEditLogNotes] = useState<string>('');

  if (!step) return null;

  const isEditable = isStepLaborEditable(order.status, step.status);

  // Filter available employees (not already assigned to this step)
  const assignedPersonIds = stepWorkers.map((w) => w.personId);
  const availableEmployees = filterAvailableEmployees(allPersons, assignedPersonIds);

  // Compute intermediate totals
  const totals = computeStepLaborTotals(stepWorkers, stepWorkLogs, step.laborCost ?? 0);

  // ── WORKER ACTIONS ─────────────────────────────────────────────────────────

  const handleOpenAddWorker = () => {
    setIsAddWorkerOpen(true);
    if (availableEmployees.length > 0) {
      setSelectedPersonId(availableEmployees[0].id);
    } else {
      setSelectedPersonId(null);
    }
    setPlannedHours(0);
    setDefaultHourlyRate(0);
    setWorkerNotes('');
  };

  const handleConfirmAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) return;

    await addWorkerMutation.mutateAsync({
      stepId: step.id,
      orderId: order.id,
      data: {
        personId: selectedPersonId,
        plannedHours: Number(plannedHours) || 0,
        defaultHourlyRate: Number(defaultHourlyRate) || 0,
        notes: workerNotes.trim() || undefined,
      },
    });

    setIsAddWorkerOpen(false);
  };

  const handleStartEditWorker = (worker: ProductionStepWorker) => {
    setEditingWorkerId(worker.id);
    setEditPlannedHours(worker.plannedHours);
    setEditDefaultHourlyRate(worker.defaultHourlyRate);
    setEditWorkerNotes(worker.notes || '');
  };

  const handleConfirmUpdateWorker = async (workerId: number) => {
    await updateWorkerMutation.mutateAsync({
      workerId,
      stepId: step.id,
      orderId: order.id,
      data: {
        plannedHours: Number(editPlannedHours) || 0,
        defaultHourlyRate: Number(editDefaultHourlyRate) || 0,
        notes: editWorkerNotes.trim() || undefined,
      },
    });
    setEditingWorkerId(null);
  };

  const handleDeleteWorker = async (worker: ProductionStepWorker) => {
    if (window.confirm(`Retirer l'affectation de ${worker.employeeFullName} ?`)) {
      await deleteWorkerMutation.mutateAsync({
        workerId: worker.id,
        stepId: step.id,
        orderId: order.id,
      });
    }
  };

  // ── WORK LOG ACTIONS ───────────────────────────────────────────────────────

  const handleOpenAddLog = () => {
    setIsAddLogOpen(true);
    if (stepWorkers.length > 0) {
      setLogStepWorkerId(stepWorkers[0].id);
      setLogHourlyRate(stepWorkers[0].defaultHourlyRate);
    } else {
      setLogStepWorkerId(null);
      setLogHourlyRate(undefined);
    }
    setLogWorkDate(getTodayCalendarDate());
    setLogActualHours(1);
    setLogNotes('');
  };

  const handleWorkerSelectionChange = (workerId: number) => {
    setLogStepWorkerId(workerId);
    const selected = stepWorkers.find((w) => w.id === workerId);
    if (selected) {
      setLogHourlyRate(selected.defaultHourlyRate);
    }
  };

  const handleConfirmAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logStepWorkerId || !logWorkDate) return;

    await addLogMutation.mutateAsync({
      stepId: step.id,
      orderId: order.id,
      data: {
        stepWorkerId: logStepWorkerId,
        workDate: logWorkDate,
        actualHours: Number(logActualHours) || 0,
        hourlyRate: logHourlyRate !== undefined && logHourlyRate !== null ? Number(logHourlyRate) : undefined,
        notes: logNotes.trim() || undefined,
      },
    });

    setIsAddLogOpen(false);
  };

  const handleStartEditLog = (log: ProductionStepWorkLog) => {
    setEditingLogId(log.id);
    setEditLogWorkDate(formatCalendarDate(log.workDate));
    setEditLogActualHours(log.actualHours);
    setEditLogHourlyRate(log.hourlyRate);
    setEditLogNotes(log.notes || '');
  };

  const handleConfirmUpdateLog = async (workLogId: number) => {
    if (!editLogWorkDate) return;

    await updateLogMutation.mutateAsync({
      workLogId,
      stepId: step.id,
      orderId: order.id,
      data: {
        workDate: editLogWorkDate,
        actualHours: Number(editLogActualHours) || 0,
        hourlyRate: editLogHourlyRate !== undefined && editLogHourlyRate !== null ? Number(editLogHourlyRate) : undefined,
        notes: editLogNotes.trim() || undefined,
      },
    });

    setEditingLogId(null);
  };

  const handleDeleteLog = async (log: ProductionStepWorkLog) => {
    if (window.confirm(`Supprimer cette session de travail (${log.actualHours} h le ${formatCalendarDate(log.workDate)}) ?`)) {
      await deleteLogMutation.mutateAsync({
        workLogId: log.id,
        stepId: step.id,
        orderId: order.id,
      });
    }
  };

  return (
    <ProductionModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Étape ${step.stepNumber} : ${step.name} — Main d'Œuvre`}
      subtitle="Gestion des affectations d'ouvriers et enregistrement des sessions réelles de travail."
      icon={<Users className="w-5 h-5 text-corp-blue-600" />}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Read-Only Notice if locked */}
        {!isEditable && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-3 text-amber-900 text-xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Modifications verrouillées : </span>
              {order.status === 'Validated'
                ? "Cet ordre de fabrication est validé (archivé en stock). Les temps de travail ne peuvent plus être modifiés."
                : order.status === 'Cancelled'
                ? "Cet ordre de fabrication est annulé."
                : "Cette étape de fabrication est annulée."}
            </div>
          </div>
        )}

        {/* Financial & Hours Overview Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Heures Prévues</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totals.estimatedPlannedHours.toFixed(1)} h
              </span>
              <span className="text-[10px] text-slate-400">estimé</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Montant est.: {totals.estimatedLaborCost.toFixed(3)} TND
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <span className="text-[11px] text-blue-700 font-medium block">Heures Réelles</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-blue-950 text-sm">
                {totals.actualWorkLogHours.toFixed(1)} h
              </span>
              <span className="text-[10px] text-blue-600">pointées</span>
            </div>
            <span className="text-[10px] text-blue-700 block mt-0.5">
              Coût ouvriers: {totals.actualWorkLogCost.toFixed(3)} TND
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Forfait Étape Manuel</span>
            <div className="mt-1">
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totals.manualLaborCost.toFixed(3)} TND
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Indépendant des ouvriers</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-[11px] text-emerald-800 font-medium block">Total Main d'Œuvre</span>
            <div className="mt-1">
              <span className="font-mono font-bold text-emerald-950 text-sm">
                {totals.totalStepLabor.toFixed(3)} TND
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Forfait + Ouvriers réels</span>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('workers')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                activeSubTab === 'workers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Ouvriers Affectés ({stepWorkers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('logs')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                activeSubTab === 'logs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Sessions Réelles Pointées ({stepWorkLogs.length})
            </button>
          </div>

          {/* Action button based on active subtab */}
          {isEditable && (
            <div>
              {activeSubTab === 'workers' ? (
                <Button
                  size="sm"
                  onClick={handleOpenAddWorker}
                  disabled={availableEmployees.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Affecter un ouvrier
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleOpenAddLog}
                  disabled={stepWorkers.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Pointer une session
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── TAB 1: WORKERS LIST & ADD FORM ─────────────────────────────────── */}
        {activeSubTab === 'workers' && (
          <div className="space-y-4">
            {/* Inline Add Worker Form */}
            {isAddWorkerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-50 border border-slate-300 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Nouvelle Affectation d'Ouvrier</span>
                  <button
                    type="button"
                    onClick={() => setIsAddWorkerOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Annuler
                  </button>
                </div>

                <form onSubmit={handleConfirmAddWorker} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-600">Sélectionner un employé *</Label>
                    <select
                      required
                      value={selectedPersonId ?? ''}
                      onChange={(e) => setSelectedPersonId(parseInt(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {availableEmployees.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstname} {p.lastname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Heures Prévues</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={plannedHours}
                      onChange={(e) => setPlannedHours(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Taux Horaire Convenu (TND/h)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={defaultHourlyRate}
                      onChange={(e) => setDefaultHourlyRate(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="text-[11px] text-slate-600">Notes / Rôle spécifique sur l'étape</Label>
                    <Input
                      type="text"
                      placeholder="ex: Opérateur toupie, découpe de précision..."
                      value={workerNotes}
                      onChange={(e) => setWorkerNotes(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addWorkerMutation.isPending || !selectedPersonId}
                      className="h-8 text-xs bg-slate-900 text-white font-semibold w-full"
                    >
                      Affecter
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Workers Table */}
            {isWorkersLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Chargement des ouvriers...</div>
            ) : stepWorkers.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucun ouvrier affecté à cette étape</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Affectez les membres de l'équipe chargés d'exécuter cette étape pour définir les temps prévisionnels et permettre le pointage réel.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {stepWorkers.map((worker) => {
                  const isEditing = editingWorkerId === worker.id;
                  const workerLogs = stepWorkLogs.filter((l) => l.stepWorkerId === worker.id);
                  const loggedHours = workerLogs.reduce((sum, l) => sum + (Number(l.actualHours) || 0), 0);
                  const loggedAmount = workerLogs.reduce((sum, l) => sum + (Number(l.calculatedLaborAmount) || 0), 0);

                  return (
                    <div key={worker.id} className="p-3.5 bg-white hover:bg-slate-50/50 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {worker.employeeFullName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{worker.employeeFullName}</span>
                            {worker.notes && (
                              <span className="text-slate-400 text-[11px] ml-2">— {worker.notes}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {isEditable && (
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {!isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditWorker(worker)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                  title="Modifier les prévisions"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorker(worker)}
                                  disabled={deleteWorkerMutation.isPending}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Retirer l'ouvrier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleConfirmUpdateWorker(worker.id)}
                                  disabled={updateWorkerMutation.isPending}
                                  className="h-7 text-[11px] bg-slate-900 text-white"
                                >
                                  Enregistrer
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingWorkerId(null)}
                                  className="h-7 text-[11px]"
                                >
                                  Annuler
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Editing Inline Form Fields */}
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <Label className="text-[10px] text-slate-500">Heures Prévues</Label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={editPlannedHours}
                              onChange={(e) => setEditPlannedHours(parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-mono mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Taux Horaire Convenu (TND/h)</Label>
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={editDefaultHourlyRate}
                              onChange={(e) => setEditDefaultHourlyRate(parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-mono mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Notes</Label>
                            <Input
                              type="text"
                              value={editWorkerNotes}
                              onChange={(e) => setEditWorkerNotes(e.target.value)}
                              className="h-7 text-xs mt-0.5"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Worker Metrics Details */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-50">
                          <div>
                            <span>Prévu : </span>
                            <strong className="font-mono text-slate-800">{worker.plannedHours} h</strong>
                          </div>
                          <div>
                            <span>Taux convenu : </span>
                            <strong className="font-mono text-slate-800">
                              {Number(worker.defaultHourlyRate).toFixed(3)} TND/h
                            </strong>
                          </div>
                          <div>
                            <span>Estimé : </span>
                            <strong className="font-mono text-slate-600">
                              {Number(worker.estimatedLaborAmount).toFixed(3)} TND
                            </strong>
                          </div>
                          <div>
                            <span>Pointé réel : </span>
                            <strong className="font-mono text-blue-700">
                              {loggedHours.toFixed(1)} h ({loggedAmount.toFixed(3)} TND)
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: WORK LOGS LIST & ADD FORM ───────────────────────────────────── */}
        {activeSubTab === 'logs' && (
          <div className="space-y-4">
            {/* Inline Add Work Log Form */}
            {isAddLogOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>Enregistrer une Session de Travail Réelle</span>
                  <button
                    type="button"
                    onClick={() => setIsAddLogOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Annuler
                  </button>
                </div>

                <form onSubmit={handleConfirmAddLog} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px] text-slate-600">Ouvrier *</Label>
                    <select
                      required
                      value={logStepWorkerId ?? ''}
                      onChange={(e) => handleWorkerSelectionChange(parseInt(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {stepWorkers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.employeeFullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Date d'intervention *</Label>
                    <Input
                      type="date"
                      required
                      value={logWorkDate}
                      onChange={(e) => setLogWorkDate(e.target.value)}
                      className="h-8 text-xs font-mono mt-1 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Heures Effectives *</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={logActualHours}
                      onChange={(e) => setLogActualHours(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono mt-1 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Taux appliqué (TND/h)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={logHourlyRate ?? ''}
                      placeholder="Défaut affectation"
                      onChange={(e) =>
                        setLogHourlyRate(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs font-mono mt-1 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="text-[11px] text-slate-600">Observations / Travail effectué</Label>
                    <Input
                      type="text"
                      placeholder="ex: Assemblage caissons, ponçage..."
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addLogMutation.isPending || !logStepWorkerId}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full"
                    >
                      Valider session
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Work Logs Table */}
            {isLogsLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Chargement des sessions...</div>
            ) : stepWorkLogs.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucune session de travail pointée</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Enregistrez les heures réelles passées par les ouvriers affectés pour calculer le coût effectif de l'étape et alimenter le récapitulatif des rémunérations.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {stepWorkLogs.map((log) => {
                  const isEditing = editingLogId === log.id;

                  return (
                    <div key={log.id} className="p-3 bg-white hover:bg-slate-50/50 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {formatCalendarDate(log.workDate)}
                          </span>
                          <span className="font-bold text-slate-900">{log.employeeFullName}</span>
                          {log.notes && <span className="text-slate-400 text-[11px]">— {log.notes}</span>}
                        </div>

                        {/* Actions */}
                        {isEditable && (
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {!isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLog(log)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                  title="Modifier la session"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  disabled={deleteLogMutation.isPending}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Supprimer la session"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleConfirmUpdateLog(log.id)}
                                  disabled={updateLogMutation.isPending}
                                  className="h-7 text-[11px] bg-slate-900 text-white"
                                >
                                  Enregistrer
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingLogId(null)}
                                  className="h-7 text-[11px]"
                                >
                                  Annuler
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit form inline */}
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <Label className="text-[10px] text-slate-500">Date d'intervention</Label>
                            <Input
                              type="date"
                              required
                              value={editLogWorkDate}
                              onChange={(e) => setEditLogWorkDate(e.target.value)}
                              className="h-7 text-xs font-mono mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Heures Réelles</Label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0.25"
                              value={editLogActualHours}
                              onChange={(e) => setEditLogActualHours(parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-mono mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Taux (TND/h)</Label>
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={editLogHourlyRate ?? ''}
                              onChange={(e) =>
                                setEditLogHourlyRate(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)
                              }
                              className="h-7 text-xs font-mono mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Notes</Label>
                            <Input
                              type="text"
                              value={editLogNotes}
                              onChange={(e) => setEditLogNotes(e.target.value)}
                              className="h-7 text-xs mt-0.5"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Log Metrics */
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px]">
                          <div className="flex items-center gap-4 text-slate-500">
                            <span>
                              Heures : <strong className="font-mono text-slate-900">{log.actualHours} h</strong>
                            </span>
                            <span>
                              Taux snapshot :{' '}
                              <strong className="font-mono text-slate-900">
                                {Number(log.hourlyRate).toFixed(3)} TND/h
                              </strong>
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400">Montant calculé : </span>
                            <strong className="font-mono font-bold text-blue-700">
                              {Number(log.calculatedLaborAmount).toFixed(3)} TND
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ProductionModal>
  );
}
