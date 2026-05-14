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
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  ExternalLink,
  Warehouse
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

const PROVIDERS = [
  { id: 1, name: 'Scierie du Nord', contact: 'M. Hedi', location: 'Tabarka', category: 'Producteur', balance: -8500.000, status: 'Active' },
  { id: 2, name: 'Import Bois S.A', contact: 'Mme Ines', location: 'Sfax Port', category: 'Importateur', balance: 1200.500, status: 'Active' },
  { id: 3, name: 'Quincaillerie Centrale', contact: 'Ali', location: 'Tunis', category: 'Accessoires', balance: 0.000, status: 'Active' },
  { id: 4, name: 'Colles & Vernis Pro', contact: 'Sami', location: 'Ben Arous', category: 'Chimie', balance: -450.000, status: 'Active' },
  { id: 5, name: 'Transport Rapide', contact: 'Yassine', location: 'National', category: 'Service', balance: -2100.000, status: 'Active' },
];

export default function ProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion des Fournisseurs</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez vos sources d'approvisionnement et vos dettes fournisseurs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Fournisseur
            </Button>
          </div>
        </div>

        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par nom, ville..." 
                  className="pl-10 h-11 rounded-xl border-forest-50 bg-sand-50/50 focus:border-forest-600 focus:ring-forest-600 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="h-11 rounded-xl text-sand-400 font-bold hover:bg-sand-100">
                  <Filter className="w-4 h-4 mr-2" /> Filtres
                </Button>
                <div className="h-6 w-[1px] bg-forest-100 mx-2 hidden md:block" />
                <div className="flex items-center gap-2 px-3 py-2 bg-forest-50 rounded-lg">
                  <Warehouse className="w-4 h-4 text-forest-600" />
                  <span className="text-sm font-bold text-forest-900">{PROVIDERS.length} Fournisseurs</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Fournisseur</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Localisation</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Catégorie</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">Solde Actuel (TND)</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {PROVIDERS.map((item) => (
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
                            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600 font-bold text-xs">
                              {item.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-forest-900">{item.name}</div>
                              <div className="text-[0.75rem] text-sand-400 font-medium">{item.contact}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-sand-600">
                            <MapPin className="w-3 h-3 text-sand-300" /> {item.location}
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <Badge variant="outline" className="bg-white border-forest-100 text-forest-600 font-bold rounded-lg">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <span className={cn(
                            "font-bold",
                            item.balance < 0 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {item.balance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <Badge 
                            className={cn(
                              "rounded-full px-3 py-1 font-bold text-[0.7rem]",
                              item.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400 hover:text-forest-600">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-forest-100 w-44">
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <CreditCard className="w-4 h-4" /> Relevé Fournisseur
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <FileText className="w-4 h-4" /> Achats
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
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Coordonnées</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-3 text-sm text-sand-600 font-medium">
                                        <Phone className="w-4 h-4 text-sand-300" /> +216 71 888 999
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-sand-600 font-medium">
                                        <Mail className="w-4 h-4 text-sand-300" /> contact@scierienord.tn
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Derniers Achats</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-xs font-bold">
                                        <span className="text-sand-400 uppercase">12 Mai 2026</span>
                                        <span className="text-forest-900">4,500 TND</span>
                                      </div>
                                      <div className="flex justify-between text-xs font-bold">
                                        <span className="text-sand-400 uppercase">28 Avril 2026</span>
                                        <span className="text-forest-900">12,800 TND</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Performances</h4>
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[0.65rem] font-bold mb-1">
                                        <span className="text-sand-400">QUALITÉ</span>
                                        <span className="text-emerald-600">EXCELLENT</span>
                                      </div>
                                      <div className="flex justify-between text-[0.65rem] font-bold">
                                        <span className="text-sand-400">DÉLAIS</span>
                                        <span className="text-amber-600">MOYEN</span>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


