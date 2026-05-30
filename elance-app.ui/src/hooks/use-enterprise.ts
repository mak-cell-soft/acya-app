import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enterpriseService } from '@/services/components/enterprise.service';
import { salesSitesService } from '@/services/components/salessites.service';
import { Enterprise, Site } from '@/types/settings';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/use-auth-store';

export function useEnterprise() {
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId ? parseInt(user.enterpriseId) : 1;

  return useQuery<Enterprise>({
    queryKey: ['enterprise', enterpriseId],
    queryFn: () => enterpriseService.getEnterpriseInfo(enterpriseId),
    enabled: !!enterpriseId,
  });
}

export function useUpdateEnterprise() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  // NOTE: Determine the enterprise ID from the authenticated user context, defaulting to 1 if not set.
  const enterpriseId = user?.enterpriseId ? parseInt(user.enterpriseId) : 1;

  return useMutation({
    // NOTE: We merge the partial update data with the existing cached enterprise data
    // to ensure that we satisfy the backend PUT contract (avoiding overwriting fields with null
    // and preventing Guid parsing errors due to missing fields). We also explicitly set the id
    // to match the URL segment, avoiding the "ID mismatch" BadRequest (400) from C#.
    mutationFn: (data: Partial<Enterprise>) => {
      const current = queryClient.getQueryData<Enterprise>(['enterprise', enterpriseId]);
      const mergedData = {
        ...current,
        ...data,
        id: enterpriseId,
      };
      return enterpriseService.update(enterpriseId, mergedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
      toast.success('Informations de l\'entreprise mises à jour');
    },
    onError: (error: any) => {
      console.error('Error updating enterprise:', error);
      toast.error('Erreur lors de la mise à jour de l\'entreprise');
    },
  });
}

export function useSites() {
  return useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => salesSitesService.getAll(),
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSite: Partial<Site>) => salesSitesService.add(newSite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise'] }); // Also refresh enterprise if it includes sites
      toast.success('Site ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating site:', error);
      toast.error('Erreur lors de l\'ajout du site');
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Site> }) =>
      salesSitesService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating site:', error);
      toast.error('Erreur lors de la mise à jour du site');
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesSitesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting site:', error);
      toast.error('Erreur lors de la suppression du site');
    },
  });
}
