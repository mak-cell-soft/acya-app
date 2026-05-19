'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Edit,
  Trash2,
  Droplets,
  ShieldAlert,
  CreditCard,
  Info,
  Loader2
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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { vehicleService } from '@/services/components/vehicle.service';
import { Vehicle } from '@/types/vehicle';
import { VehicleFormDialog } from './components/vehicle-form-dialog';
import { DeleteVehicleDialog } from './components/delete-vehicle-dialog';
import { toast } from 'sonner';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all vehicles
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getAll();
      setVehicles(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Filter only owned vehicles
  const ownedVehicles = React.useMemo(() => {
    return vehicles.filter(v => v.isowned === true);
  }, [vehicles]);

  // Calculate stats dynamically for owned vehicles
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let insuranceAlerts = 0;
    let visitAlerts = 0;
    let drainingAlerts = 0;

    ownedVehicles.forEach(v => {
      // Check Insurance
      if (v.insurancedate) {
        const insDate = new Date(v.insurancedate);
        insDate.setHours(0, 0, 0, 0);
        if (insDate <= thirtyDaysFromNow) {
          insuranceAlerts++;
        }
      }
      // Check Tech Visit
      if (v.technicalvisitdate) {
        const visDate = new Date(v.technicalvisitdate);
        visDate.setHours(0, 0, 0, 0);
        if (visDate <= thirtyDaysFromNow) {
          visitAlerts++;
        }
      }
      // Check draining date (older than 6 months is an alert)
      if (v.drainingdate) {
        const drainDate = new Date(v.drainingdate);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        if (drainDate < sixMonthsAgo) {
          drainingAlerts++;
        }
      }
    });

    return {
      total: ownedVehicles.length,
      insurance: insuranceAlerts,
      visits: visitAlerts,
      draining: drainingAlerts
    };
  }, [ownedVehicles]);

  const getVehicleStatus = (vehicle: Vehicle) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDateStatus = (dateStr: string | null | undefined) => {
      if (!dateStr) return 'Optimal';
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      if (date < today) return 'Expired';
      
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) return 'Expiring Soon';
      return 'Optimal';
    };

    const insStatus = checkDateStatus(vehicle.insurancedate);
    const visitStatus = checkDateStatus(vehicle.technicalvisitdate);

    if (insStatus === 'Expired' || visitStatus === 'Expired') return 'Expired';
    if (insStatus === 'Expiring Soon' || visitStatus === 'Expiring Soon') return 'Expiring Soon';
    return 'Optimal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Optimal': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Expiring Soon': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'Expired': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default: return 'bg-sand-50 text-sand-600 border-sand-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-TN');
  };

  const isExpiringSoon = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const isExpired = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const handleSaveVehicle = async (payload: any) => {
    if (payload.id) {
      await vehicleService.update(payload);
    } else {
      await vehicleService.add(payload);
    }
    loadVehicles();
  };

  const handleConfirmDelete = async () => {
    if (!selectedVehicle) return;
    setDeleting(true);
    try {
      await vehicleService.delete(selectedVehicle.id);
      toast.success('Véhicule supprimé avec succès');
      loadVehicles();
      setIsDeleteOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const openAddDialog = () => {
    setSelectedVehicle(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicle(vehicle);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  // Helper for dynamic Card Styling based on brand type in the expanded view
  const getCardStyle = (type: string | null | undefined) => {
    switch (type) {
      case 'Shell':
        return {
          bg: 'bg-gradient-to-tr from-amber-600 via-red-500 to-rose-600',
          border: 'border-red-500/20',
          textMuted: 'text-amber-100',
          logo: 'Shell Energy',
        };
      case 'Ola':
        return {
          bg: 'bg-gradient-to-tr from-slate-900 via-blue-950 to-orange-600',
          border: 'border-blue-900/20',
          textMuted: 'text-slate-300',
          logo: 'Ola Energy',
        };
      case 'Total':
      default:
        return {
          bg: 'bg-gradient-to-tr from-teal-700 to-emerald-600',
          border: 'border-teal-500/20',
          textMuted: 'text-emerald-100',
          logo: 'TotalEnergies',
        };
    }
  };

  // Filtered owned vehicles list
  const filteredVehicles = ownedVehicles.filter(v => {
    const term = searchTerm.toLowerCase();
    return (
      (v.brand?.toLowerCase() || '').includes(term) ||
      (v.serialnumber?.toLowerCase() || '').includes(term) ||
      (v.fuelcardconductor?.toLowerCase() || '').includes(term) ||
      (v.fuelcardenterprise?.toLowerCase() || '').includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-forest-900 tracking-tight">Gestion du Parc Automobile</h1>
            <p className="text-sand-400 font-medium mt-1">Suivi de la maintenance, des kilométrages et des cartes carburant.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50">
              <Download className="w-4 h-4 mr-2" /> Rapport
            </Button>
            <Button 
              onClick={openAddDialog}
              className="h-11 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter un Véhicule
            </Button>
          </div>
        </div>

        {/* Dynamic Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Véhicules', value: stats.total, icon: Truck, color: 'text-forest-600', bg: 'bg-forest-50' },
            { label: 'Alertes Assurance', value: stats.insurance, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Visites à prévoir', value: stats.visits, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Vidanges à effectuer', value: stats.draining, icon: Droplets, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, i) => (
            <Card key={i} className="border-forest-50 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-sand-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-forest-900">{loading ? '...' : stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vehicle list container */}
        <Card className="border-forest-100/50 shadow-xl shadow-forest-900/5 rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-forest-50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <Input 
                  placeholder="Rechercher par marque, matricule, chauffeur..." 
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-sand-400">
                          <Loader2 className="w-8 h-8 animate-spin text-forest-600" />
                          <span className="font-bold text-sm">Chargement des véhicules...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-sand-400 font-bold">
                        Aucun véhicule trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((item) => {
                      const status = getVehicleStatus(item);
                      const currentCardStyle = getCardStyle(item.fuelcardtype);
                      return (
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
                                  <div className="font-mono text-[0.7rem] text-sand-400 font-bold">{item.serialnumber}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-forest-900">
                                  {item.mileage ? Number(item.mileage).toLocaleString() : '---'}
                                </span>
                                <span className="text-[0.6rem] text-sand-400 font-bold uppercase tracking-wider">Kilomètres</span>
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <div className={cn(
                                "inline-flex flex-col items-center p-2 rounded-xl border",
                                isExpired(item.insurancedate) ? "border-rose-100 bg-rose-50" : isExpiringSoon(item.insurancedate) ? "border-amber-100 bg-amber-50" : "border-forest-50"
                              )}>
                                <span className="text-xs font-bold text-forest-900">{formatDate(item.insurancedate)}</span>
                                <span className="text-[0.6rem] text-sand-400 font-bold uppercase">Échéance</span>
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <div className={cn(
                                "inline-flex flex-col items-center p-2 rounded-xl border",
                                isExpired(item.technicalvisitdate) ? "border-rose-100 bg-rose-50" : isExpiringSoon(item.technicalvisitdate) ? "border-amber-100 bg-amber-50" : "border-forest-50"
                              )}>
                                <span className="text-xs font-bold text-forest-900">{formatDate(item.technicalvisitdate)}</span>
                                <span className="text-[0.6rem] text-sand-400 font-bold uppercase">Prochaine visite</span>
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <Badge className={cn("rounded-full px-3 py-1 font-bold text-[0.7rem] border", getStatusColor(status))}>
                                {status}
                              </Badge>
                            </td>
                            <td className="p-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-sand-400">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl border-forest-100 w-44">
                                    <DropdownMenuItem onClick={(e) => openEditDialog(item, e)} className="gap-2 font-bold text-forest-900 cursor-pointer">
                                      <Edit className="w-4 h-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => openDeleteDialog(item, e)} className="gap-2 font-bold text-rose-600 cursor-pointer hover:text-rose-700 hover:bg-rose-50">
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
                              <tr key={`expanded-${item.id}`}>
                                <td colSpan={6} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden bg-sand-50/30 border-b border-forest-50"
                                  >
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                                      {/* Maintenance */}
                                      <div className="space-y-4">
                                        <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <Droplets className="w-3.5 h-3.5 text-forest-600" /> Détails Vidange
                                        </h4>
                                        <div className="space-y-1">
                                          <div className="text-xs font-bold text-forest-900">
                                            Dernière: {formatDate(item.drainingdate)}
                                          </div>
                                          <div className="text-[0.7rem] font-semibold text-sand-500 max-w-xs leading-relaxed">
                                            {item.draining || "Aucun filtre enregistré lors de la dernière vidange."}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Propriétaire */}
                                      <div className="space-y-4 border-l border-forest-100 pl-8">
                                        <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <Info className="w-3.5 h-3.5 text-forest-600" /> Propriété
                                        </h4>
                                        <div className="space-y-1">
                                          <div className="text-xs font-bold text-forest-900">
                                            Véhicule d'Entreprise
                                          </div>
                                          <p className="text-[0.7rem] text-sand-500 leading-relaxed">
                                            Ce véhicule est enregistré sous l'actif de l'entreprise principale SOCOFEB.
                                          </p>
                                        </div>
                                      </div>

                                      {/* Carte Carburant Visual Card */}
                                      <div className="md:col-span-2 space-y-4 border-l border-forest-100 pl-8">
                                        <h4 className="text-[0.7rem] font-bold text-sand-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <CreditCard className="w-3.5 h-3.5 text-forest-600" /> Carte Carburant Associée
                                        </h4>

                                        {item.fuelcardconductor ? (
                                          <div className={`w-72 h-40 ${currentCardStyle.bg} text-white rounded-2xl p-4 shadow-lg relative overflow-hidden border ${currentCardStyle.border} flex flex-col justify-between`}>
                                            <div className="flex justify-between items-start">
                                              <div className="w-8 h-6 bg-gradient-to-r from-amber-300 to-amber-200 rounded flex flex-col justify-around p-0.5 shadow-inner">
                                                <div className="w-full h-[1px] bg-amber-800/10"></div>
                                                <div className="w-full h-[1px] bg-amber-800/10"></div>
                                              </div>
                                              <div className="text-[0.55rem] font-black tracking-tighter flex items-center gap-0.5">
                                                {item.fuelcardtype === 'Total' && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                                                {item.fuelcardtype === 'Shell' && <span className="inline-block w-1.5 h-1.5 bg-amber-300 rounded-full"></span>}
                                                {item.fuelcardtype === 'Ola' && <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full"></span>}
                                                <span>{currentCardStyle.logo}</span>
                                              </div>
                                            </div>

                                            <div className="space-y-0.5">
                                              <p className={`text-[0.5rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Entreprise</p>
                                              <p className="text-[0.7rem] font-bold tracking-wide uppercase truncate">
                                                {item.fuelcardenterprise || 'SOCOFEB'}
                                              </p>
                                            </div>

                                            <div className="flex justify-between items-end mt-2 pt-1 border-t border-white/10">
                                              <div className="space-y-0.5">
                                                <p className={`text-[0.45rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Conducteur</p>
                                                <p className="text-[0.6rem] font-bold uppercase truncate max-w-[100px]">{item.fuelcardconductor}</p>
                                              </div>
                                              <div className="space-y-0.5 text-right">
                                                <p className={`text-[0.45rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Matricule</p>
                                                <p className="text-[0.6rem] font-mono font-bold">{item.fuelcardmatricule || item.serialnumber}</p>
                                              </div>
                                              <div className="space-y-0.5 text-right pl-2">
                                                <p className={`text-[0.45rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Solde</p>
                                                <p className="text-[0.65rem] font-bold text-amber-200">
                                                  {item.fuelcardamount ? `${Number(item.fuelcardamount).toLocaleString()} TND` : '--- TND'}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="absolute right-0 bottom-0 top-0 w-24 bg-white/5 rounded-l-full transform translate-x-12 scale-y-150 rotate-12 pointer-events-none"></div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-forest-100 rounded-2xl bg-sand-50/50 max-w-xs text-center space-y-2">
                                            <p className="text-xs text-sand-500 font-medium leading-relaxed">
                                              Aucune carte carburant configurée pour ce véhicule.
                                            </p>
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              onClick={(e) => openEditDialog(item, e)}
                                              className="h-8 rounded-lg border-forest-100 text-forest-600 font-bold hover:bg-forest-50 text-[0.7rem]"
                                            >
                                              Associer une carte
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-forest-50 flex items-center justify-between">
              <p className="text-sm text-sand-400 font-medium">
                Affichage de 1 à {filteredVehicles.length} sur {ownedVehicles.length} véhicules
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <VehicleFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        vehicle={selectedVehicle}
        onSave={handleSaveVehicle}
      />

      {/* Delete Dialog */}
      <DeleteVehicleDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        vehicle={selectedVehicle}
        onConfirm={handleConfirmDelete}
        isLoading={deleting}
      />
    </DashboardLayout>
  );
}
