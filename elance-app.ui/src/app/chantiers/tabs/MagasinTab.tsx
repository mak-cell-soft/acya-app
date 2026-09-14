'use client';

import React, { useState } from 'react';
import { Truck, ShieldCheck, Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChantierDetail } from '@/types/chantier';
import { useAssignVehicle, useReleaseVehicle } from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/components/vehicle.service';
import { Vehicle } from '@/types/vehicle';
import { ChantierModal, FormFieldGroup } from '../components/ChantierModal';

interface MagasinTabProps {
  site: ChantierDetail;
}

export function MagasinTab({ site }: MagasinTabProps) {
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<number>(0);
  const [driverPersonId, setDriverPersonId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const assignVehicle = useAssignVehicle(site.id);
  const releaseVehicle = useReleaseVehicle(site.id);

  // Fetch real vehicles and drivers for seamless selection
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll(),
  });
  const { data: persons = [] } = usePersons();

  const vehicleAssignments = site.vehicleAssignments || [];

  const handleAssignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleId <= 0) return;

    await assignVehicle.mutateAsync({
      vehicleId: Number(vehicleId),
      driverPersonId: driverPersonId ? Number(driverPersonId) : undefined,
      notes: notes.trim() || undefined,
    });

    setIsAssignVehicleOpen(false);
    setVehicleId(0);
    setDriverPersonId(undefined);
    setNotes('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Refined Executive Logistics Dashboard Card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-700/40 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-full bg-[#2563eb]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Manager Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#60a5fa] shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                  Responsable Magasin & Logistique
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight m-0 mt-0.5 [text-wrap:balance]">
                {site.projectManagerName || 'Service Logistique & Matériel Central'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Supervision du parc engins, des équipements et des approvisionnements
              </p>
            </div>
          </div>

          {/* Key Scannable Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 min-w-[120px] text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#60a5fa] tabular-nums block leading-none">
                {vehicleAssignments.length}
              </span>
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 mt-1 block">
                Véhicules Actifs
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 min-w-[120px] text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#34d399] tabular-nums block leading-none">
                {site.teamMembers?.length || 0}
              </span>
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 mt-1 block">
                Équipe Site
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Section */}
      <div className="flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-[#2563eb]" />
            <h4 className="text-base font-bold text-[#0f172a] m-0 [text-wrap:balance]">
              Véhicules & Engins Affectés
            </h4>
            <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
              {vehicleAssignments.length}
            </span>
          </div>

          <Button
            onClick={() => setIsAssignVehicleOpen(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold px-4 active:scale-[0.96] transition-transform h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Affecter un véhicule
          </Button>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleAssignments.map((v) => (
            <Card
              key={v.id}
              className="border-black/5 shadow-xs rounded-2xl overflow-hidden bg-white hover:border-black/15 transition-colors"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[0.7rem] font-bold text-[#1e40af] bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 rounded-md font-mono tabular-nums inline-block mb-1.5">
                        {v.vehicleRegistration || `Véhicule #${v.vehicleId}`}
                      </span>
                      <h5 className="font-bold text-[#0f172a] text-sm sm:text-base m-0 truncate">
                        {v.vehicleModel || 'Engin / Camion Chantier'}
                      </h5>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-black/5 flex items-center justify-center text-[#2563eb] shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-black/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#64748b]">Chauffeur / Responsable</span>
                      <span className="font-bold text-[#0f172a] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#94a3b8]" />
                        <span>{v.driverPersonName || 'Non désigné'}</span>
                      </span>
                    </div>

                    {v.notes && (
                      <div className="text-[0.72rem] text-[#64748b] bg-[#f8fafc] p-2.5 rounded-xl border border-black/5 [text-wrap:pretty]">
                        {v.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> En service
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Confirmer la libération de ce véhicule du chantier ?')) {
                        releaseVehicle.mutate(v.id);
                      }
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold active:scale-[0.96] transition-transform h-8 px-2.5 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Libérer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {vehicleAssignments.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#64748b] text-xs bg-white">
              Aucun véhicule ou engin actuellement affecté à ce chantier. Cliquez sur « Affecter un véhicule ».
            </div>
          )}
        </div>
      </div>

      {/* Modal: Affecter un véhicule */}
      <ChantierModal
        open={isAssignVehicleOpen}
        onOpenChange={setIsAssignVehicleOpen}
        title="Affecter un véhicule au chantier"
        description="Associez un engin ou un véhicule de la flotte à ce chantier et désignez son chauffeur."
        icon={Truck}
        maxWidthClass="sm:max-w-[460px]"
        onSubmit={handleAssignVehicle}
        submitLabel="Affecter le véhicule"
        isSubmitting={assignVehicle.isPending}
        submitDisabled={vehicleId <= 0}
      >
        <div className="space-y-4">
          <FormFieldGroup label="Véhicule de la flotte" required>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(Number(e.target.value))}
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
              required
            >
              <option value={0}>Sélectionner un véhicule disponible...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.serialnumber || `Véhicule #${v.id}`} {v.brand ? `- ${v.brand}` : ''}
                </option>
              ))}
            </select>
          </FormFieldGroup>

          <FormFieldGroup label="Chauffeur / Responsable (Optionnel)">
            <select
              value={driverPersonId ?? ''}
              onChange={(e) =>
                setDriverPersonId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full h-9.5 px-3 border border-black/15 rounded-xl text-xs font-medium bg-white focus:outline-none focus:border-[#2563eb]"
            >
              <option value="">Aucun chauffeur assigné pour le moment</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstname} {p.lastname}
                </option>
              ))}
            </select>
          </FormFieldGroup>

          <FormFieldGroup label="Mission ou consignes d'utilisation">
            <Input
              type="text"
              placeholder="Ex: Transport des équipes et outillages lourds"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-xs h-9.5 border-black/15 focus:border-[#2563eb]"
            />
          </FormFieldGroup>
        </div>
      </ChantierModal>
    </div>
  );
}
