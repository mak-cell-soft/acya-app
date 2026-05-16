import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '@/services/components/account.service';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

export const useProfile = (userId: number) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => accountService.getProfile(userId),
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  
  return useMutation({
    mutationFn: (model: any) => accountService.updateProfile(model),
    onSuccess: (data, variables) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['profile', parseInt(user.id, 10)] });
        const newFullName = `${variables.firstName} ${variables.lastName}`;
        updateUser({
          ...user,
          email: variables.email,
          fullname: newFullName
        });
      }
      toast.success('Profil mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (model: any) => accountService.updatePassword(model),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du mot de passe');
    }
  });
};
