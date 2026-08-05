'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/use-customers';
import { Customer, GOUVERNORATES_TN, SOCIETY_PREFIXES } from '@/types/customer';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { TablePagination } from '@/components/shared/table-pagination';
import { CustomerDetailsDialog } from '@/components/customers/customer-details-dialog';
import { CustomerAccountDialog } from '@/components/customers/customer-account-dialog';
import { DeleteCustomerDialog } from '@/components/customers/delete-customer-dialog';
import { CustomerRecouvrementDialog } from '@/components/customers/customer-recouvrement-dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const PREFIX_LABELS: Record<string, string> = {
  ALL: 'Toutes Civilités / Formes',
  STE: 'STE — Société',
  ENT: 'ENT — Entreprise',
  ASS: 'ASS — Association',
  MRS: 'MRS — Monsieur',
  MME: 'MME — Madame',
  PERS: 'PERS — Pers. Physique',
  PASS: 'PASS — Passager',
  AUT: 'AUT — Autre',
};

export default function CustomersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [prefixFilter, setPrefixFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isRecouvrementOpen, setIsRecouvrementOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const queryClient = useQueryClient();
  const { hasPermission, hasAnyPermission } = usePermissionGuard();

  useEffect(() => {
    if (!hasAnyPermission('customers')) {
      toast.error("Vous n'avez pas l'autorisation d'accéder aux clients.");
      router.replace('/dashboard');
    }
  }, [hasAnyPermission, router]);

  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => {
      const matchesPrefix = prefixFilter === 'ALL' || c.prefix === prefixFilter;
      const matchesTerm = !term ||
        (c.firstname && c.firstname.toLowerCase().includes(term)) ||
        (c.lastname && c.lastname.toLowerCase().includes(term)) ||
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.identitycardnumber && c.identitycardnumber.toLowerCase().includes(term)) ||
        (c.taxregistrationnumber && c.taxregistrationnumber.toLowerCase().includes(term)) ||
        (c.phonenumberone && c.phonenumberone.includes(searchTerm));
      return matchesPrefix && matchesTerm;
    });
  }, [customers, searchTerm, prefixFilter]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIndex, startIndex + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

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

  const handleExport = () => {
    if (!customers || customers.length === 0) return;

    const exportData = customers.map(c => {
      const isSociety = SOCIETY_PREFIXES.some(p => p.id === c.prefix) || !!c.name;
      return {
        'Type Personne': isSociety ? 'Personne Morale' : 'Personne Physique',
        'Préfixe': c.prefix || (isSociety ? 'STE' : 'MR'),
        'Raison Sociale': c.name || '',
        'Description / Activité': c.description || '',
        'Prénom': c.firstname || '',
        'Nom': c.lastname || '',
        'Email': c.email || '',
        'Matricule Fiscal': c.taxregistrationnumber || '',
        'CIN': c.identitycardnumber || '',
        'Adresse': c.address || '',
        'Gouvernorat': c.gouvernorate || '',
        'Tél 1': c.phonenumberone || '',
        'Tél 2': c.phonenumbertwo || '',
        'Fonction / Activité': c.jobtitle || '',
        'Notes': c.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    
    const maxWidths = exportData.reduce((acc: any, row) => {
      Object.keys(row).forEach(key => {
        const val = row[key as keyof typeof row]?.toString() || '';
        acc[key] = Math.max(acc[key] || key.length, val.length);
      });
      return acc;
    }, {});
    
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] + 2 }));

    XLSX.writeFile(workbook, `clients_export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            {hasPermission('customers', 'canAdd') && (
              <Button 
                onClick={() => setIsImportOpen(true)}
                variant="outline" 
                className="h-11 rounded-xl border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50"
              >
                <Upload className="w-4 h-4 mr-2" /> Import / Export
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
                  placeholder="Rechercher par nom, CIN, MF, téléphone..." 
                  className="pl-10 h-11 rounded-xl border-corp-blue-50 bg-transparent focus:border-corp-blue-600 focus:ring-corp-blue-600 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={prefixFilter} onValueChange={(val) => setPrefixFilter(val || 'ALL')}>
                  <SelectTrigger className="w-[230px] h-11 rounded-xl border-corp-blue-50 focus:ring-corp-blue-600 bg-sand-50/50 text-xs font-bold text-corp-blue-900">
                    <div className="flex items-center gap-2 truncate">
                      <Filter className="w-4 h-4 text-corp-blue-600 shrink-0" />
                      <span className="truncate">{PREFIX_LABELS[prefixFilter] || 'Toutes Civilités / Formes'}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-corp-blue-100">
                    {Object.entries(PREFIX_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="font-bold text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  ) : paginatedCustomers.map((item) => (
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
                          {item.notes === 'SYSTEM_PASSAGER' ? (
                            <Badge className="rounded-full px-3 py-1 font-bold text-[0.7rem] border-none bg-amber-100 text-amber-800">
                              🔒 Client Passager
                            </Badge>
                          ) : (() => {
                            const isSociety = SOCIETY_PREFIXES.some(p => p.id === item.prefix) || !!item.name;
                            const label = isSociety ? 'Personne Morale' : 'Personne Physique';
                            return (
                              <Badge 
                                className={cn(
                                  "rounded-full px-3 py-1 font-bold text-[0.7rem] border-none shadow-2xs",
                                  isSociety ? "bg-corp-blue-100 text-corp-blue-800" : "bg-emerald-100 text-emerald-800"
                                )}
                              >
                                {label}
                              </Badge>
                            );
                          })()}
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
                                {hasPermission('customers', 'canUpdate') && item.notes !== 'SYSTEM_PASSAGER' && (
                                  <DropdownMenuItem onClick={() => openForm(item)} className="gap-2 font-bold text-corp-blue-900 cursor-pointer">
                                    <Edit className="w-4 h-4" /> Modifier
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('customers', 'canDelete') && item.notes !== 'SYSTEM_PASSAGER' && (
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
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[15, 30, 50, 100]}
            />
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
          onExportXlsx={handleExport}
        />
      </div>
    </DashboardLayout>
  );
}

