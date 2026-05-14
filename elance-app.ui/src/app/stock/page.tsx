'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Filter, 
  Download, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  Store,
  Calendar,
  Box,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Warehouse,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MOVEMENTS = [
  { id: 1, date: '2026-05-14', type: 'Entrée', doc: 'BLA-2405-012', article: 'Sapin du Nord 25x150', delta: 15.500, after: 45.500, site: 'Dépôt Principal', unit: 'M³' },
  { id: 2, date: '2026-05-14', type: 'Sortie', doc: 'BL-2405-045', article: 'Chêne Rouge 50x200', delta: -2.200, after: 12.200, site: 'Dépôt Principal', unit: 'M³' },
  { id: 3, date: '2026-05-13', type: 'Transfert', doc: 'TR-2405-001', article: 'MDF 18mm', delta: -10.000, after: 65.000, site: 'Dépôt Principal', target: 'Showroom', unit: 'PCS' },
  { id: 4, date: '2026-05-12', type: 'Entrée', doc: 'BLA-2405-008', article: 'Colle Bois D3', delta: 50.000, after: 120.000, site: 'Dépôt Principal', unit: 'PCS' },
  { id: 5, date: '2026-05-11', type: 'Sortie', doc: 'BL-2405-032', article: 'Frêne Blanc 32mm', delta: -1.500, after: 8.400, site: 'Dépôt Principal', unit: 'M³' },
];

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Mouvements de Stock</h1>
            <p className="text-sand-400 font-medium mt-1">Historique en temps réel des entrées, sorties et transferts.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <History className="w-4 h-4 mr-2" /> Inventaire
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Download className="w-4 h-4 mr-2" /> Exporter Rapport
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-forest-50 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none">+12.5%</Badge>
              </div>
              <h3 className="text-2xl font-bold text-forest-900">145.5 M³</h3>
              <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mt-1">Total Entrées (Mai)</p>
            </CardContent>
          </Card>
          <Card className="border-forest-50 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                </div>
                <Badge className="bg-rose-50 text-rose-600 border-none">-8.2%</Badge>
              </div>
              <h3 className="text-2xl font-bold text-forest-900">92.2 M³</h3>
              <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mt-1">Total Sorties (Mai)</p>
            </CardContent>
          </Card>
          <Card className="border-forest-50 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Warehouse className="w-5 h-5 text-blue-600" />
                </div>
                <Badge className="bg-blue-50 text-blue-600 border-none">Active</Badge>
              </div>
              <h3 className="text-2xl font-bold text-forest-900">4 Dépôts</h3>
              <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mt-1">Sites de Stockage</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-4">
              <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Filtres</h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-600">Dépôt</label>
                  <Input placeholder="Tous les dépôts" className="h-10 rounded-xl border-forest-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-600">Article</label>
                  <Input placeholder="Rechercher article..." className="h-10 rounded-xl border-forest-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sand-600">Période</label>
                  <div className="p-3 bg-white border border-forest-100 rounded-xl flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-sand-800">Mai 2026</span>
                    <Calendar className="w-4 h-4 text-sand-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 bg-forest-900 rounded-[24px] text-white">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-heading font-bold text-sm">Stock Réconcilié</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Tous les mouvements correspondent au stock physique enregistré lors du dernier inventaire.
              </p>
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-9 text-xs rounded-xl font-bold">
                Détails Réconciliation
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-9">
            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-forest-100">
              {MOVEMENTS.map((item, i) => (
                <div key={item.id} className="relative group">
                  <div className={cn(
                    "absolute -left-[31px] top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 transition-transform duration-300 group-hover:scale-110",
                    item.type === 'Entrée' ? "bg-emerald-500" : 
                    item.type === 'Sortie' ? "bg-rose-500" : "bg-blue-500"
                  )}>
                    {item.type === 'Entrée' ? <ArrowDownLeft className="w-3 h-3 text-white" /> : 
                     item.type === 'Sortie' ? <ArrowUpRight className="w-3 h-3 text-white" /> : 
                     <Box className="w-3 h-3 text-white" />}
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="min-w-[100px]">
                      <div className="text-sm font-bold text-forest-900">{new Date(item.date).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-[0.65rem] font-bold text-sand-400 uppercase">{item.type}</div>
                    </div>
                    
                    <Card className="flex-1 border-forest-50 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-sand-50 flex items-center justify-center text-forest-600">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "text-[0.6rem] font-bold px-2 py-0",
                                item.type === 'Entrée' ? "bg-emerald-50 text-emerald-600" : 
                                item.type === 'Sortie' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {item.doc}
                              </Badge>
                              <span className="text-[0.7rem] font-bold text-sand-400">{item.site}</span>
                            </div>
                            <div className="font-bold text-forest-900 mt-0.5">{item.article}</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            item.delta > 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {item.delta > 0 ? '+' : ''}{item.delta.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} {item.unit}
                          </div>
                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">
                            Solde: {item.after.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


