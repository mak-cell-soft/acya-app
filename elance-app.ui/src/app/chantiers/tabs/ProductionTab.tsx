'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock, PlayCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail, ChantierTaskStatus } from '@/types/chantier';
import { useCreatePhase, useCreateTask, useUpdateTaskStatus } from '@/hooks/use-chantiers';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

interface ProductionTabProps {
  site: ChantierDetail;
}

const COLOR_PRESETS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function ProductionTab({ site }: ProductionTabProps) {
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [phaseName, setPhaseName] = useState('');
  const [phaseColor, setPhaseColor] = useState('#2563eb');

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number>(0);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskSubLabel, setTaskSubLabel] = useState('');

  const createPhase = useCreatePhase(site.id);
  const createTask = useCreateTask(site.id, selectedPhaseId);
  const updateTaskStatus = useUpdateTaskStatus(site.id, selectedPhaseId);

  const phases = site.phases || [];

  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName.trim()) return;

    await createPhase.mutateAsync({
      name: phaseName.trim(),
      color: phaseColor,
      sortOrder: phases.length + 1,
      startDate: new Date().toISOString(),
    });

    setIsAddPhaseOpen(false);
    setPhaseName('');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskLabel.trim() || selectedPhaseId <= 0) return;

    await createTask.mutateAsync({
      label: taskLabel.trim(),
      subLabel: taskSubLabel.trim() || undefined,
      startDate: new Date().toISOString(),
      sortOrder: 0,
    });

    setIsAddTaskOpen(false);
    setTaskLabel('');
    setTaskSubLabel('');
  };

  const cycleStatus = (phaseId: number, taskId: number, currentStatus: ChantierTaskStatus) => {
    let nextStatus: ChantierTaskStatus = 'InProgress';
    const statusStr = String(currentStatus);
    if (statusStr === 'Planned' || statusStr === '0') nextStatus = 'InProgress';
    else if (statusStr === 'InProgress' || statusStr === '1') nextStatus = 'Done';
    else if (statusStr === 'Done' || statusStr === '2') nextStatus = 'Planned';

    updateTaskStatus.mutate({
      taskId,
      input: {
        status: nextStatus,
        progressPct: nextStatus === 'Done' ? 100 : nextStatus === 'InProgress' ? 50 : 0,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] ring-1 ring-black/5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Phases & Tâches Opérationnelles
            </h3>
            <span className="text-xs text-[#64748b] tabular-nums">
              {phases.length} étape(s) planifiée(s) pour la réalisation des travaux
            </span>
          </div>
        </div>

        <Button
          onClick={() => setIsAddPhaseOpen(true)}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold px-4 active:scale-[0.96] transition-transform h-9.5 shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouvelle phase
        </Button>
      </div>

      {phases.map((phase) => {
        const tasks = phase.tasks || [];
        const completedTasks = tasks.filter(
          (t) => String(t.status) === 'Done' || String(t.status) === '2'
        ).length;
        const phasePct =
          tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : phase.progressPct;

        return (
          <div key={phase.id} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-black/5 shadow-xs">
            {/* Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-2xs shrink-0"
                  style={{ backgroundColor: phase.color || '#2563eb' }}
                />
                <h4 className="text-sm font-bold text-[#0f172a] m-0">{phase.name}</h4>
                <span className="text-[0.68rem] font-bold text-[#64748b] bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                  {completedTasks} / {tasks.length} tâche(s)
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-24 sm:w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${phasePct}%`,
                      backgroundColor: phase.color || '#2563eb',
                    }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#0f172a] tabular-nums w-8 text-right">
                  {phasePct}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPhaseId(phase.id);
                    setIsAddTaskOpen(true);
                  }}
                  className="h-8 text-xs font-bold rounded-xl border-black/15 active:scale-[0.96] transition-transform px-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tâche
                </Button>
              </div>
            </div>

            {/* Phase Tasks List */}
            <div className="flex flex-col gap-2 pt-1">
              {tasks.map((task) => {
                const statusStr = String(task.status);
                const isTaskDone = statusStr === 'Done' || statusStr === '2';
                const isTaskInProgress = statusStr === 'InProgress' || statusStr === '1';
                const isTaskPlanned = statusStr === 'Planned' || statusStr === '0';

                return (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-black/5 hover:border-black/15 transition-colors gap-3 bg-[#f8fafc]/50"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => cycleStatus(phase.id, task.id, task.status)}
                        title="Cliquer pour faire évoluer le statut"
                        className={cn(
                          'text-[0.72rem] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-transform select-none min-h-[34px] shrink-0 border',
                          isTaskDone
                            ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                            : isTaskInProgress
                            ? 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]'
                            : 'bg-white text-[#64748b] border-slate-200'
                        )}
                      >
                        {isTaskDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#10b981]" />}
                        {isTaskInProgress && <PlayCircle className="w-3.5 h-3.5 shrink-0 text-[#2563eb]" />}
                        {isTaskPlanned && <Clock className="w-3.5 h-3.5 shrink-0 text-[#94a3b8]" />}
                        <span>{isTaskDone ? 'Terminé' : isTaskInProgress ? 'En cours' : 'Planifié'}</span>
                      </button>

                      <div className="min-w-0">
                        <div className={cn(
                          'font-bold text-xs sm:text-sm text-[#0f172a] truncate',
                          isTaskDone && 'line-through text-[#94a3b8]'
                        )}>
                          {task.label}
                        </div>
                        {task.subLabel && (
                          <div className="text-[0.7rem] text-[#64748b] truncate">{task.subLabel}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="p-4 text-center border border-dashed border-black/10 rounded-xl text-[#94a3b8] text-xs bg-[#fafafa]">
                  Aucune tâche dans cette phase. Cliquez sur « Tâche » pour démarrer la planification.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {phases.length === 0 && (
        <div className="p-12 text-center border border-dashed border-black/10 rounded-2xl text-[#64748b] bg-white">
          <h4 className="text-base font-bold text-[#0f172a] mb-1 [text-wrap:balance]">
            Aucune phase configurée pour ce chantier
          </h4>
          <p className="text-xs text-[#64748b] mb-4 [text-wrap:pretty]">
            Définissez les étapes clés du projet (ex: Fondations, Gros œuvre, Menuiserie, Finitions).
          </p>
          <Button
            onClick={() => setIsAddPhaseOpen(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform h-9.5 px-4 shadow-xs"
          >
            Créer la première phase
          </Button>
        </div>
      )}

      {/* Modal: Ajouter une phase */}
      <ChantierModal
        open={isAddPhaseOpen}
        onOpenChange={setIsAddPhaseOpen}
        title="Ajouter une phase"
        description="Créez une nouvelle grande étape opérationnelle du chantier."
        icon={Layers}
        maxWidthClass="sm:max-w-[440px]"
        onSubmit={handleAddPhase}
        submitLabel="Créer la phase"
        isSubmitting={createPhase.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Nom de la phase" required>
            <Input
              type="text"
              placeholder="Ex: Fondations et gros œuvre"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Couleur d'identification">
            <div className="flex gap-2 pt-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPhaseColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-xl cursor-pointer active:scale-[0.96] transition-transform ring-2 ring-offset-2',
                    phaseColor === c ? 'ring-[#0f172a]' : 'ring-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </FormFieldGroup>
        </div>
      </ChantierModal>

      {/* Modal: Ajouter une tâche */}
      <ChantierModal
        open={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        title="Ajouter une tâche opérationnelle"
        description="Détaillez une tâche spécifique à réaliser au cours de cette phase."
        icon={Plus}
        maxWidthClass="sm:max-w-[440px]"
        onSubmit={handleAddTask}
        submitLabel="Ajouter la tâche"
        isSubmitting={createTask.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Intitulé de la tâche" required>
            <Input
              type="text"
              placeholder="Ex: Coulage semelles béton armé"
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Détails ou spécifications techniques">
            <Input
              type="text"
              placeholder="Ex: Béton C25/30 avec adjuvant hydrofuge..."
              value={taskSubLabel}
              onChange={(e) => setTaskSubLabel(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
