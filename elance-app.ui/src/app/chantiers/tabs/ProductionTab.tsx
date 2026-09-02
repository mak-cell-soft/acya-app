import React, { useState } from 'react';
import { Settings, Plus, CheckCircle2, Clock, PlayCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail, ChantierTaskStatus } from '@/types/chantier';
import { useCreatePhase, useCreateTask, useUpdateTaskStatus } from '@/hooks/use-chantiers';

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
    if (currentStatus === 'Planned') nextStatus = 'InProgress';
    else if (currentStatus === 'InProgress') nextStatus = 'Done';
    else if (currentStatus === 'Done') nextStatus = 'Planned';

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
          <h3 className="text-base font-bold text-[#1a1a1a] m-0">Phases & Tâches opérationnelles</h3>
          <span className="text-xs text-[#888780]">{phases.length} phase(s) planifiée(s) pour ce chantier</span>
        </div>
        <Button
          onClick={() => setIsAddPhaseOpen(true)}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold px-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle phase
        </Button>
      </div>

      {phases.map((phase) => {
        const tasks = phase.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'Done').length;
        const phasePct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : phase.progressPct;

        return (
          <div key={phase.id} className="flex flex-col gap-4">
            {/* Phase Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: phase.color || '#1a1a1a' }} />
                <h4 className="text-lg font-bold text-[#1a1a1a] m-0">{phase.name}</h4>
                <span className="text-xs font-semibold text-[#888780] bg-[#f0f0f0] px-2.5 py-0.5 rounded-full">
                  {completedTasks}/{tasks.length} terminées ({phasePct}%)
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => { setSelectedPhaseId(phase.id); setIsAddTaskOpen(true); }}
                className="rounded-lg font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une tâche
              </Button>
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-black/5 shadow-sm rounded-xl gap-4 hover:border-black/10 transition-all"
                >
                  <div className="flex-1">
                    <div className="font-bold text-[#1a1a1a] text-sm">{task.label}</div>
                    {task.subLabel && <div className="text-xs text-[#888780] font-medium mt-0.5">{task.subLabel}</div>}
                    {task.responsiblePersonName && (
                      <div className="text-[0.7rem] font-semibold text-[#2563eb] mt-1">
                        Responsable: {task.responsiblePersonName}
                      </div>
                    )}
                  </div>

                  {/* Interactive Status Pill */}
                  <div className="w-[130px]">
                    <button
                      onClick={() => cycleStatus(phase.id, task.id, task.status)}
                      title="Cliquer pour changer de statut"
                      className={`text-[0.75rem] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 ${
                        task.status === 'Done'
                          ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                          : task.status === 'InProgress'
                          ? 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                          : 'bg-[#f8f9fa] text-[#888780] border border-[#e5e7eb]'
                      }`}
                    >
                      {task.status === 'Done' && <CheckCircle2 className="w-3 h-3" />}
                      {task.status === 'InProgress' && <PlayCircle className="w-3 h-3" />}
                      {task.status === 'Planned' && <Clock className="w-3 h-3" />}
                      {task.status === 'Done' ? 'Terminé' : task.status === 'InProgress' ? 'En cours' : 'Planifié'}
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-[#888780] w-[140px]">
                    {new Date(task.startDate).toLocaleDateString('fr-FR')} {task.plannedEndDate ? `→ ${new Date(task.plannedEndDate).toLocaleDateString('fr-FR')}` : ''}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="p-6 text-center border border-dashed border-black/10 rounded-xl text-[#888780] font-medium text-xs bg-[#fafafa]">
                  Aucune tâche dans cette phase. Cliquez sur « Ajouter une tâche » pour commencer.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {phases.length === 0 && (
        <div className="p-12 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] bg-white">
          <h4 className="text-base font-bold text-[#1a1a1a] mb-1">Aucune phase pour ce chantier</h4>
          <p className="text-xs text-[#888780] mb-4">Définissez les étapes clés (Gros œuvre, Électricité, Finitions...)</p>
          <Button onClick={() => setIsAddPhaseOpen(true)} className="bg-[#2563eb] text-white rounded-xl text-xs font-bold">
            Créer la première phase
          </Button>
        </div>
      )}

      {/* Modal: Ajouter une phase */}
      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Créer une nouvelle phase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPhase} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Nom de la phase</label>
              <Input
                type="text"
                placeholder="Ex: Gros œuvre, Second œuvre, Finitions"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Couleur d'identification</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={phaseColor}
                  onChange={(e) => setPhaseColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-black/10 p-0.5"
                />
                <span className="text-xs font-semibold text-[#888780]">{phaseColor}</span>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddPhaseOpen(false)} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" disabled={createPhase.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold">
                {createPhase.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ajouter une tâche */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Ajouter une tâche opérationnelle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Libellé principal</label>
              <Input
                type="text"
                placeholder="Ex: Fondations, Coulage dalle, Pose fenêtres"
                value={taskLabel}
                onChange={(e) => setTaskLabel(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Détail / Sous-tâche</label>
              <Input
                type="text"
                placeholder="Ex: Semelles isolées, Béton armé B25"
                value={taskSubLabel}
                onChange={(e) => setTaskSubLabel(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddTaskOpen(false)} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" disabled={createTask.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold">
                {createTask.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
