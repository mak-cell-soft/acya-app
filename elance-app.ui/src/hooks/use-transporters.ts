import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transporterService } from '@/services/components/transporter.service';
import { Transporter } from '@/types/settings';
import { toast } from 'sonner';

export function useTransporters() {
  return useQuery<Transporter[]>({
    queryKey: ['transporters'],
    queryFn: () => transporterService.getAll(),
  });
}

export function useCreateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newTransporter: Partial<Transporter>) => transporterService.add(newTransporter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      toast.success('Transporteur ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating transporter:', error);
      toast.error('Erreur lors de l\'ajout du transporteur');
    },
  });
}

export function useUpdateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transporter> }) =>
      transporterService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      toast.success('Transporteur mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating transporter:', error);
      toast.error('Erreur lors de la mise à jour du transporteur');
    },
  });
}

export function useDeleteTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transporterService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      toast.success('Transporteur supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting transporter:', error);
      toast.error('Erreur lors de la suppression du transporteur');
    },
  });
}
