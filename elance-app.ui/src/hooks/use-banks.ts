import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankService } from '@/services/configuration/bank.service';
import { Bank } from '@/types/settings';
import { toast } from 'sonner';

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: () => bankService.getAll(),
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newBank: Partial<Bank>) => bankService.add(newBank),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Compte bancaire ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating bank:', error);
      toast.error('Erreur lors de l\'ajout du compte bancaire');
    },
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Bank> }) =>
      bankService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Compte bancaire mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating bank:', error);
      toast.error('Erreur lors de la mise à jour du compte bancaire');
    },
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bankService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Compte bancaire supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting bank:', error);
      toast.error('Erreur lors de la suppression du compte bancaire');
    },
  });
}
