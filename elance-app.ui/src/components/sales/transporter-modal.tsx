'use client';

import * as React from 'react';
import { useTransporters, useCreateTransporter, useUpdateTransporter, useDeleteTransporter } from '@/hooks/use-transporters';
import { Transporter } from '@/types/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Truck, Edit2, Trash2, Check, X, Car } from 'lucide-react';
import { toast } from 'sonner';

interface TransporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransporter?: (transporter: Transporter) => void;
}

export function TransporterModal({ isOpen, onClose, onSelectTransporter }: TransporterModalProps) {
  const { data: transporters = [], isLoading } = useTransporters();
  const createTransporter = useCreateTransporter();
  const updateTransporter = useUpdateTransporter();
  const deleteTransporter = useDeleteTransporter();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newFullname, setNewFullname] = React.useState('');
  const [newCar, setNewCar] = React.useState('');

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editFullname, setEditFullname] = React.useState('');
  const [editCar, setEditCar] = React.useState('');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsAddingNew(false);
      setNewFullname('');
      setNewCar('');
      setEditingId(null);
    }
  }, [isOpen]);

  const filteredTransporters = React.useMemo(() => {
    if (!searchQuery.trim()) return transporters;
    const q = searchQuery.toLowerCase().trim();
    return transporters.filter((t) => {
      const name = (t.fullname || '').toLowerCase();
      const car = typeof t.car === 'object' && t.car !== null 
        ? ((t.car as any).serialnumber || '').toLowerCase() 
        : (t.car || '').toLowerCase();
      return name.includes(q) || car.includes(q);
    });
  }, [transporters, searchQuery]);

  const handleCreate = async (autoSelect = false) => {
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
        // If API returns created object or we match by payload
        const target = created || { id: Date.now(), fullname: newFullname.trim(), car: newCar.trim() };
        onSelectTransporter(target as Transporter);
        onClose();
      }
    } catch (err) {
      console.error('Error creating transporter:', err);
    }
  };

  const handleStartEdit = (t: Transporter) => {
    setEditingId(t.id);
    setEditFullname(t.fullname || '');
    const carStr = typeof t.car === 'object' && t.car !== null 
      ? ((t.car as any).serialnumber || '') 
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
      console.error('Error updating transporter:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-full rounded-3xl p-6 bg-white border border-corp-blue-100 shadow-2xl space-y-5 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-corp-blue-50 text-corp-blue-600 border border-corp-blue-100">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-corp-blue-900 tracking-tight">
                Gestion des Transporteurs
              </DialogTitle>
              <DialogDescription className="text-xs text-sand-500 font-medium">
                Recherchez, ajoutez ou modifiez la liste de vos transporteurs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Add Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou matricule..."
                className="pl-10 h-11 rounded-2xl border-corp-blue-100 bg-sand-50/50 text-xs font-bold text-corp-blue-900 focus:ring-2 focus:ring-corp-blue-500"
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

            <Button
              type="button"
              onClick={() => {
                setIsAddingNew(!isAddingNew);
                if (!isAddingNew && searchQuery) {
                  setNewFullname(searchQuery);
                }
              }}
              className="h-11 px-4 rounded-2xl bg-corp-blue-600 hover:bg-corp-blue-700 text-white font-bold text-xs gap-2 transition-all shadow-md shadow-corp-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </Button>
          </div>

          {/* New Transporter Inline Form */}
          {isAddingNew && (
            <div className="p-4 rounded-2xl bg-corp-blue-50/60 border border-corp-blue-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-corp-blue-900 uppercase tracking-wider">
                  Nouveau Transporteur
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-sand-400 hover:text-red-500 p-1"
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
                    className="h-9 rounded-xl border-corp-blue-200 text-xs font-bold bg-white"
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
                    className="h-9 rounded-xl border-corp-blue-200 text-xs font-bold bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingNew(false)}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => handleCreate(true)}
                  disabled={createTransporter.isPending}
                  className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer & Sélectionner</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Transporters List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-sand-400 font-medium">
              Chargement des transporteurs...
            </div>
          ) : filteredTransporters.length > 0 ? (
            filteredTransporters.map((t) => {
              const isEditing = editingId === t.id;
              const carText = typeof t.car === 'object' && t.car !== null
                ? `${(t.car as any).type || ''} ${(t.car as any).serialnumber || ''}`.trim()
                : (t.car || '');

              if (isEditing) {
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2 animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={editFullname}
                        onChange={(e) => setEditFullname(e.target.value)}
                        placeholder="Nom du transporteur..."
                        className="h-8 text-xs font-bold bg-white border-amber-200"
                      />
                      <Input
                        value={editCar}
                        onChange={(e) => setEditCar(e.target.value)}
                        placeholder="Véhicule / Immatriculation..."
                        className="h-8 text-xs font-bold bg-white border-amber-200"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(t.id)}
                        disabled={updateTransporter.isPending}
                        className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Enregistrer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="h-7 px-2.5 text-xs text-sand-500 rounded-lg"
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
                  className="group p-3 rounded-2xl border border-sand-200 hover:border-corp-blue-200 bg-white hover:bg-corp-blue-50/30 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-sand-100 text-sand-600 group-hover:bg-corp-blue-100 group-hover:text-corp-blue-600 transition-colors shrink-0">
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

                  <div className="flex items-center gap-1 shrink-0">
                    {onSelectTransporter && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelectTransporter(t);
                          onClose();
                        }}
                        className="h-8 px-3 rounded-xl bg-corp-blue-50 hover:bg-corp-blue-600 text-corp-blue-700 hover:text-white font-bold text-xs transition-all border border-corp-blue-100"
                      >
                        Sélectionner
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEdit(t)}
                      className="h-8 w-8 rounded-xl text-sand-400 hover:text-corp-blue-600 hover:bg-corp-blue-50"
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
                      className="h-8 w-8 rounded-xl text-sand-400 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-sand-200 bg-sand-50/50 space-y-3">
              <p className="text-xs text-sand-500 font-medium">
                {searchQuery
                  ? `Aucun transporteur trouvé pour "${searchQuery}".`
                  : 'Aucun transporteur enregistré.'}
              </p>
              {searchQuery && (
                <Button
                  type="button"
                  onClick={() => {
                    setNewFullname(searchQuery);
                    setIsAddingNew(true);
                  }}
                  className="h-8 text-xs font-bold rounded-xl bg-corp-blue-600 text-white gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter "{searchQuery}"</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
