import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personService } from '@/services/team/person.service';
import { appUserService } from '@/services/team/app-user.service';
import { Person, AppUser } from '@/types/team';
import { toast } from 'sonner';

export function usePersons() {
  return useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => personService.getAll(),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPerson: Partial<Person>) => personService.add(newPerson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Employé ajouté avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating employee:', error);
      toast.error('Erreur lors de l\'ajout de l\'employé');
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Person> }) =>
      personService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Employé mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating employee:', error);
      toast.error('Erreur lors de la mise à jour de l\'employé');
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => personService.deleteSoft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Employé supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting employee:', error);
      toast.error('Erreur lors de la suppression de l\'employé');
    },
  });
}

export function useAppUsers() {
  return useQuery<AppUser[]>({
    queryKey: ['app-users'],
    queryFn: () => appUserService.getAll(),
  });
}

export function useUpdateAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AppUser> }) =>
      appUserService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      toast.success('Utilisateur mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating app user:', error);
      toast.error('Erreur lors de la mise à jour de l\'utilisateur');
    },
  });
}

export function useCreateAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => appUserService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Utilisateur créé avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating app user:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de la création de l\'utilisateur');
    },
  });
}
