import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { counterpartService } from '@/services/components/counterpart.service';
import { Supplier } from '@/types/customer';
import { toast } from 'sonner';

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => counterpartService.getAll('Supplier'),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSupplier: Partial<Supplier>) => counterpartService.add(newSupplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating supplier:', error);
      toast.error('Erreur lors de l\'ajout du fournisseur');
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      counterpartService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating supplier:', error);
      toast.error('Erreur lors de la mise à jour du fournisseur');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => counterpartService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting supplier:', error);
      toast.error('Erreur lors de la suppression du fournisseur');
    },
  });
}
