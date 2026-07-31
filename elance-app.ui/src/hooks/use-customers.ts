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
      if (error.response?.status === 409) {
        toast.error('Un client avec ces mêmes informations (CIN / Matricule Fiscal) existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout du client');
      }
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      counterpartService.put(id, { ...data, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating customer:', error);
      if (error.response?.status === 409) {
        toast.error('Un client avec ces mêmes informations (CIN / Matricule Fiscal) existe déjà');
      } else {
        toast.error('Erreur lors de la mise à jour du client');
      }
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

export function useOrCreatePassagerCounterpart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedById: number): Promise<Customer> => {
      const customers: Customer[] = await counterpartService.getAll('Customer');
      const existing = customers.find(
        (c) => (c.notes === 'SYSTEM_PASSAGER' || (c.prefix === 'PASS' && c.name === 'Client Passager')) && !c.isdeleted
      );
      if (existing) return existing;

      await counterpartService.add({
        type: 'Customer',
        prefix: 'PASS',
        name: 'Client Passager',
        firstname: 'Client',
        lastname: 'Passager',
        description: 'Client Passager - Compte système pour clients de passage',
        notes: 'SYSTEM_PASSAGER',
        address: 'N/A',
        gouvernorate: 'Tunis',
        jobtitle: 'Particulier',
        isactive: true,
        isdeleted: false,
        openingbalance: 0,
        maximumdiscount: 0,
        updatedbyid: updatedById,
      });

      const refreshed: Customer[] = await counterpartService.getAll('Customer');
      const created = refreshed.find(
        (c) => (c.notes === 'SYSTEM_PASSAGER' || (c.prefix === 'PASS' && c.name === 'Client Passager')) && !c.isdeleted
      );
      if (!created) {
        throw new Error('Failed to retrieve created Client Passager counterpart');
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

