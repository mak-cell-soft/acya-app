import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/services/team/permissions.service';
import { UserPermissionsDto } from '@/types/permissions';
import { toast } from 'sonner';

export function useUserPermissions(userId: number) {
  return useQuery<UserPermissionsDto>({
    queryKey: ['permissions', userId],
    queryFn: () => permissionsService.getByUserId(userId),
    enabled: !!userId,
  });
}

export function useMyPermissions() {
  return useQuery<UserPermissionsDto>({
    queryKey: ['my-permissions'],
    queryFn: () => permissionsService.getMyPermissions(),
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UserPermissionsDto }) =>
      permissionsService.update(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permissions', variables.userId] });
      toast.success('Permissions mises à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating permissions:', error);
      toast.error('Erreur lors de la mise à jour des permissions');
    },
  });
}
