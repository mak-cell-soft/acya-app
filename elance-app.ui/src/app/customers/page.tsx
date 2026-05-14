'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  User, 
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  ExternalLink
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

const CUSTOMERS = [
  { id: 1, name: 'Sarl Menuiserie Moderne', manager: 'Ahmed Ben Salem', mf: '1234567/A/P/M/000', email: 'ahmed@menuiserie.tn', phone: '71 123 456', balance: 4500.500, status: 'Active' },
  { id: 2, name: 'Entreprise Bati Plus', manager: 'Sonia Mansour', mf: '9876543/B/C/H/000', email: 'contact@batiplus.com.tn', phone: '22 456 789', balance: -1250.000, status: 'Credit' },
  { id: 3, name: 'Espace Décoration', manager: 'Karim Jaziri', mf: '4561237/X/Z/R/000', email: 'karim@espacedecor.tn', phone: '55 789 123', balance: 0.000, status: 'Active' },
  { id: 4, name: 'Construction Pro', manager: 'Mohamed Ali', mf: '3216549/K/L/M/000', email: 'm.ali@procon.tn', phone: '98 321 654', balance: 12400.750, status: 'Active' },
  { id: 5, name: 'Atelier Artisanat', manager: 'Faten Amri', mf: '7893214/M/N/P/000', email: 'faten@atelier.tn', phone: '21 987 654', balance: 850.000, status: 'Active' },
];

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion des Clients</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez votre base client, les soldes et l'historique des ventes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            <Button className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Client
            </Button>
          </div>
        </div>

        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par nom, MF, téléphone..." 
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
                  <User className="w-4 h-4 text-forest-600" />
                  <span className="text-sm font-bold text-forest-900">{CUSTOMERS.length} Clients</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/50 border-b border-forest-50">
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Client</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Matricule Fiscal</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">Solde Actuel (TND)</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {CUSTOMERS.map((item) => (
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
                            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600 font-bold text-xs uppercase">
                              {item.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-forest-900">{item.name}</div>
                              <div className="text-[0.75rem] text-sand-400 font-medium">{item.manager}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-mono text-xs text-sand-600">{item.mf}</span>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-sand-400 font-medium">
                              <Phone className="w-3 h-3" /> {item.phone}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-sand-400 font-medium">
                              <Mail className="w-3 h-3" /> {item.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <span className={cn(
                            "font-bold",
                            item.balance < 0 ? "text-rose-600" : "text-forest-900"
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
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400 hover:text-forest-600 hover:bg-forest-100/50">
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
                                  <CreditCard className="w-4 h-4" /> État de Compte
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 font-bold text-forest-900 cursor-pointer">
                                  <FileText className="w-4 h-4" /> Documents
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
                                    <div className="flex items-start gap-3">
                                      <MapPin className="w-4 h-4 text-sand-400 mt-1" />
                                      <div className="text-sm font-medium text-sand-800 leading-relaxed">
                                        Zone Industrielle de Mornag,<br />
                                        Lot n°45, Ben Arous, Tunisie
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Statistiques Ventes</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Total Commandé</div>
                                        <div className="text-sm font-bold text-forest-900">45,800 TND</div>
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Dernière Vente</div>
                                        <div className="text-sm font-bold text-forest-900">10/05/2026</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-forest-100 pl-8">
                                    <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest">Documents en attente</h4>
                                    <div className="flex gap-2">
                                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 rounded-lg px-2">2 BL à facturer</Badge>
                                      <Badge className="bg-forest-100 text-forest-700 hover:bg-forest-100 rounded-lg px-2">1 Devis actif</Badge>
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
              <p className="text-sm text-sand-400 font-medium">Affichage de 1 à 5 sur {CUSTOMERS.length} clients</p>
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


