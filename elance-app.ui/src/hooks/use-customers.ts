import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { counterpartService } from '@/services/components/counterpart.service';
import { Customer } from '@/types/customer';
import { toast } from 'sonner';

export function useCustomers(type: string = 'Customer') {
  return useQuery<Customer[]>({
    queryKey: ['customers', type],
    queryFn: () => counterpartService.getAll(type),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCustomer: Partial<Customer>) => counterpartService.add(newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast.error('Erreur lors de l\'ajout du client');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      counterpartService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating customer:', error);
      toast.error('Erreur lors de la mise à jour du client');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => counterpartService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting customer:', error);
      toast.error('Erreur lors de la suppression du client');
    },
  });
}
