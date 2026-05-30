import { useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { Payment } from '@/types/payment';

/**
 * Hook to retrieve all payments applied to a selected supplier counterpart.
 * Uses the existing backend controller endpoint via paymentService.getBySupplierId.
 */
export function useSupplierPayments(supplierId: number, enabled: boolean = true) {
  return useQuery<Payment[]>({
    queryKey: ['payments', 'supplier', supplierId],
    queryFn: () => paymentService.getBySupplierId(supplierId),
    enabled: !!supplierId && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
}
