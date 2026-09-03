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
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

import { useChantiersList, useChantierDetail, useCreateChantier } from '@/hooks/use-chantiers';
import { ChantierListItem, CreateChantierInput } from '@/types/chantier';

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
    if (selectedId && chantiers.some(c => c.id === selectedId)) {
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
  };

  return (
    <DashboardLayout>
      {/* Framed dual-pane container without destructive negative margin */}
      <div className="flex h-[calc(100vh-190px)] min-h-[640px] bg-[#f8f9fa] rounded-2xl border border-black/5 shadow-sm font-['Outfit',sans-serif] overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-full md:w-[330px] bg-white border-r border-black/5 shadow-[4px_0_15px_rgba(0,0,0,0.02)] z-10 flex flex-col shrink-0">
          <div className="p-5 border-b border-black/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="m-0 text-lg font-bold text-[#1a1a1a] tracking-tight flex items-center gap-2 [text-wrap:balance]">
                <Building2 className="w-5 h-5 text-[#2563eb]" />
                Mes Chantiers
              </h2>
              <span className="text-xs font-semibold text-[#888780] bg-[#f0f0f0] px-2.5 py-0.5 rounded-full tabular-nums">
                {chantiers.length}
              </span>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
              <Input
                type="text"
                placeholder="Rechercher un chantier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-[#f8f9fa] border-black/10 focus-visible:ring-1 focus-visible:ring-[#2563eb]"
              />
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="w-full rounded-xl font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] text-xs h-9 active:scale-[0.96] transition-transform"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouveau Chantier
            </Button>
          </div>
          
          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
            {isListLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-[#888780]">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563eb] mb-2" />
                <span className="text-xs">Chargement des chantiers...</span>
              </div>
            )}

            {!isListLoading && chantiers.length === 0 && (
              <div className="text-center py-12 px-4 text-[#888780]">
                <HardHat className="w-10 h-10 mx-auto text-[#ccc] mb-2" />
                <p className="text-sm font-bold text-[#1a1a1a] mb-1">Aucun chantier</p>
                <p className="text-xs text-[#888780] mb-4 [text-wrap:pretty]">Créez votre premier projet de construction pour commencer.</p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Créer un chantier
                </Button>
              </div>
            )}

            {chantiers.map((site) => (
              <div
                key={site.id}
                onClick={() => setSelectedId(site.id)}
                className={cn(
                  "flex items-center p-3.5 rounded-xl cursor-pointer relative overflow-hidden transition-all duration-200 border border-transparent bg-white hover:bg-[#fafafa] active:scale-[0.98]",
                  effectiveId === site.id && "bg-white border-[#2563eb] shadow-[0_4px_16px_rgba(37,99,235,0.08)]"
                )}
              >
                {/* Status indicator bar */}
                <div 
                  className={cn(
                    "absolute left-0 w-1 h-[65%] rounded-r-[4px]",
                    site.healthFlag === 'Green' ? "bg-[#10b981]" : 
                    site.healthFlag === 'Orange' ? "bg-[#f59e0b]" : "bg-[#ef4444]"
                  )} 
                />
                
                {/* Site Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <div className="font-bold text-[#1a1a1a] text-[0.88rem] mb-0.5 truncate">{site.name}</div>
                  <div className="text-[0.75rem] text-[#888780] flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {site.location || site.gouvernorate || 'Localisation non spécifiée'}
                  </div>
                </div>
                
                {/* Progress Circle */}
                <div className={cn(
                  "w-9 h-9 rounded-full border-2 flex items-center justify-center text-[0.7rem] font-extrabold transition-colors shrink-0 ml-2 tabular-nums",
                  effectiveId === site.id 
                    ? "border-[#2563eb] text-[#2563eb] bg-[#eff6ff]" 
                    : "border-[#e5e7eb] text-[#666]"
                )}>
                  {site.progressPct}%
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Detail Content */}
        <main className="flex-1 bg-[#fbfbfb] overflow-y-auto relative custom-scrollbar">
          {isDetailLoading && (
            <div className="flex flex-col items-center justify-center h-full text-[#888780]">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563eb] mb-3" />
              <span className="text-sm font-medium">Chargement du chantier...</span>
            </div>
          )}

          {!isDetailLoading && selectedDetail && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDetail.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="p-8 max-w-[1250px] mx-auto"
              >
                {/* Page Header */}
                <header className="mb-8 bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-md tabular-nums">
                          {selectedDetail.reference}
                        </span>
                        <h1 className="text-2xl font-extrabold text-[#1a1a1a] tracking-tight m-0 [text-wrap:balance]">
                          {selectedDetail.name}
                        </h1>
                        <span className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full",
                          selectedDetail.status === 'Completed' ? "bg-[#dcfce7] text-[#15803d]" :
                          selectedDetail.status === 'InProgress' ? "bg-[#eff6ff] text-[#1d4ed8]" :
                          "bg-[#f3f4f6] text-[#4b5563]"
                        )}>
                          {selectedDetail.status === 'Completed' ? 'Terminé' :
                           selectedDetail.status === 'InProgress' ? 'En cours' :
                           selectedDetail.status === 'OnHold' ? 'En pause' : 'Planifié'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-[#888780] flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#2563eb]" /> {selectedDetail.location || 'Localisation non spécifiée'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Début: <span className="tabular-nums">{new Date(selectedDetail.startDate).toLocaleDateString('fr-FR')}</span>
                        </span>
                        {selectedDetail.architectName && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-[#1a1a1a]">Architecte: {selectedDetail.architectName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress summary banner */}
                    <div className="flex items-center gap-4 bg-[#f8f9fa] p-3.5 rounded-xl border border-black/5 shrink-0">
                      <div>
                        <div className="text-[0.7rem] font-bold uppercase tracking-wider text-[#888780]">Avancement</div>
                        <div className="text-xl font-extrabold text-[#2563eb] tabular-nums">{selectedDetail.progressPct}%</div>
                      </div>
                      <div className="w-24 bg-[#e5e7eb] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563eb] h-full rounded-full transition-all duration-500"
                          style={{ width: `${selectedDetail.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex border-b border-black/5 overflow-x-auto gap-1">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap active:scale-[0.96] transition-transform",
                            isActive
                              ? "border-[#2563eb] text-[#2563eb] bg-[#eff6ff]/40 rounded-t-lg"
                              : "border-transparent text-[#888780] hover:text-[#1a1a1a] hover:bg-[#fafafa] rounded-t-lg"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", isActive ? "text-[#2563eb]" : "text-[#888780]")} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </header>

                {/* Tab Views */}
                <div className="mt-4">
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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#888780]">
              <HardHat className="w-16 h-16 text-[#ccc] mb-4" />
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2 [text-wrap:balance]">Bienvenue sur le module Chantier</h3>
              <p className="text-sm text-[#888780] max-w-[450px] mb-6 [text-wrap:pretty]">
                Ce module ERP est conçu pour les entreprises de construction pour piloter la production, les équipes, les matériaux et le suivi d'avancement.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl px-6 active:scale-[0.96] transition-transform min-h-[40px]"
              >
                <Plus className="w-4 h-4 mr-2" /> Créer un premier chantier
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Nouveau Chantier */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold [text-wrap:balance]">Créer un nouveau chantier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Nom du chantier</label>
                <Input
                  type="text"
                  placeholder="Ex: Résidence Les Palmiers"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="rounded-xl text-xs h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Référence</label>
                <Input
                  type="text"
                  placeholder="CH-2026-001"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Localisation / Adresse</label>
                <Input
                  type="text"
                  placeholder="Ex: Ennasr II, Tunis"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Gouvernorat</label>
                <Input
                  type="text"
                  placeholder="Tunis, Sousse, Sfax..."
                  value={newGouv}
                  onChange={(e) => setNewGouv(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Date début</label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  required
                  className="rounded-xl text-xs h-10 tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Fin estimée</label>
                <Input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="rounded-xl text-xs h-10 tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Budget (TND)</label>
                <Input
                  type="number"
                  placeholder="150000"
                  value={newBudget || ''}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="rounded-xl text-xs h-10 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Description du projet</label>
              <Input
                type="text"
                placeholder="Description sommaire du projet..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createChantier.isPending}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4"
              >
                {createChantier.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer le chantier'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
