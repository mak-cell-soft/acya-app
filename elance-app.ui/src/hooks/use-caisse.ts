import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caisseService } from '@/services/treasury/caisse.service';
import { toast } from 'sonner';

/**
 * Hook to retrieve cash register balance for a site.
 */
export function useCaisseBalance(siteId: number | undefined) {
  return useQuery({
    queryKey: ['caisse', 'balance', siteId],
    queryFn: () => caisseService.getSiteBalance(siteId!),
    enabled: !!siteId,
  });
}

/**
 * Hook to retrieve recent movements for a site on a specific date.
 */
export function useCaisseMovements(siteId: number | undefined, count: number = 100, date?: Date) {
  return useQuery({
    queryKey: ['caisse', 'movements', siteId, date ? date.toISOString().split('T')[0] : 'all'],
    queryFn: () => caisseService.getMovements(siteId!, count, date),
    enabled: !!siteId,
  });
}

/**
 * Hook to retrieve cash register daily appro limit for a site.
 */
export function useCaisseApproLimit(siteId: number | undefined) {
  return useQuery({
    queryKey: ['caisse', 'appro-limit', siteId],
    queryFn: () => caisseService.getApproLimit(siteId!),
    enabled: !!siteId,
  });
}

/**
 * Hook to add a cash movement (ENTREE / SORTIE).
 */
export function useAddCaisseMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (movement: {
      salesSiteId: number;
      type: 'ENTREE' | 'SORTIE';
      amount: number;
      reason: string;
      reference?: string;
      notes?: string;
      createdByUserId?: string;
    }) => caisseService.addMovement(movement),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caisse', 'balance', variables.salesSiteId] });
      queryClient.invalidateQueries({ queryKey: ['caisse', 'movements', variables.salesSiteId] });
      queryClient.invalidateQueries({ queryKey: ['caisse', 'appro-limit', variables.salesSiteId] });
      toast.success('Mouvement de caisse enregistré avec succès');
    },
    onError: (error: any) => {
      console.error('Error adding caisse movement:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      toast.error(errorMsg);
    },
  });
}

/**
 * Hook to delete a manual cash movement.
 */
export function useDeleteCaisseMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; salesSiteId: number }) => caisseService.deleteMovement(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caisse', 'balance', variables.salesSiteId] });
      queryClient.invalidateQueries({ queryKey: ['caisse', 'movements', variables.salesSiteId] });
      queryClient.invalidateQueries({ queryKey: ['caisse', 'appro-limit', variables.salesSiteId] });
      toast.success('Mouvement supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting caisse movement:', error);
      toast.error('Erreur lors de la suppression du mouvement');
    },
  });
}
