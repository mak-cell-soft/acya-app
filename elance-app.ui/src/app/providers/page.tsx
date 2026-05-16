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
  Warehouse,
  History,
  Building2,
  LayoutDashboard
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

// Hooks & Types
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/use-suppliers';
import { Supplier, SUPPLIER_CATEGORIES } from '@/types/customer';

// Components
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { SupplierDetailsDialog } from '@/components/suppliers/supplier-details-dialog';
import { SupplierAccountDialog } from '@/components/suppliers/supplier-account-dialog';
import { DeleteSupplierDialog } from '@/components/suppliers/delete-supplier-dialog';

export default function ProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Queries & Mutations
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.taxregistrationnumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailsOpen(true);
  };

  const handleOpenAccount = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsAccountOpen(true);
  };

  const handleOpenDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteOpen(true);
  };

  const handleSave = async (data: any) => {
    if (selectedSupplier) {
      await updateMutation.mutateAsync({ id: selectedSupplier.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (selectedSupplier) {
      await deleteMutation.mutateAsync(selectedSupplier.id);
      setIsDeleteOpen(false);
    }
  };

  const getCategoryLabel = (id: string) => {
    return SUPPLIER_CATEGORIES.find(c => c.id.toString() === id)?.value || "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-black text-forest-900 tracking-tight">Gestion des Fournisseurs</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez vos sources d'approvisionnement et vos dettes fournisseurs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-6">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            <Button 
              onClick={handleOpenCreate}
              className="h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20 px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> Nouveau Fournisseur
            </Button>
          </div>
        </div>

        <Card className="border-forest-100/50 shadow-2xl shadow-forest-900/5 rounded-[32px] overflow-hidden bg-white/80 backdrop-blur-md">
          <CardHeader className="border-b border-forest-50 p-8 bg-white/50">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par raison sociale, MF, ville..." 
                  className="pl-12 h-12 rounded-2xl border-forest-50 bg-sand-50/30 focus:border-forest-600 focus:ring-forest-600 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" className="h-12 rounded-xl text-sand-400 font-bold hover:bg-sand-100 px-5">
                  <Filter className="w-4 h-4 mr-2" /> Filtres
                </Button>
                <div className="h-8 w-[1px] bg-forest-100 mx-2 hidden md:block" />
                <div className="flex items-center gap-3 px-5 py-3 bg-forest-50 rounded-2xl border border-forest-100">
                  <Warehouse className="w-5 h-5 text-forest-600" />
                  <span className="text-sm font-black text-forest-900 tracking-tight">
                    {suppliers.length} <span className="text-forest-400 font-bold ml-1 uppercase text-[0.65rem]">Total</span>
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/30 border-b border-forest-50">
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em]">Fournisseur</th>
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em]">Matricule Fiscal</th>
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em] text-center">Catégorie</th>
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em] text-right">Solde (TND)</th>
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em] text-center">Type</th>
                    <th className="p-6 text-[0.7rem] font-black text-sand-400 uppercase tracking-[0.15em]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-forest-100 border-t-forest-600 rounded-full animate-spin" />
                          <p className="text-sm font-bold text-sand-400 uppercase tracking-widest">Chargement des fournisseurs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-24 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-16 h-16 rounded-3xl bg-sand-50 flex items-center justify-center text-sand-200 mx-auto">
                            <Truck className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-bold text-forest-900">Aucun fournisseur trouvé</p>
                          <p className="text-xs text-sand-400 font-medium leading-relaxed">Ajustez votre recherche ou ajoutez un nouveau fournisseur.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr 
                          className={cn(
                            "group hover:bg-forest-50/30 transition-all duration-300 cursor-pointer border-l-4 border-transparent",
                            expandedId === item.id && "bg-forest-50/50 border-forest-600 shadow-inner"
                          )}
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-600 font-black text-sm shadow-sm border border-forest-200/50">
                                {item.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-black text-forest-900 tracking-tight">{item.prefix} {item.name}</div>
                                <div className="text-[0.75rem] text-sand-400 font-bold uppercase tracking-tighter flex items-center gap-2 mt-0.5">
                                  <Phone className="w-3 h-3 text-sand-300" /> {item.phonenumberone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="font-mono text-xs font-bold text-forest-600 bg-forest-50 px-3 py-1.5 rounded-lg inline-block border border-forest-100/50">
                              {item.taxregistrationnumber || "—"}
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <Badge variant="outline" className="bg-white border-forest-100 text-forest-600 font-bold rounded-xl px-3 py-1">
                              {getCategoryLabel(item.jobtitle?.toString() || "")}
                            </Badge>
                          </td>
                          <td className="p-6 text-right">
                            <div className={cn(
                              "font-mono font-black text-base",
                              item.openingbalance < 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {item.openingbalance.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <Badge 
                              className={cn(
                                "rounded-full px-4 py-1.5 font-black text-[0.6rem] uppercase tracking-wider shadow-sm",
                                item.type === 'Both' 
                                  ? "bg-amber-100 text-amber-700 border border-amber-200" 
                                  : "bg-forest-100 text-forest-700 border border-forest-200"
                              )}
                            >
                              {item.type === 'Both' ? "Mixte" : "Fournisseur"}
                            </Badge>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl text-sand-400 hover:text-forest-600 hover:bg-forest-100/50 transition-all"
                                onClick={(e) => { e.stopPropagation(); handleOpenDetails(item); }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-sand-400 hover:bg-sand-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-forest-100 p-2 w-52 shadow-xl bg-white/95 backdrop-blur-md">
                                  <DropdownMenuItem 
                                    className="gap-3 font-bold text-forest-900 rounded-xl p-3 cursor-pointer hover:bg-forest-50"
                                    onClick={() => handleOpenAccount(item)}
                                  >
                                    <CreditCard className="w-4 h-4 text-emerald-500" /> État de Compte
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="gap-3 font-bold text-forest-900 rounded-xl p-3 cursor-pointer hover:bg-forest-50"
                                  >
                                    <History className="w-4 h-4 text-forest-500" /> Historique Achats
                                  </DropdownMenuItem>
                                  <div className="h-px bg-forest-50 my-1" />
                                  <DropdownMenuItem 
                                    className="gap-3 font-bold text-forest-900 rounded-xl p-3 cursor-pointer hover:bg-forest-50"
                                    onClick={() => handleOpenEdit(item)}
                                  >
                                    <Edit className="w-4 h-4 text-sand-400" /> Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="gap-3 font-bold text-rose-600 rounded-xl p-3 cursor-pointer hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => handleOpenDelete(item)}
                                  >
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <ChevronDown className={cn("w-4 h-4 text-sand-300 transition-transform duration-500 ml-2", expandedId === item.id && "rotate-180")} />
                            </div>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedId === item.id && (
                            <tr>
                              <td colSpan={6} className="p-0 border-none">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                  className="overflow-hidden bg-sand-50/20 backdrop-blur-sm"
                                >
                                  <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-forest-50">
                                    <div className="space-y-6">
                                      <h4 className="text-[0.65rem] font-black text-sand-400 uppercase tracking-[0.2em]">Contact & Siège</h4>
                                      <div className="space-y-4">
                                        <div className="flex items-start gap-4 text-sm text-sand-600 font-bold group">
                                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-forest-600 group-hover:scale-110 transition-transform">
                                            <MapPin className="w-4 h-4" />
                                          </div>
                                          <span className="leading-tight pt-1">{item.address || "Adresse non renseignée"}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-sand-600 font-bold group">
                                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-forest-600 group-hover:scale-110 transition-transform">
                                            <Mail className="w-4 h-4" />
                                          </div>
                                          <span className="pt-0.5">{item.email || "—"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-6 md:border-l md:border-forest-100 md:pl-10">
                                      <h4 className="text-[0.65rem] font-black text-sand-400 uppercase tracking-[0.2em]">Responsable</h4>
                                      <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-forest-900 flex items-center justify-center text-white text-xs font-bold group-hover:rotate-12 transition-transform">
                                          {item.firstname?.[0]}{item.lastname?.[0]}
                                        </div>
                                        <div>
                                          <div className="text-sm font-black text-forest-900">{item.firstname} {item.lastname}</div>
                                          <div className="text-[0.65rem] font-bold text-sand-400 uppercase tracking-tight">Directeur / Gérant</div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-6 md:border-l md:border-forest-100 md:pl-10">
                                      <h4 className="text-[0.65rem] font-black text-sand-400 uppercase tracking-[0.2em]">Données Bancaires</h4>
                                      {item.bankname ? (
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-forest-600 text-white border-transparent px-2 py-0 font-black text-[0.6rem]">
                                              {item.bankname}
                                            </Badge>
                                          </div>
                                          <div className="font-mono text-xs text-forest-900 font-bold break-all bg-white p-3 rounded-xl border border-forest-50 shadow-sm">
                                            {item.bankaccountnumber || "NON RENSEIGNÉ"}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-sand-300 italic font-medium pt-2">Aucun compte renseigné</div>
                                      )}
                                    </div>

                                    <div className="space-y-6 md:border-l md:border-forest-100 md:pl-10 flex flex-col justify-between">
                                      <div>
                                        <h4 className="text-[0.65rem] font-black text-sand-400 uppercase tracking-[0.2em]">Actions Rapides</h4>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                          <Button size="sm" variant="outline" className="rounded-lg h-9 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-3">
                                            <Truck className="w-3.5 h-3.5 mr-2" /> Bons Livraison
                                          </Button>
                                          <Button size="sm" variant="outline" className="rounded-lg h-9 border-forest-100 text-forest-600 font-bold hover:bg-forest-50 px-3">
                                            <FileText className="w-3.5 h-3.5 mr-2" /> Factures
                                          </Button>
                                        </div>
                                      </div>
                                      <Button 
                                        className="w-full bg-forest-900 text-white rounded-xl h-11 font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-forest-900/10"
                                        onClick={() => handleOpenDetails(item)}
                                      >
                                        Tableau de Bord Complet
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <SupplierFormDialog 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
          editSupplier={selectedSupplier}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <SupplierDetailsDialog 
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          supplier={selectedSupplier}
        />

        <SupplierAccountDialog 
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          supplier={selectedSupplier}
        />

        <DeleteSupplierDialog 
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          supplier={selectedSupplier}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
