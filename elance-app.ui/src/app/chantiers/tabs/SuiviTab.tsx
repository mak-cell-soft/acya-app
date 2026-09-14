'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Check,
  ShieldAlert,
  CalendarDays,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail, ChantierEntryType, ChantierAlertType } from '@/types/chantier';
import {
  useAddProgressEntry,
  useAddChantierAlert,
  useResolveChantierAlert,
} from '@/hooks/use-chantiers';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

interface SuiviTabProps {
  site: ChantierDetail;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  DailyReport: 'Rapport journalier',
  Milestone: 'Étape clé / Jalon',
  Observation: 'Observation',
  Issue: 'Incident / Alerte',
  '0': 'Rapport journalier',
  '1': 'Étape clé / Jalon',
  '2': 'Observation',
  '3': 'Incident / Alerte',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  Critical: 'Blocage critique',
  Warning: 'Point de vigilance',
  Info: 'Information',
  '0': 'Blocage critique',
  '1': 'Point de vigilance',
  '2': 'Information',
};

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
      entryStatus: 'Done',
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
      alertType,
    });

    setIsAddAlertOpen(false);
    setAlertMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Timeline Column */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Card className="border-black/5 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Journal de Chantier & Événements
              </CardTitle>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-bold rounded-xl active:scale-[0.96] transition-transform h-8.5 px-3.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouvelle note
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex flex-col">
              {timeline.map((ev, i) => {
                const typeKey = String(ev.entryType);
                const isMilestone = typeKey === 'Milestone' || typeKey === '1';
                const isIssue = typeKey === 'Issue' || typeKey === '3';
                const typeLabel = ENTRY_TYPE_LABELS[typeKey] || typeKey;

                return (
                  <div key={ev.id} className="flex gap-4 relative pb-7 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border-2 z-10 bg-white ring-2 ring-white shadow-2xs',
                          isMilestone
                            ? 'border-[#2563eb] bg-[#2563eb]'
                            : isIssue
                            ? 'border-[#dc2626] bg-[#dc2626]'
                            : 'border-[#10b981] bg-[#10b981]'
                        )}
                      />
                      {i < timeline.length - 1 && (
                        <div className="w-[1.5px] h-full bg-slate-200 absolute top-3.5 left-[6.5px]" />
                      )}
                    </div>

                    <div className="-mt-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[0.7rem] font-bold text-[#64748b] tabular-nums">
                          {new Date(ev.entryDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span
                          className={cn(
                            'text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border',
                            isMilestone
                              ? 'bg-blue-50 text-[#1e40af] border-blue-200'
                              : isIssue
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {typeLabel}
                        </span>
                      </div>
                      <div className="font-bold text-[#0f172a] text-sm">{ev.title}</div>
                      {ev.description && (
                        <div className="text-xs text-[#475569] mt-1 leading-relaxed [text-wrap:pretty]">
                          {ev.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {timeline.length === 0 && (
                <div className="py-8 text-center text-[#94a3b8] text-xs [text-wrap:pretty]">
                  Aucun événement ou note consigné dans le journal pour le moment.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Vigilance Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card className="border-black/5 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Alertes & Vigilance
              </CardTitle>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddAlertOpen(true)}
              className="text-xs font-bold rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 active:scale-[0.96] transition-transform h-8.5 px-3"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Signaler
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              {alerts.map((a) => {
                const alertKey = String(a.alertType);
                const isCritical = alertKey === 'Critical' || alertKey === '0';
                const alertLabel = ALERT_TYPE_LABELS[alertKey] || alertKey;

                return (
                  <div
                    key={a.id}
                    className={cn(
                      'flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-colors',
                      a.isResolved
                        ? 'bg-slate-50 border-black/5 text-[#94a3b8] opacity-60'
                        : isCritical
                        ? 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
                        : 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]'
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-snug m-0 [text-wrap:pretty]">
                          {a.message}
                        </p>
                        <span className="text-[0.68rem] opacity-75 mt-1 block tabular-nums font-medium">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')} · {alertLabel}
                        </span>
                      </div>
                    </div>

                    {!a.isResolved && (
                      <button
                        type="button"
                        onClick={() => resolveAlert.mutate(a.id)}
                        title="Marquer comme résolu"
                        className="p-1 rounded-lg hover:bg-black/5 text-current cursor-pointer active:scale-[0.96] transition-transform shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {alerts.length === 0 && (
                <div className="p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#64748b] text-xs">
                  Aucune alerte active sur ce chantier. Tout est nominal.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Nouvelle note journal */}
      <ChantierModal
        open={isAddEntryOpen}
        onOpenChange={setIsAddEntryOpen}
        title="Ajouter une note au journal"
        description="Enregistrez un rapport, constat météo ou avancement remarquable."
        icon={FileText}
        maxWidthClass="sm:max-w-[460px]"
        onSubmit={handleAddEntry}
        submitLabel="Consigner la note"
        isSubmitting={addEntry.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Titre de l'événement" required>
            <Input
              type="text"
              placeholder="Ex: Visite du bureau de contrôle technique"
              value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>

          <FormFieldGroup label="Type d'entrée" required>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as ChantierEntryType)}
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
            >
              <option value="DailyReport">Rapport journalier</option>
              <option value="Milestone">Étape clé / Jalon</option>
              <option value="Observation">Observation</option>
              <option value="Issue">Problème / Incident</option>
            </select>
          </FormFieldGroup>

          <FormFieldGroup label="Détails de la note">
            <Input
              type="text"
              placeholder="Précisions sur les travaux réalisés, conditions du site..."
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>

      {/* Modal: Nouvelle Alerte */}
      <ChantierModal
        open={isAddAlertOpen}
        onOpenChange={setIsAddAlertOpen}
        title="Signaler un point de vigilance ou blocage"
        description="Alertez immédiatement l'équipe sur un risque de délai, sécurité ou approvisionnement."
        icon={ShieldAlert}
        iconColor="text-red-600"
        iconBg="bg-red-50"
        maxWidthClass="sm:max-w-[440px]"
        onSubmit={handleAddAlert}
        submitLabel="Signaler l'alerte"
        danger
        isSubmitting={addAlert.isPending}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Niveau de gravité" required>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as ChantierAlertType)}
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-red-500"
            >
              <option value="Warning">Point de vigilance (Orange)</option>
              <option value="Critical">Blocage critique (Rouge)</option>
              <option value="Info">Simple information (Bleu)</option>
            </select>
          </FormFieldGroup>

          <FormFieldGroup label="Description du risque ou problème" required>
            <Input
              type="text"
              placeholder="Ex: Retard de livraison acier par le fournisseur..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              required
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-red-500"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
