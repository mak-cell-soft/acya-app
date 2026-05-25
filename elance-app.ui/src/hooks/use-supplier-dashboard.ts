import { useQuery } from '@tanstack/react-query';
import { counterpartService } from '@/services/components/counterpart.service';
import { SupplierDashboardData } from '@/types/customer';

/**
 * Hook to retrieve the complete dashboard statistics and history for a given supplier counterpart.
 * Uses the existing backend controller endpoint.
 */
export function useSupplierDashboard(id: number, enabled: boolean = true) {
  return useQuery<SupplierDashboardData>({
    queryKey: ['supplier-dashboard', id],
    queryFn: () => counterpartService.getSupplierDashboard(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
}
