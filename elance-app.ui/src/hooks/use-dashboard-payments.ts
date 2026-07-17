import { useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { DashboardPaymentDto } from '@/types/payment';

export function useDashboardPayments(date: Date, appUserId?: number, documentSide: string = 'customer', monthOnly: boolean = false) {
  return useQuery<DashboardPaymentDto[]>({
    queryKey: ['payments', 'dashboard', date.toISOString().split('T')[0], appUserId || 'all', documentSide, monthOnly],
    queryFn: () => paymentService.getDashboardPayments(date, appUserId, documentSide, monthOnly),
  });
}
