'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Users,
  Package,
  TrendingUp,
  Clock,
  MoreVertical,
  ChevronRight,
  Building2,
  HardHat,
  LayoutGrid,
  List,
  AlertCircle,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SITES = [
  {
    id: 1,
    name: 'Résidence El Mansour',
    location: 'Ennasr II, Tunis',
    client: 'Sarl Immobilier Plus',
    progress: 75,
    status: 'In Progress',
    startDate: '2026-01-10',
    team: 12,
    budget: 145000,
    spent: 98000,
    deliveries: 15
  },
  {
    id: 2,
    name: 'Villa Contemporaine',
    location: 'Gammarth',
    client: 'Privé - M. Ben Ammar',
    progress: 30,
    status: 'In Progress',
    startDate: '2026-03-20',
    team: 6,
    budget: 85000,
    spent: 32000,
    deliveries: 4
  },
  {
    id: 3,
    name: 'Rénovation Bureaux',
    location: 'Lac 1',
    client: 'Global Tech TN',
    progress: 100,
    status: 'Completed',
    startDate: '2025-11-05',
    team: 4,
    budget: 45000,
    spent: 43500,
    deliveries: 8
  },
  {
    id: 4,
    name: 'Hôtel Le Sultan',
    location: 'Hammamet',
    client: 'Groupe Touristique',
    progress: 15,
    status: 'Delayed',
    startDate: '2026-04-15',
    team: 25,
    budget: 450000,
    spent: 120000,
    deliveries: 22
  },
];

export default function ChantiersPage() {
  const [selectedId, setSelectedId] = useState(1);
  const selectedSite = SITES.find(s => s.id === selectedId) || SITES[0];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion des Chantiers</h1>
            <p className="text-sand-400 font-medium mt-1">Suivi opérationnel, livraison de bois et avancement des projets.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Chantier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Master List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
              <Input
                placeholder="Rechercher un chantier..."
                className="pl-10 h-12 rounded-2xl border-forest-100 bg-white shadow-sm focus:ring-forest-600"
              />
            </div>

            <div className="space-y-3">
              {SITES.map((site) => (
                <motion.div
                  key={site.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedId(site.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-300 cursor-pointer group",
                    selectedId === site.id
                      ? "bg-forest-900 border-forest-900 text-white shadow-xl shadow-forest-900/10"
                      : "bg-white border-forest-50 hover:border-forest-200"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm line-clamp-1">{site.name}</div>
                    <Badge className={cn(
                      "text-[0.6rem] font-bold px-2 py-0.5 rounded-full",
                      selectedId === site.id
                        ? "bg-white/20 text-white border-transparent"
                        : site.status === 'Completed' ? "bg-emerald-50 text-emerald-600" :
                          site.status === 'Delayed' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {site.status}
                    </Badge>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 text-[0.7rem] font-medium mb-3",
                    selectedId === site.id ? "text-white/60" : "text-sand-400"
                  )}>
                    <MapPin className="w-3 h-3" /> {site.location}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[0.6rem] font-bold mb-1">
                      <span>Progression</span>
                      <span>{site.progress}%</span>
                    </div>
                    <div className={cn(
                      "h-1.5 w-full rounded-full overflow-hidden",
                      selectedId === site.id ? "bg-white/10" : "bg-sand-100"
                    )}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${site.progress}%` }}
                        className={cn(
                          "h-full rounded-full",
                          selectedId === site.id ? "bg-white" : "bg-forest-600"
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detail View */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-forest-100 shadow-xl shadow-forest-900/5 rounded-[32px] overflow-hidden bg-white">
                  <div className="pt-8 pb-8 px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-forest-50 rounded-[18px] border border-forest-100 flex items-center justify-center text-forest-600 shrink-0 shadow-sm">
                          <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-heading font-bold text-forest-900">{selectedSite.name}</h2>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-sm text-sand-400 font-medium">
                              <Users className="w-4 h-4" /> {selectedSite.client}
                            </div>
                            <div className="w-1 h-1 bg-sand-200 rounded-full" />
                            <div className="flex items-center gap-2 text-sm text-sand-400 font-medium">
                              <Calendar className="w-4 h-4" /> Début: {new Date(selectedSite.startDate).toLocaleDateString('fr-TN')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="rounded-xl border-forest-100 text-forest-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-xl border-forest-100 text-forest-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <div className="bg-sand-50/50 p-5 rounded-2xl border border-forest-50">
                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <HardHat className="w-3 h-3" /> Effectif Terrain
                        </div>
                        <div className="text-xl font-bold text-forest-900">{selectedSite.team} Ouvriers</div>
                        <p className="text-[0.65rem] text-emerald-600 font-bold mt-1">Équipe active aujourd'hui</p>
                      </div>
                      <div className="bg-sand-50/50 p-5 rounded-2xl border border-forest-50">
                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Package className="w-3 h-3" /> Livraisons Bois
                        </div>
                        <div className="text-xl font-bold text-forest-900">{selectedSite.deliveries} Bons</div>
                        <p className="text-[0.65rem] text-forest-600 font-bold mt-1">Total livraisons BL</p>
                      </div>
                      <div className="bg-sand-50/50 p-5 rounded-2xl border border-forest-50">
                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Consommation Budget
                        </div>
                        <div className="text-xl font-bold text-forest-900">
                          {Math.round((selectedSite.spent / selectedSite.budget) * 100)}%
                        </div>
                        <p className="text-[0.65rem] text-timber-600 font-bold mt-1">{selectedSite.spent.toLocaleString()} / {selectedSite.budget.toLocaleString()} TND</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-forest-50 pb-4">
                        <h3 className="font-heading font-bold text-forest-900">Dernières Livraisons</h3>
                        <Button variant="link" className="text-forest-600 font-bold text-xs h-auto p-0">Voir tout <ChevronRight className="w-3 h-3 ml-1" /></Button>
                      </div>

                      <div className="space-y-3">
                        {[
                          { ref: 'BL-2405-012', date: 'Hier, 14:20', items: 'Sapin du Nord (12 M³)', status: 'Recu' },
                          { ref: 'BL-2405-008', date: '10 Mai, 09:15', items: 'Poutrelles H20 (45 pcs)', status: 'Recu' },
                          { ref: 'BL-2404-098', date: '28 Avril, 16:45', items: 'Chêne Rouge (4 M³)', status: 'Recu' },
                        ].map((delivery, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white border border-forest-50 rounded-2xl hover:border-forest-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center text-forest-600">
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-forest-900">{delivery.ref}</div>
                                <div className="text-[0.65rem] text-sand-400 font-medium">{delivery.items}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[0.7rem] font-bold text-sand-600">{delivery.date}</div>
                              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[0.6rem] font-bold mt-1">REÇU</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedSite.status === 'Delayed' && (
                      <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
                        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-rose-900">Retard identifié</p>
                          <p className="text-xs text-rose-700 mt-1 font-medium">Ce chantier présente un retard de 12 jours sur le planning initial de gros œuvre.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


