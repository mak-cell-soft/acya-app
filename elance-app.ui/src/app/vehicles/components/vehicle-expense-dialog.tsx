'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Fuel,
  Droplets,
  Wrench,
  Calendar,
  ShieldCheck,
  Disc,
  Receipt,
  FileText,
  Loader2,
  DollarSign,
  Gauge,
  User,
  Building2
} from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import { VehicleExpense, VehicleExpenseType } from '@/types/vehicle-expense';
import { vehicleExpenseService } from '@/services/components/vehicle-expense.service';
import { usePersons } from '@/hooks/use-team';
import { toast } from 'sonner';

const expenseSchema = z.object({
  type: z.string().min(1, 'Le type de dépense est obligatoire'),
  date: z.date({ message: 'La date est obligatoire' }),
  amount: z.number({ message: 'Montant invalide' }).positive('Le montant doit être positif'),
  liters: z.number().optional().nullable(),
  mileage: z.number().optional().nullable(),
  driverName: z.string().optional().nullable(),
  stationOrProvider: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface VehicleExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  expenseToEdit?: VehicleExpense | null;
  onSuccess: () => void;
}

const EXPENSE_TYPES: { key: VehicleExpenseType; label: string; icon: any; color: string }[] = [
  { key: 'Fuel', label: 'Plein de Carburant', icon: Fuel, color: 'text-amber-500 bg-amber-50' },
  { key: 'OilChange', label: 'Vidange & Filtres', icon: Droplets, color: 'text-blue-500 bg-blue-50' },
  { key: 'Repair', label: 'Réparation & Mécanique', icon: Wrench, color: 'text-rose-500 bg-rose-50' },
  { key: 'TechnicalVisit', label: 'Visite Technique', icon: Calendar, color: 'text-purple-500 bg-purple-50' },
  { key: 'Insurance', label: 'Assurance', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-50' },
  { key: 'Tires', label: 'Pneumatiques', icon: Disc, color: 'text-cyan-500 bg-cyan-50' },
  { key: 'Vignette', label: 'Taxe & Vignette', icon: Receipt, color: 'text-orange-500 bg-orange-50' },
  { key: 'Other', label: 'Autre Dépense', icon: FileText, color: 'text-slate-500 bg-slate-50' },
];

export function VehicleExpenseDialog({
  isOpen,
  onClose,
  vehicle,
  expenseToEdit,
  onSuccess,
}: VehicleExpenseDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const { data: persons } = usePersons();

  const isEdit = !!expenseToEdit;

  const currentMileageNumber = vehicle?.mileage ? parseFloat(vehicle.mileage) : undefined;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      type: 'Fuel',
      date: new Date(),
      amount: undefined as any,
      liters: undefined,
      mileage: currentMileageNumber,
      driverName: vehicle?.fuelcardconductor || '',
      stationOrProvider: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        form.reset({
          type: expenseToEdit.type || 'Fuel',
          date: expenseToEdit.date ? new Date(expenseToEdit.date) : new Date(),
          amount: expenseToEdit.amount,
          liters: expenseToEdit.liters ?? undefined,
          mileage: expenseToEdit.mileage ?? undefined,
          driverName: expenseToEdit.driverName || '',
          stationOrProvider: expenseToEdit.stationOrProvider || '',
          notes: expenseToEdit.notes || '',
        });
      } else {
        form.reset({
          type: 'Fuel',
          date: new Date(),
          amount: undefined as any,
          liters: undefined,
          mileage: currentMileageNumber,
          driverName: vehicle?.fuelcardconductor || '',
          stationOrProvider: vehicle?.fuelcardtype ? `Station ${vehicle.fuelcardtype}` : '',
          notes: '',
        });
      }
    }
  }, [isOpen, expenseToEdit, vehicle, form, currentMileageNumber]);

  const selectedType = form.watch('type');

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const payload: Partial<VehicleExpense> = {
        id: expenseToEdit ? expenseToEdit.id : 0,
        vehicleId: vehicle.id,
        date: values.date.toISOString(),
        type: values.type,
        amount: values.amount,
        liters: values.liters || null,
        mileage: values.mileage || null,
        driverName: values.driverName || null,
        stationOrProvider: values.stationOrProvider || null,
        notes: values.notes || null,
      };

      if (isEdit) {
        await vehicleExpenseService.update(payload);
        toast.success('Dépense mise à jour avec succès');
      } else {
        await vehicleExpenseService.add(payload);
        toast.success('Dépense enregistrée avec succès');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement de la dépense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 border-corp-blue-100 shadow-2xl">
        {/* Header with gradient accent */}
        <div className="bg-gradient-to-br from-corp-blue-900 to-corp-blue-800 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <Fuel className="w-5 h-5 text-amber-400" />
              </span>
              {isEdit ? 'Modifier la Dépense' : 'Nouveau Plein / Dépense Flotte'}
            </DialogTitle>
            <DialogDescription className="text-corp-blue-200 text-xs font-medium">
              Véhicule : <strong className="text-white">{vehicle?.brand}</strong> ({vehicle?.serialnumber})
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Type Selector Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider">
              Type d'opération
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => form.setValue('type', t.key)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-corp-blue-600 bg-corp-blue-50/70 text-corp-blue-950 ring-2 ring-corp-blue-600/30 shadow-sm'
                        : 'border-corp-blue-100/60 bg-sand-50/40 text-sand-600 hover:border-corp-blue-200 hover:bg-corp-blue-50/20'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg mb-1 ${t.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[0.7rem] text-center leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-corp-blue-600" /> Date
              </Label>
              <DatePicker
                date={form.watch('date')}
                setDate={(d) => d && form.setValue('date', d)}
                placeholder="Sélectionner la date"
                className="w-full h-10 rounded-xl border-corp-blue-100"
              />
              {form.formState.errors.date && (
                <p className="text-[0.7rem] text-rose-500">{form.formState.errors.date.message}</p>
              )}
            </div>

            {/* Montant (TND) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-corp-blue-600" /> Montant (TND) *
              </Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.000"
                className="h-10 rounded-xl border-corp-blue-100 font-bold text-corp-blue-950"
                {...form.register('amount', { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-[0.7rem] text-rose-500">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Litres (si carburant) */}
            {selectedType === 'Fuel' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-500" /> Volume en Litres
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 45.5"
                  className="h-10 rounded-xl border-corp-blue-100 font-bold"
                  {...form.register('liters', { valueAsNumber: true })}
                />
              </div>
            )}

            {/* Kilométrage au compteur */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-corp-blue-600" /> Kilométrage (km)
              </Label>
              <Input
                type="number"
                step="1"
                placeholder={currentMileageNumber ? `Actuel: ${currentMileageNumber}` : 'Ex: 145000'}
                className="h-10 rounded-xl border-corp-blue-100 font-bold"
                {...form.register('mileage', { valueAsNumber: true })}
              />
            </div>

            {/* Chauffeur / Responsable */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-corp-blue-600" /> Chauffeur / Bénéficiaire
              </Label>
              {persons && persons.length > 0 ? (
                <Select
                  value={form.watch('driverName') || ''}
                  onValueChange={(val) => form.setValue('driverName', val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-corp-blue-100">
                    <SelectValue placeholder="Sélectionner un collaborateur" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-corp-blue-100">
                    {persons.map((p) => {
                      const fullName = `${p.firstname || ''} ${p.lastname || ''}`.trim() || `Person #${p.id}`;
                      return (
                        <SelectItem key={p.id} value={fullName}>
                          {fullName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nom du chauffeur"
                  className="h-10 rounded-xl border-corp-blue-100"
                  {...form.register('driverName')}
                />
              )}
            </div>

            {/* Station / Garage */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-corp-blue-600" /> Station / Fournisseur
              </Label>
              <Input
                placeholder="Ex: TotalEnergies Sousse, Agil..."
                className="h-10 rounded-xl border-corp-blue-100"
                {...form.register('stationOrProvider')}
              />
            </div>
          </div>

          {/* Notes / Remarques */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-corp-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sand-500" /> Détails / Filtres changés / N° Facture
            </Label>
            <Input
              placeholder="Ex: Changement filtre à huile + filtre à gasoil, Facture F2026-44"
              className="h-10 rounded-xl border-corp-blue-100"
              {...form.register('notes')}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-corp-blue-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 rounded-xl border-corp-blue-100 text-corp-blue-900 font-bold hover:bg-sand-50"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 rounded-xl bg-corp-blue-600 text-white font-bold hover:bg-corp-blue-800 shadow-md shadow-corp-blue-600/20"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
