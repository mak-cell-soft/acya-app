import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appVariableService } from '@/services/configuration/app-variable.service';
import { AppVariable } from '@/types/settings';
import { toast } from 'sonner';

export function useAppVariables(nature: string) {
  return useQuery<AppVariable[]>({
    queryKey: ['app-variables', nature],
    queryFn: () => appVariableService.getAll(nature),
  });
}

export function useCreateAppVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newVar: Partial<AppVariable>) => appVariableService.addAppVariable(newVar),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-variables', variables.nature] });
      toast.success(`${variables.nature} ajouté avec succès`);
    },
    onError: (error: any) => {
      console.error('Error creating app variable:', error);
      toast.error('Erreur lors de l\'ajout de la variable');
    },
  });
}

export function useUpdateAppVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AppVariable> }) =>
      appVariableService.put(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-variables', variables.data.nature] });
      toast.success('Variable mise à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating app variable:', error);
      toast.error('Erreur lors de la mise à jour de la variable');
    },
  });
}

export function useDeleteAppVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, nature }: { id: number; nature: string }) => appVariableService.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-variables', variables.nature] });
      toast.success('Variable supprimée avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting app variable:', error);
      toast.error('Erreur lors de la suppression de la variable');
    },
  });
}
