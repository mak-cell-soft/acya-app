'use client';

import * as React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateSite } from '@/hooks/use-enterprise';
import { GOV_TN } from '@/lib/constants/settings';
import { Loader2, Store, MapPin } from 'lucide-react';

const siteSchema = z.object({
  address: z.string().min(1, 'Adresse requise'),
  codepost: z.string().regex(/^\d{4}$/, 'Code postal doit contenir 4 chiffres'),
  gov: z.string().min(1, 'Gouvernorat requis'),
  isForsale: z.boolean().default(false),
});

type SiteFormValues = z.infer<typeof siteSchema>;

interface SiteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enterpriseId: number;
}

export function SiteFormDialog({ isOpen, onClose, enterpriseId }: SiteFormDialogProps) {
  const createSite = useCreateSite();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema) as any,
    defaultValues: {
      address: '',
      codepost: '',
      gov: '',
      isForsale: false,
    },
  });

  // Reset form when dialog visibility changes
  React.useEffect(() => {
    if (isOpen) {
      reset({
        address: '',
        codepost: '',
        gov: '',
        isForsale: false,
      });
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<SiteFormValues> = (data) => {
    createSite.mutate({
      ...data,
      enterpriseid: enterpriseId,
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-forest-100">
        <DialogHeader className="p-8 bg-forest-600 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Store className="w-24 h-24" />
          </div>
          <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-3">
            <MapPin className="w-6 h-6" />
            Nouveau Site
          </DialogTitle>
          <DialogDescription className="text-forest-100 text-sm font-medium mt-1">
            Ajoutez un nouveau point de vente ou dépôt pour votre entreprise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 bg-white">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-forest-900">Adresse complète</Label>
              <Input 
                {...register('address')} 
                placeholder="Ex: Rue de l'Industrie, Zone Industrielle..."
                className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
              />
              {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-900">Code Postal</Label>
                <Input 
                  {...register('codepost')} 
                  placeholder="2035"
                  maxLength={4}
                  className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 outline-none transition-all font-medium" 
                />
                {errors.codepost && <p className="text-xs text-red-500 font-medium">{errors.codepost.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-900">Gouvernorat</Label>
                <Controller
                  name="gov"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => field.onChange(val || '')} value={field.value}>
                      <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-forest-100">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOV_TN.map((g) => (
                          <SelectItem key={g.key} value={g.value}>{g.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gov && <p className="text-xs text-red-500 font-medium">{errors.gov.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-sand-50/50 border border-forest-50">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-forest-900">Point de Vente</Label>
                <p className="text-xs text-sand-400 font-medium">Activer si ce site effectue des ventes.</p>
              </div>
              <Controller
                name="isForsale"
                control={control}
                render={({ field }) => (
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                    className="data-[state=checked]:bg-forest-600"
                  />
                )}
              />
            </div>
          </div>

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
              disabled={createSite.isPending}
              className="flex-[2] h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20"
            >
              {createSite.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer le site'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
