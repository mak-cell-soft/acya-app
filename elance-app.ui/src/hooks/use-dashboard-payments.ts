import { useQuery } from '@tanstack/react-query';
import { paymentService } from '@/services/components/payment.service';
import { DashboardPaymentDto } from '@/types/payment';

export function useDashboardPayments(
  date: Date,
  appUserId?: number,
  documentSide: string = 'customer',
  monthOnly: boolean = false,
  allSites: boolean = false,
  fromDate?: string,
  toDate?: string
) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  return useQuery<DashboardPaymentDto[]>({
    queryKey: ['payments', 'dashboard', dateKey, appUserId || 'all', documentSide, monthOnly, allSites, fromDate || '', toDate || ''],
    queryFn: () => paymentService.getDashboardPayments(date, appUserId, documentSide, monthOnly, allSites, fromDate, toDate),
  });
}
