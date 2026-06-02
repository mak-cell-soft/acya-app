import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/components/analytics.service';
import { useAuthStore } from '@/store/use-auth-store';

export function useAnalyticsKpis(month?: number, year?: number) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['analytics', 'kpis', user?.enterpriseId, month, year],
    queryFn: () => analyticsService.getDashboardKpis(user?.enterpriseId?.toString(), month, year),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useMonthlyRevenue(months: number = 6) {
  return useQuery({
    queryKey: ['analytics', 'monthly-revenue', months],
    queryFn: () => analyticsService.getMonthlyRevenue(months),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTopSubCategories(months: number = 6) {
  return useQuery({
    queryKey: ['analytics', 'top-subcategories', months],
    queryFn: () => analyticsService.getTopSubCategories(months),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockHealthBySubCategory(siteId?: number) {
  return useQuery({
    queryKey: ['analytics', 'stock-health', siteId],
    queryFn: () => analyticsService.getStockHealthBySubCategory(siteId),
    staleTime: 5 * 60 * 1000,
  });
}
