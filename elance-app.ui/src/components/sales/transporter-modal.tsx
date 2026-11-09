'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTransporters, useCreateTransporter, useUpdateTransporter, useDeleteTransporter } from '@/hooks/use-transporters';
import { useVehicles } from '@/hooks/use-vehicles';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { Transporter } from '@/types/settings';
import { Vehicle } from '@/types/vehicle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Truck, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Car, 
  ShieldCheck, 
  Fuel, 
  UserCheck, 
  ExternalLink, 
  Lock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TransporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransporter?: (transporter: Transporter) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  selectedTransporterId?: number | string | null;
  selectedVehicleId?: number | string | null;
}

type ModalTab = 'fleet' | 'external';

export function TransporterModal({ 
  isOpen, 
  onClose, 
  onSelectTransporter,
  onSelectVehicle,
  selectedTransporterId,
  selectedVehicleId,
}: TransporterModalProps) {
  const { hasPermission } = usePermissionGuard();
  const canReadVehicles = hasPermission('vehicles', 'canRead');

  // 1. Data Hooks
  const { 
    data: transporters = [], 
    isLoading: isLoadingTransporters,
    isError: isErrorTransporters,
    refetch: refetchTransporters
  } = useTransporters();

  const { 
    data: fleetVehicles = [], 
    isLoading: isLoadingVehicles,
    isError: isErrorVehicles,
    refetch: refetchVehicles
  } = useVehicles(true);

  const createTransporter = useCreateTransporter();
  const updateTransporter = useUpdateTransporter();
  const deleteTransporter = useDeleteTransporter();

  // 2. Active Tab & Search States
  const [activeTab, setActiveTab] = React.useState<ModalTab>('fleet');
  const [searchQuery, setSearchQuery] = React.useState('');

  // 3. External Transporters Add & Edit States
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newFullname, setNewFullname] = React.useState('');
  const [newCar, setNewCar] = React.useState('');

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editFullname, setEditFullname] = React.useState('');
  const [editCar, setEditCar] = React.useState('');

  // Reset local state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsAddingNew(false);
      setNewFullname('');
      setNewCar('');
      setEditingId(null);
    }
  }, [isOpen]);

  // If user cannot read vehicles, default to external transporters tab
  React.useEffect(() => {
    if (!canReadVehicles && activeTab === 'fleet') {
      setActiveTab('external');
    }
  }, [canReadVehicles, activeTab]);

  // 4. Clean Partitioning: External Transporters exclude owned fleet vehicles
  const externalTransporters = React.useMemo(() => {
    return transporters.filter((t) => {
      if (typeof t.car === 'object' && t.car !== null && (t.car as any).isowned === true) {
        return false;
      }
      if (t.isOwned === true) {
        return false;
      }
      return true;
    });
  }, [transporters]);

  // Filtered internal fleet list
  const filteredFleet = React.useMemo(() => {
    const owned = (fleetVehicles || []).filter(v => v.isowned === true);
    if (!searchQuery.trim()) return owned;
    const q = searchQuery.toLowerCase().trim();
    return owned.filter((v) => {
      const serial = (v.serialnumber || '').toLowerCase();
      const brand = (v.brand || '').toLowerCase();
      const conductor = (v.fuelcardconductor || '').toLowerCase();
      const enterprise = (v.fuelcardenterprise || '').toLowerCase();
      return serial.includes(q) || brand.includes(q) || conductor.includes(q) || enterprise.includes(q);
    });
  }, [fleetVehicles, searchQuery]);

  // Filtered external transporters list
  const filteredExternal = React.useMemo(() => {
    if (!searchQuery.trim()) return externalTransporters;
    const q = searchQuery.toLowerCase().trim();
    return externalTransporters.filter((t) => {
      const name = (t.fullname || '').toLowerCase();
      const carStr = typeof t.car === 'object' && t.car !== null
        ? `${(t.car as any).brand || ''} ${(t.car as any).serialnumber || ''}`.toLowerCase()
        : (t.car || '').toLowerCase();
      return name.includes(q) || carStr.includes(q);
    });
  }, [externalTransporters, searchQuery]);

  // 5. Selection Handlers
  const handleSelectFleetVehicle = (vehicle: Vehicle) => {
    // If an existing transporter in tbl_transporter references this vehicle, preserve its ID
    const matchingTransporter = transporters.find(
      (t) => typeof t.car === 'object' && t.car !== null && (t.car as any).id === vehicle.id
    );

    const displayName = vehicle.fuelcardconductor?.trim()
      ? `${vehicle.fuelcardconductor.trim()} (${vehicle.brand || 'Véhicule'} ${vehicle.serialnumber || ''})`.trim()
      : `${vehicle.brand || 'Véhicule'} ${vehicle.serialnumber || 'Interne'}`.trim();

    const transporterPayload: Transporter = {
      id: matchingTransporter?.id ?? vehicle.id,
      fullname: displayName,
      car: {
        ...vehicle,
        id: vehicle.id,
        serialnumber: vehicle.serialnumber || '',
        brand: vehicle.brand || '',
        isowned: true,
      },
      vehicleId: vehicle.id,
      isOwned: true,
    };

    if (onSelectTransporter) {
      onSelectTransporter(transporterPayload);
    }
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    }
    onClose();
  };

  const handleSelectExternalTransporter = (t: Transporter) => {
    if (onSelectTransporter) {
      onSelectTransporter(t);
    }
    onClose();
  };

  // 6. External Transporter CRUD Handlers
  const handleCreateExternal = async (autoSelect = false) => {
    if (!newFullname.trim()) {
      toast.error('Veuillez saisir le nom du transporteur.');
      return;
    }

    try {
      const created = await createTransporter.mutateAsync({
        fullname: newFullname.trim(),
        car: newCar.trim(),
      });

      setNewFullname('');
      setNewCar('');
      setIsAddingNew(false);

      if (autoSelect && onSelectTransporter) {
        const target = created || { id: Date.now(), fullname: newFullname.trim(), car: newCar.trim() };
        onSelectTransporter(target as Transporter);
        onClose();
      }
    } catch (err) {
      console.error('Error creating external transporter:', err);
    }
  };

  const handleStartEdit = (t: Transporter) => {
    setEditingId(t.id);
    setEditFullname(t.fullname || '');
    const carStr = typeof t.car === 'object' && t.car !== null
      ? `${(t.car as any).brand || ''} ${(t.car as any).serialnumber || ''}`.trim()
      : (t.car || '');
    setEditCar(carStr);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editFullname.trim()) {
      toast.error('Le nom du transporteur ne peut pas être vide.');
      return;
    }

    try {
      await updateTransporter.mutateAsync({
        id,
        data: {
          fullname: editFullname.trim(),
          car: editCar.trim(),
        },
      });
      setEditingId(null);
    } catch (err) {
      console.error('Error updating external transporter:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full rounded-3xl p-6 bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/10 space-y-5 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-corp-blue-50/80 text-corp-blue-600 border border-corp-blue-100/90 shrink-0 shadow-2xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-corp-blue-900 tracking-tight">
                Gestion des Transporteurs & Flotte
              </DialogTitle>
              <DialogDescription className="text-xs text-sand-500 font-medium">
                Sélectionnez un véhicule de l'entreprise ou un transporteur externe pour vos documents de livraison et transferts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Section Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-sand-100/70 border border-sand-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('fleet');
              setIsAddingNew(false);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
              activeTab === 'fleet'
                ? "bg-corp-blue-600 text-white shadow-sm shadow-corp-blue-600/20 border border-corp-blue-600"
                : "text-sand-600 hover:text-corp-blue-900 hover:bg-white/80 border border-transparent hover:border-sand-200/70"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Flotte Entreprise</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[0.65rem] font-black",
              activeTab === 'fleet' ? "bg-white/20 text-white" : "bg-sand-200/80 text-sand-600 border border-sand-300/40"
            )}>
              {canReadVehicles ? (fleetVehicles?.filter(v => v.isowned)?.length || 0) : '—'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
              activeTab === 'external'
                ? "bg-corp-blue-600 text-white shadow-sm shadow-corp-blue-600/20 border border-corp-blue-600"
                : "text-sand-600 hover:text-corp-blue-900 hover:bg-white/80 border border-transparent hover:border-sand-200/70"
            )}
          >
            <Truck className="w-4 h-4" />
            <span>Transporteurs Externes</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[0.65rem] font-black",
              activeTab === 'external' ? "bg-white/20 text-white" : "bg-sand-200/80 text-sand-600 border border-sand-300/40"
            )}>
              {externalTransporters.length}
            </span>
          </button>
        </div>

        {/* Tab A: Internal Fleet Banner */}
        {activeTab === 'fleet' && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200/70 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-emerald-950 block">Véhicules de la Flotte Entreprise</span>
                <span className="text-[0.7rem] text-emerald-700 font-medium truncate block">
                  Véhicules appartenant à l'entreprise (IsOwned = true). Sélectionnables directement pour la livraison.
                </span>
              </div>
            </div>
            <Link
              href="/vehicles"
              onClick={onClose}
              className="shrink-0 text-[0.7rem] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-white hover:bg-emerald-50/60 px-3 py-1.5 rounded-xl border border-emerald-300/80 hover:border-emerald-400 shadow-2xs transition-all"
            >
              <span>Gérer la flotte</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'fleet'
                    ? "Rechercher par matricule, marque, chauffeur..."
                    : "Rechercher par nom ou matricule transporteur..."
                }
                className="pl-10 h-11 rounded-2xl border border-sand-200 hover:border-sand-300 bg-sand-50/50 focus:bg-white text-xs font-bold text-corp-blue-900 focus-visible:border-corp-blue-500 focus-visible:ring-2 focus-visible:ring-corp-blue-500/20 focus-visible:ring-offset-0 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-red-500 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* In External tab: Show Add Button */}
            {activeTab === 'external' && (
              <Button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  if (!isAddingNew && searchQuery) {
                    setNewFullname(searchQuery);
                  }
                }}
                className="h-11 px-4 rounded-2xl bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold text-xs gap-2 transition-all shadow-md shadow-corp-blue-600/20 shrink-0 border border-corp-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau</span>
              </Button>
            )}
          </div>

          {/* New External Transporter Inline Form */}
          {activeTab === 'external' && isAddingNew && (
            <div className="p-4 rounded-2xl bg-corp-blue-50/50 border border-corp-blue-200/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-corp-blue-900 uppercase tracking-wider">
                  Nouveau Transporteur Externe
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-sand-400 hover:text-red-500 p-1 rounded-lg hover:bg-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[0.65rem] font-bold text-sand-500 uppercase block mb-1">
                    Nom Complet *
                  </label>
                  <Input
                    value={newFullname}
                    onChange={(e) => setNewFullname(e.target.value)}
                    placeholder="Ex: Societe Express / Ali Ben Salah"
                    className="h-9 rounded-xl border border-corp-blue-200/90 text-xs font-bold bg-white focus-visible:ring-1 focus-visible:ring-corp-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-bold text-sand-500 uppercase block mb-1">
                    Véhicule / Immatriculation
                  </label>
                  <Input
                    value={newCar}
                    onChange={(e) => setNewCar(e.target.value)}
                    placeholder="Ex: 210 TN 4567 / Isuzu"
                    className="h-9 rounded-xl border border-corp-blue-200/90 text-xs font-bold bg-white focus-visible:ring-1 focus-visible:ring-corp-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingNew(false)}
                  className="h-8 text-xs font-bold rounded-xl border-sand-200 hover:bg-sand-100"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => handleCreateExternal(true)}
                  disabled={createTransporter.isPending}
                  className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 border border-emerald-600 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer & Sélectionner</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
          {/* TAB A: INTERNAL FLEET */}
          {activeTab === 'fleet' && (
            <>
              {!canReadVehicles ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-sand-300/80 bg-sand-50/40 space-y-2">
                  <Lock className="w-6 h-6 text-sand-400 mx-auto" />
                  <p className="text-xs font-bold text-corp-blue-900">Accès restreint aux véhicules de la flotte</p>
                  <p className="text-[0.7rem] text-sand-500 max-w-sm mx-auto">
                    Votre compte utilisateur ne dispose pas de l'autorisation de lecture pour les véhicules. Vous pouvez utiliser les transporteurs externes.
                  </p>
                </div>
              ) : isLoadingVehicles ? (
                <div className="text-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600 mx-auto" />
                  <p className="text-xs text-sand-500 font-medium">Chargement des véhicules de la flotte...</p>
                </div>
              ) : isErrorVehicles ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-red-200/80 bg-red-50/40 space-y-2">
                  <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                  <p className="text-xs font-bold text-red-900">Erreur lors du chargement de la flotte</p>
                  <p className="text-[0.7rem] text-red-600">Impossible de récupérer les véhicules de l'entreprise.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchVehicles()}
                    className="h-7 text-xs font-bold rounded-lg border-red-200 hover:bg-red-100 text-red-700"
                  >
                    Réessayer
                  </Button>
                </div>
              ) : filteredFleet.length > 0 ? (
                filteredFleet.map((v) => {
                  const isSelected = Boolean(
                    (selectedVehicleId && Number(selectedVehicleId) === v.id) ||
                    (selectedTransporterId && Number(selectedTransporterId) === v.id)
                  );

                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "group p-3.5 rounded-2xl border bg-white transition-all duration-200 flex items-center justify-between gap-3.5 shadow-2xs",
                        isSelected
                          ? "border-corp-blue-500 bg-corp-blue-50/30 ring-1 ring-corp-blue-500/25 shadow-xs"
                          : "border-slate-200/90 hover:border-corp-blue-300 hover:bg-corp-blue-50/20 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Plate Badge */}
                        <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs tracking-wider border border-slate-700/80 shrink-0 shadow-xs">
                          <span className="text-[0.55rem] text-slate-400 uppercase tracking-widest leading-none">TN</span>
                          <span className="text-xs font-black">{v.serialnumber || 'SANS MATRICULE'}</span>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-corp-blue-950">
                              {v.brand || 'Véhicule Flotte'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Flotte Interne
                            </span>
                            {v.fuelcardenterprise && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                <Fuel className="w-2.5 h-2.5" />
                                {v.fuelcardenterprise}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[0.7rem] text-sand-500 font-medium flex-wrap">
                            {v.fuelcardconductor ? (
                              <span className="flex items-center gap-1 text-corp-blue-800 font-semibold">
                                <UserCheck className="w-3 h-3 text-sand-400" />
                                {v.fuelcardconductor}
                              </span>
                            ) : (
                              <span className="text-sand-400 italic">Conducteur non assigné</span>
                            )}
                            {v.mileage && (
                              <span className="text-sand-400">
                                • {Number(v.mileage).toLocaleString()} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Separator & Selection Button ONLY (No Edit / Delete) */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:block w-px h-8 bg-sand-200/80 shrink-0" />
                        {onSelectTransporter && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSelectFleetVehicle(v)}
                            className={cn(
                              "h-8 px-3.5 rounded-xl font-bold text-xs transition-all shadow-xs gap-1.5 border",
                              isSelected
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20"
                                : "bg-corp-blue-600 hover:bg-corp-blue-700 text-white border-corp-blue-600 shadow-corp-blue-600/20"
                            )}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Sélectionné' : 'Sélectionner'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-sand-300/80 bg-sand-50/40 space-y-3">
                  <p className="text-xs text-sand-500 font-medium">
                    {searchQuery
                      ? `Aucun véhicule de la flotte trouvé pour "${searchQuery}".`
                      : 'Aucun véhicule enregistré dans la flotte de l\'entreprise.'}
                  </p>
                  <Link
                    href="/vehicles"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-corp-blue-600 hover:bg-corp-blue-700 text-white shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter dans le menu Véhicules</span>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* TAB B: EXTERNAL TRANSPORTERS */}
          {activeTab === 'external' && (
            <>
              {isLoadingTransporters ? (
                <div className="text-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-corp-blue-600 mx-auto" />
                  <p className="text-xs text-sand-500 font-medium">Chargement des transporteurs externes...</p>
                </div>
              ) : isErrorTransporters ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-red-200/80 bg-red-50/40 space-y-2">
                  <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                  <p className="text-xs font-bold text-red-900">Erreur lors du chargement des transporteurs</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTransporters()}
                    className="h-7 text-xs font-bold rounded-lg border-red-200 hover:bg-red-100 text-red-700"
                  >
                    Réessayer
                  </Button>
                </div>
              ) : filteredExternal.length > 0 ? (
                filteredExternal.map((t) => {
                  const isEditing = editingId === t.id;
                  const carText = typeof t.car === 'object' && t.car !== null
                    ? `${(t.car as any).brand || ''} ${(t.car as any).serialnumber || ''}`.trim()
                    : (t.car || '');

                  const isSelected = Boolean(
                    selectedTransporterId && Number(selectedTransporterId) === t.id
                  );

                  if (isEditing) {
                    return (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-2xl border border-amber-200/90 bg-amber-50/40 space-y-2.5 animate-in fade-in duration-150 shadow-2xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={editFullname}
                            onChange={(e) => setEditFullname(e.target.value)}
                            placeholder="Nom du transporteur..."
                            className="h-8.5 text-xs font-bold bg-white border-amber-200/90 focus-visible:ring-1 focus-visible:ring-amber-400"
                          />
                          <Input
                            value={editCar}
                            onChange={(e) => setEditCar(e.target.value)}
                            placeholder="Véhicule / Immatriculation..."
                            className="h-8.5 text-xs font-bold bg-white border-amber-200/90 focus-visible:ring-1 focus-visible:ring-amber-400"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5 pt-0.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveEdit(t.id)}
                            disabled={updateTransporter.isPending}
                            className="h-7.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 border border-emerald-600 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Enregistrer
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-7.5 px-2.5 text-xs text-sand-600 hover:text-corp-blue-900 border border-sand-200 rounded-lg bg-white/60 hover:bg-white"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group p-3 rounded-2xl border bg-white transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs",
                        isSelected
                          ? "border-corp-blue-500 bg-corp-blue-50/30 ring-1 ring-corp-blue-500/25 shadow-xs"
                          : "border-slate-200/90 hover:border-corp-blue-300 hover:bg-corp-blue-50/20 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-sand-100 text-sand-600 border border-sand-200/70 group-hover:bg-corp-blue-100 group-hover:text-corp-blue-600 group-hover:border-corp-blue-200/70 transition-colors shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-corp-blue-900 truncate">
                            {t.fullname}
                          </div>
                          {carText ? (
                            <div className="text-[0.7rem] text-sand-500 font-medium truncate">
                              {carText}
                            </div>
                          ) : (
                            <div className="text-[0.65rem] text-sand-400 italic">
                              Pas de véhicule spécifié
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:block w-px h-7 bg-sand-200/80 shrink-0" />
                        {onSelectTransporter && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSelectExternalTransporter(t)}
                            className={cn(
                              "h-8 px-3 rounded-xl font-bold text-xs transition-all border shadow-2xs",
                              isSelected
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20"
                                : "bg-corp-blue-50 hover:bg-corp-blue-600 text-corp-blue-700 hover:text-white border-corp-blue-200/80 hover:border-corp-blue-600"
                            )}
                          >
                            {isSelected ? 'Sélectionné' : 'Sélectionner'}
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(t)}
                          className="h-8 w-8 rounded-xl border border-transparent hover:border-sand-200/90 text-sand-400 hover:text-corp-blue-600 hover:bg-corp-blue-50 transition-all"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteTransporter.mutate(t.id)}
                          disabled={deleteTransporter.isPending}
                          className="h-8 w-8 rounded-xl border border-transparent hover:border-red-200/90 text-sand-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-sand-300/80 bg-sand-50/40 space-y-3">
                  <p className="text-xs text-sand-500 font-medium">
                    {searchQuery
                      ? `Aucun transporteur trouvé pour "${searchQuery}".`
                      : 'Aucun transporteur externe enregistré.'}
                  </p>
                  {searchQuery && (
                    <Button
                      type="button"
                      onClick={() => {
                        setNewFullname(searchQuery);
                        setIsAddingNew(true);
                      }}
                      className="h-8 text-xs font-bold rounded-xl bg-corp-blue-600 text-white gap-1.5 border border-corp-blue-600 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter "{searchQuery}"</span>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
