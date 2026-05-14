'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Truck, 
  ChevronDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Edit,
  Trash2,
  Gauge,
  Droplets,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const VEHICLES = [
  { id: 1, brand: 'Isuzu NPR', plate: '210 TUN 1234', mileage: 125000, insurance: '2026-06-15', techVisit: '2026-05-20', lastDrain: '2026-02-10', status: 'Optimal' },
  { id: 2, brand: 'Iveco Daily', plate: '195 TUN 5678', mileage: 85400, insurance: '2026-05-10', techVisit: '2026-08-12', lastDrain: '2026-04-15', status: 'Expiring Soon' },
  { id: 3, brand: 'Mitsubishi L200', plate: '225 TUN 9012', mileage: 45000, insurance: '2026-12-01', techVisit: '2026-11-15', lastDrain: '2026-05-01', status: 'Optimal' },
  { id: 4, brand: 'Renault Master', plate: '200 TUN 3456', mileage: 189000, insurance: '2026-04-15', techVisit: '2026-04-10', lastDrain: '2025-11-20', status: 'Expired' },
];

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Optimal': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Expiring Soon': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Expired': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-sand-50 text-sand-600 border-sand-100';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion du Parc Automobile</h1>
            <p className="text-sand-400 font-medium mt-1">Suivi de la maintenance, des kilométrages et des échéances légales.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Rapport
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Ajouter un Véhicule
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Véhicules', value: '12', icon: Truck, color: 'text-forest-600', bg: 'bg-forest-50' },
            { label: 'Alertes Assurance', value: '2', icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Visites à prévoir', value: '3', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Vidanges requises', value: '1', icon: Droplets, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, i) => (
            <Card key={i} className="border-forest-50 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-sand-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-forest-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par marque, matricule..." 
                  className="pl-10 h-11 rounded-xl border-forest-50 bg-sand-50/50 focus:border-forest-600 focus:ring-forest-600 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="h-11 rounded-xl text-sand-400 font-bold hover:bg-sand-100">
                  <Filter className="w-4 h-4 mr-2" /> Filtres
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Véhicule</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Kilométrage</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Assurance</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Visite Technique</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {VEHICLES.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={cn(
                          "group hover:bg-forest-50/30 transition-all duration-300 cursor-pointer",
                          expandedId === item.id && "bg-forest-50/50"
                        )}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-forest-900">{item.brand}</div>
                              <div className="font-mono text-[0.7rem] text-sand-400 font-bold">{item.plate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-forest-900">{item.mileage.toLocaleString()}</span>
                            <span className="text-[0.6rem] text-sand-400 font-bold uppercase tracking-wider">Kilomètres</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <div className={cn(
                            "inline-flex flex-col items-center p-2 rounded-xl border",
                            item.status === 'Expired' ? "border-rose-100 bg-rose-50" : "border-forest-50"
                          )}>
                            <span className="text-xs font-bold text-forest-900">{new Date(item.insurance).toLocaleDateString('fr-TN')}</span>
                            <span className="text-[0.6rem] text-sand-400 font-bold uppercase">Échéance</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <div className="inline-flex flex-col items-center p-2 rounded-xl border border-forest-50">
                            <span className="text-xs font-bold text-forest-900">{new Date(item.techVisit).toLocaleDateString('fr-TN')}</span>
                            <span className="text-[0.6rem] text-sand-400 font-bold uppercase">Prochaine visite</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <Badge className={cn("rounded-full px-3 py-1 font-bold text-[0.7rem] border", getStatusColor(item.status))}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400 hover:text-forest-600">
                              <Settings className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-forest-100 w-44">
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <Droplets className="w-4 h-4" /> Enregistrer Vidange
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <Edit className="w-4 h-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-rose-600 cursor-pointer hover:text-rose-700 hover:bg-rose-50">
                                  <Trash2 className="w-4 h-4" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <ChevronDown className={cn("w-4 h-4 text-sand-300 transition-transform duration-300", expandedId === item.id && "rotate-180")} />
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden bg-sand-50/30"
                              >
                                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                  <div className="space-y-4">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Détails Maintenance</h4>
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full border-4 border-forest-600 flex items-center justify-center text-[0.7rem] font-bold text-forest-600">
                                        85%
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Santé moteur</div>
                                        <div className="text-sm font-bold text-forest-900 text-emerald-600">Optimal</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Dernière Vidange</h4>
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-forest-100 rounded-lg">
                                        <Droplets className="w-5 h-5 text-forest-600" />
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Le {new Date(item.lastDrain).toLocaleDateString('fr-TN')}</div>
                                        <div className="text-sm font-bold text-forest-900">Huile 5W40 + Filtre</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Pneumatiques</h4>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-sand-400">AVANT</span>
                                        <span className="text-emerald-600">BON ÉTAT</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-sand-400">ARRIÈRE</span>
                                        <span className="text-amber-600">À SURVEILLER</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-forest-50 flex items-center justify-between">
              <p className="text-sm text-sand-400 font-medium">Affichage de 1 à 4 sur {VEHICLES.length} véhicules</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


