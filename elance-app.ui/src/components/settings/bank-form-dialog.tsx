'use client';

import * as React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBank, useUpdateBank } from '@/hooks/use-banks';
import { Loader2, Landmark, Building2, CreditCard, LandmarkIcon, Wallet, Info, MapPin, Globe } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { BANKS_TN } from '@/constants/banks';

const bankSchema = z.object({
  reference: z.string().min(1, 'Banque requise'),
  designation: z.string().min(1, 'Désignation requise'),
  agency: z.string().min(1, 'Agence requise'),
  rib: z.string().min(1, 'RIB requis'),
  iban: z.string().min(1, 'IBAN requis'),
  chequeDepositFeeHT: z.coerce.number().min(0),
  traiteDepositFeeHT: z.coerce.number().min(0),
  wireTransferFeeHT: z.coerce.number().min(0),
  miscFeeHT: z.coerce.number().min(0),
  initialBalance: z.coerce.number(),
});

type BankFormValues = z.infer<typeof bankSchema>;

interface BankFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bank?: any; // If provided, we are editing
}

export function BankFormDialog({ isOpen, onClose, bank }: BankFormDialogProps) {
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const { user } = useAuthStore();
  const isEditing = !!bank;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema) as any,
    defaultValues: {
      reference: '',
      designation: '',
      agency: '',
      rib: '',
      iban: '',
      chequeDepositFeeHT: 0,
      traiteDepositFeeHT: 0,
      wireTransferFeeHT: 0,
      miscFeeHT: 0,
      initialBalance: 0,
    },
  });

  const selectedRef = watch('reference');

  React.useEffect(() => {
    if (isOpen) {
      if (bank) {
        reset({
          reference: bank.reference,
          designation: bank.designation,
          agency: bank.agency,
          rib: bank.rib,
          iban: bank.iban,
          chequeDepositFeeHT: bank.chequeDepositFeeHT || 0,
          traiteDepositFeeHT: bank.traiteDepositFeeHT || 0,
          wireTransferFeeHT: bank.wireTransferFeeHT || 0,
          miscFeeHT: bank.miscFeeHT || 0,
          initialBalance: bank.initialBalance || 0,
        });
      } else {
        reset({
          reference: '',
          designation: '',
          agency: '',
          rib: '',
          iban: '',
          chequeDepositFeeHT: 0,
          traiteDepositFeeHT: 0,
          wireTransferFeeHT: 0,
          miscFeeHT: 0,
          initialBalance: 0,
        });
      }
    }
  }, [isOpen, bank, reset]);

  const handleBankChange = (value: string | null) => {
    if (!value) return;
    setValue('reference', value);
    const selectedBank = BANKS_TN.find(b => b.key === value);
    if (selectedBank) {
      setValue('designation', selectedBank.value);
    }
  };

  const onSubmit: SubmitHandler<BankFormValues> = (data) => {
    const userId = Number(user?.id);
    const payload = {
      ...data,
      id: isEditing ? bank.id : 0,
      updatedby: userId,
      isdeleted: false,
      creationdate: isEditing ? bank.creationdate : new Date().toISOString(),
      updatedate: new Date().toISOString(),
      logo: ''
    };

    if (isEditing) {
      updateBank.mutate({ id: bank.id, data: payload }, { onSuccess: () => onClose() });
    } else {
      createBank.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[32px] p-0 overflow-hidden border-forest-100 shadow-2xl">
        <DialogHeader className="p-8 bg-forest-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <LandmarkIcon className="w-32 h-32" />
          </div>
          <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-3 relative z-10">
            <Landmark className="w-6 h-6" />
            {isEditing ? 'Modifier la Banque' : 'Ajouter une Banque'}
          </DialogTitle>
          <DialogDescription className="text-forest-100 text-sm font-medium mt-1 relative z-10">
            Configurez les détails du compte bancaire et les frais d'opérations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 bg-white max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Informations Bancaires */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-forest-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-forest-400" />
              Compte & Agence
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Banque</Label>
                <Select value={selectedRef} onValueChange={handleBankChange}>
                  <SelectTrigger className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:ring-forest-600">
                    <SelectValue placeholder="Sélectionner une banque" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-forest-100">
                    {BANKS_TN.sort((a, b) => a.key.localeCompare(b.key)).map((b) => (
                      <SelectItem key={b.key} value={b.key} className="rounded-lg focus:bg-forest-50 focus:text-forest-900">
                        {b.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reference && <p className="text-xs text-red-500 font-medium">{errors.reference.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Désignation</Label>
                <div className="relative">
                  <Input 
                    {...register('designation')} 
                    readOnly
                    className="h-12 rounded-xl bg-sand-100/50 border-forest-100 font-medium pl-10" 
                  />
                  <Info className="absolute left-3 top-3.5 w-5 h-5 text-sand-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Agence</Label>
                <div className="relative">
                  <Input 
                    {...register('agency')} 
                    required
                    placeholder="ex: Tunis Centre"
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 pl-10" 
                  />
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-forest-400" />
                </div>
                {errors.agency && <p className="text-xs text-red-500 font-medium">{errors.agency.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">RIB</Label>
                <div className="relative">
                  <Input 
                    {...register('rib')} 
                    required
                    placeholder="20 chiffres"
                    className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 pl-10" 
                  />
                  <CreditCard className="absolute left-3 top-3.5 w-5 h-5 text-forest-400" />
                </div>
                {errors.rib && <p className="text-xs text-red-500 font-medium">{errors.rib.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-forest-800">IBAN</Label>
              <div className="relative">
                <Input 
                  {...register('iban')} 
                  required
                  placeholder="TN59 ..."
                  className="h-12 rounded-xl bg-sand-50 border-forest-100 focus:border-forest-600 pl-10" 
                />
                <Globe className="absolute left-3 top-3.5 w-5 h-5 text-forest-400" />
              </div>
              {errors.iban && <p className="text-xs text-red-500 font-medium">{errors.iban.message}</p>}
            </div>
          </div>

          {/* Section 2: Frais & Solde */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-forest-900 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-forest-400" />
              Frais d'Opérations (HT) & Solde
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Frais Chèque HT</Label>
                <Input type="number" step="0.001" {...register('chequeDepositFeeHT')} className="h-12 rounded-xl bg-sand-50 border-forest-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Frais Traite HT</Label>
                <Input type="number" step="0.001" {...register('traiteDepositFeeHT')} className="h-12 rounded-xl bg-sand-50 border-forest-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Frais Virement HT</Label>
                <Input type="number" step="0.001" {...register('wireTransferFeeHT')} className="h-12 rounded-xl bg-sand-50 border-forest-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-forest-800">Frais Divers HT</Label>
                <Input type="number" step="0.001" {...register('miscFeeHT')} className="h-12 rounded-xl bg-sand-50 border-forest-100" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-bold text-forest-800">Solde Initial</Label>
                <Input type="number" step="0.001" {...register('initialBalance')} className="h-12 rounded-xl bg-forest-50 border-forest-100 font-bold text-forest-900" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-forest-100 text-forest-600 font-bold hover:bg-forest-50"
            >
              Annuler
            </Button>
            <Button 
              disabled={createBank.isPending || updateBank.isPending}
              className="flex-[2] h-12 rounded-xl bg-forest-600 text-white hover:bg-forest-800 font-bold shadow-lg shadow-forest-600/20"
            >
              {createBank.isPending || updateBank.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isEditing ? 'Enregistrer' : 'Créer le Compte'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
