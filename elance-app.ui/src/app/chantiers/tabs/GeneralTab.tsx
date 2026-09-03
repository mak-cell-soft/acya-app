'use client';

import React, { useState, useMemo } from 'react';
import { MapPin, Phone, UserPlus, StickyNote, Calendar, Wallet, Search, Check, Loader2, X, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import { usePersons } from '@/hooks/use-team';
import { useUpdateChantier } from '@/hooks/use-chantiers';
import { ROLE_LABELS, Person } from '@/types/team';
import { cn } from '@/lib/utils';

interface GeneralTabProps {
  site: ChantierDetail;
  onAssignArchitect?: () => void;
}

/**
 * GeneralTab: Project summary, internal notes, architect assignment modal, location, and key milestones.
 * Consumes real ChantierDetail data from GET /api/chantier/{id} and updates architect via PUT /api/chantier/{id}.
 */
export function GeneralTab({ site }: GeneralTabProps) {
  const [isAssignArchitectOpen, setIsAssignArchitectOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(site.architectPersonId ?? null);
  const [searchPerson, setSearchPerson] = useState('');

  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();
  const updateChantier = useUpdateChantier(site.id);

  // Filter persons by name or role label
  const filteredPersons = useMemo(() => {
    const q = searchPerson.toLowerCase().trim();
    if (!q) return persons;
    return persons.filter(p => {
      const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
      const roleName = (ROLE_LABELS[p.role] || '').toLowerCase();
      const phone = (p.phonenumber || '').toLowerCase();
      return fullName.includes(q) || roleName.includes(q) || phone.includes(q);
    });
  }, [persons, searchPerson]);

  const handleOpenModal = () => {
    setSelectedPersonId(site.architectPersonId ?? null);
    setSearchPerson('');
    setIsAssignArchitectOpen(true);
  };

  const handleSaveArchitect = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateChantier.mutateAsync({
      name: site.name,
      description: site.description,
      internalNote: site.internalNote,
      location: site.location,
      gouvernorate: site.gouvernorate,
      startDate: site.startDate,
      plannedEndDate: site.plannedEndDate,
      actualEndDate: site.actualEndDate,
      budgetTotal: site.budgetTotal,
      architectPersonId: selectedPersonId ?? undefined,
      projectManagerPersonId: site.projectManagerPersonId,
      clientCounterPartId: site.clientCounterPartId,
      status: site.status,
      healthFlag: site.healthFlag,
      progressPct: site.progressPct,
    });

    setIsAssignArchitectOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-['Outfit',sans-serif]">
      {/* Left Column: Overview & Notes & Location */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">À propos du projet</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-[#666] leading-relaxed mb-6 whitespace-pre-line [text-wrap:pretty]">
              {site.description || "Aucune description fournie pour ce chantier. Ce projet consiste en la construction/rénovation selon les plans approuvés."}
            </p>
            
            <div className="bg-[#f8faff] border-l-4 border-[#2563eb] p-4 rounded-r-xl flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-[#2563eb] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb] block mb-1">Note interne</span>
                <p className="text-sm text-[#1a1a1a] font-medium [text-wrap:pretty]">
                  {site.internalNote || "Aucune consigne interne particulière pour ce site."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">Localisation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[180px] bg-[#f8f9fa] rounded-xl flex flex-col items-center justify-center text-[#888780] border border-black/5 p-4 text-center">
              <MapPin className="w-8 h-8 text-[#2563eb] opacity-75 mb-2" />
              <span className="font-bold text-[#1a1a1a] text-base">{site.location || "Emplacement non renseigné"}</span>
              {site.gouvernorate && (
                <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full mt-2">
                  {site.gouvernorate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Architect & Timeline & Budget */}
      <div className="flex flex-col gap-6">
        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">Architecte & Direction de Projet</CardTitle>
            {site.architectName && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenModal}
                className="text-xs font-bold text-[#2563eb] border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] rounded-xl active:scale-[0.96] transition-transform"
              >
                Changer d'architecte
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {site.architectName ? (
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#eff6ff] border-2 border-[#bfdbfe] ring-2 ring-black/5 flex items-center justify-center text-[#2563eb] text-xl font-extrabold shadow-sm shrink-0">
                  {site.architectName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-[#1a1a1a] truncate">{site.architectName}</div>
                  <div className="text-xs font-medium text-[#888780] mb-3">Architecte référent du chantier</div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-3 py-1 rounded-lg">
                      <UserCheck className="w-3.5 h-3.5" /> Affecté
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[#888780]">
                <UserPlus className="w-10 h-10 opacity-30 mb-3" />
                <span className="font-semibold mb-2 text-sm text-[#1a1a1a]">Aucun architecte assigné</span>
                <span className="text-xs text-[#888780] mb-4 text-center max-w-[280px] [text-wrap:pretty]">
                  Sélectionnez un collaborateur ou intervenant du personnel comme architecte référent du projet.
                </span>
                <Button
                  onClick={handleOpenModal}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl px-5 text-xs active:scale-[0.96] transition-transform min-h-[40px]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assigner un architecte
                </Button>
              </div>
            )}

            {site.projectManagerName && (
              <div className="mt-6 pt-6 border-t border-black/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-black/10 flex items-center justify-center text-[#1a1a1a] font-bold text-sm shrink-0">
                  {site.projectManagerName[0]}
                </div>
                <div>
                  <div className="text-xs text-[#888780] font-semibold uppercase tracking-wider">Chef de Projet</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">{site.projectManagerName}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#fbfbfb] border-b border-black/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#1a1a1a] [text-wrap:balance]">Échéancier & Budget</CardTitle>
            <Calendar className="w-5 h-5 text-[#888780]" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#888780]">Date de début</span>
                <span className="font-semibold text-sm text-[#1a1a1a] tabular-nums">
                  {new Date(site.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#f0f0f0]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#888780]">Fin estimée</span>
                <span className="font-semibold text-sm text-[#1a1a1a] tabular-nums">
                  {site.plannedEndDate ? new Date(site.plannedEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non définie'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8faff] border border-[#bfdbfe]/40">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb] flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Budget Total
                </span>
                <span className="font-extrabold text-base text-[#2563eb] tabular-nums">
                  {site.budgetTotal ? `${site.budgetTotal.toLocaleString('fr-FR')} TND` : 'Non renseigné'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Assigner un Architecte */}
      <Dialog open={isAssignArchitectOpen} onOpenChange={setIsAssignArchitectOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Assigner un architecte au chantier</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveArchitect} className="flex flex-col gap-4 mt-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
              <Input
                type="text"
                placeholder="Rechercher un collaborateur par nom, rôle..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl bg-[#f8f9fa] border-black/10 focus-visible:ring-1 focus-visible:ring-[#2563eb]"
              />
              {searchPerson && (
                <button
                  type="button"
                  onClick={() => setSearchPerson('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#1a1a1a]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Persons List */}
            <div className="border border-black/10 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
              {isPersonsLoading && (
                <div className="py-8 flex flex-col items-center justify-center text-[#888780] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                  <span className="text-xs">Chargement du personnel...</span>
                </div>
              )}

              {!isPersonsLoading && filteredPersons.length === 0 && (
                <div className="py-8 text-center text-xs text-[#888780]">
                  Aucun membre trouvé pour « {searchPerson} »
                </div>
              )}

              {!isPersonsLoading && filteredPersons.map((p) => {
                const isSelected = selectedPersonId === p.id;
                const roleLabel = ROLE_LABELS[p.role] || 'Collaborateur';

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer transition-colors duration-150 hover:bg-[#eff6ff]/60",
                      isSelected ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : "bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ring-1 ring-black/5",
                        isSelected ? "bg-[#2563eb] text-white" : "bg-[#f0f0f0] text-[#1a1a1a]"
                      )}>
                        {p.firstname?.[0]?.toUpperCase()}{p.lastname?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1a1a1a] truncate">
                          {p.firstname} {p.lastname}
                        </div>
                        <div className="text-[0.72rem] text-[#888780] flex items-center gap-2">
                          <span className="truncate">{roleLabel}</span>
                          {p.phonenumber && (
                            <>
                              <span>•</span>
                              <span className="tabular-nums">{p.phonenumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unassign option if someone is selected */}
            {selectedPersonId !== null && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-[#888780]">Collaborateur sélectionné</span>
                <button
                  type="button"
                  onClick={() => setSelectedPersonId(null)}
                  className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Dissocier l'architecte
                </button>
              </div>
            )}

            <DialogFooter className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignArchitectOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateChantier.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4"
              >
                {updateChantier.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Confirmer l\'affectation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
