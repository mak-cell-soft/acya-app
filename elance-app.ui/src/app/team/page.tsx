'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Users, 
  ChevronDown,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  FileText,
  Edit,
  Trash2,
  HardHat,
  BadgeCheck,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  Building,
  KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Custom Hooks for API consumption
import { 
  usePersons, 
  useCreatePerson, 
  useUpdatePerson, 
  useDeletePerson, 
  useAppUsers, 
  useCreateAppUser,
  useUpdateAppUser 
} from '@/hooks/use-team';
import { useSites } from '@/hooks/use-enterprise';
import { Person, AppUser, ROLE_LABELS, ROLE_COLORS } from '@/types/team';

// Form Dialogs
import { AddEmployeeDialog } from './components/AddEmployeeDialog';
import { EditUserDialog } from './components/EditUserDialog';
import { CreateUserDialog } from './components/CreateUserDialog';
import { DeleteConfirmDialog } from '@/components/articles/delete-confirm-dialog';
import { LeaveManagementDialog } from './components/LeaveManagementDialog';
import { PayslipManagementDialog } from './components/PayslipManagementDialog';
import { AdvanceManagementDialog } from './components/AdvanceManagementDialog';
import { LeaveCalendarDialog } from './components/LeaveCalendarDialog';
import { PermissionsDialog } from './components/PermissionsDialog';
import { Coins } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';

export default function TeamPage() {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'employees' | 'users'>('employees');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dialog State
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  
  // Selection State
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Queries & Mutations
  const { data: persons, isLoading: isPersonsLoading } = usePersons();
  const { data: appUsers, isLoading: isUsersLoading } = useAppUsers();
  const { data: sites } = useSites();

  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const createAppUser = useCreateAppUser();
  const updateAppUser = useUpdateAppUser();
  const currentUser = useAuthStore(state => state.user);
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === '20' || currentUser?.role === 'SuperAdmin' || currentUser?.role === '10';

  // --- Filtering & Sorting ---
  const filteredPersons = useMemo(() => {
    if (!persons) return [];
    return persons.filter((p) => {
      const fullname = `${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
      const roleName = ROLE_LABELS[p.role]?.toLowerCase() || '';
      const matchText = searchTerm.toLowerCase();
      
      return (
        fullname.includes(matchText) ||
        p.cin?.includes(matchText) ||
        roleName.includes(matchText) ||
        p.phonenumber?.includes(matchText)
      );
    });
  }, [persons, searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!appUsers) return [];
    return appUsers.filter((u) => {
      const loginMatch = u.login.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const personMatch = u.person
        ? `${u.person.firstname || ''} ${u.person.lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
        : false;

      return loginMatch || emailMatch || personMatch;
    });
  }, [appUsers, searchTerm]);

  // --- Handlers ---
  const handleSaveEmployee = (model: any) => {
    if (selectedPerson) {
      updatePerson.mutate(
        { id: selectedPerson.id, data: model },
        {
          onSuccess: () => {
            setIsEmployeeDialogOpen(false);
            setSelectedPerson(null);
          }
        }
      );
    } else {
      createPerson.mutate(model, {
        onSuccess: () => {
          setIsEmployeeDialogOpen(false);
        }
      });
    }
  };

  const handleSaveUser = (model: any) => {
    if (selectedUser) {
      updateAppUser.mutate(
        { id: selectedUser.id, data: model },
        {
          onSuccess: () => {
            setIsUserDialogOpen(false);
            setSelectedUser(null);
          }
        }
      );
    }
  };

  const handleCreateUser = (model: any) => {
    createAppUser.mutate(model, {
      onSuccess: () => {
        setIsCreateUserDialogOpen(false);
      }
    });
  };

  const handleDeleteEmployee = () => {
    if (selectedPerson) {
      deletePerson.mutate(selectedPerson.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedPerson(null);
        }
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-corp-blue-900 tracking-tight">Équipe & RH</h1>
            <p className="text-sand-400 font-medium mt-1">Gérez vos collaborateurs, leurs contrats et les profils d&apos;utilisateurs de l&apos;application.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-11 border-corp-blue-100 text-corp-blue-600 font-bold hover:bg-corp-blue-50 px-5"
              onClick={() => setIsCalendarDialogOpen(true)}
            >
              <Calendar className="w-4 h-4 mr-2 text-emerald-600 animate-pulse" /> Planning Congés
            </Button>
            <Button 
              className="h-11 bg-corp-blue-600 text-white hover:bg-corp-blue-800 font-bold shadow-lg shadow-corp-blue-600/20 px-5 transition-all duration-300 transform active:scale-95"
              onClick={() => {
                if (activeTab === 'employees') {
                  setSelectedPerson(null);
                  setIsEmployeeDialogOpen(true);
                } else {
                  setIsCreateUserDialogOpen(true);
                }
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> {activeTab === 'employees' ? 'Ajouter un Membre' : 'Créer un Compte'}
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val as 'employees' | 'users');
            setSearchTerm('');
            setExpandedId(null);
          }}
        >
          <TabsList className="bg-sand-50 border border-corp-blue-50/50 p-1.5 rounded-2xl w-full md:w-auto">
            <TabsTrigger value="employees" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="w-4 h-4 mr-2 text-corp-blue-600" /> Collaborateurs
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ShieldCheck className="w-4 h-4 mr-2 text-corp-blue-600" /> Utilisateurs App
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters Panel */}
          <Card className="border-corp-blue-100/50 shadow-xl shadow-corp-blue-900/5 rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm mt-6">
            <CardHeader className="border-b border-corp-blue-50 p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                  <Input 
                    placeholder={
                      activeTab === 'employees' 
                        ? "Rechercher par nom, CIN, rôle..." 
                        : "Rechercher par identifiant, email, collaborateur..."
                    }
                    className="pl-10 h-11 rounded-xl border-corp-blue-50 bg-sand-50/50 focus:border-corp-blue-600 focus:ring-corp-blue-600 transition-all font-medium text-corp-blue-900 placeholder:text-sand-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-corp-blue-50 rounded-xl">
                    <Users className="w-4 h-4 text-corp-blue-600" />
                    <span className="text-sm font-bold text-corp-blue-900">
                      {activeTab === 'employees' 
                        ? `${filteredPersons.length} Membres` 
                        : `${filteredUsers.length} Comptes`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              
              {/* --- Employees Tab Content --- */}
              <TabsContent value="employees" className="outline-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-sand-50/50 border-b border-corp-blue-50">
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest pl-8">Collaborateur</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">CIN & CNSS</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Contact</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-right">Salaire Base</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Embauche</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-corp-blue-50">
                      {isPersonsLoading ? (
                        <TableSkeleton cols={6} />
                      ) : filteredPersons.length === 0 ? (
                        <EmptyState message="Aucun collaborateur trouvé." />
                      ) : (
                        filteredPersons.map((item) => (
                          <React.Fragment key={item.id}>
                            <tr 
                              className={cn(
                                "group hover:bg-corp-blue-50/30 transition-all duration-300 cursor-pointer border-l-4 border-transparent",
                                expandedId === item.id && "bg-corp-blue-50/50 border-corp-blue-600"
                              )}
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                              <td className="p-5 pl-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-corp-blue-100/70 text-corp-blue-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                    {item.firstname?.[0]}{item.lastname?.[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-corp-blue-900 text-sm flex items-center gap-2">
                                      {item.firstname} {item.lastname}
                                      {item.isappuser && (
                                        <Badge className="bg-corp-blue-100 text-corp-blue-700 border-none rounded-lg text-[0.65rem] py-0.5 px-2 hover:bg-corp-blue-100 flex items-center gap-1 font-bold">
                                          <UserCheck className="w-3 h-3" /> App
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[0.75rem] text-sand-400 font-bold tracking-wide mt-0.5 uppercase">
                                      {ROLE_LABELS[item.role] || `Rôle ${item.role}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <div className="flex flex-col gap-1 text-xs">
                                  <span className="font-semibold text-sand-600">CIN: <span className="font-mono text-corp-blue-900">{item.cin || 'N/A'}</span></span>
                                  <span className="font-medium text-sand-400">CNSS: <span className="font-mono text-sand-600">{item.idcnss || 'N/A'}</span></span>
                                </div>
                              </td>
                              <td className="p-5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-sand-700">
                                  <Phone className="w-3.5 h-3.5 text-sand-400" /> {item.phonenumber || 'Non renseigné'}
                                </div>
                              </td>
                              <td className="p-5 text-right font-bold text-corp-blue-950">
                                {item.basesalary.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} <span className="text-[0.65rem] text-sand-300 font-medium">TND</span>
                              </td>
                              <td className="p-5 text-center font-semibold text-sand-600 text-xs">
                                {item.hiredate ? new Date(item.hiredate).toLocaleDateString('fr-FR') : '--'}
                              </td>
                              <td className="p-5 text-right pr-8">
                                <div className="flex items-center justify-end gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-sand-300 hover:text-corp-blue-900">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-corp-blue-100 w-48 p-2 shadow-xl">
                                      <DropdownMenuItem 
                                        className="gap-2 font-bold text-corp-blue-900 cursor-pointer rounded-xl h-11"
                                        onClick={() => {
                                          setSelectedPerson(item);
                                          setIsEmployeeDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 text-emerald-600" /> Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="gap-2 font-bold text-corp-blue-900 cursor-pointer rounded-xl h-11"
                                        onClick={() => {
                                          setSelectedPerson(item);
                                          setIsLeaveDialogOpen(true);
                                        }}
                                      >
                                        <Calendar className="w-4 h-4 text-emerald-600" /> Congés
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="gap-2 font-bold text-corp-blue-900 cursor-pointer rounded-xl h-11"
                                        onClick={() => {
                                          setSelectedPerson(item);
                                          setIsPayslipDialogOpen(true);
                                        }}
                                      >
                                        <FileText className="w-4 h-4 text-emerald-600" /> Fiches de Paie
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="gap-2 font-bold text-corp-blue-900 cursor-pointer rounded-xl h-11"
                                        onClick={() => {
                                          setSelectedPerson(item);
                                          setIsAdvanceDialogOpen(true);
                                        }}
                                      >
                                        <Coins className="w-4 h-4 text-emerald-600" /> Avances
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="gap-2 font-bold text-rose-600 cursor-pointer hover:text-rose-700 hover:bg-rose-50 rounded-xl h-11"
                                        onClick={() => {
                                          setSelectedPerson(item);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" /> Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <div className="p-1 rounded-full bg-corp-blue-50/50">
                                    <ChevronDown className={cn("w-4 h-4 text-corp-blue-300 transition-transform duration-500", expandedId === item.id && "rotate-180 text-corp-blue-600")} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded Details Row */}
                            <AnimatePresence>
                              {expandedId === item.id && (
                                <tr>
                                  <td colSpan={6} className="p-0 border-none">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                      className="overflow-hidden bg-gradient-to-b from-corp-blue-50/50 to-transparent border-b border-corp-blue-50"
                                    >
                                      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 ml-4">
                                        
                                        {/* Address and info */}
                                        <div className="space-y-4">
                                          <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> Résidence & Domicile
                                          </h4>
                                          <div className="bg-white p-4 rounded-2xl border border-corp-blue-100 shadow-sm space-y-2">
                                            <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Adresse</div>
                                            <div className="text-sm font-semibold text-corp-blue-900">{item.address || 'Non spécifiée'}</div>
                                            {item.birthtown && (
                                              <div className="text-xs text-sand-400 font-medium">Né(e) à: <span className="font-bold text-corp-blue-600">{item.birthtown}</span></div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Financial details */}
                                        <div className="space-y-4 border-l border-corp-blue-100/50 pl-8">
                                          <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Heures & Banque
                                          </h4>
                                          <div className="bg-white p-4 rounded-2xl border border-corp-blue-100 shadow-sm space-y-3">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[0.65rem] font-bold text-sand-400 uppercase">H. Sup cumulées</span>
                                              <span className="text-sm font-bold text-corp-blue-900">{item.overtimehours} hrs</span>
                                            </div>
                                            <div className="border-t border-corp-blue-50 pt-2">
                                              <div className="text-[0.65rem] font-bold text-sand-400 uppercase">Coordonnées Bancaires</div>
                                              <div className="text-xs font-bold text-corp-blue-700 mt-1">{item.bankname || 'Aucune banque'}</div>
                                              <div className="text-xs font-mono text-sand-400 mt-0.5">{item.bankaccount || 'N/A'}</div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Contract documents */}
                                        <div className="space-y-4 border-l border-corp-blue-100/50 pl-8">
                                          <h4 className="text-[0.7rem] font-bold text-timber-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" /> Documents Associés
                                          </h4>
                                          <div className="flex flex-wrap gap-2 pt-2">
                                            <Badge className="bg-white text-sand-600 border border-corp-blue-100 font-bold rounded-lg py-1 px-2.5">Contrat CDI</Badge>
                                            <Badge className="bg-white text-sand-600 border border-corp-blue-100 font-bold rounded-lg py-1 px-2.5">Copie CIN</Badge>
                                            {item.idcnss && (
                                              <Badge className="bg-white text-sand-600 border border-corp-blue-100 font-bold rounded-lg py-1 px-2.5">Fiche CNSS</Badge>
                                            )}
                                          </div>
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
              </TabsContent>

              {/* --- App Users Tab Content --- */}
              <TabsContent value="users" className="outline-none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-sand-50/50 border-b border-corp-blue-50">
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest pl-8">Compte Utilisateur</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Collaborateur Lié</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Site Assigné</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest">Rôle</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest text-center">Status</th>
                        <th className="p-5 text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-corp-blue-50">
                      {isUsersLoading ? (
                        <TableSkeleton cols={6} />
                      ) : filteredUsers.length === 0 ? (
                        <EmptyState message="Aucun compte utilisateur trouvé." />
                      ) : (
                        filteredUsers.map((item) => {
                          const userSite = sites?.find(s => s.id === item.defaultsite);
                          
                          return (
                            <tr 
                              key={item.id}
                              className="group hover:bg-corp-blue-50/30 transition-all duration-300 cursor-pointer border-l-4 border-transparent"
                            >
                              <td className="p-5 pl-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-corp-blue-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-corp-blue-900/10">
                                    <KeyRound className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-corp-blue-900 text-sm">{item.login}</div>
                                    <div className="text-[0.75rem] text-sand-400 font-semibold flex items-center gap-1 mt-0.5">
                                      <Mail className="w-3 h-3" /> {item.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                {item.person ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-corp-blue-50 text-corp-blue-700 flex items-center justify-center font-bold text-[0.65rem] uppercase">
                                      {item.person.firstname?.[0]}{item.person.lastname?.[0]}
                                    </div>
                                    <span className="font-semibold text-sm text-corp-blue-900">
                                      {item.person.firstname} {item.person.lastname}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-rose-500 bg-rose-50 py-1 px-2.5 rounded-lg border border-rose-100">Compte non lié</span>
                                )}
                              </td>
                              <td className="p-5">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-corp-blue-800">
                                  <Building className="w-4 h-4 text-sand-300" /> {userSite?.address || `Site ID: ${item.defaultsite || 'Non assigné'}`}
                                </div>
                              </td>
                              <td className="p-5">
                                {item.person?.role ? (
                                  <Badge 
                                    className="rounded-lg px-2.5 py-1 font-bold text-[0.7rem] border-none text-white shadow-sm"
                                    style={{ backgroundColor: ROLE_COLORS[item.person.role] || 'var(--color-corp-blue-600)' }}
                                  >
                                    {ROLE_LABELS[item.person.role] || 'Inconnu'}
                                  </Badge>
                                ) : (
                                  <span className="text-sand-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="p-5 text-center">
                                <Badge 
                                  className={cn(
                                    "rounded-full px-3 py-1 font-bold text-[0.7rem] border-none",
                                    item.isactive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                  )}
                                >
                                  {item.isactive ? 'Actif' : 'Bloqué'}
                                </Badge>
                              </td>
                              <td className="p-5 text-right pr-8">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    className="h-9 font-bold bg-white hover:bg-corp-blue-50 border border-corp-blue-100 text-corp-blue-700 px-4 text-xs"
                                    onClick={(e) => {
                                      // NOTE: Prevent row expansion click event bubbling
                                      e.stopPropagation();
                                      setSelectedUser(item);
                                      setIsUserDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Paramètres
                                  </Button>

                                  {/* NOTE: If the app user is linked to an employee (person), allow managing their leaves, payslips, and advances. */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 text-sand-300 hover:text-corp-blue-900">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-corp-blue-100 w-48 p-2 shadow-xl">
                                      <DropdownMenuItem 
                                        className={cn(
                                          "gap-2 font-bold text-corp-blue-900 rounded-xl h-11",
                                          !item.person ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                        disabled={!item.person}
                                        onClick={(e) => {
                                          if (!item.person) return;
                                          e.stopPropagation();
                                          setSelectedPerson(item.person);
                                          setIsLeaveDialogOpen(true);
                                        }}
                                      >
                                        <Calendar className="w-4 h-4 text-emerald-600" /> Congés
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className={cn(
                                          "gap-2 font-bold text-corp-blue-900 rounded-xl h-11",
                                          !item.person ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                        disabled={!item.person}
                                        onClick={(e) => {
                                          if (!item.person) return;
                                          e.stopPropagation();
                                          setSelectedPerson(item.person);
                                          setIsPayslipDialogOpen(true);
                                        }}
                                      >
                                        <FileText className="w-4 h-4 text-emerald-600" /> Fiches de Paie
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className={cn(
                                          "gap-2 font-bold text-corp-blue-900 rounded-xl h-11",
                                          !isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                        disabled={!isAdmin}
                                        onClick={(e) => {
                                          if (!isAdmin) return;
                                          e.stopPropagation();
                                          setSelectedUser(item);
                                          setIsPermissionsDialogOpen(true);
                                        }}
                                      >
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Permissions
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className={cn(
                                          "gap-2 font-bold text-corp-blue-900 rounded-xl h-11",
                                          !item.person ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                        )}
                                        disabled={!item.person}
                                        onClick={(e) => {
                                          if (!item.person) return;
                                          e.stopPropagation();
                                          setSelectedPerson(item.person);
                                          setIsAdvanceDialogOpen(true);
                                        }}
                                      >
                                        <Coins className="w-4 h-4 text-emerald-600" /> Avances
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* --- Add / Edit Employee Dialog --- */}
      <AddEmployeeDialog
        isOpen={isEmployeeDialogOpen}
        onClose={() => {
          setIsEmployeeDialogOpen(false);
          setSelectedPerson(null);
        }}
        onSave={handleSaveEmployee}
        editEmployee={selectedPerson}
        isLoading={createPerson.isPending || updatePerson.isPending}
      />

      {/* --- Leave Management Dialog --- */}
      <LeaveManagementDialog
        isOpen={isLeaveDialogOpen}
        onClose={() => {
          setIsLeaveDialogOpen(false);
          setSelectedPerson(null);
        }}
        employee={selectedPerson}
      />

      {/* --- Payslip Management Dialog --- */}
      <PayslipManagementDialog
        isOpen={isPayslipDialogOpen}
        onClose={() => {
          setIsPayslipDialogOpen(false);
          setSelectedPerson(null);
        }}
        employee={selectedPerson}
      />

      {/* --- Advance Management Dialog --- */}
      <AdvanceManagementDialog
        isOpen={isAdvanceDialogOpen}
        onClose={() => {
          setIsAdvanceDialogOpen(false);
          setSelectedPerson(null);
        }}
        employee={selectedPerson}
      />

      {/* --- Leave Calendar Dialog --- */}
      <LeaveCalendarDialog
        isOpen={isCalendarDialogOpen}
        onClose={() => setIsCalendarDialogOpen(false)}
      />

      {/* --- Create AppUser Dialog --- */}
      <CreateUserDialog
        isOpen={isCreateUserDialogOpen}
        onClose={() => setIsCreateUserDialogOpen(false)}
        onSave={handleCreateUser}
        isLoading={createAppUser.isPending}
      />

      {/* --- Edit AppUser Dialog --- */}
      <EditUserDialog
        isOpen={isUserDialogOpen}
        onClose={() => {
          setIsUserDialogOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        editUser={selectedUser}
        isLoading={updateAppUser.isPending}
      />

      {/* --- Permissions Dialog --- */}
      <PermissionsDialog
        isOpen={isPermissionsDialogOpen}
        onClose={() => {
          setIsPermissionsDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      {/* --- Soft Delete Confirm Dialog --- */}
      <DeleteConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedPerson(null);
        }}
        onConfirm={handleDeleteEmployee}
        title="Supprimer le Collaborateur"
        description={`Êtes-vous sûr de vouloir supprimer le collaborateur "${selectedPerson?.firstname} ${selectedPerson?.lastname}" ? Cette action n'est pas réversible.`}
        isLoading={deletePerson.isPending}
      />

    </DashboardLayout>
  );
}

// Custom Premium Loading Skeletons
interface TableSkeletonProps {
  cols: number;
}
function TableSkeleton({ cols }: TableSkeletonProps) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((idx) => (
        <tr key={idx}>
          <td className="p-5 pl-8">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-28 rounded-lg" />
                <Skeleton className="h-3 w-20 mt-1 rounded-lg" />
              </div>
            </div>
          </td>
          {Array.from({ length: cols - 2 }).map((_, cIdx) => (
            <td key={cIdx} className="p-5">
              <Skeleton className="h-4 w-24 rounded-lg" />
            </td>
          ))}
          <td className="p-5 text-right pr-8">
            <Skeleton className="h-9 w-20 ml-auto rounded-xl" />
          </td>
        </tr>
      ))}
    </>
  );
}

// Custom Premium Empty State
interface EmptyStateProps {
  message: string;
}
function EmptyState({ message }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={10} className="p-20 text-center">
        <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-xl bg-sand-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-sand-300" />
          </div>
          <h3 className="text-corp-blue-900 text-lg font-bold">Aucune donnée</h3>
          <p className="text-sand-400 text-sm font-medium mt-1 max-w-[280px]">
            {message}
          </p>
        </div>
      </td>
    </tr>
  );
}




