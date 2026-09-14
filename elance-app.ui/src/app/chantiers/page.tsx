'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Users,
  HardHat,
  LayoutGrid,
  Store,
  TrendingUp,
  Info,
  BarChart2,
  Building2,
  Coins,
  X,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { GeneralTab } from './tabs/GeneralTab';
import { EquipeTab } from './tabs/EquipeTab';
import { ProductionTab } from './tabs/ProductionTab';
import { MateriauxTab } from './tabs/MateriauxTab';
import { MagasinTab } from './tabs/MagasinTab';
import { CaisseTab } from './tabs/CaisseTab';
import { SuiviTab } from './tabs/SuiviTab';
import { StatsTab } from './tabs/StatsTab';

import { ChantierModal, FormFieldGroup, FormSection } from './components/ChantierModal';
import { ChantierStatusBadge, ChantierHealthIndicator } from './components/ChantierStatusBadge';

import { useChantiersList, useChantierDetail, useCreateChantier } from '@/hooks/use-chantiers';
import { CreateChantierInput } from '@/types/chantier';

const TABS = [
  { id: 0, label: 'Général', icon: Info },
  { id: 1, label: 'Équipe', icon: Users },
  { id: 2, label: 'Production', icon: HardHat },
  { id: 3, label: 'Matériaux', icon: LayoutGrid },
  { id: 4, label: 'Magasin', icon: Store },
  { id: 5, label: 'Caisse', icon: Coins },
  { id: 6, label: 'Suivi', icon: TrendingUp },
  { id: 7, label: 'Statistiques', icon: BarChart2 },
];

export default function ChantiersPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state for creating a new chantier
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newGouv, setNewGouv] = useState('Tunis');
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState<number>(0);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState('');

  // Fetch real list from API
  const { data: chantiers = [], isLoading: isListLoading } = useChantiersList({ search: searchTerm });
  const createChantier = useCreateChantier();

  // Auto-select first chantier if none selected yet
  const effectiveId = useMemo(() => {
    if (selectedId && chantiers.some((c) => c.id === selectedId)) {
      return selectedId;
    }
    return chantiers.length > 0 ? chantiers[0].id : null;
  }, [selectedId, chantiers]);

  // Fetch full detail of the selected chantier
  const { data: selectedDetail, isLoading: isDetailLoading } = useChantierDetail(effectiveId ?? undefined);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const input: CreateChantierInput = {
      name: newName.trim(),
      reference: newRef.trim() || undefined,
      description: newDesc.trim() || undefined,
      location: newLocation.trim() || undefined,
      gouvernorate: newGouv,
      startDate: new Date(newStartDate).toISOString(),
      plannedEndDate: newEndDate ? new Date(newEndDate).toISOString() : undefined,
      budgetTotal: newBudget > 0 ? Number(newBudget) : undefined,
    };

    const created = await createChantier.mutateAsync(input);
    setSelectedId(created.id);
    setIsCreateOpen(false);

    // Reset form
    setNewName('');
    setNewRef('');
    setNewLocation('');
    setNewDesc('');
    setNewBudget(0);
    setNewEndDate('');
  };

  // Compute active badge counts for tabs
  const tabBadges = useMemo(() => {
    if (!selectedDetail) return {};
    const unresolvedAlerts = selectedDetail.alerts?.filter((a) => !a.isResolved)?.length || 0;
    return {
      1: selectedDetail.teamMembers?.length,
      2: selectedDetail.phases?.length,
      3: selectedDetail.materialRequirements?.length,
      4: selectedDetail.vehicleAssignments?.length,
      6: unresolvedAlerts > 0 ? `${unresolvedAlerts}!` : undefined,
    };
  }, [selectedDetail]);

  return (
    <DashboardLayout>
      {/* Framed dual-pane container with premium responsive layout */}
      <div className="flex h-[calc(100vh-140px)] min-h-[660px] bg-[#f8f9fa] rounded-2xl border border-black/5 shadow-xs overflow-hidden">
        {/* Left Sidebar: Mes Chantiers */}
        <aside className="w-full md:w-[340px] bg-white border-r border-black/5 shadow-[2px_0_12px_rgba(0,0,0,0.02)] z-10 flex flex-col shrink-0">
          <div className="p-4 border-b border-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] ring-1 ring-black/5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="m-0 text-base font-bold text-[#0f172a] tracking-tight leading-none [text-wrap:balance]">
                    Mes Chantiers
                  </h2>
                  <span className="text-[0.7rem] text-[#64748b]">Projets & Opérations</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 rounded-full tabular-nums">
                {chantiers.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Rechercher un chantier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-[#f8fafc] border-black/10 focus-visible:ring-1 focus-visible:ring-[#2563eb] placeholder:text-[#94a3b8]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* CTA: Nouveau Chantier */}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="w-full rounded-xl font-bold bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs h-9 active:scale-[0.96] transition-transform shadow-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nouveau Chantier
            </Button>
          </div>

          {/* Chantiers List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
            {isListLoading && (
              <div className="flex flex-col gap-2 p-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-black/5 bg-white space-y-2 animate-pulse"
                  >
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!isListLoading && chantiers.length === 0 && (
              <div className="text-center py-12 px-4 text-[#64748b]">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3 ring-1 ring-black/5">
                  <HardHat className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#0f172a] mb-1">Aucun chantier</p>
                <p className="text-xs text-[#64748b] mb-4 [text-wrap:pretty]">
                  Créez votre premier projet de construction pour commencer le suivi opérationnel.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform h-9 px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Créer un chantier
                </Button>
              </div>
            )}

            {chantiers.map((site) => {
              const isSelected = effectiveId === site.id;
              return (
                <div
                  key={site.id}
                  onClick={() => setSelectedId(site.id)}
                  className={cn(
                    'flex items-center p-3 rounded-xl cursor-pointer relative overflow-hidden transition-colors border',
                    isSelected
                      ? 'bg-[#eff6ff]/70 border-[#2563eb] shadow-xs'
                      : 'bg-white border-black/5 hover:border-black/15 hover:bg-[#fafafa]'
                  )}
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={cn(
                      'absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-colors',
                      String(site.healthFlag) === 'Green' || String(site.healthFlag) === '0'
                        ? 'bg-[#10b981]'
                        : String(site.healthFlag) === 'Orange' || String(site.healthFlag) === '1'
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#ef4444]'
                    )}
                  />

                  {/* Site Info */}
                  <div className="flex-1 ml-2.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-[#0f172a] text-xs sm:text-sm truncate">
                        {site.name}
                      </span>
                    </div>
                    <div className="text-[0.72rem] text-[#64748b] flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0 text-[#94a3b8]" />
                      <span className="truncate">
                        {site.location || site.gouvernorate || 'Emplacement non défini'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Badge */}
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl border flex items-center justify-center text-[0.72rem] font-extrabold shrink-0 tabular-nums shadow-2xs',
                      isSelected
                        ? 'border-[#2563eb] text-[#2563eb] bg-white'
                        : 'border-slate-200 text-[#475569] bg-slate-50'
                    )}
                  >
                    {site.progressPct}%
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Detail Content */}
        <main className="flex-1 bg-[#fafaf9] overflow-y-auto relative custom-scrollbar">
          {isDetailLoading && (
            <div className="p-8 max-w-[1250px] mx-auto space-y-6 animate-pulse">
              <div className="h-32 bg-white rounded-2xl border border-black/5" />
              <div className="h-96 bg-white rounded-2xl border border-black/5" />
            </div>
          )}

          {!isDetailLoading && selectedDetail && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDetail.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="p-6 md:p-8 max-w-[1250px] mx-auto space-y-6"
              >
                {/* Header Card */}
                <header className="bg-white p-6 rounded-2xl border border-black/5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {selectedDetail.reference && (
                          <span className="text-xs font-bold text-[#1e40af] bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 rounded-lg tabular-nums font-mono">
                            {selectedDetail.reference}
                          </span>
                        )}
                        <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight m-0 [text-wrap:balance]">
                          {selectedDetail.name}
                        </h1>
                        <ChantierStatusBadge status={selectedDetail.status} />
                        <ChantierHealthIndicator healthFlag={selectedDetail.healthFlag} />
                      </div>

                      {/* Metadata Chips */}
                      <div className="flex items-center gap-3 text-xs text-[#64748b] flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                          <span>{selectedDetail.location || selectedDetail.gouvernorate || 'Localisation non spécifiée'}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>
                            Démarrage :{' '}
                            <strong className="text-[#0f172a] tabular-nums">
                              {new Date(selectedDetail.startDate).toLocaleDateString('fr-FR')}
                            </strong>
                          </span>
                        </span>
                        {selectedDetail.architectName && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-[#10b981]" />
                              <span>
                                Architecte : <strong className="text-[#0f172a]">{selectedDetail.architectName}</strong>
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress summary banner */}
                    <div className="flex items-center gap-4 bg-[#f8fafc] p-3.5 rounded-xl border border-slate-200/70 shrink-0">
                      <div>
                        <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[#64748b]">
                          Avancement global
                        </div>
                        <div className="text-2xl font-extrabold text-[#2563eb] tabular-nums leading-none mt-0.5">
                          {selectedDetail.progressPct}%
                        </div>
                      </div>
                      <div className="w-28 bg-[#e2e8f0] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563eb] h-full rounded-full transition-all duration-500"
                          style={{ width: `${selectedDetail.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex border-b border-black/5 overflow-x-auto gap-1 -mb-6 -mx-6 px-6 pt-1">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const countBadge = (tabBadges as Record<number, string | number | undefined>)[tab.id];

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'flex items-center gap-2 px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap active:scale-[0.96]',
                            isActive
                              ? 'border-[#2563eb] text-[#2563eb] bg-[#eff6ff]/50 rounded-t-lg'
                              : 'border-transparent text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] rounded-t-lg'
                          )}
                        >
                          <Icon className={cn('w-4 h-4', isActive ? 'text-[#2563eb]' : 'text-[#94a3b8]')} />
                          <span>{tab.label}</span>
                          {countBadge !== undefined && (
                            <span
                              className={cn(
                                'text-[0.65rem] font-bold px-1.5 py-0.2 rounded-full tabular-nums',
                                String(countBadge).includes('!')
                                  ? 'bg-red-100 text-red-700'
                                  : isActive
                                  ? 'bg-[#dbeafe] text-[#1e40af]'
                                  : 'bg-slate-100 text-[#64748b]'
                              )}
                            >
                              {countBadge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </header>

                {/* Tab Views */}
                <div className="pt-1">
                  {activeTab === 0 && <GeneralTab site={selectedDetail} />}
                  {activeTab === 1 && <EquipeTab site={selectedDetail} />}
                  {activeTab === 2 && <ProductionTab site={selectedDetail} />}
                  {activeTab === 3 && <MateriauxTab site={selectedDetail} />}
                  {activeTab === 4 && <MagasinTab site={selectedDetail} />}
                  {activeTab === 5 && <CaisseTab site={selectedDetail} />}
                  {activeTab === 6 && <SuiviTab site={selectedDetail} />}
                  {activeTab === 7 && <StatsTab site={selectedDetail} />}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {!isDetailLoading && !selectedDetail && chantiers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#64748b]">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 ring-1 ring-black/5">
                <HardHat className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-2 [text-wrap:balance]">
                Bienvenue sur le module Chantier
              </h3>
              <p className="text-xs text-[#64748b] max-w-[460px] mb-6 [text-wrap:pretty]">
                Ce module ERP est conçu pour piloter les projets de construction, le suivi de la main-d&apos;œuvre, les réapprovisionnements en matériaux, la logistique et la trésorerie de chantier.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl px-5 active:scale-[0.96] transition-transform h-10 shadow-xs"
              >
                <Plus className="w-4 h-4 mr-2" /> Créer un premier chantier
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Nouveau Chantier */}
      <ChantierModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Créer un nouveau chantier"
        description="Renseignez les paramètres initiaux pour ouvrir un nouveau site de construction."
        icon={Building2}
        maxWidthClass="sm:max-w-[560px]"
        onSubmit={handleCreateSubmit}
        submitLabel="Créer le chantier"
        isSubmitting={createChantier.isPending}
      >
        <div className="space-y-4">
          <FormSection title="Identification">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormFieldGroup label="Nom du chantier" required className="sm:col-span-2">
                <Input
                  type="text"
                  placeholder="Ex: Résidence Les Palmiers"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
                />
              </FormFieldGroup>
              <FormFieldGroup label="Référence">
                <Input
                  type="text"
                  placeholder="CH-2026-001"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] font-mono"
                />
              </FormFieldGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormFieldGroup label="Adresse / Localisation">
                <Input
                  type="text"
                  placeholder="Ex: Ennasr II, Rue Hédi Nouira"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
                />
              </FormFieldGroup>
              <FormFieldGroup label="Gouvernorat">
                <Input
                  type="text"
                  placeholder="Tunis, Ariana, Sousse..."
                  value={newGouv}
                  onChange={(e) => setNewGouv(e.target.value)}
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
                />
              </FormFieldGroup>
            </div>
          </FormSection>

          <FormSection title="Planning & Budget">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormFieldGroup label="Date début" required>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  required
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums"
                />
              </FormFieldGroup>
              <FormFieldGroup label="Fin estimée">
                <Input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums"
                />
              </FormFieldGroup>
              <FormFieldGroup label="Budget prévu (TND)">
                <Input
                  type="number"
                  placeholder="150000"
                  value={newBudget || ''}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb] tabular-nums font-bold"
                />
              </FormFieldGroup>
            </div>
          </FormSection>

          <FormSection title="Description Sommaire">
            <FormFieldGroup label="Consignes ou spécifications">
              <Input
                type="text"
                placeholder="Description générale des travaux à réaliser..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
              />
            </FormFieldGroup>
          </FormSection>
        </div>
      </ChantierModal>
    </DashboardLayout>
  );
}
