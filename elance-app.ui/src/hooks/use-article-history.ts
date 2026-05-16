import { useQuery } from '@tanstack/react-query';
import { articleService } from '@/services/components/article.service';
import { PurchasePriceHistory, SalesPriceHistory, CatalogPriceHistory } from '@/types/article';

export const useArticleHistory = (articleId: number | null) => {
  const purchaseHistory = useQuery<PurchasePriceHistory[]>({
    queryKey: ['article-history', 'purchase', articleId],
    queryFn: () => articleService.getPurchaseHistory(articleId!),
    enabled: !!articleId,
  });

  const salesHistory = useQuery<SalesPriceHistory[]>({
    queryKey: ['article-history', 'sales', articleId],
    queryFn: () => articleService.getSalesHistory(articleId!),
    enabled: !!articleId,
  });

  const catalogHistory = useQuery<CatalogPriceHistory[]>({
    queryKey: ['article-history', 'catalog', articleId],
    queryFn: () => articleService.getCatalogHistory(articleId!),
    enabled: !!articleId,
  });

  return {
    purchaseHistory,
    salesHistory,
    catalogHistory,
    isLoading: purchaseHistory.isLoading || salesHistory.isLoading || catalogHistory.isLoading,
  };
};
