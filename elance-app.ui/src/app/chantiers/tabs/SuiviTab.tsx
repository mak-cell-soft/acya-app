'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Flag, Calendar, MessageSquare, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail, ChantierEntryType, ChantierEntryStatus, ChantierAlertType } from '@/types/chantier';
import { useAddProgressEntry, useAddChantierAlert, useResolveChantierAlert } from '@/hooks/use-chantiers';
import { cn } from '@/lib/utils';

interface SuiviTabProps {
  site: ChantierDetail;
}

export function SuiviTab({ site }: SuiviTabProps) {
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryType, setEntryType] = useState<ChantierEntryType>('DailyReport');

  const [isAddAlertOpen, setIsAddAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<ChantierAlertType>('Warning');

  const addEntry = useAddProgressEntry(site.id);
  const addAlert = useAddChantierAlert(site.id);
  const resolveAlert = useResolveChantierAlert(site.id);

  const timeline = site.progressEntries || [];
  const alerts = site.alerts || [];

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTitle.trim()) return;

    await addEntry.mutateAsync({
      title: entryTitle.trim(),
      description: entryDesc.trim() || undefined,
      entryType,
      entryStatus: 'Done'
    });

    setIsAddEntryOpen(false);
    setEntryTitle('');
    setEntryDesc('');
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;

    await addAlert.mutateAsync({
      message: alertMessage.trim(),
      alertType
    });

    setIsAddAlertOpen(false);
    setAlertMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-['Outfit',sans-serif]">
      {/* Timeline Column */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="border-b border-black/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">Journal de chantier & Événements</CardTitle>
            <Button
              size="sm"
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-bold rounded-xl active:scale-[0.96] transition-transform min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Nouvelle note
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              {timeline.map((ev, i) => (
                <div key={ev.id} className="flex gap-4 relative pb-8 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-[3px] z-10 bg-white ring-1 ring-black/5",
                      ev.entryType === 'Milestone' ? 'border-[#2563eb]' :
                      ev.entryType === 'Issue' ? 'border-[#dc2626]' :
                      'border-[#10b981]'
                    )} />
                    {i < timeline.length - 1 && <div className="w-[2px] h-full bg-[#f0f0f0] absolute top-4 left-[7px]" />}
                  </div>
                  <div className="-mt-1 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#888780] tabular-nums">
                        {new Date(ev.entryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f8f9fa] text-[#888780]">
                        {ev.entryType}
                      </span>
                    </div>
                    <div className="font-bold text-[#1a1a1a] text-sm">{ev.title}</div>
                    {ev.description && <div className="text-xs text-[#666] mt-1 leading-relaxed [text-wrap:pretty]">{ev.description}</div>}
                  </div>
                </div>
              ))}

              {timeline.length === 0 && (
                <div className="py-8 text-center text-[#888780] text-xs [text-wrap:pretty]">
                  Aucun événement consigné dans le journal pour le moment.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Vigilance Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="border-b border-black/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">Alertes & Vigilance</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddAlertOpen(true)}
              className="text-xs font-bold rounded-xl border-black/10 hover:bg-red-50 text-red-600 hover:text-red-700 active:scale-[0.96] transition-transform min-h-[36px]"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Signaler
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-colors",
                    a.isResolved
                      ? 'bg-[#f8f9fa] border-black/5 text-[#888780] opacity-60'
                      : a.alertType === 'Critical'
                      ? 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
                      : 'bg-[#fffbeb] border-[#fde68a] text-[#d97706]'
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight m-0 [text-wrap:pretty]">{a.message}</p>
                      <span className="text-[0.65rem] opacity-75 mt-1 block tabular-nums">
                        {new Date(a.createdAt).toLocaleDateString('fr-FR')} · {a.alertType}
                      </span>
                    </div>
                  </div>

                  {!a.isResolved && (
                    <button
                      onClick={() => resolveAlert.mutate(a.id)}
                      title="Marquer comme résolu"
                      className="p-1 rounded-lg hover:bg-black/5 text-current cursor-pointer active:scale-[0.96] transition-transform shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] text-xs">
                  Aucune alerte active sur ce chantier. Tout est sous contrôle.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Nouvelle note journal */}
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Ajouter une note au journal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Titre de l'événement</label>
              <Input
                type="text"
                placeholder="Ex: Visite du bureau de contrôle Veritas"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Type d'entrée</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as ChantierEntryType)}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                <option value="DailyReport">Rapport journalier</option>
                <option value="Milestone">Étape clé / Jalon</option>
                <option value="Observation">Observation</option>
                <option value="Issue">Problème / Alerte</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Détails de la note</label>
              <Input
                type="text"
                placeholder="Précisions sur les travaux réalisés, conditions météo..."
                value={entryDesc}
                onChange={(e) => setEntryDesc(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsAddEntryOpen(false)} className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]">
                Annuler
              </Button>
              <Button type="submit" disabled={addEntry.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4">
                {addEntry.isPending ? 'Enregistrement...' : 'Consigner la note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Nouvelle Alerte */}
      <Dialog open={isAddAlertOpen} onOpenChange={setIsAddAlertOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Signaler un point de vigilance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAlert} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Niveau de gravité</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as ChantierAlertType)}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                <option value="Warning">Point de vigilance (Orange)</option>
                <option value="Critical">Blocage critique (Rouge)</option>
                <option value="Info">Simple information (Bleu)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Description du risque / problème</label>
              <Input
                type="text"
                placeholder="Ex: Retard livraison acier par le fournisseur"
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                required
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsAddAlertOpen(false)} className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]">
                Annuler
              </Button>
              <Button type="submit" disabled={addAlert.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4">
                {addAlert.isPending ? 'Enregistrement...' : 'Signaler l\'alerte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
