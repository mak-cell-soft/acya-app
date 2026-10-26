import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/components/article.service';
import { Article } from '@/types/article';
import { toast } from 'sonner';

export const useArticles = (options?: { enabled?: boolean }) => {
  return useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: articleService.getAll,
    enabled: options?.enabled ?? true,
  });
};

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: articleService.addArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de l\'article');
    }
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, model }: { id: number; model: any }) => articleService.put(id, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour de l\'article');
    }
  });
};

export const useDeleteArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: articleService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression de l\'article');
    }
  });
};
