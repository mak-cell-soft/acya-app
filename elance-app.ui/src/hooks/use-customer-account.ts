import { useQuery } from '@tanstack/react-query';
import { accountingService } from '@/services/components/accounting.service';
import { AccountStatement } from '@/types/customer';

export function useCustomerStatement(id: number, startDate: Date, endDate: Date, enabled: boolean = true) {
  return useQuery<AccountStatement>({
    queryKey: ['customer-statement', id, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => accountingService.getStatement(id, startDate, endDate),
    enabled: !!id && enabled,
  });
}
