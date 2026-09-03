'use client';

import React, { useState } from 'react';
import { Truck, ShieldCheck, Plus, Trash2, Home, CheckCircle, Loader2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChantierDetail } from '@/types/chantier';
import { useAssignVehicle, useReleaseVehicle } from '@/hooks/use-chantiers';
import { usePersons } from '@/hooks/use-team';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/components/vehicle.service';
import { Vehicle } from '@/types/vehicle';
import { cn } from '@/lib/utils';

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
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll(),
  });
  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();

  const vehicleAssignments = site.vehicleAssignments || [];

  const handleAssignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleId <= 0) return;

    await assignVehicle.mutateAsync({
      vehicleId: Number(vehicleId),
      driverPersonId: driverPersonId ? Number(driverPersonId) : undefined,
      notes: notes.trim() || undefined
    });

    setIsAssignVehicleOpen(false);
    setVehicleId(0);
    setDriverPersonId(undefined);
    setNotes('');
  };

  return (
    <div className="flex flex-col gap-8 font-['Outfit',sans-serif]">
      {/* Store Manager Hero Banner */}
      <Card className="bg-[#1a1a1a] text-white border-none rounded-2xl shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#2563eb]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Responsable Magasin & Logistique</span>
              <h3 className="text-xl font-bold m-0 mt-1 [text-wrap:balance]">
                {site.projectManagerName || "Service Logistique Centrale"}
              </h3>
              <span className="text-xs text-white/70 mt-1 block">Affectation et suivi des engins et outillages</span>
            </div>
          </div>
          <div className="flex gap-6 md:gap-10 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-10 w-full md:w-auto justify-center">
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-[#2563eb] tabular-nums">{vehicleAssignments.length}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1 block">Véhicules Actifs</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-[#10b981] tabular-nums">{site.teamMembers.length}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1 block">Équipe Site</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-[#2563eb]" />
            <h4 className="text-lg font-bold text-[#1a1a1a] m-0 [text-wrap:balance]">Véhicules & Engins affectés</h4>
            <span className="text-xs font-semibold text-[#888780] bg-[#f0f0f0] px-2.5 py-0.5 rounded-full tabular-nums">
              {vehicleAssignments.length}
            </span>
          </div>

          <Button
            onClick={() => setIsAssignVehicleOpen(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold px-4 active:scale-[0.96] transition-transform min-h-[40px]"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Affecter un véhicule
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicleAssignments.map((v) => (
            <Card key={v.id} className="border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-md w-fit mb-1.5 tabular-nums">
                      {v.vehicleRegistration || `Véhicule #${v.vehicleId}`}
                    </div>
                    <h5 className="font-bold text-[#1a1a1a] text-base m-0 truncate">
                      {v.vehicleModel || "Engin / Utilitaire"}
                    </h5>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#f8f9fa] ring-1 ring-black/5 flex items-center justify-center text-[#2563eb] shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-black/5 pt-3 mt-3">
                  <span className="text-[#888780] font-medium">Chauffeur / Responsable</span>
                  <span className="font-bold text-[#1a1a1a]">{v.driverPersonName || "Non désigné"}</span>
                </div>

                {v.notes && (
                  <div className="text-[0.75rem] text-[#888780] bg-[#fafafa] p-2.5 rounded-xl mt-3 [text-wrap:pretty]">
                    {v.notes}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-black/5 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => releaseVehicle.mutate(v.id)}
                    className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold active:scale-[0.96] transition-transform min-h-[36px]"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Libérer du chantier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {vehicleAssignments.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-black/10 rounded-2xl text-[#888780] font-medium text-xs bg-white">
              Aucun véhicule ou engin actuellement affecté à ce chantier. Cliquez sur « Affecter un véhicule ».
            </div>
          )}
        </div>
      </div>

      {/* Modal: Affecter un véhicule */}
      <Dialog open={isAssignVehicleOpen} onOpenChange={setIsAssignVehicleOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl font-['Outfit',sans-serif] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a1a1a]">Affecter un véhicule au chantier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignVehicle} className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Véhicule de la flotte</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                required
              >
                <option value={0}>Sélectionner un véhicule...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.serialnumber || `Véhicule #${v.id}`} {v.brand ? `- ${v.brand}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Chauffeur / Responsable (Optionnel)</label>
              <select
                value={driverPersonId ?? ''}
                onChange={(e) => setDriverPersonId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-10 px-3 border border-black/10 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                <option value="">Aucun chauffeur assigné pour le moment</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstname} {p.lastname}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#888780] uppercase block mb-1.5">Notes ou mission</label>
              <Input
                type="text"
                placeholder="Ex: Transport personnel et outillage lourd"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <DialogFooter className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsAssignVehicleOpen(false)} className="rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform min-h-[38px]">
                Annuler
              </Button>
              <Button type="submit" disabled={vehicleId <= 0 || assignVehicle.isPending} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold active:scale-[0.96] transition-transform min-h-[38px] px-4">
                {assignVehicle.isPending ? 'Affectation...' : 'Valider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
