import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingGridService } from '@/services/components/pricing-grid.service';
import { PricingGrid } from '@/types/customer';
import { toast } from 'sonner';

export function usePricingGrid(counterPartId: number) {
  return useQuery<PricingGrid[]>({
    queryKey: ['pricing-grid', counterPartId],
    queryFn: () => pricingGridService.getForCounterPart(counterPartId),
    enabled: !!counterPartId,
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Partial<PricingGrid>) => pricingGridService.create(rule),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-grid', variables.counterpartid] });
      toast.success('Règle tarifaire ajoutée avec succès');
    },
    error: (error: any) => {
      console.error('Error creating pricing rule:', error);
      toast.error('Erreur lors de l\'ajout de la règle tarifaire');
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, counterPartId }: { id: number; counterPartId: number }) =>
      pricingGridService.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-grid', variables.counterPartId] });
      toast.success('Règle tarifaire supprimée avec succès');
    },
    error: (error: any) => {
      console.error('Error deleting pricing rule:', error);
      toast.error('Erreur lors de la suppression de la règle tarifaire');
    },
  });
}
