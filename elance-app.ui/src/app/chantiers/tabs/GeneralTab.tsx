'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  UserPlus,
  StickyNote,
  Calendar,
  Wallet,
  Search,
  Check,
  Loader2,
  X,
  UserCheck,
  Building,
  Clock,
  Compass,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import { usePersons } from '@/hooks/use-team';
import { useUpdateChantier } from '@/hooks/use-chantiers';
import { useCustomers } from '@/hooks/use-customers';
import { ROLE_LABELS } from '@/types/team';
import { cn } from '@/lib/utils';
import { ChantierModal } from '../components/ChantierModal';
import {
  formatChantierClientName,
  resolveChantierClientDisplay,
  matchesChantierCustomerSearch
} from '@/lib/chantier-utils';

interface GeneralTabProps {
  site: ChantierDetail;
  onAssignArchitect?: () => void;
}

export function GeneralTab({ site }: GeneralTabProps) {
  const [isAssignArchitectOpen, setIsAssignArchitectOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(site.architectPersonId ?? null);
  const [searchPerson, setSearchPerson] = useState('');

  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(site.clientCounterPartId ?? null);
  const [searchCustomer, setSearchCustomer] = useState('');

  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers('Customer');
  const updateChantier = useUpdateChantier(site.id);

  // Keep modal selection states in sync with site prop changes
  useEffect(() => {
    setSelectedClientId(site.clientCounterPartId ?? null);
  }, [site.clientCounterPartId]);

  useEffect(() => {
    setSelectedPersonId(site.architectPersonId ?? null);
  }, [site.architectPersonId]);

  // Filter persons by name, role or phone
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

  // Filter customers by display name, company name, first/last name, matricule, phone or CIN
  const filteredCustomers = useMemo(() => {
    if (!searchCustomer.trim()) return customers;
    return customers.filter((c) => matchesChantierCustomerSearch(c, searchCustomer));
  }, [customers, searchCustomer]);

  const handleOpenModal = () => {
    setSelectedPersonId(site.architectPersonId ?? null);
    setSearchPerson('');
    setIsAssignArchitectOpen(true);
  };

  const handleOpenClientModal = () => {
    setSelectedClientId(site.clientCounterPartId ?? null);
    setSearchCustomer('');
    setIsAssignClientOpen(true);
  };

  const handleSaveArchitect = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateChantier.mutateAsync({
      name: site.name,
      description: site.description || undefined,
      internalNote: site.internalNote || undefined,
      location: site.location || undefined,
      gouvernorate: site.gouvernorate || undefined,
      startDate: site.startDate,
      plannedEndDate: site.plannedEndDate || undefined,
      actualEndDate: site.actualEndDate || undefined,
      budgetTotal: site.budgetTotal ?? undefined,
      architectPersonId: selectedPersonId ?? null,
      projectManagerPersonId: site.projectManagerPersonId ?? null,
      clientCounterPartId: site.clientCounterPartId ?? null,
      status: site.status,
      healthFlag: site.healthFlag,
      progressPct: site.progressPct,
    });

    setIsAssignArchitectOpen(false);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateChantier.mutateAsync({
      name: site.name,
      description: site.description || undefined,
      internalNote: site.internalNote || undefined,
      location: site.location || undefined,
      gouvernorate: site.gouvernorate || undefined,
      startDate: site.startDate,
      plannedEndDate: site.plannedEndDate || undefined,
      actualEndDate: site.actualEndDate || undefined,
      budgetTotal: site.budgetTotal ?? undefined,
      architectPersonId: site.architectPersonId ?? null,
      projectManagerPersonId: site.projectManagerPersonId ?? null,
      clientCounterPartId: selectedClientId ?? null,
      status: site.status,
      healthFlag: site.healthFlag,
      progressPct: site.progressPct,
    });

    setIsAssignClientOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Project Overview, Notes, Location */}
      <div className="flex flex-col gap-6">
        {/* About Card */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                À propos du chantier
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-[#475569] leading-relaxed [text-wrap:pretty]">
              {site.description ||
                'Aucune description détaillée renseignée pour ce projet. Les opérations se déroulent selon les directives du cahier des charges approuvé.'}
            </p>

            <div className="bg-[#f8fafc] border-l-4 border-[#2563eb] p-4 rounded-r-xl flex items-start gap-3">
              <StickyNote className="w-5 h-5 text-[#2563eb] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#2563eb] block mb-1">
                  Consignes & Note interne
                </span>
                <p className="text-xs text-[#0f172a] font-medium leading-normal [text-wrap:pretty]">
                  {site.internalNote || 'Aucune consigne interne particulière pour ce site pour le moment.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Emplacement & Localisation
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-[#f8fafc] rounded-xl flex flex-col items-center justify-center border border-black/5 p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center ring-1 ring-black/5">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="font-bold text-[#0f172a] text-sm sm:text-base">
                {site.location || 'Adresse non communiquée'}
              </div>
              {site.gouvernorate && (
                <span className="text-xs font-bold text-[#1e40af] bg-[#eff6ff] border border-[#bfdbfe] px-3 py-0.5 rounded-full">
                  Gouvernorat : {site.gouvernorate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Direction, Architect, Timeline, Budget */}
      <div className="flex flex-col gap-6">
        {/* Architect & Project Manager */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Maîtrise d&apos;Œuvre & Direction
              </CardTitle>
            </div>
            {site.architectName && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenModal}
                className="text-xs font-bold text-[#2563eb] border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe] rounded-xl active:scale-[0.96] transition-transform h-8"
              >
                Changer d&apos;architecte
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {site.architectName ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f8fafc] border border-black/5">
                <div className="w-12 h-12 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#2563eb] text-base font-extrabold shadow-2xs shrink-0">
                  {site.architectName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm sm:text-base text-[#0f172a] truncate">
                    {site.architectName}
                  </div>
                  <div className="text-xs text-[#64748b]">Architecte référent du projet</div>
                  <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-md mt-1">
                    <Check className="w-3 h-3" /> Affecté et validé
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[#64748b] text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2 ring-1 ring-black/5">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="font-bold mb-1 text-sm text-[#0f172a]">Aucun architecte désigné</span>
                <span className="text-xs text-[#64748b] mb-4 max-w-[280px] [text-wrap:pretty]">
                  Désignez un collaborateur pour superviser la conformité architecturale du chantier.
                </span>
                <Button
                  onClick={handleOpenModal}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl px-4 text-xs active:scale-[0.96] transition-transform h-9"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Assigner un architecte
                </Button>
              </div>
            )}

            {site.projectManagerName && (
              <div className="pt-3 border-t border-black/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-black/5 flex items-center justify-center text-[#0f172a] font-bold text-xs shrink-0">
                  {site.projectManagerName[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-[0.68rem] text-[#64748b] font-bold uppercase tracking-wider">
                    Chef de Projet Dédié
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#0f172a]">{site.projectManagerName}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client & Commanditaire Card */}
        {(() => {
          const siteClientDisplay = resolveChantierClientDisplay(site, customers);

          return (
            <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#8b5cf6]" />
                  <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                    Client & Maîtrise d&apos;Ouvrage
                  </CardTitle>
                </div>
                {siteClientDisplay ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenClientModal}
                    className="text-xs font-bold text-[#8b5cf6] border-[#ddd6fe] bg-[#f5f3ff] hover:bg-[#ede9fe] rounded-xl active:scale-[0.96] transition-transform h-8"
                  >
                    Changer de client
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {siteClientDisplay ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f8fafc] border border-black/5">
                    <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe] flex items-center justify-center text-[#8b5cf6] text-base font-extrabold shadow-2xs shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm sm:text-base text-[#0f172a] truncate">
                        {siteClientDisplay}
                      </div>
                      <div className="text-xs text-[#64748b]">Client / Commanditaire officiel du chantier</div>
                      <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-md mt-1">
                        <Check className="w-3 h-3" /> Compte client lié
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-[#64748b] text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2 ring-1 ring-black/5">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <span className="font-bold mb-1 text-sm text-[#0f172a]">Aucun client associé</span>
                    <span className="text-xs text-[#64748b] mb-4 max-w-[280px] [text-wrap:pretty]">
                      Associez un compte client pour lier ce chantier à sa facturation et ses devis.
                    </span>
                    <Button
                      onClick={handleOpenClientModal}
                      className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-xl px-4 text-xs active:scale-[0.96] transition-transform h-9"
                    >
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      Associer un client
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Schedule & Budget */}
        <Card className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#f8fafc] border-b border-black/5 pb-3.5 pt-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563eb]" />
              <CardTitle className="text-base font-bold text-[#0f172a] [text-wrap:balance]">
                Planning & Budget
              </CardTitle>
            </div>
            <Clock className="w-4 h-4 text-[#94a3b8]" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#f8fafc] border border-black/5">
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Date de début</span>
                <span className="font-bold text-xs sm:text-sm text-[#0f172a] tabular-nums">
                  {new Date(site.startDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#f8fafc] border border-black/5">
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Fin estimée</span>
                <span className="font-bold text-xs sm:text-sm text-[#0f172a] tabular-nums">
                  {site.plannedEndDate
                    ? new Date(site.plannedEndDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Non définie'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1e40af] flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#2563eb]" /> Budget Total
                </span>
                <span className="font-extrabold text-sm sm:text-base text-[#1e40af] tabular-nums">
                  {site.budgetTotal ? `${site.budgetTotal.toLocaleString('fr-FR')} TND` : 'Non renseigné'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Assigner un Architecte */}
      <ChantierModal
        open={isAssignArchitectOpen}
        onOpenChange={setIsAssignArchitectOpen}
        title="Assigner un architecte"
        description="Sélectionnez un membre qualifié pour être l'architecte référent de ce chantier."
        icon={UserPlus}
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleSaveArchitect}
        submitLabel="Confirmer l'affectation"
        isSubmitting={updateChantier.isPending}
      >
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              type="text"
              placeholder="Rechercher par nom, rôle ou téléphone..."
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

          {/* Persons List */}
          <div className="border border-black/10 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-black/5 bg-[#fafafa]">
            {isPersonsLoading && (
              <div className="py-8 flex flex-col items-center justify-center text-[#64748b] gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#2563eb]" />
                <span className="text-xs">Chargement des collaborateurs...</span>
              </div>
            )}

            {!isPersonsLoading && filteredPersons.length === 0 && (
              <div className="py-8 text-center text-xs text-[#64748b]">
                Aucun collaborateur trouvé pour « {searchPerson} »
              </div>
            )}

            {!isPersonsLoading &&
              filteredPersons.map((p) => {
                const isSelected = selectedPersonId === p.id;
                const roleLabel = ROLE_LABELS[p.role] || 'Collaborateur';

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={cn(
                      'flex items-center justify-between p-3 cursor-pointer transition-colors duration-150',
                      isSelected
                        ? 'bg-[#eff6ff] border-l-4 border-l-[#2563eb]'
                        : 'bg-white hover:bg-[#f8fafc]'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5',
                          isSelected ? 'bg-[#2563eb] text-white' : 'bg-[#f1f5f9] text-[#0f172a]'
                        )}
                      >
                        {p.firstname?.[0]?.toUpperCase()}
                        {p.lastname?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#0f172a] truncate">
                          {p.firstname} {p.lastname}
                        </div>
                        <div className="text-[0.7rem] text-[#64748b] flex items-center gap-2">
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
                      <div className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Unassign option */}
          {selectedPersonId !== null && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-[#64748b]">Collaborateur sélectionné</span>
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 p-1"
              >
                <X className="w-3.5 h-3.5" /> Dissocier l&apos;architecte
              </button>
            </div>
          )}
        </div>
      </ChantierModal>

      {/* Modal: Assigner / Changer de client */}
      <ChantierModal
        open={isAssignClientOpen}
        onOpenChange={setIsAssignClientOpen}
        title="Client & Commanditaire"
        description="Associez un compte client pour ce chantier de construction."
        icon={Briefcase}
        iconColor="text-[#8b5cf6]"
        iconBg="bg-[#f5f3ff]"
        maxWidthClass="sm:max-w-[480px]"
        onSubmit={handleSaveClient}
        submitLabel="Enregistrer le client"
        isSubmitting={updateChantier.isPending}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              type="text"
              placeholder="Rechercher par nom, matricule ou tél..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-xl bg-[#f8fafc] border-black/10 focus-visible:ring-1 focus-visible:ring-[#8b5cf6]"
            />
            {searchCustomer && (
              <button
                type="button"
                onClick={() => setSearchCustomer('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {isCustomersLoading && (
              <div className="flex items-center justify-center py-6 text-xs text-[#94a3b8]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Chargement des clients...
              </div>
            )}

            {!isCustomersLoading && filteredCustomers.length === 0 && (
              <div className="text-center py-6 text-xs text-[#94a3b8]">
                Aucun client trouvé pour cette recherche.
              </div>
            )}

            {!isCustomersLoading &&
              filteredCustomers.map((c) => {
                const isSelected = selectedClientId === c.id;
                const displayName = formatChantierClientName(c) || `Client #${c.id}`;
                const initial = displayName.charAt(0).toUpperCase() || 'C';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-colors',
                      isSelected
                        ? 'border-[#8b5cf6] bg-[#f5f3ff] shadow-xs'
                        : 'border-black/5 hover:border-black/15 bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-black/5',
                          isSelected ? 'bg-[#8b5cf6] text-white' : 'bg-[#f1f5f9] text-[#0f172a]'
                        )}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#0f172a] truncate">
                          {displayName}
                        </div>
                        <div className="text-[0.7rem] text-[#64748b] flex items-center gap-2">
                          {c.taxregistrationnumber && <span>MF: {c.taxregistrationnumber}</span>}
                          {c.phonenumberone && (
                            <>
                              <span>•</span>
                              <span className="tabular-nums">{c.phonenumberone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Selected client summary & Dissocier option */}
          {selectedClientId !== null && (
            <div className="flex items-center justify-between px-1 pt-1 border-t border-black/5">
              <span className="text-xs text-[#64748b] truncate mr-2">
                Sélectionné :{' '}
                <strong className="text-[#0f172a]">
                  {(() => {
                    const sel = customers.find((c) => c.id === selectedClientId);
                    return sel
                      ? formatChantierClientName(sel)
                      : (site.clientCounterPartId === selectedClientId
                        ? resolveChantierClientDisplay(site, customers)
                        : `Client #${selectedClientId}`);
                  })()}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 p-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Dissocier le client
              </button>
            </div>
          )}
        </div>
      </ChantierModal>
    </div>
  );
}
