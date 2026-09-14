'use client';

import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  MoreVertical,
  Trash2,
  Users,
  UserPlus,
  Search,
  Check,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChantierDetail } from '@/types/chantier';
import { useAssignTeamMember, useReleaseTeamMember } from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { ROLE_LABELS } from '@/types/team';
import { cn } from '@/lib/utils';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

const COMMON_ROLES = [
  'Chef de chantier',
  'Conducteur de travaux',
  'Chef d\'équipe',
  'Ouvrier qualifié',
  'Maçon',
  'Ferrailleur',
  'Électricien',
  'Plombier',
  'Manœuvre',
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

  const activeMembers = useMemo(() => site.teamMembers || [], [site.teamMembers]);

  // Group members by role
  const rolesSet = Array.from(
    new Set([...COMMON_ROLES, ...activeMembers.map((m) => m.chantierRole)])
  );

  // Set of person IDs already active in team
  const activePersonIds = useMemo(() => {
    return new Set(activeMembers.map((m) => m.personId));
  }, [activeMembers]);

  // Filter persons by search query
  const filteredPersons = useMemo(() => {
    const q = searchPerson.toLowerCase().trim();
    if (!q) return persons;
    return persons.filter((p) => {
      const fullName = `${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
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
      chantierRole: role.trim(),
    });

    setIsAssignOpen(false);
    setSelectedPersonId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-black/5 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] ring-1 ring-black/5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Personnel & Équipe Affectée
            </h3>
            <span className="text-xs text-[#64748b] tabular-nums">
              {activeMembers.length} intervenant(s) actif(s) sur ce chantier
            </span>
          </div>
        </div>

        <Button
          onClick={() => handleOpenAssignModal()}
          className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4 active:scale-[0.96] transition-transform h-9.5 shadow-xs"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Affecter un membre
        </Button>
      </div>

      {/* Role groups */}
      <div className="space-y-6">
        {rolesSet.map((r) => {
          const membersInRole = activeMembers.filter(
            (m) => m.chantierRole.toLowerCase() === r.toLowerCase()
          );
          if (
            membersInRole.length === 0 &&
            !['Chef de chantier', 'Ouvrier qualifié', 'Manœuvre'].includes(r)
          ) {
            return null;
          }

          return (
            <div key={r} className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                  <h4 className="text-sm font-bold text-[#0f172a] m-0">{r}</h4>
                  <span className="bg-[#f1f5f9] text-[#64748b] text-[0.68rem] font-bold px-2 py-0.5 rounded-full tabular-nums">
                    {membersInRole.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenAssignModal(r)}
                  className="text-xs font-semibold text-[#2563eb] hover:bg-[#eff6ff] rounded-lg active:scale-[0.96] transition-transform h-7 px-2"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Ajouter
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {membersInRole.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center p-3.5 bg-white border border-black/5 shadow-xs rounded-2xl hover:border-black/15 transition-colors relative overflow-hidden"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {member.personFullName ? member.personFullName[0]?.toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 ml-3 min-w-0 pr-1">
                      <div className="font-bold text-[#0f172a] text-xs sm:text-sm truncate">
                        {member.personFullName || `Membre #${member.personId}`}
                      </div>
                      <div className="text-[0.7rem] text-[#64748b] mt-0.5 tabular-nums truncate">
                        Affecté le {new Date(member.assignedAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#94a3b8] hover:text-[#0f172a] active:scale-[0.96] transition-transform"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl font-medium p-1">
                        <DropdownMenuItem
                          onClick={() => releaseMember.mutate(member.id)}
                          className="text-red-600 focus:text-red-600 cursor-pointer text-xs rounded-lg p-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Retirer du chantier
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {membersInRole.length === 0 && (
                  <div className="col-span-full p-4 text-center border border-dashed border-black/10 rounded-xl text-[#94a3b8] text-xs bg-[#fafafa]">
                    Aucun membre affecté au rôle « {r} »
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Affecter un membre */}
      <ChantierModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        title="Affecter un membre à l'équipe"
        description="Choisissez un collaborateur et définissez sa fonction sur le chantier."
        icon={UserPlus}
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleAssign}
        submitLabel="Affecter au chantier"
        isSubmitting={assignMember.isPending}
        submitDisabled={!selectedPersonId}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Sélectionner un collaborateur" required>
            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Rechercher par nom, rôle..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-[#f8fafc] border-black/15 focus:border-[#2563eb]"
              />
              {searchPerson && (
                <button
                  type="button"
                  onClick={() => setSearchPerson('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Persons */}
            <div className="border border-black/10 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
              {isPersonsLoading && (
                <div className="py-6 flex flex-col items-center justify-center text-[#64748b] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                  <span className="text-xs">Chargement du personnel...</span>
                </div>
              )}

              {!isPersonsLoading && filteredPersons.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748b]">
                  Aucun collaborateur trouvé pour « {searchPerson} »
                </div>
              )}

              {!isPersonsLoading &&
                filteredPersons.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  const isAlreadyInTeam = activePersonIds.has(p.id);
                  const roleLabel = ROLE_LABELS[p.role] || 'Personnel';

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isAlreadyInTeam && setSelectedPersonId(p.id)}
                      className={cn(
                        'flex items-center justify-between p-2.5 transition-colors duration-150',
                        isAlreadyInTeam
                          ? 'opacity-50 cursor-not-allowed bg-slate-50'
                          : 'cursor-pointer hover:bg-[#eff6ff]/60',
                        isSelected ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]' : 'bg-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5',
                            isSelected ? 'bg-[#2563eb] text-white' : 'bg-[#f1f5f9] text-[#0f172a]'
                          )}
                        >
                          {p.firstname?.[0]?.toUpperCase()}
                          {p.lastname?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#0f172a] truncate">
                            {p.firstname} {p.lastname}
                          </div>
                          <div className="text-[0.7rem] text-[#64748b] flex items-center gap-1.5">
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
                          <span className="text-[0.68rem] font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-full">
                            Déjà affecté
                          </span>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>

            {!selectedPersonId && (
              <span className="text-[0.7rem] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Veuillez sélectionner un collaborateur disponible.
              </span>
            )}
          </FormFieldGroup>

          <FormFieldGroup label="Rôle / Fonction sur le chantier" required>
            <Input
              type="text"
              list="roles-list"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Chef de chantier, Plombier..."
              required
              className="rounded-xl h-9.5 text-xs border-black/15 focus:border-[#2563eb]"
            />
            <datalist id="roles-list">
              {COMMON_ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
