'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Package, 
  ChevronDown,
  History,
  Edit,
  Trash2,
  AlertCircle
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

const ARTICLES = [
  { id: 1, ref: 'BOIS-001', name: 'Sapin du Nord 25x150', category: 'Bois Blanc', subCategory: 'Sciage', price: 1250.000, stock: 45.5, unit: 'M³', status: 'In Stock' },
  { id: 2, ref: 'BOIS-002', name: 'Chêne Rouge 50x200', category: 'Bois Rouge', subCategory: 'Sciage', price: 4800.000, stock: 12.2, unit: 'M³', status: 'Low Stock' },
  { id: 3, ref: 'ACC-045', name: 'Colle Bois D3 5kg', category: 'Accessoires', subCategory: 'Colles', price: 85.500, stock: 120, unit: 'PCS', status: 'In Stock' },
  { id: 4, ref: 'BOIS-088', name: 'Frêne Blanc 32mm', category: 'Bois Noble', subCategory: 'Plateaux', price: 3200.000, stock: 8.4, unit: 'M³', status: 'In Stock' },
  { id: 5, ref: 'PAN-012', name: 'MDF 18mm 2800x2070', category: 'Panneaux', subCategory: 'MDF', price: 145.000, stock: 65, unit: 'Feuille', status: 'In Stock' },
];

export default function ArticlesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion des Articles</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez votre catalogue de bois, panneaux et accessoires.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nouvel Article
            </Button>
          </div>
        </div>

        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par référence, désignation..." 
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
                  <Package className="w-4 h-4 text-forest-600" />
                  <span className="text-sm font-bold text-forest-900">{ARTICLES.length} Articles</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Référence</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Désignation</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Catégorie</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">P.U TTC (TND)</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Stock</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {ARTICLES.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={cn(
                          "group hover:bg-forest-50/30 transition-all duration-300 cursor-pointer",
                          expandedId === item.id && "bg-forest-50/50"
                        )}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <td className="p-5">
                          <span className="font-bold text-forest-900">{item.ref}</span>
                        </td>
                        <td className="p-5">
                          <div className="font-medium text-sand-800">{item.name}</div>
                          <div className="text-[0.75rem] text-sand-400 font-medium">{item.subCategory}</div>
                        </td>
                        <td className="p-5">
                          <Badge variant="outline" className="bg-white border-forest-100 text-forest-600 font-bold rounded-lg px-2.5 py-0.5">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <span className="font-bold text-forest-900">{item.price.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</span>
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-forest-900">{item.stock}</span>
                            <span className="text-[0.65rem] text-sand-400 font-bold uppercase">{item.unit}</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <Badge 
                            className={cn(
                              "rounded-full px-3 py-1 font-bold text-[0.7rem]",
                              item.status === 'In Stock' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400 hover:text-forest-600 hover:bg-forest-100/50">
                              <History className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-forest-100 w-40">
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
                            <td colSpan={7} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden bg-sand-50/30"
                              >
                                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                  <div className="space-y-4">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Détails Techniques</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Épaisseur</div>
                                        <div className="text-sm font-bold text-forest-900">25 mm</div>
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Largeur</div>
                                        <div className="text-sm font-bold text-forest-900">150 mm</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Stock & Seuil</h4>
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-amber-50 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Seuil d'alerte</div>
                                        <div className="text-sm font-bold text-forest-900">5.0 M³</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Dernière Opération</h4>
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-bold text-xs">
                                        BL
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Vente #2405-012</div>
                                        <div className="text-sm font-bold text-forest-900">12/05/2026 - 2.5 M³</div>
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
              <p className="text-sm text-sand-400 font-medium">Affichage de 1 à 5 sur {ARTICLES.length} articles</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold border-forest-50 text-forest-600" disabled>Précédent</Button>
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold bg-forest-600 text-white border-forest-600">1</Button>
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold border-forest-50 text-forest-600">Suivant</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


