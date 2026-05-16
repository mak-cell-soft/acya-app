import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/configuration/category.service';
import { Category } from '@/types/article';

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
  });
};
