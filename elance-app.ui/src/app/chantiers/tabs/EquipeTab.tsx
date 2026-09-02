import React, { useState } from 'react';
import { PlusCircle, MoreVertical, Trash2, Users, UserPlus, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import { useAssignTeamMember, useReleaseTeamMember } from '@/hooks/use-chantiers';

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
  const [personId, setPersonId] = useState<number>(0);
  const [role, setRole] = useState<string>('Chef de chantier');

  const assignMember = useAssignTeamMember(site.id);
  const releaseMember = useReleaseTeamMember(site.id);

  const activeMembers = site.teamMembers || [];

  // Group members by role
  const rolesSet = Array.from(new Set([...COMMON_ROLES, ...activeMembers.map(m => m.chantierRole)]));

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (personId <= 0 || !role.trim()) return;

    await assignMember.mutateAsync({
      personId: Number(personId),
      chantierRole: role.trim()
    });

    setIsAssignOpen(false);
    setPersonId(0);
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
            <h3 className="text-base font-bold text-[#1a1a1a] m-0">Personnel affecté au chantier</h3>
            <span className="text-xs text-[#888780]">{activeMembers.length} intervenant(s) actif(s)</span>
          </div>
        </div>

        <Button
          onClick={() => setIsAssignOpen(true)}
          className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold rounded-xl text-xs px-4"
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
                <span className="bg-[#f0f0f0] text-[#888780] text-xs font-bold px-2 py-0.5 rounded-full">
                  {membersInRole.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRole(r); setIsAssignOpen(true); }}
                className="text-xs font-semibold text-[#2563eb] hover:bg-[#eff6ff] rounded-lg"
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
                  <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-inner">
                    {member.personFullName ? member.personFullName[0] : 'U'}
                  </div>
                  <div className="flex-1 ml-3 overflow-hidden">
                    <div className="font-bold text-[#1a1a1a] text-sm truncate">
                      {member.personFullName || `Membre #${member.personId}`}
                    </div>
                    <div className="text-[0.75rem] text-[#888780] mt-0.5">
                      Depuis le {new Date(member.assignedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-[#f0f0f0]">
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
        <DialogContent className="sm:max-w-[425px] rounded-2xl font-['Outfit',sans-serif]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Affecter un membre à l'équipe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Identifiant de la personne (ID Contact/RH)</label>
              <Input
                type="number"
                placeholder="Ex: 12"
                value={personId || ''}
                onChange={(e) => setPersonId(Number(e.target.value))}
                required
                className="rounded-xl"
              />
              <span className="text-[0.7rem] text-[#888780] mt-1 block">
                ID correspondant à un enregistrement existant dans le module Contacts / Personnel.
              </span>
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
                className="rounded-xl"
              />
              <datalist id="roles-list">
                {COMMON_ROLES.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)} className="rounded-xl text-xs font-semibold">
                Annuler
              </Button>
              <Button type="submit" disabled={assignMember.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold">
                {assignMember.isPending ? 'Affectation...' : 'Valider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
