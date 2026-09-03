'use client';

import React, { useState } from 'react';
import { Settings, Plus, CheckCircle2, Clock, PlayCircle, AlertCircle, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail, ChantierTaskStatus } from '@/types/chantier';
import { useCreatePhase, useCreateTask, useUpdateTaskStatus } from '@/hooks/use-chantiers';
import { cn } from '@/lib/utils';

interface ProductionTabProps {
  site: ChantierDetail;
}

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
      startDate: new Date().toISOString()
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
      sortOrder: 0
    });

    setIsAddTaskOpen(false);
    setTaskLabel('');
    setTaskSubLabel('');
  };

  const cycleStatus = (phaseId: number, taskId: number, currentStatus: ChantierTaskStatus) => {
    let nextStatus: ChantierTaskStatus = 'InProgress';
    if (currentStatus === 'Planned' || (currentStatus as any) === 0) nextStatus = 'InProgress';
    else if (currentStatus === 'InProgress' || (currentStatus as any) === 1) nextStatus = 'Done';
    else if (currentStatus === 'Done' || (currentStatus as any) === 2) nextStatus = 'Planned';

    updateTaskStatus.mutate({
      taskId,
      input: { status: nextStatus, progressPct: nextStatus === 'Done' ? 100 : nextStatus === 'InProgress' ? 50 : 0 }
    });
  };

  return (
    <div className="flex flex-col gap-10 font-['Outfit',sans-serif]">
      {/* Top action bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Phases & Tâches opérationnelles</h3>
          <span className="text-xs text-[#888780] tabular-nums">{phases.length} phase(s) planifiée(s) pour ce chantier</span>
        </div>
        <Button
          onClick={() => setIsAddPhaseOpen(true)}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold px-4 active:scale-[0.96] transition-transform min-h-[40px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle phase
        </Button>
      </div>

      {phases.map((phase) => {
        const tasks = phase.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'Done' || (t.status as any) === 2).length;
        const phasePct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : phase.progressPct;

        return (
          <div key={phase.id} className="flex flex-col gap-4">
            {/* Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs"
                  style={{ backgroundColor: phase.color || '#2563eb' }}
                />
                <h4 className="text-sm font-extrabold text-[#1a1a1a] m-0">{phase.name}</h4>
                <span className="text-[0.68rem] font-bold text-[#888780] bg-[#f8f9fa] px-2 py-0.5 rounded-md tabular-nums">
                  {completedTasks}/{tasks.length} tâche(s) terminée(s)
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${phasePct}%`,
                      backgroundColor: phase.color || '#2563eb'
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-[#1a1a1a] tabular-nums w-8 text-right">{phasePct}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPhaseId(phase.id);
                    setIsAddTaskOpen(true);
                  }}
                  className="h-8 text-xs font-bold rounded-xl border-black/10 active:scale-[0.96] transition-transform"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tâche
                </Button>
              </div>
            </div>

            {/* Phase Tasks List */}
            <div className="flex flex-col gap-2">
              {tasks.map((task) => {
                const isTaskDone = task.status === 'Done' || (task.status as any) === 2;
                const isTaskInProgress = task.status === 'InProgress' || (task.status as any) === 1;
                const isTaskPlanned = task.status === 'Planned' || (task.status as any) === 0;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-black/5 hover:border-black/10 transition-colors gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => cycleStatus(phase.id, task.id, task.status)}
                        title="Cliquer pour changer le statut"
                        className={cn(
                          "text-[0.75rem] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-transform select-none min-h-[36px]",
                          isTaskDone
                            ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                            : isTaskInProgress
                            ? 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                            : 'bg-[#f8f9fa] text-[#888780] border border-[#e5e7eb]'
                        )}
                      >
                        {isTaskDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        {isTaskInProgress && <PlayCircle className="w-3.5 h-3.5 shrink-0" />}
                        {isTaskPlanned && <Clock className="w-3.5 h-3.5 shrink-0" />}
                        {isTaskDone ? 'Terminé' : isTaskInProgress ? 'En cours' : 'Planifié'}
                      </button>
                      <div className="min-w-0">
                        <div className="font-bold text-[#1a1a1a] text-sm truncate">{task.label}</div>
                        {task.subLabel && <div className="text-xs text-[#888780] font-medium truncate">{task.subLabel}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="p-6 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-xs bg-[#fafafa]">
                  Aucune tâche dans cette phase. Cliquez sur « Ajouter une tâche » pour commencer.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {phases.length === 0 && (
        <div className="p-12 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] bg-white">
          <h4 className="text-base font-bold text-[#1a1a1a] mb-1 [text-wrap:balance]">Aucune phase pour ce chantier</h4>
          <p className="text-xs text-[#888780] mb-4 [text-wrap:pretty]">Définissez les étapes clés (Gros œuvre, Électricité, Finitions...)</p>
          <Button onClick={() => setIsAddPhaseOpen(true)} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[40px]">
            Créer la première phase
          </Button>
        </div>
      )}

      {/* Modal: Ajouter une phase */}
      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Ajouter une phase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPhase} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Nom de la phase</label>
              <Input
                type="text"
                placeholder="Ex: Fondations et gros œuvre"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Couleur d'identification</label>
              <div className="flex gap-2.5">
                {['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPhaseColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-xl cursor-pointer active:scale-[0.96] transition-transform ring-2 ring-offset-2",
                      phaseColor === c ? "ring-[#1a1a1a]" : "ring-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsAddPhaseOpen(false)} className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]">
                Annuler
              </Button>
              <Button type="submit" disabled={createPhase.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4">
                {createPhase.isPending ? 'Création...' : 'Créer la phase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ajouter une tâche */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Ajouter une tâche opérationnelle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Intitulé de la tâche</label>
              <Input
                type="text"
                placeholder="Ex: Coulage des semelles de fondation"
                value={taskLabel}
                onChange={(e) => setTaskLabel(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Détails ou consignes techniques</label>
              <Input
                type="text"
                placeholder="Ex: Béton C25/30 avec hydrofuge de masse..."
                value={taskSubLabel}
                onChange={(e) => setTaskSubLabel(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)} className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]">
                Annuler
              </Button>
              <Button type="submit" disabled={createTask.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4">
                {createTask.isPending ? 'Ajout...' : 'Ajouter la tâche'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
