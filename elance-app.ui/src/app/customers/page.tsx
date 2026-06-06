'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Upload,
  User, 
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  BadgeInfo,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { DataImportDialog } from '@/components/shared/data-import-dialog';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { Customer, GOUVERNORATES_TN } from '@/types/customer';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { CustomerDetailsDialog } from '@/components/customers/customer-details-dialog';
import { CustomerAccountDialog } from '@/components/customers/customer-account-dialog';
import { DeleteCustomerDialog } from '@/components/customers/delete-customer-dialog';
import { CustomerRecouvrementDialog } from '@/components/customers/customer-recouvrement-dialog';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isRecouvrementOpen, setIsRecouvrementOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const queryClient = useQueryClient();
  const { hasPermission } = usePermissionGuard();
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      (c.firstname && c.firstname.toLowerCase().includes(term)) ||
      (c.lastname && c.lastname.toLowerCase().includes(term)) ||
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.taxregistrationnumber && c.taxregistrationnumber.toLowerCase().includes(term)) ||
      (c.phonenumberone && c.phonenumberone.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const handleCreate = (data: any) => {
    createCustomer.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedCustomer(null);
      }
    });
  };

  const handleUpdate = (data: any) => {
    if (!selectedCustomer) return;
    updateCustomer.mutate({ id: selectedCustomer.id, data: data }, {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedCustomer(null);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedCustomer) return;
    deleteCustomer.mutate(selectedCustomer.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedCustomer(null);
      }
    });
  };

  const openForm = (customer: Customer | null = null) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const openDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const openAccount = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAccountOpen(true);
  };

  const openRecouvrement = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsRecouvrementOpen(true);
  };

  const openDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-corp-blue-900 tracking-tight">Gestion des Clients</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez votre base client, les soldes et l'historique des ventes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
            {hasPermission('customers', 'canAdd') && (
              <Button 
                onClick={() => setIsImportOpen(true)}
                variant="outline" 
                className="h-11 rounded-xl border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50"
              >
                <Upload className="w-4 h-4 mr-2" /> Importer
              </Button>
            )}
            {hasPermission('customers', 'canAdd') && (
              <Button 
                onClick={() => openForm()}
                className="h-11 rounded-xl bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20"
              >
                <Plus className="w-4 h-4 mr-2" /> Nouveau Client
              </Button>
            )}
          </div>
        </div>

        <Card className="border-corp-blue-100/50 shadow-none rounded-xl overflow-hidden bg-transparent">
          <CardHeader className="border-b border-corp-blue-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par nom, MF, téléphone..." 
                  className="pl-10 h-11 rounded-xl border-corp-blue-50 bg-transparent focus:border-corp-blue-600 focus:ring-corp-blue-600 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="h-11 text-sand-400 font-bold hover:bg-sand-100">
                  <Filter className="w-4 h-4 mr-2" /> Filtres
                </Button>
                <div className="h-6 w-[1px] bg-corp-blue-100 mx-2 hidden md:block" />
                <div className="flex items-center gap-2 px-3 py-2 bg-corp-blue-50 rounded-lg">
                  <User className="w-4 h-4 text-corp-blue-600" />
                  <span className="text-sm font-bold text-corp-blue-900">{filteredCustomers.length} Clients</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-transparent border-b border-corp-blue-50">
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest">Client</th>
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest">Matricule Fiscal</th>
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest text-right">Solde Actuel (TND)</th>
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest text-center">Type</th>
                    <th className="p-5 text-[0.7rem] font-bold text-corp-blue-900/50 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-blue-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-corp-blue-600 animate-spin" />
                          <p className="text-sand-400 font-bold">Chargement des clients...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={cn(
                          "group hover:bg-corp-blue-50/30 transition-all duration-300 cursor-pointer",
                          expandedId === item.id && "bg-corp-blue-50/50"
                        )}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-corp-blue-100 flex items-center justify-center text-corp-blue-600 font-bold text-xs uppercase">
                              {(item.name || item.firstname).substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-corp-blue-900">{item.name || `${item.firstname} ${item.lastname}`}</div>
                              <div className="text-[0.75rem] text-sand-400 font-medium">{item.firstname} {item.lastname}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-mono text-xs text-sand-600">{item.taxregistrationnumber || "—"}</span>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-sand-400 font-medium">
                              <Phone className="w-3 h-3" /> {item.phonenumberone}
                            </div>
                            {item.email && (
                              <div className="flex items-center gap-2 text-xs text-sand-400 font-medium">
                                <Mail className="w-3 h-3" /> {item.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <span className={cn(
                            "font-bold",
                            (item.currentbalance ?? item.openingbalance) < 0 ? "text-rose-600" : "text-corp-blue-900"
                          )}>
                            {(item.currentbalance ?? item.openingbalance).toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <Badge 
                            className={cn(
                              "rounded-full px-3 py-1 font-bold text-[0.7rem] border-none",
                              item.isTypeBoth ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {item.isTypeBoth ? 'Client/Fournisseur' : 'Client'}
                          </Badge>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-lg text-sand-400 hover:text-corp-blue-600 hover:bg-corp-blue-100/50"
                              onClick={(e) => { e.stopPropagation(); openDetails(item); }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-corp-blue-100 w-44">
                                <DropdownMenuItem onClick={() => openAccount(item)} className="gap-2 font-bold text-corp-blue-900 cursor-pointer">
                                  <CreditCard className="w-4 h-4" /> État de Compte
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRecouvrement(item)} className="gap-2 font-bold text-corp-blue-900 cursor-pointer text-green-700">
                                  <DollarSign className="w-4 h-4" /> Recouvrement
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDetails(item)} className="gap-2 font-bold text-corp-blue-900 cursor-pointer">
                                  <FileText className="w-4 h-4" /> Détails / Grille
                                </DropdownMenuItem>
                                {hasPermission('customers', 'canUpdate') && (
                                  <DropdownMenuItem onClick={() => openForm(item)} className="gap-2 font-bold text-corp-blue-900 cursor-pointer">
                                    <Edit className="w-4 h-4" /> Modifier
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('customers', 'canDelete') && (
                                  <DropdownMenuItem onClick={() => openDelete(item)} className="gap-2 font-bold text-rose-600 cursor-pointer hover:text-rose-700 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                  </DropdownMenuItem>
                                )}
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
                                    <div className="flex items-center gap-2">
                                      <BadgeInfo className="w-4 h-4 text-corp-blue-600" />
                                      <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Informations Générales</h4>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <MapPin className="w-4 h-4 text-sand-400 mt-1" />
                                      <div className="text-sm font-medium text-sand-800 leading-relaxed">
                                        {item.address},<br />
                                        {GOUVERNORATES_TN.find(g => g.key.toString() === item.gouvernorate || g.value === item.gouvernorate)?.value || item.gouvernorate}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-corp-blue-100 pl-8">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-corp-blue-600" />
                                      <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Finances</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Plafond Crédit</div>
                                        <div className="text-sm font-bold text-corp-blue-900">{(item.maximumsalesbar ?? 0).toLocaleString()} TND</div>
                                      </div>
                                      <div>
                                        <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Remise Max.</div>
                                        <div className="text-sm font-bold text-corp-blue-900">{item.maximumdiscount}%</div>
                                      </div>
                                    </div>
                                    {/* Shortcut trigger to directly open customer account statement */}
                                    <div className="pt-2 grid grid-cols-2 gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          openAccount(item); 
                                        }}
                                        className="w-full text-xs font-bold border-corp-blue-200 text-corp-blue-600 hover:bg-corp-blue-50 hover:text-corp-blue-800 transition-all rounded-xl"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 mr-2" /> État de Compte
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          openRecouvrement(item); 
                                        }}
                                        className="w-full text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 transition-all rounded-xl"
                                      >
                                        <DollarSign className="w-3.5 h-3.5 mr-2" /> Recouvrement
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-4 border-l border-corp-blue-100 pl-8">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-corp-blue-600" />
                                      <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Notes</h4>
                                    </div>
                                    <p className="text-xs text-sand-500 font-medium italic">
                                      {item.notes || "Aucune note particulière."}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                  {!isLoading && filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <User className="w-12 h-12" />
                          <p className="text-sand-400 font-bold">Aucun client trouvé</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-corp-blue-50 flex items-center justify-between">
              <p className="text-sm text-sand-400 font-medium">
                Affichage de {filteredCustomers.length} clients
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold border-corp-blue-50 text-corp-blue-600" disabled>Précédent</Button>
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold bg-corp-blue-600 text-white border-corp-blue-600">1</Button>
                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold border-corp-blue-50 text-corp-blue-600">Suivant</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CustomerFormDialog 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSave={selectedCustomer ? handleUpdate : handleCreate}
          editCustomer={selectedCustomer}
          isLoading={createCustomer.isPending || updateCustomer.isPending}
        />

        <CustomerDetailsDialog 
          isOpen={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)} 
          customer={selectedCustomer}
          onOpenAccount={(customer) => {
            setIsDetailsOpen(false); // Close details modal to prevent overlay stacking
            openAccount(customer);   // Open statement modal
          }}
        />

        <CustomerAccountDialog 
          isOpen={isAccountOpen} 
          onClose={() => setIsAccountOpen(false)} 
          customer={selectedCustomer}
        />

        {selectedCustomer && (
          <CustomerRecouvrementDialog
            open={isRecouvrementOpen}
            onOpenChange={setIsRecouvrementOpen}
            customerId={selectedCustomer.id}
          />
        )}

        <DeleteCustomerDialog 
          isOpen={isDeleteOpen} 
          onClose={() => setIsDeleteOpen(false)} 
          onConfirm={handleDelete}
          customer={selectedCustomer}
          isLoading={deleteCustomer.isPending}
        />

        <DataImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          type="customer"
          onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
        />
      </div>
    </DashboardLayout>
  );
}

