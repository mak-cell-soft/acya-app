'use client';

import React, { useState } from 'react';
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
  Edit,
  Share,
  Info,
  BarChart2
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
import { SuiviTab } from './tabs/SuiviTab';
import { StatsTab } from './tabs/StatsTab';

const SITES = [
  {
    id: 1,
    name: 'Résidence El Mansour',
    location: 'Ennasr II, Tunis',
    createdAt: '2026-01-10T10:00:00Z',
    flag: 'green',
    progressPercent: 75,
    employees: Array(12).fill({}),
    architect: { firstName: 'M. Ben Ammar' }
  },
  {
    id: 2,
    name: 'Villa Contemporaine',
    location: 'Gammarth',
    createdAt: '2026-03-20T10:00:00Z',
    flag: 'orange',
    progressPercent: 30,
    employees: Array(6).fill({}),
    architect: { firstName: 'S. Trabelsi' }
  },
  {
    id: 3,
    name: 'Rénovation Bureaux',
    location: 'Lac 1',
    createdAt: '2025-11-05T10:00:00Z',
    flag: 'green',
    progressPercent: 100,
    employees: Array(4).fill({}),
    architect: { firstName: 'A. Kallel' }
  },
  {
    id: 4,
    name: 'Hôtel Le Sultan',
    location: 'Hammamet',
    createdAt: '2026-04-15T10:00:00Z',
    flag: 'red',
    progressPercent: 15,
    employees: Array(25).fill({}),
    architect: null
  },
];

const TABS = [
  { id: 0, label: 'Général', icon: Info },
  { id: 1, label: 'Équipe', icon: Users },
  { id: 2, label: 'Production', icon: HardHat },
  { id: 3, label: 'Matériaux', icon: LayoutGrid },
  { id: 4, label: 'Magasin', icon: Store },
  { id: 5, label: 'Suivi', icon: TrendingUp },
  { id: 6, label: 'Statistiques', icon: BarChart2 },
];

export default function ChantiersPage() {
  const [selectedId, setSelectedId] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  
  const selectedSite = SITES.find(s => s.id === selectedId) || SITES[0];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] bg-[#f8f9fa] -m-8 font-['Outfit',sans-serif] overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-full md:w-[320px] bg-white border-r border-black/5 shadow-[4px_0_15px_rgba(0,0,0,0.02)] z-10 flex flex-col shrink-0">
          <div className="p-6 border-b border-black/5">
            <h2 className="m-0 text-[1.25rem] font-bold text-[#1a1a1a] tracking-tight">Mes Chantiers</h2>
            <Button className="w-full mt-4 rounded-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Chantier
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
            {SITES.map((site) => (
              <div
                key={site.id}
                onClick={() => setSelectedId(site.id)}
                className={cn(
                  "flex items-center p-4 rounded-xl cursor-pointer relative overflow-hidden transition-all duration-300 border border-transparent bg-white hover:bg-[#fdfdfd] hover:translate-x-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)]",
                  selectedId === site.id && "bg-white border-[#2563eb] shadow-[0_8px_25px_rgba(37,99,235,0.1)]"
                )}
              >
                {/* Status Indicator */}
                <div 
                  className={cn(
                    "absolute left-0 w-1 h-[60%] rounded-r-[4px]",
                    site.flag === 'green' ? "bg-[#639922]" : 
                    site.flag === 'orange' ? "bg-[#2563eb]" : "bg-[#e24b4a]"
                  )} 
                />
                
                {/* Site Info */}
                <div className="flex-1 ml-3">
                  <div className="font-semibold text-[#1a1a1a] text-[0.95rem] mb-1">{site.name}</div>
                  <div className="text-[0.8rem] text-[#888780] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {site.location}
                  </div>
                </div>
                
                {/* Progress Circle */}
                <div className={cn(
                  "w-[42px] h-[42px] rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                  selectedId === site.id 
                    ? "border-[#2563eb] text-[#2563eb]" 
                    : "border-[#f0f0f0] text-[#333]"
                )}>
                  {site.progressPercent}%
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Detail Content */}
        <main className="flex-1 bg-[#fbfbfb] overflow-y-auto relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="p-8 max-w-[1200px] mx-auto"
            >
              {/* Page Header */}
              <header className="mb-10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-5">
                  <div>
                    <h1 className="text-[2.5rem] font-extrabold text-[#1a1a1a] m-0 mb-2 tracking-tight">
                      {selectedSite.name}
                    </h1>
                    <div className="flex items-center gap-3 text-[#888780] text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {selectedSite.location}
                      </span>
                      <span>•</span>
                      <span>
                        Créé le {new Date(selectedSite.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button className="rounded-[10px] px-5 font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]">
                      <Edit className="w-4 h-4 mr-2" /> Modifier
                    </Button>
                    <Button className="rounded-[10px] px-5 font-semibold bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]">
                      <Share className="w-4 h-4 mr-2" /> Exporter
                    </Button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex flex-wrap md:flex-nowrap items-center bg-white rounded-2xl py-5 px-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-black/5 gap-6 md:gap-10">
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[0.7rem] uppercase tracking-wider text-[#888780] font-bold">Drapeau</span>
                    <div className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        selectedSite.flag === 'green' ? "bg-[#639922]" : 
                        selectedSite.flag === 'orange' ? "bg-[#f59e0b]" : "bg-[#e24b4a]"
                      )} />
                      {selectedSite.flag === 'green' ? 'Sain' : selectedSite.flag === 'orange' ? 'Attention' : 'Critique'}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[0.7rem] uppercase tracking-wider text-[#888780] font-bold">Statut</span>
                    <span className={cn(
                      "font-semibold text-[0.85rem] px-2.5 py-0.5 rounded-md w-fit",
                      selectedSite.progressPercent < 100 
                        ? "bg-[#e1f5ee] text-[#1d9e75]" 
                        : "bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]"
                    )}>
                      {selectedSite.progressPercent < 100 ? 'En cours' : 'Terminé'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[0.7rem] uppercase tracking-wider text-[#888780] font-bold">Équipe</span>
                    <span className="font-semibold text-[#1a1a1a]">{selectedSite.employees.length} employés</span>
                  </div>

                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[0.7rem] uppercase tracking-wider text-[#888780] font-bold">Architecte</span>
                    <span className="font-semibold text-[#1a1a1a]">{selectedSite.architect?.firstName || 'Non assigné'}</span>
                  </div>

                  <div className="flex flex-col gap-1 flex-1 w-full mt-2 md:mt-0 order-10 md:order-none">
                    <span className="text-[0.7rem] uppercase tracking-wider text-[#888780] font-bold">Avancement ({selectedSite.progressPercent}%)</span>
                    <div className="w-full bg-[#f0f0f0] h-2 rounded-full mt-1 overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#1a1a1a] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedSite.progressPercent}%` }}
                        transition={{ duration: 0.8, delay: 0.2 } as any}
                      />
                    </div>
                  </div>
                </div>
              </header>

              {/* Tabs Nav */}
              <nav className="flex gap-4 md:gap-8 border-b border-black/5 mb-8 overflow-x-auto pb-0.5 custom-scrollbar">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "py-3 px-1 text-[0.85rem] md:text-[0.95rem] font-semibold flex items-center gap-2 relative transition-all whitespace-nowrap",
                        isActive ? "text-[#2563eb]" : "text-[#888780] hover:text-[#1a1a1a]"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                      {isActive && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#2563eb] rounded-t-sm" 
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Tab Content Placeholder */}
              <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm min-h-[400px]">
                {activeTab === 0 && <GeneralTab site={selectedSite} />}
                {activeTab === 1 && <EquipeTab site={selectedSite} />}
                {activeTab === 2 && <ProductionTab site={selectedSite} />}
                {activeTab === 3 && <MateriauxTab site={selectedSite} />}
                {activeTab === 4 && <MagasinTab site={selectedSite} />}
                {activeTab === 5 && <SuiviTab site={selectedSite} />}
                {activeTab === 6 && <StatsTab site={selectedSite} />}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
          }
        `}} />
      </div>
    </DashboardLayout>
  );
}
