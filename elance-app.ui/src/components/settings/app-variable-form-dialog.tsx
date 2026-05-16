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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAppVariable } from '@/hooks/use-app-variables';
import { Loader2, Settings2, Ruler, Percent, Tag, ShieldCheck } from 'lucide-react';
import { AppVariable } from '@/types/settings';

const appVarSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  value: z.string().min(1, 'La valeur est requise'),
  nature: z.string().optional(),
  isactive: z.boolean().default(true),
  isdefault: z.boolean().default(false),
  iseditable: z.boolean().default(true),
});

type AppVarFormValues = z.infer<typeof appVarSchema>;

interface AppVariableFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nature: string; // The base nature (Tva, RS, Taxe, Dimension, Length)
}

const NATURE_LABELS: Record<string, string> = {
  Tva: 'TVA (%)',
  RS: 'Retenue à la Source (%)',
  Taxe: 'Taxe',
  Dimension: 'Dimension (mm)',
  Length: 'Longueur (cm)',
};

const NATURE_ICONS: Record<string, any> = {
  Tva: Percent,
  RS: ShieldCheck,
  Taxe: Tag,
  Dimension: Ruler,
  Length: Ruler,
};

export function AppVariableFormDialog({ isOpen, onClose, nature }: AppVariableFormDialogProps) {
  const createVar = useCreateAppVariable();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppVarFormValues>({
    resolver: zodResolver(appVarSchema) as any,
    defaultValues: {
      name: '',
      value: '',
      nature: nature === 'Dimension' ? 'thickness' : nature,
      isactive: true,
      isdefault: false,
      iseditable: true,
    },
  });

  const selectedNature = watch('nature');
  const nameValue = watch('name');

  // Handle automatic conversion for dimensions
  React.useEffect(() => {
    if (nature === 'Dimension' || nature === 'Length') {
      const num = parseFloat(nameValue || '0');
      if (!isNaN(num) && num > 0) {
        const mVal = nature === 'Length' ? (num / 100).toString() : (num / 1000).toString();
        setValue('value', mVal);
      } else {
        setValue('value', '');
      }
    }
  }, [nameValue, nature, setValue]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        value: '',
        nature: nature === 'Dimension' ? 'thickness' : nature,
        isactive: true,
        isdefault: false,
        iseditable: true,
      });
    }
  }, [isOpen, nature, reset]);

  const onSubmit = (data: AppVarFormValues) => {
    const payload = {
      ...data,
      id: 0,
      isdeleted: false,
      // For Tva/RS, clean the value if someone manually added %
      value: (nature === 'Tva' || nature === 'RS') ? data.value.replace(/%$/, '') : data.value,
    };

    createVar.mutate(payload, {
      onSuccess: () => onClose(),
    });
  };

  const Icon = NATURE_ICONS[nature] || Settings2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-forest-100 shadow-2xl">
        <DialogHeader className="p-8 bg-forest-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Icon className="w-24 h-24" />
          </div>
          <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-3 relative z-10">
            <Icon className="w-6 h-6" />
            Ajouter {NATURE_LABELS[nature]}
          </DialogTitle>
          <DialogDescription className="text-forest-100 text-sm font-medium mt-1 relative z-10">
            Créez une nouvelle variable de configuration pour le système.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 bg-white">
          {nature === 'Dimension' && (
            <div className="space-y-2">
              <Label className="text-sm font-bold text-forest-800">Type de Dimension</Label>
              <Select 
                value={selectedNature} 
                onValueChange={(val) => setValue('nature', val!)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:ring-forest-600">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-forest-100">
                  <SelectItem value="thickness" className="rounded-lg">Épaisseur</SelectItem>
                  <SelectItem value="width" className="rounded-lg">Largeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-forest-800">
                {nature === 'Dimension' ? 'Valeur (mm)' : nature === 'Length' ? 'Valeur (cm)' : 'Nom / Libellé'}
              </Label>
              <Input 
                {...register('name')}
                placeholder={nature === 'Dimension' || nature === 'Length' ? 'ex: 20' : 'ex: Standard'}
                className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600"
              />
              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-forest-800">
                {nature === 'Dimension' || nature === 'Length' ? 'Valeur (m)' : 'Valeur'}
              </Label>
              <Input 
                {...register('value')}
                readOnly={nature === 'Dimension' || nature === 'Length'}
                placeholder={nature === 'Dimension' || nature === 'Length' ? '0.02' : 'ex: 19'}
                className={`h-12 rounded-xl border-forest-100 ${nature === 'Dimension' || nature === 'Length' ? 'bg-sand-100/50 cursor-not-allowed' : 'bg-sand-50 focus:border-forest-600'}`}
              />
              {errors.value && <p className="text-xs text-red-500 font-medium">{errors.value.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-sand-50 rounded-2xl border border-forest-50">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-forest-800">Actif</Label>
              <p className="text-xs text-sand-500">Rendre cette variable utilisable immédiatement</p>
            </div>
            <Switch 
              checked={watch('isactive')}
              onCheckedChange={(val) => setValue('isactive', val)}
              className="data-[state=checked]:bg-forest-600"
            />
          </div>

          {nature !== 'Dimension' && nature !== 'Length' && (
            <div className="flex items-center justify-between p-4 bg-sand-50 rounded-2xl border border-forest-50">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-forest-800">Par défaut</Label>
                <p className="text-xs text-sand-500">Utiliser cette valeur par défaut dans les formulaires</p>
              </div>
              <Switch 
                checked={watch('isdefault')}
                onCheckedChange={(val) => setValue('isdefault', val)}
                className="data-[state=checked]:bg-forest-600"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50"
            >
              Annuler
            </Button>
            <Button 
              disabled={createVar.isPending}
              className="flex-[2] h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20"
            >
              {createVar.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Ajouter la variable'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
