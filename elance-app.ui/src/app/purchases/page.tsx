'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  ShoppingCart, 
  ChevronDown,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  BadgeCheck
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

const PURCHASES = [
  { id: 1, number: 'BLA-2405-001', date: '14/05/2026', provider: 'Scierie du Nord', amount_ttc: 15400.000, amount_ht: 12941.176, status: 'Reçu', isInvoiced: true },
  { id: 2, number: 'BLA-2405-002', date: '13/05/2026', provider: 'Import Bois S.A', amount_ttc: 8900.500, amount_ht: 7479.412, status: 'En attente', isInvoiced: false },
  { id: 3, number: 'BCA-2405-045', date: '12/05/2026', provider: 'Quincaillerie Centrale', amount_ttc: 450.000, amount_ht: 378.151, status: 'Commandé', isInvoiced: false },
  { id: 4, number: 'BLA-2405-003', date: '11/05/2026', provider: 'Scierie du Nord', amount_ttc: 12000.000, amount_ht: 10084.034, status: 'Reçu', isInvoiced: true },
  { id: 5, number: 'BCA-2405-012', date: '10/05/2026', provider: 'Transport Rapide', amount_ttc: 850.000, amount_ht: 714.286, status: 'En attente', isInvoiced: false },
];

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('Mai');

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion des Achats</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez vos commandes fournisseurs et entrées de marchandises.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nouvel Achat
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <Card className="border-forest-100 shadow-lg shadow-forest-900/5 rounded-[24px] bg-white overflow-hidden">
          <div className="p-4 bg-timber-600 text-white flex items-center justify-between">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-heading font-bold">{selectedMonth} 2026</h2>
              <p className="text-[0.65rem] font-bold text-white/50 uppercase tracking-[0.2em]">Période d'approvisionnement</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-2 overflow-x-auto flex items-center gap-1 justify-center bg-sand-50/50">
            {MONTHS.map(m => (
              <Button 
                key={m} 
                variant={selectedMonth === m ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMonth(m)}
                className={cn(
                  "rounded-lg h-9 px-4 font-bold text-[0.8rem]",
                  selectedMonth === m ? "bg-timber-600 text-white hover:bg-timber-700" : "text-sand-400 hover:text-timber-600 hover:bg-timber-50"
                )}
              >
                {m.substring(0, 3)}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par référence, fournisseur..." 
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
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-amber-900">{PURCHASES.length} Achats</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Référence</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Date</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Fournisseur</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">Montant TTC</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Entrée Stock</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {PURCHASES.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={cn(
                          "group hover:bg-forest-50/30 transition-all duration-300 cursor-pointer",
                          expandedId === item.id && "bg-forest-50/50"
                        )}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <td className="p-5">
                          <span className="font-bold text-forest-900">{item.number}</span>
                        </td>
                        <td className="p-5">
                          <span className="text-xs font-bold text-sand-400">{item.date}</span>
                        </td>
                        <td className="p-5">
                          <div className="font-bold text-forest-900 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center text-[0.6rem] text-amber-700">
                              {item.provider.substring(0, 1)}
                            </div>
                            {item.provider}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="font-bold text-forest-900">{item.amount_ttc.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</div>
                          <div className="text-[0.65rem] font-bold text-sand-400">{item.amount_ht.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} HT</div>
                        </td>
                        <td className="p-5 text-center">
                          <Badge 
                            className={cn(
                              "rounded-full px-3 py-1 font-bold text-[0.7rem]",
                              item.status === 'Reçu' ? "bg-emerald-50 text-emerald-600" : 
                              item.status === 'Commandé' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-5 text-center">
                          {item.status === 'Reçu' ? (
                            <BadgeCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 mx-auto" />
                          )}
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400 hover:text-forest-600">
                              <Printer className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-forest-100 w-44">
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <Edit className="w-4 h-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <Package className="w-4 h-4" /> Valider Entrée
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <FileDown className="w-4 h-4" /> Télécharger PDF
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
                            <td colSpan={7} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden bg-sand-50/30"
                              >
                                <div className="p-8">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                      <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Articles Achetés</h4>
                                      <div className="space-y-2">
                                        {[1, 2].map(i => (
                                          <div key={i} className="bg-white p-3 rounded-xl border border-forest-50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="text-[0.65rem] font-bold text-sand-300">#{i}</div>
                                              <div>
                                                <div className="text-sm font-bold text-forest-900">Madrier Sapin 4m</div>
                                                <div className="text-[0.7rem] text-sand-400 font-medium">BOIS-PUR-00{i}</div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm font-bold text-forest-900">25.000 M³</div>
                                              <div className="text-[0.7rem] text-sand-400 font-medium">1,100.000 TND / M³</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-4 border-l border-forest-100 pl-8">
                                      <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Suivi Logistique</h4>
                                      <div className="grid grid-cols-2 gap-6">
                                        <div>
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase mb-1">Date d'arrivée</div>
                                          <div className="text-sm font-bold text-forest-900">14/05/2026 10:15</div>
                                        </div>
                                        <div>
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase mb-1">Dépôt de réception</div>
                                          <div className="text-sm font-bold text-forest-900">Dépôt Nord (Tabarka)</div>
                                        </div>
                                        <div>
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase mb-1">Réceptionnaire</div>
                                          <div className="text-sm font-bold text-forest-900">Salem Mahmoud</div>
                                        </div>
                                        <div>
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase mb-1">Document Original</div>
                                          <div className="text-sm font-bold text-timber-600 underline">FACT-SN-9982</div>
                                        </div>
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


