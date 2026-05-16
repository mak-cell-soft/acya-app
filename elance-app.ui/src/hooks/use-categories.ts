import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/configuration/category.service';
import { subCategoryService } from '@/services/configuration/sub-category.service';
import { Category, SubCategory } from '@/types/settings';
import { toast } from 'sonner';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCat: Partial<Category>) => categoryService.add(newCat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Catégorie ajoutée avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      toast.error('Erreur lors de l\'ajout de la catégorie');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      categoryService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Catégorie mise à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      toast.error('Erreur lors de la mise à jour de la catégorie');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Catégorie supprimée avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting category:', error);
      toast.error('Erreur lors de la suppression de la catégorie');
    },
  });
}

// SubCategory Hooks
export function useCreateSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSub: Partial<SubCategory>) => subCategoryService.add(newSub),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Sous-catégorie ajoutée avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating sub-category:', error);
      toast.error('Erreur lors de l\'ajout de la sous-catégorie');
    },
  });
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SubCategory> }) =>
      subCategoryService.put(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Sous-catégorie mise à jour avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating sub-category:', error);
      toast.error('Erreur lors de la mise à jour de la sous-catégorie');
    },
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => subCategoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Sous-catégorie supprimée avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting sub-category:', error);
      toast.error('Erreur lors de la suppression de la sous-catégorie');
    },
  });
}
