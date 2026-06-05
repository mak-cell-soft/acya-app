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
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, 
  Truck, 
  Settings2, 
  Calendar, 
  Droplets,
  CreditCard,
  Building,
  User,
  Hash,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import { usePersons } from '@/hooks/use-team';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Helper to parse existing serialnumber into virtual form fields
const parseSerialNumber = (serial: string | null | undefined) => {
  if (!serial) {
    return { part1: '', serie: 'TU' as const, part2: '' };
  }
  const clean = serial.trim().toUpperCase();
  
  if (/[T][U]/.test(clean)) {
    const parts = clean.split(/TU/);
    const part1 = parts[0]?.trim() || '';
    const part2 = parts[1]?.trim() || '';
    return { part1, serie: 'TU' as const, part2 };
  }
  
  if (/[R][S]/.test(clean)) {
    const part1 = clean.replace(/RS/, '').trim();
    return { part1, serie: 'RS' as const, part2: '' };
  }
  
  return { part1: clean, serie: 'TU' as const, part2: '' };
};

const vehicleSchema = z.object({
  id: z.number().default(0),
  brand: z.string().min(1, 'La marque est obligatoire'),
  serialnumber_part1: z.string()
    .min(1, 'La première partie est obligatoire')
    .regex(/^\d+$/, 'Doit être numérique'),
  serialnumber_serie: z.enum(['TU', 'RS']),
  serialnumber_part2: z.string().optional().nullable().refine(val => !val || /^\d+$/.test(val), {
    message: 'Doit être numérique',
  }),
  mileage: z.string().optional().nullable(),
  isowned: z.boolean().default(true),
  insurancedate: z.date().optional().nullable(),
  technicalvisitdate: z.date().optional().nullable(),
  drainingdate: z.date().optional().nullable(),
  draining: z.string().default(''),
  fuelcardenterprise: z.string().default('SOCOFEB'),
  fuelcardconductor: z.string().optional().nullable(),
  fuelcardmatricule: z.string().optional().nullable(),
  fuelcardamount: z.number().optional().nullable(),
  fuelcardtype: z.string().optional().nullable(),
  fuelcardnumber: z.string().optional().nullable(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave: (vehicle: any) => Promise<void>;
}

const DRAINING_OPTIONS = [
  'Changement Huile',
  'Filtre à Huile',
  'Filtre à air',
  'Liquide Frein',
  'Filtre à Gasoil',
  'Huile Pond',
  'Graissage'
];

export function VehicleFormDialog({ isOpen, onClose, vehicle, onSave }: VehicleFormDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const isEditMode = !!vehicle;

  // Fetch team members/collaborators for conductor select
  const { data: persons } = usePersons();

  // Filter conductors (role === 40). Fall back to all if none exist.
  const conductors = React.useMemo(() => {
    if (!persons) return [];
    const filtered = persons.filter(p => p.role === 40);
    return filtered.length > 0 ? filtered : persons;
  }, [persons]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      id: 0,
      brand: '',
      serialnumber_part1: '',
      serialnumber_serie: 'TU',
      serialnumber_part2: '',
      mileage: '',
      isowned: true,
      insurancedate: null,
      technicalvisitdate: null,
      drainingdate: null,
      draining: '',
      fuelcardenterprise: 'SOCOFEB',
      fuelcardconductor: '',
      fuelcardmatricule: '',
      fuelcardamount: null,
      fuelcardtype: 'Total',
      fuelcardnumber: '',
    },
  });

  const watchPart1 = watch('serialnumber_part1') || '';
  const watchSerie = watch('serialnumber_serie') || 'TU';
  const watchPart2 = watch('serialnumber_part2') || '';
  
  const watchDraining = watch('draining') || '';
  const watchInsurance = watch('insurancedate');
  const watchTechVisit = watch('technicalvisitdate');
  const watchDrainDate = watch('drainingdate');

  // Fuel card watch fields for visual card preview
  const watchFuelEnterprise = watch('fuelcardenterprise');
  const watchFuelConductor = watch('fuelcardconductor');
  const watchFuelAmount = watch('fuelcardamount');
  const watchFuelType = watch('fuelcardtype') || 'Total';
  const watchFuelNumber = watch('fuelcardnumber') || '';

  // Compute standard concatenated matricule string for submission & preview
  const computedSerial = React.useMemo(() => {
    const p1 = watchPart1.trim();
    if (watchSerie === 'TU') {
      const p2 = watchPart2.trim();
      return p1 && p2 ? `${p1} TU ${p2}` : p1 ? `${p1} TU` : '';
    }
    return p1 ? `${p1} RS` : '';
  }, [watchPart1, watchSerie, watchPart2]);

  // Sync Fuel Card Matricule with computed Serialnumber automatically
  React.useEffect(() => {
    setValue('fuelcardmatricule', computedSerial);
  }, [computedSerial, setValue]);

  // Load vehicle data for edit mode
  React.useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        const parsed = parseSerialNumber(vehicle.serialnumber);
        reset({
          id: vehicle.id,
          brand: vehicle.brand || '',
          serialnumber_part1: parsed.part1,
          serialnumber_serie: parsed.serie,
          serialnumber_part2: parsed.part2,
          mileage: vehicle.mileage || '',
          isowned: true, // enforce owned for this manager UI
          insurancedate: vehicle.insurancedate ? new Date(vehicle.insurancedate) : null,
          technicalvisitdate: vehicle.technicalvisitdate ? new Date(vehicle.technicalvisitdate) : null,
          drainingdate: vehicle.drainingdate ? new Date(vehicle.drainingdate) : null,
          draining: vehicle.draining || '',
          fuelcardenterprise: vehicle.fuelcardenterprise || 'SOCOFEB',
          fuelcardconductor: vehicle.fuelcardconductor || '',
          fuelcardmatricule: vehicle.fuelcardmatricule || vehicle.serialnumber || '',
          fuelcardamount: vehicle.fuelcardamount || null,
          fuelcardtype: vehicle.fuelcardtype || 'Total',
          fuelcardnumber: vehicle.fuelcardnumber || '',
        });
      } else {
        reset({
          id: 0,
          brand: '',
          serialnumber_part1: '',
          serialnumber_serie: 'TU',
          serialnumber_part2: '',
          mileage: '',
          isowned: true,
          insurancedate: null,
          technicalvisitdate: null,
          drainingdate: null,
          draining: '',
          fuelcardenterprise: 'SOCOFEB',
          fuelcardconductor: '',
          fuelcardmatricule: '',
          fuelcardamount: null,
          fuelcardtype: 'Total',
          fuelcardnumber: '',
        });
      }
    }
  }, [isOpen, vehicle, reset]);

  // Expiration / Warn Date Calculator inside the dialog for premium UX feedback
  const getDateStatusMessage = (dateVal: Date | null | undefined) => {
    if (!dateVal) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateVal);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      return { text: "Dépassée (Expirée)", class: "text-rose-600 bg-rose-50 border-rose-100" };
    }
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return { text: `Proche d'échéance (${diffDays}j restants)`, class: "text-amber-600 bg-amber-50 border-amber-100" };
    }
    return { text: "Date Valide (Optimale)", class: "text-emerald-600 bg-emerald-50 border-emerald-100" };
  };

  const insuranceStatus = getDateStatusMessage(watchInsurance);
  const techVisitStatus = getDateStatusMessage(watchTechVisit);

  const toggleDrainingOption = (option: string, checked: boolean) => {
    const currentOptions = watchDraining ? watchDraining.split(',').map(o => o.trim()).filter(Boolean) : [];
    let updatedOptions = [...currentOptions];

    if (checked) {
      if (!updatedOptions.includes(option)) {
        updatedOptions.push(option);
      }
    } else {
      updatedOptions = updatedOptions.filter(o => o !== option);
    }

    setValue('draining', updatedOptions.join(', '));
  };

  const isOptionSelected = (option: string) => {
    const currentOptions = watchDraining ? watchDraining.split(',').map(o => o.trim()).filter(Boolean) : [];
    return currentOptions.includes(option);
  };

  const onSubmit = async (data: VehicleFormValues) => {
    setLoading(true);
    try {
      // Map JS dates back to ISO strings for backend
      const payload = {
        id: data.id,
        brand: data.brand,
        serialnumber: computedSerial,
        mileage: data.mileage ? String(data.mileage) : null,
        isowned: data.isowned,
        insurancedate: data.insurancedate ? data.insurancedate.toISOString() : null,
        technicalvisitdate: data.technicalvisitdate ? data.technicalvisitdate.toISOString() : null,
        drainingdate: data.drainingdate ? data.drainingdate.toISOString() : null,
        draining: data.draining,
        fuelcardenterprise: data.fuelcardenterprise,
        fuelcardconductor: data.fuelcardconductor,
        fuelcardmatricule: computedSerial,
        fuelcardamount: data.fuelcardamount ? Number(data.fuelcardamount) : null,
        fuelcardtype: data.fuelcardtype,
        fuelcardnumber: data.fuelcardnumber || null,
      };

      await onSave(payload);
      toast.success(isEditMode ? 'Véhicule modifié avec succès' : 'Véhicule ajouté avec succès');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  // Helper for dynamic Card Styling based on brand type
  const getCardStyle = (type: string | null | undefined) => {
    switch (type) {
      case 'Shell':
        return {
          bg: 'bg-gradient-to-tr from-amber-600 via-red-500 to-rose-600',
          border: 'border-red-500/30',
          textMuted: 'text-amber-100',
          logo: 'Shell Energy',
          chip: 'from-amber-300 to-amber-100',
        };
      case 'Ola':
        return {
          bg: 'bg-gradient-to-tr from-slate-900 via-blue-950 to-orange-600',
          border: 'border-blue-900/30',
          textMuted: 'text-slate-300',
          logo: 'Ola Energy',
          chip: 'from-amber-300 to-amber-100',
        };
      case 'Total':
      default:
        return {
          bg: 'bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500',
          border: 'border-teal-500/30',
          textMuted: 'text-emerald-100',
          logo: 'TotalEnergies',
          chip: 'from-amber-300 to-amber-100',
        };
    }
  };

  const currentCardStyle = getCardStyle(watchFuelType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-white max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4 mb-4 p-6 md:p-8 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Truck className="w-24 h-24" />
          </div>
          <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-3 relative z-10">
            <Truck className="w-6 h-6 animate-pulse" />
            {isEditMode ? 'Modifier' : 'Nouveau'} Véhicule
          </DialogTitle>
          <DialogDescription className="text-forest-100 text-sm font-medium mt-1 relative z-10">
            Saisissez les informations techniques, les échéances administratives et configurez la carte carburant associée.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-forest-100">
          {/* Section 1: Informations Générales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-forest-50 pb-2">
              <span className="p-1.5 bg-forest-50 rounded-lg text-forest-600"><Settings2 className="w-4 h-4" /></span>
              <h3 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Informations Générales</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="space-y-2 md:col-span-5">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Marque & Modèle</Label>
                <Input 
                  {...register('brand')}
                  placeholder="Ex: Toyota Hilux"
                  className="h-11 rounded-xl bg-sand-50/50 border-forest-50 focus:border-forest-600 focus:ring-1 focus:ring-forest-600 font-semibold"
                />
                {errors.brand && <p className="text-xs text-red-500 font-semibold mt-1">{errors.brand.message}</p>}
              </div>

              {/* Tunisian Unified License Plate Input Row */}
              <div className="space-y-2 md:col-span-7">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider block">
                  Immatriculation (Matricule Tunisien)
                </Label>
                
                <div className="grid grid-cols-12 gap-2 items-center bg-sand-50/20 p-1.5 rounded-2xl border border-forest-50 shadow-inner">
                  {/* Part 1 (Left Number) */}
                  <div className="col-span-4 relative">
                    <Input
                      {...register('serialnumber_part1')}
                      type="text"
                      placeholder={watchSerie === 'TU' ? "1234" : "123456"}
                      maxLength={watchSerie === 'TU' ? 4 : 6}
                      className={cn(
                        "h-11 rounded-xl border-forest-50 focus:ring-forest-600 font-black text-center text-lg bg-white shadow-sm",
                        errors.serialnumber_part1 && "border-red-300 focus:border-red-500 focus:ring-red-500"
                      )}
                    />
                  </div>

                  {/* Serie fixed dropdown (TU / RS) */}
                  <div className="col-span-3">
                    <Select
                      value={watchSerie}
                      onValueChange={(val) => {
                        setValue('serialnumber_serie', val as 'TU' | 'RS');
                        if (val === 'RS') {
                          setValue('serialnumber_part2', '');
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-forest-50 focus:ring-forest-600 font-black text-center text-lg bg-white shadow-sm justify-center gap-1.5">
                        <SelectValue placeholder="Série" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-forest-100">
                        <SelectItem value="TU" className="rounded-lg font-black text-lg text-center">TU</SelectItem>
                        <SelectItem value="RS" className="rounded-lg font-black text-lg text-center">RS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Part 2 (Right Number - Only active if TU) */}
                  <div className="col-span-5">
                    {watchSerie === 'TU' ? (
                      <Input
                        {...register('serialnumber_part2')}
                        type="text"
                        placeholder="123"
                        maxLength={3}
                        className={cn(
                          "h-11 rounded-xl border-forest-50 focus:ring-forest-600 font-black text-center text-lg bg-white shadow-sm",
                          errors.serialnumber_part2 && "border-red-300 focus:border-red-500 focus:ring-red-500"
                        )}
                      />
                    ) : (
                      <div className="h-11 rounded-xl bg-sand-100 border border-sand-200 text-sand-400 flex items-center justify-center text-xs font-bold select-none cursor-not-allowed">
                        N/A (RS uniquement)
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-inputs Errors displaying inline */}
                {(errors.serialnumber_part1 || errors.serialnumber_part2) && (
                  <div className="flex flex-col gap-0.5 mt-1 bg-red-50/50 p-2 rounded-lg border border-red-100">
                    {errors.serialnumber_part1 && (
                      <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Première Partie : {errors.serialnumber_part1.message}
                      </p>
                    )}
                    {errors.serialnumber_part2 && (
                      <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Deuxième Partie : {errors.serialnumber_part2.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Kilométrage Actuel</Label>
                <div className="relative">
                  <Input 
                    {...register('mileage')}
                    type="number"
                    placeholder="Ex: 150000"
                    className="h-11 rounded-xl bg-sand-50/50 border-forest-50 focus:border-forest-600 pr-12 focus:ring-1 focus:ring-forest-600 font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-sand-400">km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Administrations & Maintenance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-5 rounded-2xl bg-sand-50/30 border border-forest-50/50">
              <div className="flex items-center gap-2 border-b border-forest-50 pb-2">
                <span className="p-1.5 bg-forest-50 rounded-lg text-forest-600"><Calendar className="w-4 h-4" /></span>
                <h3 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Échéances Administratives</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Échéance Assurance</Label>
                    {insuranceStatus && (
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", insuranceStatus.class)}>
                        {insuranceStatus.text}
                      </span>
                    )}
                  </div>
                  <DatePicker 
                    date={watchInsurance || undefined} 
                    setDate={(date) => setValue('insurancedate', date || null)}
                    placeholder="Sélectionner la date d'échéance"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Prochaine Visite Technique</Label>
                    {techVisitStatus && (
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", techVisitStatus.class)}>
                        {techVisitStatus.text}
                      </span>
                    )}
                  </div>
                  <DatePicker 
                    date={watchTechVisit || undefined} 
                    setDate={(date) => setValue('technicalvisitdate', date || null)}
                    placeholder="Sélectionner la prochaine visite"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 rounded-2xl bg-sand-50/30 border border-forest-50/50">
              <div className="flex items-center gap-2 border-b border-forest-50 pb-2">
                <span className="p-1.5 bg-forest-50 rounded-lg text-forest-600"><Droplets className="w-4 h-4" /></span>
                <h3 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Maintenance (Vidange)</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider">Date Dernière Vidange</Label>
                  <DatePicker 
                    date={watchDrainDate || undefined} 
                    setDate={(date) => setValue('drainingdate', date || null)}
                    placeholder="Date de la dernière vidange"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-forest-500" /> Détails Vidange / Filtres remplacés
                  </Label>
                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-forest-50 shadow-sm max-h-36 overflow-y-auto">
                    {DRAINING_OPTIONS.map((option) => (
                      <div key={option} className="flex items-center gap-2 hover:bg-sand-50/50 p-1.5 rounded-lg transition-all">
                        <Checkbox 
                          id={`drain-${option}`}
                          checked={isOptionSelected(option)}
                          onCheckedChange={(checked) => toggleDrainingOption(option, !!checked)}
                          className="border-forest-200 text-forest-600 focus:ring-forest-600 rounded"
                        />
                        <label htmlFor={`drain-${option}`} className="text-xs text-forest-800 font-bold cursor-pointer select-none">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Carte Carburant */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-forest-50 pb-2">
              <span className="p-1.5 bg-forest-50 rounded-lg text-forest-600"><CreditCard className="w-4 h-4" /></span>
              <h3 className="text-sm font-bold text-forest-900 uppercase tracking-wider">Carte Carburant</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-sand-50/20 p-6 rounded-[24px] border border-forest-50/40 shadow-inner">
              {/* Form Input Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      Type / Fournisseur
                    </Label>
                    <Select 
                      value={watchFuelType || ""} 
                      onValueChange={(val) => setValue('fuelcardtype', val)}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white border-forest-50 focus:ring-forest-600 font-semibold text-forest-900 shadow-sm">
                        <SelectValue placeholder="Choisir la carte" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-forest-100">
                        <SelectItem value="Total" className="rounded-lg font-semibold">Total</SelectItem>
                        <SelectItem value="Shell" className="rounded-lg font-semibold">Shell</SelectItem>
                        <SelectItem value="Ola" className="rounded-lg font-semibold">Ola</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-sand-400" /> Entreprise
                    </Label>
                    <Input 
                      value={watchFuelEnterprise || ''}
                      readOnly
                      className="h-11 rounded-xl bg-sand-100 cursor-not-allowed border-forest-50 text-sand-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-7 space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-sand-400" /> Conducteur du Véhicule (Chauffeur)
                    </Label>
                    <Select
                      value={watchFuelConductor || ""}
                      onValueChange={(val) => setValue('fuelcardconductor', val)}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white border-forest-50 focus:ring-forest-600 font-semibold text-forest-900 shadow-sm">
                        <SelectValue placeholder="Sélectionner un conducteur" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-forest-100">
                        {conductors.map(c => {
                          const fullName = `${c.firstname} ${c.lastname}`;
                          return (
                            <SelectItem key={c.id} value={fullName} className="rounded-lg font-semibold">
                              {fullName} {c.role === 40 && <span className="text-[10px] bg-forest-50 text-forest-600 px-1.5 py-0.5 rounded font-bold ml-1.5 border border-forest-100">Conducteur</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-5 space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-sand-400" /> Numéro de la Carte
                    </Label>
                    <Input 
                      {...register('fuelcardnumber')}
                      placeholder="Ex: 1407 083580"
                      className="h-11 rounded-xl bg-white border-forest-50 focus:border-forest-600 focus:ring-1 focus:ring-forest-600 font-semibold text-forest-900 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-sand-400" /> Matricule de la Carte
                    </Label>
                    <Input 
                      value={computedSerial || '---'}
                      readOnly
                      placeholder="Identique au matricule"
                      className="h-11 rounded-xl bg-sand-100 cursor-not-allowed border-forest-50 text-sand-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-sand-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-sand-400" /> Montant / Solde (TND)
                    </Label>
                    <Input 
                      {...register('fuelcardamount', { valueAsNumber: true })}
                      type="number"
                      placeholder="Ex: 500"
                      className="h-11 rounded-xl bg-white border-forest-50 focus:border-forest-600 focus:ring-1 focus:ring-forest-600 font-semibold text-forest-900 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Visual Credit Card Preview */}
              <div className="lg:col-span-5 flex justify-center">
                <div className={`w-80 h-48 ${currentCardStyle.bg} text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden border ${currentCardStyle.border} flex flex-col justify-between transition-all duration-500`}>
                  {/* Brand Top Area */}
                  <div className="flex justify-between items-start">
                    {/* Chip */}
                    <div className={`w-10 h-8 bg-gradient-to-r ${currentCardStyle.chip} rounded-lg flex flex-col justify-around p-1 shadow-inner`}>
                      <div className="w-full h-[1px] bg-amber-800/20"></div>
                      <div className="w-full h-[1px] bg-amber-800/20"></div>
                      <div className="w-full h-[1px] bg-amber-800/20"></div>
                    </div>
                    {/* Brand logo replica */}
                    <div className="text-right">
                      <div className="text-xs font-black tracking-tighter flex items-center gap-0.5 justify-end">
                        {watchFuelType === 'Total' && <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                        {watchFuelType === 'Shell' && <span className="inline-block w-2.5 h-2.5 bg-amber-300 rounded-full"></span>}
                        {watchFuelType === 'Ola' && <span className="inline-block w-2.5 h-2.5 bg-blue-400 rounded-full"></span>}
                        <span>{currentCardStyle.logo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="flex justify-between items-end relative z-10 mt-4">
                    <div className="space-y-1">
                      <p className={`text-[0.65rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-widest leading-none`}>Entreprise</p>
                      <p className="text-xs font-bold tracking-wide uppercase truncate max-w-[150px]">
                        {watchFuelEnterprise}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className={`text-[0.65rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-widest leading-none`}>N° Carte</p>
                      <p className="text-xs font-mono font-bold tracking-wider">
                        {watchFuelNumber || '•••• •••• •••• ••••'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-auto pt-2">
                    <div className="space-y-0.5">
                      <p className={`text-[0.55rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Chauffeur</p>
                      <p className="text-[0.7rem] font-bold uppercase tracking-wide truncate max-w-[140px]">
                        {watchFuelConductor || '---'}
                      </p>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <p className={`text-[0.55rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Matricule</p>
                      <p className="text-[0.7rem] font-mono font-bold tracking-wider truncate max-w-[90px]">
                        {computedSerial || 'VEH MATRICULE'}
                      </p>
                    </div>

                    <div className="space-y-0.5 text-right pl-2">
                      <p className={`text-[0.55rem] font-medium ${currentCardStyle.textMuted} uppercase tracking-wider leading-none`}>Solde</p>
                      <p className="text-[0.75rem] font-bold text-amber-200">
                        {watchFuelAmount !== null && watchFuelAmount !== undefined ? `${watchFuelAmount.toLocaleString()} TND` : '--- TND'}
                      </p>
                    </div>
                  </div>

                  {/* Artistic curves/circles for aesthetics */}
                  <div className="absolute right-0 bottom-0 top-0 w-32 bg-white/5 rounded-l-full transform translate-x-12 scale-y-150 rotate-12 pointer-events-none"></div>
                  <div className="absolute right-0 bottom-0 top-0 w-24 bg-white/5 rounded-l-full transform translate-x-16 scale-y-120 rotate-45 pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-forest-50 shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50"
            >
              Annuler
            </Button>
            <Button 
              disabled={loading}
              className="flex-[2] h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isEditMode ? 'Enregistrer les modifications' : 'Ajouter le véhicule'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
