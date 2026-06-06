import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankDepositService } from '@/services/treasury/bank-deposit.service';
import { caisseService } from '@/services/treasury/caisse.service';
import { toast } from 'sonner';

/**
 * Hook to retrieve all bank balances (consolidated).
 */
export function useBankBalances() {
  return useQuery({
    queryKey: ['treasury', 'bank-balances'],
    queryFn: () => bankDepositService.getAllBankBalances(),
  });
}

/**
 * Hook to retrieve the Caisse Principale balance.
 */
export function useCaissePrincipaleBalance() {
  return useQuery({
    queryKey: ['treasury', 'caisse-principale'],
    queryFn: () => caisseService.getCaissePrincipaleBalance(),
  });
}

/**
 * Hook to retrieve all point of sale caisse balances.
 */
export function useAllCaisseBalances() {
  return useQuery({
    queryKey: ['treasury', 'all-caisse-balances'],
    queryFn: () => caisseService.getAllBalances(),
  });
}

/**
 * Hook to create a new bank deposit.
 * Automatically invalidates treasury queries on success.
 */
export function useCreateBankDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deposit: {
      bankId: number;
      depositType: 'ESPECE' | 'CHEQUE' | 'TRAITE' | string;
      amountHT: number;
      reference?: string;
      notes?: string;
      salesSiteId: number | null;
      createdByUserId: string | null;
    }) => bankDepositService.createDeposit(deposit),
    onSuccess: () => {
      // Invalidate all related treasury cache keys
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      // Also invalidate general caisse/site balance query in case it is loaded elsewhere
      queryClient.invalidateQueries({ queryKey: ['caisse'] });
      // Also invalidate bank-statement to update rapprochement bancaire
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
      
      toast.success('Versement en banque effectué avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating bank deposit:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de l\'enregistrement du versement';
      toast.error(errorMsg);
    },
  });
}
