'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBanks } from '@/hooks/use-banks';
import { useAllCaisseBalances, useCaissePrincipaleBalance, useCreateBankDeposit } from '@/hooks/use-treasury';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';
import { Loader2, Landmark, Wallet, Banknote, FileSignature, Receipt } from 'lucide-react';

const depositSchema = z.object({
  bankId: z.string().min(1, 'La banque de destination est requise'),
  salesSiteId: z.string().optional(),
  depositType: z.enum(['ESPECE', 'CHEQUE', 'TRAITE']),
  amount: z.coerce.number().min(0.001, 'Le montant doit être supérieur à 0'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface BankDepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isCentral?: boolean;
  siteId?: number | null;
  onSuccess?: () => void;
}

export function BankDepositDialog({
  isOpen,
  onClose,
  isCentral = true,
  siteId = null,
  onSuccess,
}: BankDepositDialogProps) {
  const { user } = useAuthStore();
  
  // Data queries
  const { data: banks = [], isLoading: isLoadingBanks } = useBanks();
  const { data: mainCaisseBalance = 0, isLoading: isLoadingMainCaisse } = useCaissePrincipaleBalance();
  const { data: sites = [], isLoading: isLoadingSites } = useAllCaisseBalances();

  // Mutation
  const createDeposit = useCreateBankDeposit();

  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      depositType: 'ESPECE',
      amount: 0,
      reference: '',
      notes: '',
      salesSiteId: siteId?.toString() || undefined,
    },
  });

  const selectedSiteId = watch('salesSiteId');
  const depositType = watch('depositType');

  // Track balance changes
  useEffect(() => {
    if (isOpen) {
      if (isCentral) {
        setCurrentBalance(mainCaisseBalance);
      } else if (siteId) {
        const matchingSite = sites.find((s: any) => s.salesSiteId === siteId);
        setCurrentBalance(matchingSite?.currentBalance || 0);
      } else if (selectedSiteId) {
        const matchingSite = sites.find((s: any) => s.salesSiteId === parseInt(selectedSiteId, 10));
        setCurrentBalance(matchingSite?.currentBalance || 0);
      } else {
        setCurrentBalance(0);
      }
    }
  }, [isOpen, isCentral, siteId, selectedSiteId, mainCaisseBalance, sites]);

  // Reset form when opened or closed
  useEffect(() => {
    if (isOpen) {
      reset({
        depositType: 'ESPECE',
        amount: 0,
        reference: '',
        notes: '',
        salesSiteId: siteId?.toString() || undefined,
        bankId: '',
      });
    }
  }, [isOpen, reset, siteId]);

  const onSubmit = async (values: any) => {
    // Validate balance for cash deposits
    if (values.depositType === 'ESPECE' && values.amount > currentBalance) {
      toast.error('Solde insuffisant dans la caisse pour effectuer ce versement espèces');
      return;
    }

    try {
      setLoading(true);
      await createDeposit.mutateAsync({
        bankId: parseInt(values.bankId, 10),
        depositType: values.depositType,
        amountHT: values.amount,
        reference: values.reference,
        notes: values.notes,
        salesSiteId: isCentral ? null : values.salesSiteId ? parseInt(values.salesSiteId, 10) : null,
        createdByUserId: user?.id ? String(user.id) : null,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit deposit failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
              <Landmark className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-serif font-bold text-slate-900 dark:text-slate-50">
                {isCentral ? 'Versement Caisse Principale' : 'Nouveau Versement en Banque'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Opération de transfert de fonds liquides ou d&apos;effets vers les comptes bancaires.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Balance Banner */}
        <div className="relative bg-slate-950 text-white rounded-2xl p-5 overflow-hidden mb-6 flex justify-between items-center shadow-lg shadow-slate-900/10">
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              {isCentral ? 'Solde Caisse Principale' : 'Solde Caisse Actuel'}
            </span>
            <span className="text-2xl font-mono font-bold text-amber-400">
              {isLoadingMainCaisse || isLoadingSites ? (
                <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
              ) : null}
              {formatCurrency(currentBalance)}
            </span>
          </div>
          <Wallet className="w-12 h-12 text-slate-850 absolute right-4 top-1/2 -translate-y-1/2 select-none" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Site provenance selection (only if not central and not predetermined) */}
            {!siteId && !isCentral && (
              <div className="space-y-2">
                <Label htmlFor="salesSiteId" className="text-[10px] uppercase font-bold text-slate-500">
                  Site de provenance *
                </Label>
                <Select
                  value={selectedSiteId}
                  onValueChange={(val: string) => setValue('salesSiteId', val)}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-[#fafafa] focus:bg-white text-xs font-semibold">
                    <SelectValue placeholder="Sélectionner le site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site: any) => (
                      <SelectItem key={site.salesSiteId} value={site.salesSiteId.toString()}>
                        {site.salesSiteName || site.siteName || `Site #${site.salesSiteId}`} ({formatCurrency(site.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.salesSiteId && (
                  <span className="text-[10px] text-rose-500 font-bold block">{errors.salesSiteId.message as string}</span>
                )}
              </div>
            )}

            {/* Destination Bank Select */}
            <div className="space-y-2">
              <Label htmlFor="bankId" className="text-[10px] uppercase font-bold text-slate-500">
                Banque de destination *
              </Label>
              <Select
                onValueChange={(val: string) => setValue('bankId', val)}
                disabled={isLoadingBanks}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-[#fafafa] focus:bg-white text-xs font-semibold">
                  <SelectValue placeholder="Sélectionner la banque de destination" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id.toString()}>
                      {bank.designation} - {bank.rib}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankId && (
                <span className="text-[10px] text-rose-500 font-bold block">{errors.bankId.message as string}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Deposit Type Select */}
              <div className="space-y-2">
                <Label htmlFor="depositType" className="text-[10px] uppercase font-bold text-slate-500">
                  Type de versement *
                </Label>
                <Select
                  value={depositType}
                  onValueChange={(val) => setValue('depositType', val as 'ESPECE' | 'CHEQUE' | 'TRAITE')}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-[#fafafa] focus:bg-white text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESPECE">Espèces</SelectItem>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                    <SelectItem value="TRAITE">Traite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[10px] uppercase font-bold text-slate-500">
                  Montant *
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...register('amount')}
                    className="h-11 rounded-xl border-slate-200 bg-[#fafafa] focus:bg-white text-xs font-semibold pr-12 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
                    TND
                  </span>
                </div>
                {errors.amount && (
                  <span className="text-[10px] text-rose-500 font-bold block">{errors.amount.message as string}</span>
                )}
              </div>
            </div>

            {/* Reference Input */}
            <div className="space-y-2">
              <Label htmlFor="reference" className="text-[10px] uppercase font-bold text-slate-500">
                Référence / N° Bordereau
              </Label>
              <div className="relative">
                <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="reference"
                  placeholder="Ex: BORD-12345"
                  {...register('reference')}
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-[#fafafa] focus:bg-white text-xs font-semibold"
                />
              </div>
            </div>

            {/* Notes textarea */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[10px] uppercase font-bold text-slate-500">
                Notes complémentaires
              </Label>
              <textarea
                id="notes"
                placeholder="Détails additionnels (provenance, motif, etc.)"
                {...register('notes')}
                rows={2}
                className="flex w-full rounded-xl border border-slate-200 bg-[#fafafa] px-3 py-2 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-450 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-bold"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || createDeposit.isPending}
              className="h-11 px-6 bg-slate-900 hover:bg-slate-850 dark:bg-slate-50 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold text-xs gap-2 shadow-sm"
            >
              {loading || createDeposit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Landmark className="w-4 h-4" />
              )}
              Confirmer le Versement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
