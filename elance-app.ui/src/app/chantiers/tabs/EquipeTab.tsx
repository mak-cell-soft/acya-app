'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreVertical, Trash2, Users, UserPlus, Phone, Mail, Search, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import { useAssignTeamMember, useReleaseTeamMember } from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { ROLE_LABELS, Person } from '@/types/team';
import { cn } from '@/lib/utils';

const COMMON_ROLES = [
  'Chef de chantier',
  'Conducteur de travaux',
  'Chef d\'équipe',
  'Ouvrier qualifié',
  'Maçon',
  'Ferrailleur',
  'Électricien',
  'Plombier',
  'Manœuvre'
];

interface EquipeTabProps {
  site: ChantierDetail;
}

export function EquipeTab({ site }: EquipeTabProps) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchPerson, setSearchPerson] = useState('');
  const [role, setRole] = useState<string>('Chef de chantier');

  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();
  const assignMember = useAssignTeamMember(site.id);
  const releaseMember = useReleaseTeamMember(site.id);

  const activeMembers = site.teamMembers || [];

  // Group members by role
  const rolesSet = Array.from(new Set([...COMMON_ROLES, ...activeMembers.map(m => m.chantierRole)]));

  // Set of person IDs already active in team
  const activePersonIds = useMemo(() => {
    return new Set(activeMembers.map(m => m.personId));
  }, [activeMembers]);

  // Filter persons by search query
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

  const handleOpenAssignModal = (defaultRole?: string) => {
    if (defaultRole) setRole(defaultRole);
    setSelectedPersonId(null);
    setSearchPerson('');
    setIsAssignOpen(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || selectedPersonId <= 0 || !role.trim()) return;

    await assignMember.mutateAsync({
      personId: Number(selectedPersonId),
      chantierRole: role.trim()
    });

    setIsAssignOpen(false);
    setSelectedPersonId(null);
  };

  return (
    <div className="flex flex-col gap-8 font-['Outfit',sans-serif]">
      {/* Header bar with CTA */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Personnel affecté au chantier</h3>
            <span className="text-xs text-[#888780] tabular-nums">{activeMembers.length} intervenant(s) actif(s)</span>
          </div>
        </div>

        <Button
          onClick={() => handleOpenAssignModal()}
          className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4 active:scale-[0.96] transition-transform min-h-[40px]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Affecter un membre
        </Button>
      </div>

      {/* Role groups */}
      {rolesSet.map(r => {
        const membersInRole = activeMembers.filter(m => m.chantierRole.toLowerCase() === r.toLowerCase());
        if (membersInRole.length === 0 && !['Chef de chantier', 'Ouvrier qualifié', 'Manœuvre'].includes(r)) {
          return null;
        }

        return (
          <div key={r} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                <h4 className="text-base font-bold text-[#1a1a1a] m-0">{r}</h4>
                <span className="bg-[#f0f0f0] text-[#888780] text-xs font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {membersInRole.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAssignModal(r)}
                className="text-xs font-semibold text-[#2563eb] hover:bg-[#eff6ff] rounded-lg active:scale-[0.96] transition-transform"
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {membersInRole.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center p-4 bg-white border border-black/5 shadow-sm rounded-2xl hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] text-white ring-1 ring-black/5 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-inner">
                    {member.personFullName ? member.personFullName[0]?.toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 ml-3 overflow-hidden">
                    <div className="font-bold text-[#1a1a1a] text-sm truncate">
                      {member.personFullName || `Membre #${member.personId}`}
                    </div>
                    <div className="text-[0.75rem] text-[#888780] mt-0.5 tabular-nums">
                      Depuis le {new Date(member.assignedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:bg-[#f0f0f0] active:scale-[0.96] transition-transform">
                        <MoreVertical className="w-4 h-4 text-[#888780]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl font-medium">
                      <DropdownMenuItem
                        onClick={() => releaseMember.mutate(member.id)}
                        className="text-red-600 focus:text-red-600 cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Retirer du chantier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {membersInRole.length === 0 && (
                <div className="col-span-full p-5 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-xs bg-[#fafafa]">
                  Aucun membre affecté au rôle « {r} »
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal: Affecter un membre */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Affecter un membre à l'équipe</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssign} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">
                Sélectionner un collaborateur
              </label>

              {/* Search bar */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, rôle..."
                  value={searchPerson}
                  onChange={(e) => setSearchPerson(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-[#f8f9fa] border-black/10 focus-visible:ring-1 focus-visible:ring-[#2563eb]"
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

              {/* List of Persons */}
              <div className="border border-black/10 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
                {isPersonsLoading && (
                  <div className="py-8 flex flex-col items-center justify-center text-[#888780] gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                    <span className="text-xs">Chargement du personnel...</span>
                  </div>
                )}

                {!isPersonsLoading && filteredPersons.length === 0 && (
                  <div className="py-6 text-center text-xs text-[#888780]">
                    Aucun collaborateur trouvé pour « {searchPerson} »
                  </div>
                )}

                {!isPersonsLoading && filteredPersons.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  const isAlreadyInTeam = activePersonIds.has(p.id);
                  const roleLabel = ROLE_LABELS[p.role] || 'Personnel';

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isAlreadyInTeam && setSelectedPersonId(p.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 transition-colors duration-150",
                        isAlreadyInTeam ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:bg-[#eff6ff]/60",
                        isSelected ? "bg-[#eff6ff] border-l-4 border-l-[#2563eb]" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5",
                          isSelected ? "bg-[#2563eb] text-white" : "bg-[#f0f0f0] text-[#1a1a1a]"
                        )}>
                          {p.firstname?.[0]?.toUpperCase()}{p.lastname?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#1a1a1a] truncate">
                            {p.firstname} {p.lastname}
                          </div>
                          <div className="text-[0.7rem] text-[#888780] flex items-center gap-1.5">
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

                      <div className="shrink-0 ml-2">
                        {isAlreadyInTeam ? (
                          <span className="text-[0.68rem] font-semibold text-[#888780] bg-[#f0f0f0] px-2 py-0.5 rounded-full">
                            Déjà affecté
                          </span>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!selectedPersonId && (
                <span className="text-[0.7rem] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> Veuillez sélectionner un collaborateur dans la liste ci-dessus.
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Rôle sur le chantier</label>
              <Input
                type="text"
                list="roles-list"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Chef de chantier"
                required
                className="rounded-xl h-10 text-xs"
              />
              <datalist id="roles-list">
                {COMMON_ROLES.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!selectedPersonId || assignMember.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4"
              >
                {assignMember.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Affectation...
                  </>
                ) : (
                  'Affecter au chantier'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
